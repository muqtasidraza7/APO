import { NextResponse } from "next/server";
import { createClient } from "../../utils/supabase/server";
import { getGroqModel } from "../../utils/ai";
import { projectDocumentSchema } from "../../utils/schemas";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { HumanMessage } from "@langchain/core/messages";

export const runtime = "nodejs";

/** Strip markdown code fences and extract raw JSON from the model response */
function extractJson(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Try to find the first { ... } block
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

    // Use the smaller 8b model — avoid withStructuredOutput (tool-calling) because
    // llama-3.1-8b-instant has a looping bug on Groq: it repeats the function call
    // body until it hits the token limit → 400 tool_use_failed.
    // Instead, ask for raw JSON in message content and parse it manually.
    const model = getGroqModel(0.1, "llama-3.1-8b-instant");

    // Cap at 3000 chars to stay well within 6k TPM free-tier
    const documentText = extractedText.substring(0, 3000);

    const systemPrompt = `You are a Project Manager AI. Analyze the document and return ONLY a single valid JSON object — no extra text, no markdown, no explanation.

The JSON must follow this exact structure (all fields are optional except summary):
{
  "summary": "string (2-3 sentences)",
  "project_type": "software|construction|marketing|consulting|research|other",
  "budget_estimate": number or null,
  "currency": "string or null",
  "timeline_weeks": number or null,
  "start_date": "YYYY-MM-DD or null",
  "end_date": "YYYY-MM-DD or null",
  "client_info": { "name": "string", "contact_person": "string", "email": "string" },
  "requirements": ["up to 6 key requirements"],
  "milestones": [{ "title": "string", "week": number, "deliverable": "string" }],
  "risks": [{ "description": "string", "severity": "high|medium|low", "mitigation": "string" }],
  "required_skills": ["up to 8 skills"],
  "success_criteria": ["up to 4 criteria"],
  "constraints": ["up to 4 constraints"],
  "assumptions": ["up to 4 assumptions"]
}

RULES:
- Output ONE JSON object only. Do NOT repeat it.
- Use null for missing optional fields, not the string "Unknown".
- Keep arrays concise (max items as noted above).`;

    // Retry up to 2 times for transient rate-limit errors
    let rawText = "";
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await model.invoke([
          new HumanMessage(`${systemPrompt}\n\nDOCUMENT TEXT:\n${documentText}`),
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
          const waitMs = (attempt + 1) * 12_000; // 12s, then 24s
          console.warn(`Groq rate limit hit — retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise((r) => setTimeout(r, waitMs));
        } else {
          throw err;
        }
      }
    }

    // Parse and validate with Zod (lenient — use .catch() defaults on bad fields)
    const jsonString = extractJson(rawText);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error(`AI returned invalid JSON. Raw response: ${rawText.substring(0, 300)}`);
    }

    // Pre-truncate arrays to schema maximums so larger documents don't cause ZodErrors
    if (Array.isArray(parsed.milestones))       parsed.milestones       = parsed.milestones.slice(0, 5);
    if (Array.isArray(parsed.risks))            parsed.risks            = parsed.risks.slice(0, 4);
    if (Array.isArray(parsed.requirements))     parsed.requirements     = parsed.requirements.slice(0, 6);
    if (Array.isArray(parsed.required_skills))  parsed.required_skills  = parsed.required_skills.slice(0, 8);
    if (Array.isArray(parsed.success_criteria)) parsed.success_criteria = parsed.success_criteria.slice(0, 4);
    if (Array.isArray(parsed.constraints))      parsed.constraints      = parsed.constraints.slice(0, 4);
    if (Array.isArray(parsed.assumptions))      parsed.assumptions      = parsed.assumptions.slice(0, 4);

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