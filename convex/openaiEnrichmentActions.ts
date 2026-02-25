import { v } from "convex/values";
import { action } from "./_generated/server";

const MOCK_SUMMARY = "A useful resource saved for later reading.";
const MOCK_CATEGORY = "Uncategorized";
const OPENAI_MODEL = "gpt-4o-mini";

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

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return { aiSummary: MOCK_SUMMARY, category: MOCK_CATEGORY };
    }

    try {
      const prompt = `You are a bookmark categorizer. Given a URL and title, return a JSON object with exactly two fields:
- "aiSummary": a single sentence (max 20 words) describing what this bookmark is about
- "category": one of these exact values: ${ALLOWED_CATEGORIES.join(", ")}

Title: ${args.title}
URL: ${args.url}

Respond with ONLY valid JSON. No markdown. No explanation.`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      let response: Response;
      try {
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 128,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        console.log("AI enrichment failed, using mock after fetch call");
        return { aiSummary: MOCK_SUMMARY, category: MOCK_CATEGORY };
      }

      const data = await response.json() as {
        choices?: Array<{
          message?: { content?: string };
        }>;
      };

      const rawText = data.choices?.[0]?.message?.content;

      if (!rawText) {
        console.log("AI enrichment failed, using mock here");
        return { aiSummary: MOCK_SUMMARY, category: MOCK_CATEGORY };
      }

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
        console.log("AI enrichment failed, using mock in parsed JSON");
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