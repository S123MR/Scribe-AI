import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const summarizeToNotes = async (text: string): Promise<string> => {
  try {
    const ai = getClient();
    
    // We want a model good at reasoning and structure
    const modelId = "gemini-2.5-flash"; 
    
    const prompt = `
      You are an expert student note-taker. 
      Take the following text and convert it into clean, organized, handwritten-style study notes.
      
      Rules:
      1. Use **bold** for key terms.
      2. Use clear structure with Headers (#, ##).
      3. Use lists (bullet points or numbered) for steps or groups.
      4. Use Markdown tables if comparing data.
      5. Keep sentences concise.
      6. Add a "Key Takeaways" section at the end.
      
      Input text:
      ${text}
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });

    return response.text || "Could not generate notes.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to generate notes");
  }
};