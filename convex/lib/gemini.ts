// import { GoogleGenAI } from "@google/genai";

// const MODEL = "gemini-3-flash-preview";
// const API_KEY = process.env.GOOGLE_GEMINI_KEY;
// const USE_AI_FLAG = process.env.USE_AI;

// // Set up AI Client
// function getGeminiClient(): GoogleGenAI | null {
//   if (USE_AI_FLAG !== "true") return null;
//   if (!API_KEY) return null;

//   return new GoogleGenAI({ API_KEY });
// }

// // Create ai-gen response based on prompt & instruction
// export async function callAIGenerator(params: {
//   prompt: string;
//   systemInstruction?: string;
// }): Promise<string | null> {
//   const ai = getGeminiClient();
//   if (!ai) return null;

//   try {
//     const response = await ai.models.generateContent({
//       model: MODEL,
//       contents: params.prompt,
//       config: {
//         ...(params.systemInstruction
//           ? { systemInstruction: params.systemInstruction }
//           : {}),
//         temperature: 0.1,
//       },
//     });

//     const text = response.text?.trim();
//     return text || null;
//   } catch (err) {
//     console.error("Gemini generateContent failed", err);
//     return null;
//   }
// }