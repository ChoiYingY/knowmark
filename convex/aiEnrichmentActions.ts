import { v } from "convex/values";
import { action } from "./_generated/server";

const MOCK_SUMMARY = "A useful resource saved for later reading.";
const MOCK_CATEGORY = "Uncategorized";
const GEMINI_MODEL = "gemini-1.5-flash";

const ALLOWED_CATEGORIES = [
  "AI & Tech",
  "Career",
  "Learning",
  "Health",
  "Productivity",
  "Finance",
  "Uncategorized",
] as const;

type PreviewEnrichmentResult = {
  aiSummary: string;
  category: string;
};

export const getPreviewEnrichment = action({
  args: {
    url: v.string(),
    normalizedUrl: v.string(),
    title: v.string(),
  },
  handler: async (_ctx, args): Promise<PreviewEnrichmentResult> => {
    if (process.env.USE_AI !== "true") {
      return { aiSummary: MOCK_SUMMARY, category: MOCK_CATEGORY };
    }

    const key = process.env.GOOGLE_GEMINI_KEY;
    if (!key) {
      return { aiSummary: MOCK_SUMMARY, category: MOCK_CATEGORY };
    }

    try {
      const categoriesList = ALLOWED_CATEGORIES.join(", ");
      const prompt = `
        You are a bookmark categorizer. Given a URL and title, return a JSON object with exactly two fields:
        - "aiSummary": a single sentence (max 20 words) describing what this bookmark is about
        - "category": one of these exact values: ${categoriesList}

        Title: ${args.title}
        URL: ${args.url}

        Respond with ONLY valid JSON. No markdown. No explanation.
      `.trim();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      let response: Response;
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 128,
              },
            }),
            signal: controller.signal,
          }
        );
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        console.log("AI enrichment failed, using mock after fetch call");
        return { aiSummary: MOCK_SUMMARY, category: MOCK_CATEGORY };
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        console.log("AI enrichment failed, using mock");
        return { aiSummary: MOCK_SUMMARY, category: MOCK_CATEGORY };
      }

      // Strip markdown code fences if present
      const cleaned = rawText
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        console.log("AI enrichment failed, using mock");
        return { aiSummary: MOCK_SUMMARY, category: MOCK_CATEGORY };
      }

      const obj =
        parsed !== null && typeof parsed === "object"
          ? (parsed as Record<string, unknown>)
          : {};

      const aiSummary =
        typeof obj.aiSummary === "string" && obj.aiSummary.trim().length > 0
          ? obj.aiSummary.trim()
          : MOCK_SUMMARY;

      const category =
        typeof obj.category === "string" &&
        (ALLOWED_CATEGORIES as readonly string[]).includes(obj.category)
          ? obj.category
          : MOCK_CATEGORY;

      console.log("AI enrichment succeeded");
      return { aiSummary, category };
    } catch {
      console.log("AI enrichment failed, using mock in catch statement");
      return { aiSummary: MOCK_SUMMARY, category: MOCK_CATEGORY };
    }
  },
});