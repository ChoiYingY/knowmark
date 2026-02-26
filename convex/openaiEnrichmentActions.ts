import { v } from "convex/values";
import { action } from "./_generated/server";

const ALLOWED_CATEGORIES = [
  "AI & Tech",
  "Career",
  "Learning",
  "Health",
  "Productivity",
  "Finance",
  "Uncategorized",
] as const;

const ALLOWED_BEST_TIMES = ["today", "this_week", "weekend", "later"] as const;
const ALLOWED_EFFORTS = ["short", "medium", "long"] as const;

type Category = (typeof ALLOWED_CATEGORIES)[number];
type BestTime = (typeof ALLOWED_BEST_TIMES)[number];
type Effort = (typeof ALLOWED_EFFORTS)[number];

/* Mock data */
const MOCK_SUMMARY = "A useful resource saved for later reading.";
const MOCK_CATEGORY: Category = "Uncategorized";
const MOCK_WHY_USEFUL = "Worth revisiting to explore the key ideas in more depth.";
const MOCK_BEST_TIME: BestTime = "later";
const MOCK_EFFORT: Effort = "medium";
const OPENAI_MODEL = "gpt-4o-mini";

type PreviewEnrichmentResult = {
  aiSummary: string;
  whyUseful: string;
  bestTime: BestTime;
  effort: Effort;
  category: Category;
}

export const getPreviewEnrichment = action({
  args: {
    url: v.string(),
    normalizedUrl: v.string(),
    title: v.string(),
  },
  handler: async (_ctx, args): Promise<PreviewEnrichmentResult> => {
    if (process.env.USE_AI !== "true") {
      return { aiSummary: MOCK_SUMMARY, whyUseful: MOCK_WHY_USEFUL, bestTime: MOCK_BEST_TIME, effort: MOCK_EFFORT, category: MOCK_CATEGORY };
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return { aiSummary: MOCK_SUMMARY, whyUseful: MOCK_WHY_USEFUL, bestTime: MOCK_BEST_TIME, effort: MOCK_EFFORT, category: MOCK_CATEGORY };
    }

    try {
      const prompt = `You are a bookmark enrichment assistant for an ADHD-friendly reading queue.

      You ONLY know the Title and URL below. Do NOT browse the web. Do NOT invent specifics that are not strongly implied by the title/URL.
      Your job is to output ONE JSON object with EXACTLY these five fields and NOTHING else:

      1) "aiSummary" (max 20 words)
      - Objective description of what the link is (topic + format if obvious: article, docs, video, repo, paper, tool).
      - MUST NOT include personal value language (no “useful”, “worth”, “helpful”, “you should”, etc.).

      2) "whyUseful" (max 20 words)
      - Practical future use-case: when the user would revisit and what outcome they'll get.
      - MUST be different from aiSummary (no rephrasing). Focus on “when/why to use it”, not “what it is”.
      - Start with “Revisit when…” OR “Use this to…” (pick one).

      3) "bestTime" (choose EXACTLY ONE token)
      - today: time-sensitive, urgent action/decision, deadline/event/announcement implied.
      - this_week: actionable task to do soon (setup, implementation, applying advice) but not urgent today.
      - weekend: deep focus / longform / learning-heavy (papers, long essays, courses, book chapters).
      - later: evergreen reference, inspiration, “maybe someday”, or uncertain urgency.
      MUST be exactly one of: today, this_week, weekend, later

      4) "effort" (choose EXACTLY ONE token)
      Estimate time-to-consume:
      - short: <= 5 minutes (quick reference, short post, single page, short clip)
      - medium: 5-15 minutes (typical article, docs section, tutorial page)
      - long: > 20 minutes (paper, long tutorial, video/podcast, multi-page docs)
      MUST be exactly one of: short, medium, long

      5) "category"
      Choose the single best category match based on title/URL intent.
      MUST be exactly one of: ${ALLOWED_CATEGORIES.map((c) => `"${c}"`).join(", ")}
      If unclear, pick the most general/neutral option in the list (e.g., "Uncategorized" if present).

      Title: ${args.title}
      URL: ${args.url}

      Hard requirements:
      - Respond with ONLY valid JSON (double quotes, no trailing commas).
      - No markdown. No explanation. No extra keys.
      - If unsure about urgency, set bestTime="later". If unsure about effort, set effort="medium".

      Respond with ONLY valid JSON. No markdown. No explanation. No extra fields.`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

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
            max_tokens: 256,

            response_format: {
              type: "json_schema",
              json_schema: {
                name: "bookmark_enrichment",
                strict: true,
                schema: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    aiSummary: { type: "string" },
                    whyUseful: { type: "string" },
                    bestTime: { type: "string", enum: [...ALLOWED_BEST_TIMES] },
                    effort: { type: "string", enum: [...ALLOWED_EFFORTS] },
                    category: { type: "string", enum: [...ALLOWED_CATEGORIES] },
                  },
                  required: ["aiSummary", "whyUseful", "bestTime", "effort", "category"],
                },
              },
            },
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        console.log("AI enrichment failed, using mock after fetch call");
        return { aiSummary: MOCK_SUMMARY, whyUseful: MOCK_WHY_USEFUL, bestTime: MOCK_BEST_TIME, effort: MOCK_EFFORT, category: MOCK_CATEGORY };
      }

      const data = await response.json() as {
        choices?: Array<{
          message?: { content?: string };
        }>;
      };

      const rawText = data.choices?.[0]?.message?.content;

      if (!rawText) {
        console.log("AI enrichment failed, using mock here");
        return { aiSummary: MOCK_SUMMARY, whyUseful: MOCK_WHY_USEFUL, bestTime: MOCK_BEST_TIME, effort: MOCK_EFFORT, category: MOCK_CATEGORY };
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
        return { aiSummary: MOCK_SUMMARY, whyUseful: MOCK_WHY_USEFUL, bestTime: MOCK_BEST_TIME, effort: MOCK_EFFORT, category: MOCK_CATEGORY };
      }

      const obj =
        parsed !== null && typeof parsed === "object"
          ? (parsed as Record<string, unknown>)
          : {};

      const aiSummary =
        typeof obj.aiSummary === "string" && obj.aiSummary.trim().length > 0
          ? obj.aiSummary.trim()
          : MOCK_SUMMARY;

      const category: Category =
        typeof obj.category === "string" &&
        (ALLOWED_CATEGORIES as readonly string[]).includes(obj.category)
          ? (obj.category as Category)
          : MOCK_CATEGORY;

      const whyUseful =
        typeof obj.whyUseful === "string" && obj.whyUseful.trim().length > 0
          ? obj.whyUseful.trim()
          : MOCK_WHY_USEFUL;

      const bestTime: BestTime =
        typeof obj.bestTime === "string" &&
        (ALLOWED_BEST_TIMES as readonly string[]).includes(obj.bestTime)
          ? (obj.bestTime as BestTime)
          : MOCK_BEST_TIME;

      const effort: Effort =
        typeof obj.effort === "string" &&
        (ALLOWED_EFFORTS as readonly string[]).includes(obj.effort)
          ? (obj.effort as Effort)
          : MOCK_EFFORT;

      console.log("AI enrichment succeeded");
      return { aiSummary, whyUseful, bestTime, effort, category };
    } catch {
      console.log("AI enrichment failed, using mock in catch statement");
      return { aiSummary: MOCK_SUMMARY, whyUseful: MOCK_WHY_USEFUL, bestTime: MOCK_BEST_TIME, effort: MOCK_EFFORT, category: MOCK_CATEGORY };
    }
  },
});