import { NextResponse } from "next/server";
import { getGroqModel } from "../../utils/ai";
import { cvSchema } from "../../utils/schemas";
import { PromptTemplate } from "@langchain/core/prompts";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("cv") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No CV file provided" }, { status: 400 });
        }

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
        }

        // Load and parse PDF using LangChain's PDFLoader
        const loader = new PDFLoader(file, { parsedItemSeparator: " " });
        const docs = await loader.load();
        const extractedText = docs.map((doc) => doc.pageContent).join("\n");

        // Initialize ChatGroq and bind the structured output schema
        const model = getGroqModel(0.1);
        const structuredModel = model.withStructuredOutput(cvSchema);

        // Define the prompt using LangChain PromptTemplate
        const promptTemplate = PromptTemplate.fromTemplate(`
You are an expert HR AI analyzing a professional CV/Resume.
Extract the candidate's professional profile based on the provided text.

IMPORTANT:
- Extract ALL skills mentioned (technical and soft skills)
- Normalize skill names (e.g., "ReactJS" -> "React", "js" -> "JavaScript")
- Be thorough — list every meaningful skill found
- For experience_level use one of: "Junior", "Mid-Level", "Senior", "Lead", "Executive"
- For years_of_experience use an integer estimate

CV TEXT:
{cvText}
`);

        const prompt = await promptTemplate.invoke({
            cvText: extractedText.substring(0, 20000),
        });

        // Generate structured output
        const aiData = await structuredModel.invoke(prompt);

        return NextResponse.json({
            success: true,
            skills: aiData.skills || [],
            job_title: aiData.job_title || "",
            experience_level: aiData.experience_level || "Mid-Level",
            years_of_experience: aiData.years_of_experience || 0,
            summary: aiData.summary || "",
        });
    } catch (error: any) {
        console.error("CV Parse Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
