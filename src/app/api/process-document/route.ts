import { NextResponse } from "next/server";
import { createClient } from "../../utils/supabase/server";
import { getGroqModel } from "../../utils/ai";
import { projectDocumentSchema } from "../../utils/schemas";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { HumanMessage } from "@langchain/core/messages";

export const runtime = "nodejs";

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text.trim();
}

export async function POST(request: Request) {
  const supabase = await createClient();
  let projectId: string | undefined;

  try {
    const body = await request.json();
    projectId = body.projectId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (!project?.original_file_url) {
      return NextResponse.json({ error: "Project file URL missing" }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.workspace_id !== project.workspace_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const fileResponse = await fetch(project.original_file_url);
    if (!fileResponse.ok) throw new Error("Failed to download file");

    const arrayBuffer = await fileResponse.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    const loader = new PDFLoader(blob as any, { parsedItemSeparator: " " });
    const docs = await loader.load();
    const extractedText = docs.map((doc) => doc.pageContent).join("\n");

    // Use the powerful 70B model for best extraction quality
    const model = getGroqModel(0.1);

    // Use up to 8000 chars — enough to cover most multi-page project documents
    const documentText = extractedText.substring(0, 8000);

    const systemPrompt = `You are a senior Project Manager AI specializing in extracting structured project data from documents.
Your task is to analyze the provided project document and return ONLY a single valid JSON object — no extra text, no markdown, no explanation.

OUTPUT FORMAT (strict JSON, all fields optional except summary):
{
  "summary": "2-3 sentence executive summary of what this project is about and its primary goal",
  "project_type": "software|construction|marketing|consulting|research|other",
  "budget_estimate": <number in base currency unit, or null>,
  "currency": "<ISO currency code e.g. USD, EUR, PKR, GBP — or null>",
  "timeline_weeks": <total project duration in weeks as integer, or null>,
  "start_date": "<YYYY-MM-DD or null>",
  "end_date": "<YYYY-MM-DD or null>",
  "client_info": {
    "name": "<client organization name or null>",
    "contact_person": "<primary contact name or null>",
    "email": "<contact email or null>"
  },
  "requirements": [
    "<Requirement 1 — specific, actionable>",
    "<up to 8 requirements total>"
  ],
  "milestones": [
    {
      "title": "<short milestone name, e.g. 'User Authentication Module'>",
      "week": <target week number as integer>,
      "deliverable": "<concrete output or artifact, e.g. 'Fully tested login/signup system with JWT'>",
      "success_criteria": "<measurable acceptance criterion, e.g. '95% of test cases pass, <200ms response time'>"
    }
  ],
  "risks": [
    {
      "description": "<clear risk statement, e.g. 'Third-party API rate limits may delay data sync'>",
      "severity": "high|medium|low",
      "mitigation": "<concrete action to reduce/avoid risk>"
    }
  ],
  "required_skills": ["<skill 1>", "<up to 10 skills>"],
  "success_criteria": [
    "<Project-level KPI 1, e.g. 'System handles 10k concurrent users'>",
    "<up to 6 project success criteria>"
  ],
  "constraints": ["<constraint 1>", "<up to 5 constraints>"],
  "assumptions": ["<assumption 1>", "<up to 5 assumptions>"]
}

EXTRACTION RULES:
1. MILESTONES: Generate 4-8 milestones that represent the major phases or deliverables. Each milestone must be at its most logical week. If the document doesn't mention milestones explicitly, infer them from requirements and project scope. Every milestone needs a concrete, testable success_criteria — not vague goals.
2. RISKS: Identify 3-6 real risks specific to this project. Each risk needs a practical, actionable mitigation. Do NOT write generic risks like "budget overrun" unless there is evidence in the document.
3. SUCCESS CRITERIA: These are project-level KPIs — measurable outcomes that define project success (uptime %, user counts, performance benchmarks, regulatory approvals, etc.)
4. REQUIRED SKILLS: Extract actual technical/domain skills needed (e.g. "React", "PostgreSQL", "Structural Engineering", "SEO"), not job titles.
5. BUDGET: Extract exact number if mentioned. If given as range, use the midpoint. If given in a non-base unit (thousands), convert to full number.
6. TIMELINE: Count total weeks from start to end. If dates are given, calculate the week count.
7. For any field not inferable from the document, use null (not "Unknown" or "N/A").
8. Output ONE JSON object only. Do NOT include any text before or after it.`;

    let rawText = "";
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await model.invoke([
          new HumanMessage(`${systemPrompt}\n\nPROJECT DOCUMENT:\n${documentText}`),
        ]);
        rawText = typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);
        break;
      } catch (err: any) {
        const isRateLimit =
          err?.status === 429 ||
          err?.message?.includes("rate_limit") ||
          err?.message?.includes("Rate limit");
        if (isRateLimit && attempt < maxRetries) {
          const waitMs = (attempt + 1) * 15_000;
          console.warn(`Groq rate limit — retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise((r) => setTimeout(r, waitMs));
        } else {
          throw err;
        }
      }
    }

    const jsonString = extractJson(rawText);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error(`AI returned invalid JSON. Raw: ${rawText.substring(0, 400)}`);
    }

    // Enforce schema array limits before Zod validation
    if (Array.isArray(parsed.milestones))       parsed.milestones       = parsed.milestones.slice(0, 8);
    if (Array.isArray(parsed.risks))            parsed.risks            = parsed.risks.slice(0, 6);
    if (Array.isArray(parsed.requirements))     parsed.requirements     = parsed.requirements.slice(0, 8);
    if (Array.isArray(parsed.required_skills))  parsed.required_skills  = parsed.required_skills.slice(0, 10);
    if (Array.isArray(parsed.success_criteria)) parsed.success_criteria = parsed.success_criteria.slice(0, 6);
    if (Array.isArray(parsed.constraints))      parsed.constraints      = parsed.constraints.slice(0, 5);
    if (Array.isArray(parsed.assumptions))      parsed.assumptions      = parsed.assumptions.slice(0, 5);

    const aiData = projectDocumentSchema.parse(parsed);

    const {
      client_info,
      success_criteria,
      constraints,
      assumptions,
      project_type,
      ...coreAiData
    } = aiData;

    const customFieldsData = {
      constraints: constraints || [],
      assumptions: assumptions || [],
      requirements: aiData.requirements || [],
    };

    const { error: updateError } = await supabase
      .from("projects")
      .update({
        ai_data: coreAiData,
        ai_status: "completed",
        project_type: project_type || "general",
        client_info: client_info || {},
        success_criteria: success_criteria ? { kpis: success_criteria } : {},
        custom_fields: customFieldsData,
      })
      .eq("id", projectId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, data: aiData });

  } catch (error: any) {
    if (projectId) {
      await supabase
        .from("projects")
        .update({ ai_status: "failed" })
        .eq("id", projectId);
    }
    console.error("Process Document Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
