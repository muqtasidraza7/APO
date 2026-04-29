import { NextResponse } from "next/server";
import { createClient } from "../../utils/supabase/server";
import { getGroqModel } from "../../utils/ai";
import { projectDocumentSchema } from "../../utils/schemas";
import { PromptTemplate } from "@langchain/core/prompts";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  let projectId: string | undefined;

  try {
    const body = await request.json();
    projectId = body.projectId;

    // ── Auth check ───────────────────────────────────────────────────────────
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

    // ── Workspace ownership check ─────────────────────────────────────────────
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
    
    // Load and parse PDF using LangChain
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    const loader = new PDFLoader(blob as any, { parsedItemSeparator: " " });
    const docs = await loader.load();
    const extractedText = docs.map((doc) => doc.pageContent).join("\n");

    // Initialize LangChain ChatGroq with structured output
    const model = getGroqModel(0.1);
    const structuredModel = model.withStructuredOutput(projectDocumentSchema);

    const promptTemplate = PromptTemplate.fromTemplate(`
You are an expert Project Manager AI analyzing project documents.
Extract ALL relevant information from the provided document text.

IMPORTANT: 
- Extract as much detail as possible from the document
- If information is missing, use reasonable estimates based on context
- For tasks, break down requirements into actionable items
- Identify project type (software, construction, marketing, consulting, etc.)

DOCUMENT TEXT:
{documentText}
`);

    const prompt = await promptTemplate.invoke({
      documentText: extractedText.substring(0, 25000)
    });

    // Generate structured output
    const aiData = await structuredModel.invoke(prompt);

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

    const customFieldsData = {
      ...custom_fields,
      constraints,
      assumptions,
      requirements: aiData.requirements || [],
    };

    const { error: updateError } = await supabase
      .from("projects")
      .update({
        ai_data: coreAiData,
        ai_status: "completed",
        project_type: project_type || "general",
        client_info: client_info || {},
        success_criteria: success_criteria || {},
        custom_fields: customFieldsData,
      })
      .eq("id", projectId);

    if (updateError) throw updateError;

    if (tasks && tasks.length > 0) {
      const tasksToInsert = tasks.map((task: any) => ({
        project_id: projectId,
        title: task.title,
        description: task.description,
        estimated_hours: task.estimated_hours,
        required_skills: task.required_skills || [],
        priority: task.priority || "medium",
        acceptance_criteria: task.acceptance_criteria || [],
        source_requirement: task.description,
        created_by_ai: true,
        status: "pending",
      }));

      await supabase.from("project_tasks").insert(tasksToInsert);
    }

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