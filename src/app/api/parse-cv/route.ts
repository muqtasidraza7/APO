import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const PDFParser = require("pdf2json");

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

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const extractedText = await parsePdfBuffer(buffer);

        if (!process.env.GROQ_API_KEY) {
            throw new Error("Missing GROQ_API_KEY");
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const prompt = `
      You are an expert HR AI analyzing a professional CV/Resume.
      Extract the candidate's professional profile and return a JSON object with this EXACT structure.
      Do not include any explanation, just the JSON.

      IMPORTANT:
      - Extract ALL skills mentioned (technical and soft skills)
      - Normalize skill names (e.g., "ReactJS" -> "React", "js" -> "JavaScript")
      - Be thorough — list every meaningful skill found
      - For experience_level use one of: "Junior", "Mid-Level", "Senior", "Lead", "Executive"
      - For years_of_experience use an integer estimate

      Structure:
      {
        "skills": ["Skill 1", "Skill 2", "Skill 3"],
        "job_title": "Most recent or primary job title from CV",
        "experience_level": "Junior|Mid-Level|Senior|Lead|Executive",
        "years_of_experience": 5,
        "summary": "One sentence professional summary based on the CV"
      }

      CV TEXT:
      ${extractedText.substring(0, 20000)}
    `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            response_format: { type: "json_object" },
        });

        const aiResponseContent = chatCompletion.choices[0]?.message?.content || "{}";
        const aiData = JSON.parse(aiResponseContent);

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

function parsePdfBuffer(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, 1);

        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));

        pdfParser.on("pdfParser_dataReady", () => {
            const rawText = pdfParser.getRawTextContent();
            try {
                resolve(decodeURIComponent(rawText));
            } catch (e) {
                resolve(rawText);
            }
        });

        pdfParser.parseBuffer(buffer);
    });
}
