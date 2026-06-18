import { NextRequest, NextResponse } from "next/server";
import { getGroqModel } from "../../utils/ai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const { text, projectType, section } = await request.json();
        if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

        const model = getGroqModel(0.4);
        const parser = new StringOutputParser();

        const promptTemplate = PromptTemplate.fromTemplate(`
You are a senior project consultant reviewing a project plan document.
Elaborate on the following point in exactly 4 to 5 clear, professional sentences.
Be specific, practical, and avoid generic filler. Do not use bullet points or markdown headers.

Section: {section}
Project type: {projectType}
Point: {text}
`);

        const prompt = await promptTemplate.invoke({
            text,
            projectType: projectType || "general",
            section: section || "project plan",
        });

        const elaboration = await model.pipe(parser).invoke(prompt);

        return NextResponse.json({ success: true, elaboration: elaboration.trim() });
    } catch (error: any) {
        console.error("Elaborate error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
