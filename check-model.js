const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: ".env.local" }); // Load your API key

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

  try {
    console.log("Fetching available models...");
    // We access the API directly to see the raw list
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`
    );
    const data = await response.json();

    if (data.error) {
      console.error("API Error:", data.error.message);
      return;
    }

    console.log("\n=== MODELS YOU CAN USE ===");
    const validModels = data.models.filter((m) =>
      m.supportedGenerationMethods.includes("generateContent")
    );

    if (validModels.length === 0) {
      console.log(
        "No models found that support 'generateContent'. Check your API key permissions."
      );
    } else {
      validModels.forEach((m) => {
        // The name comes back like "models/gemini-pro".
        // We usually just need the part after "models/"
        console.log(`- ${m.name.replace("models/", "")}`);
      });
    }
    console.log("========================\n");
  } catch (error) {
    console.error("Script failed:", error);
  }
}

listModels();
