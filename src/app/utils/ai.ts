import { ChatGroq } from "@langchain/groq";

export const getGroqModel = (temperature = 0.1, model = "llama-3.3-70b-versatile") => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY");
  }

  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: model,
    temperature,
  });
};
