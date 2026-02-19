import { NextResponse } from "next/server";
import { createClient } from "../../utils/supabase/server";
import Groq from "groq-sdk";

// Use pdf2json (The stable choice for Node.js)
const PDFParser = require("pdf2json");

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();
    console.log("1. Processing Project ID (Llama 3):", projectId);

    const supabase = await createClient();

    // 1. Fetch Project Info
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (!project?.original_file_url) {
      return NextResponse.json({ error: "Project file URL missing" }, { status: 404 });
    }

    // 2. Download File
    const fileResponse = await fetch(project.original_file_url);
    if (!fileResponse.ok) throw new Error("Failed to download file");

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Extract Text
    console.log("2. Extracting Text from PDF...");
    const extractedText = await parsePdfBuffer(buffer);
    console.log("3. Extracted Characters:", extractedText.length);

    // 4. Send to Llama 3 via Groq
    if (!process.env.GROQ_API_KEY) {
      throw new Error("Missing GROQ_API_KEY in .env.local");
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Enhanced Llama 3 Prompt for Comprehensive Extraction
    const prompt = `
      You are an expert Project Manager AI analyzing project documents.
      Extract ALL relevant information and return a JSON object with this EXACT structure.
      Do not include any explanation, just the JSON.
      
      IMPORTANT: 
      - Extract as much detail as possible from the document
      - If information is missing, use reasonable estimates based on context
      - For tasks, break down requirements into actionable items
      - Identify project type (software, construction, marketing, consulting, etc.)
      
      Structure:
      {
        "summary": "2-3 sentence executive summary of the project",
        "project_type": "software|construction|marketing|consulting|research|other",
        "budget_estimate": 10000,
        "currency": "USD",
        "timeline_weeks": 12,
        "start_date": "2025-03-01" (estimate if not specified),
        "end_date": "2025-05-24" (calculate from timeline),
        
        "client_info": {
          "name": "Client Company Name",
          "contact_person": "John Doe",
          "email": "john@example.com",
          "phone": "+1234567890",
          "stakeholders": ["Person 1", "Person 2"]
        },
        
        "requirements": [
          "Detailed requirement 1",
          "Detailed requirement 2"
        ],
        
        "tasks": [
          {
            "title": "Task Name",
            "description": "Detailed description",
            "estimated_hours": 40,
            "required_skills": ["Skill 1", "Skill 2"],
            "priority": "high|medium|low",
            "dependencies": ["Task title it depends on"],
            "acceptance_criteria": ["Criteria 1", "Criteria 2"]
          }
        ],
        
        "milestones": [
          { 
            "title": "Milestone Name", 
            "week": 1, 
            "deliverable": "What will be delivered",
            "success_criteria": "How to measure success"
          }
        ],
        
        "risks": [
          {
            "description": "Risk description",
            "severity": "high|medium|low",
            "mitigation": "How to mitigate this risk"
          }
        ],
        
        "required_skills": ["Skill 1", "Skill 2", "Skill 3"],
        
        "success_criteria": {
          "kpis": ["KPI 1", "KPI 2"],
          "acceptance_criteria": ["Criteria 1", "Criteria 2"],
          "quality_metrics": ["Metric 1", "Metric 2"]
        },
        
        "constraints": {
          "technical": ["Constraint 1"],
          "business": ["Constraint 2"],
          "regulatory": ["Constraint 3"]
        },
        
        "assumptions": ["Assumption 1", "Assumption 2"],
        
        "custom_fields": {
          "any_other_relevant_data": "extracted from document"
        }
      }

      DOCUMENT TEXT:
      ${extractedText.substring(0, 25000)}
    `;

    console.log("4. Sending to Llama 3-70b...");

    const chatCompletion = await groq.chat.completions.create({
      "messages": [{ "role": "user", "content": prompt }],
      "model": "llama-3.3-70b-versatile", // The smart, large model
      "temperature": 0.1, // Keep it factual
      "response_format": { type: "json_object" } // Force JSON mode (Crucial!)
    });

    const aiResponseContent = chatCompletion.choices[0]?.message?.content || "{}";
    const aiData = JSON.parse(aiResponseContent);

    console.log("5. Llama Responded Success");

    // 5. Separate data for different database columns
    const {
      client_info,
      success_criteria,
      constraints,
      assumptions,
      custom_fields,
      project_type,
      tasks,
      ...coreAiData
    } = aiData;

    // Prepare custom_fields with additional extracted data
    const customFieldsData = {
      ...custom_fields,
      constraints,
      assumptions,
      requirements: aiData.requirements || []
    };

    // 6. Update Database with all extracted data
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        ai_data: coreAiData, // Core fields (summary, budget, timeline, milestones, risks, skills)
        ai_status: 'completed',
        project_type: project_type || 'general',
        client_info: client_info || {},
        success_criteria: success_criteria || {},
        custom_fields: customFieldsData
      })
      .eq("id", projectId);

    if (updateError) throw updateError;

    // 7. Save extracted tasks to project_tasks table
    if (tasks && tasks.length > 0) {
      const tasksToInsert = tasks.map((task: any) => ({
        project_id: projectId,
        title: task.title,
        description: task.description,
        estimated_hours: task.estimated_hours,
        required_skills: task.required_skills || [],
        priority: task.priority || 'medium',
        acceptance_criteria: task.acceptance_criteria || [],
        source_requirement: task.description,
        created_by_ai: true,
        status: 'pending'
      }));

      const { error: tasksError } = await supabase
        .from("project_tasks")
        .insert(tasksToInsert);

      if (tasksError) {
        console.error("Error saving tasks:", tasksError);
        // Don't fail the whole operation if tasks fail
      }
    }

    return NextResponse.json({ success: true, data: aiData });

  } catch (error: any) {
    console.error("Llama Processing Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



function parsePdfBuffer(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1);

    pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));

    pdfParser.on("pdfParser_dataReady", () => {
      const rawText = pdfParser.getRawTextContent();

      try {
        // Try to decode nicely
        resolve(decodeURIComponent(rawText));
      } catch (e) {
        // If decoding crashes (e.g. because of a "%" symbol), use the raw text
        console.warn("PDF decoding warning (using raw text):", e);
        resolve(rawText);
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}