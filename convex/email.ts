import { v } from "convex/values";
import { action, mutation, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const DEFAULT_FROM_NAME = "Knowmark";
const DEFAULT_REMINDER_TEMPLATE_ID = "d-b5a7d1323aec4fd78f15734d92434732";
const DEFAULT_URL = "https://4e6f74ca-2d4d-4db3-b0bd-e5c107297416.preview.vibeflow.ai/";

export type ReminderEmailParams = {
  bookmarkTitle: string;
  bookmarkUrl: string;
  summary: string;
  whyUseful: string;
  category: string;
  effortText: string;
  bestTimeLabel: string;
  reminderUrl: string;
  teamEmail: string;
};

export type ReminderTemplateData = ReminderEmailParams;

export function subjectFromParams(p: ReminderEmailParams) {
  const effort = (p.effortText ?? "").trim();
  return effort
    ? `Reading reminder: ${p.bookmarkTitle} (${effort})`
    : `Reading reminder: ${p.bookmarkTitle}`;
}

type SendEmailArgs = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: ReminderTemplateData;
};

type SendEmailResult = {
  ok: true;
};

async function sendEmailImpl(args: SendEmailArgs): Promise<SendEmailResult> {
  const usingTemplate = !!args.templateId;

  if (!usingTemplate && !args.text && !args.html) {
    throw new Error("sendEmail: at least one of 'text' or 'html' is required when no templateId is provided");
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error("sendEmail: SENDGRID_API_KEY is not configured");
  }

  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (!fromEmail) {
    throw new Error("sendEmail: SENDGRID_FROM_EMAIL is not configured");
  }

  const fromName = process.env.SENDGRID_FROM_NAME ?? DEFAULT_FROM_NAME;

  const personalization: {
    to: Array<{ email: string }>;
    dynamic_template_data?: ReminderTemplateData;
  } = {
    to: [{ email: args.to }],
  };

  if (usingTemplate && args.dynamicTemplateData) {
    personalization.dynamic_template_data = args.dynamicTemplateData;
  }

  const body: Record<string, unknown> = {
    personalizations: [personalization],
    from: { email: fromEmail, name: fromName },
  };

  if (usingTemplate) {
    body.template_id = args.templateId;
    // Some templates define subject internally. Keeping subject here is harmless and can help if your template doesn't override it.
    body.subject = args.subject;
  } else {
    const content: Array<{ type: string; value: string }> = [];
    if (args.text) {
      content.push({ type: "text/plain", value: args.text });
    }
    if (args.html) {
      content.push({ type: "text/html", value: args.html });
    }

    body.subject = args.subject;
    body.content = content;
  }

  const response = await fetch(SENDGRID_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    console.log("SendGrid: email sent successfully");
    return { ok: true };
  }

  const errorBody = await response.text();
  throw new Error("SendGrid error " + response.status + ": " + errorBody);
}

export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    text: v.optional(v.string()),
    html: v.optional(v.string()),
    templateId: v.optional(v.string()),
    dynamicTemplateData: v.optional(
      v.object({
        bookmarkTitle: v.string(),
        bookmarkUrl: v.string(),
        summary: v.string(),
        whyUseful: v.string(),
        category: v.string(),
        effortText: v.string(),
        bestTimeLabel: v.string(),
        reminderUrl: v.string(),
        teamEmail: v.string(),
      })
    ),
  },
  handler: async (_ctx, args): Promise<SendEmailResult> => {
    return sendEmailImpl(args);
  },
});

/* helpers for triggerReminderEmail */
export const getBookmarkForReminder = internalQuery({
  args: {
    bookmarkId: v.id("bookmarks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.bookmarkId);
  },
});

export const patchReminderAfterTrigger = internalMutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    status: v.union(v.literal("sent"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.bookmarkId, {
      reminderStatus: args.status,
      reminderScheduledId: undefined,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const triggerReminderEmail = internalAction({
  args: {
    bookmarkId: v.id("bookmarks"),
    reminderAt: v.number(),
  },
  handler: async (ctx, args) => {
    console.log("triggerReminderEmail: fired for bookmarkId", args.bookmarkId);

    const bookmark = await ctx.runQuery(internal.email.getBookmarkForReminder, {
      bookmarkId: args.bookmarkId,
    });

    if (!bookmark) {
      console.log("triggerReminderEmail: bookmark not found, skipping", args.bookmarkId);
      return;
    }

    // Stale-job guard: exits safely if this scheduled job no longer matches the
    // active reminder. This prevents old jobs from sending after reschedule or cancel.
    if (
      !bookmark.reminderScheduledId ||
      bookmark.reminderStatus !== "scheduled" ||
      bookmark.reminderAt !== args.reminderAt
    ) {
      console.log("triggerReminderEmail: stale job detected, skipping send", args.bookmarkId);
      return;
    }

    if (!bookmark.reminderEmail) {
      console.log("triggerReminderEmail: no reminderEmail set, marking failed", args.bookmarkId);
      await ctx.runMutation(internal.email.patchReminderAfterTrigger, {
        bookmarkId: args.bookmarkId,
        status: "failed",
      });
      return;
    }

    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    if (!fromEmail) {
      throw new Error("sendEmail: SENDGRID_FROM_EMAIL is not configured");
    }

    // Resolve template id — throw clearly if not configured at all
    const reminderTemplateId =
      process.env.SENDGRID_REMINDER_TEMPLATE_ID ?? DEFAULT_REMINDER_TEMPLATE_ID;
    if (!reminderTemplateId) {
      throw new Error(
        "triggerReminderEmail: template id not configured (set SENDGRID_REMINDER_TEMPLATE_ID env var or DEFAULT_REMINDER_TEMPLATE_ID constant)"
      );
    }

    // ----------------------------
    // Dynamic template variables (SendGrid)
    // ----------------------------

    const bookmarkTitle = bookmark.title || bookmark.url;
    const bookmarkUrl = bookmark.url;

    const summary = bookmark.aiSummary?.trim() || "Saved in Knowmark for later.";

    // Keep `whyUseful` as the primary key (template expects it)
    const whyUseful =
      bookmark.whyUseful ??
      (bookmark as any).whyHelpful ?? // fallback if you ever stored it under this name
      "";

    // Category: use stored category if you have it, else fallback
    const category =
      (bookmark as any).category ??
      (bookmark as any).aiCategory ??
      "Uncategorized";

     // Best time label (template expects bestTimeLabel)
    const bestTime = (bookmark as any).bestTime ?? "later";
    const bestTimeLabel =
      bestTime === "today" ? "Today" :
      bestTime === "this_week" ? "This week" :
      bestTime === "weekend" ? "Weekend" :
      "Later";

    // Effort text (template expects effortText)
    const effort = (bookmark as any).effort ?? "short";

    // If you already store estimateLen / effortText, prefer it; else derive.
    const derivedEstimateLen =
      effort === "short" ? 5 :
      effort === "medium" ? 10 :
      effort === "long" ? 20 :
      10;

    const effortText =
      (bookmark as any).effortText ??
      `Light read: ~${(bookmark as any).estimateLen ?? derivedEstimateLen}min+`;

    // reminderUrl (template expects reminderUrl)
    const reminderUrl = process.env.PRODUCTION_URL ?? DEFAULT_URL;

    const teamEmail = process.env.SENDGRID_TEAM_EMAIL ?? fromEmail;

    try {
      await ctx.runAction(api.email.sendEmail, {
        to: bookmark.reminderEmail,
        subject: `Knowmark reminder: ${bookmarkTitle}`,
        templateId: reminderTemplateId,
        dynamicTemplateData: {
          bookmarkTitle,
          bookmarkUrl,
          summary,
          category,
          whyUseful,
          effortText,
          bestTimeLabel,
          reminderUrl,
          teamEmail,
        },
      });

      await ctx.runMutation(internal.email.patchReminderAfterTrigger, {
        bookmarkId: args.bookmarkId,
        status: "sent",
      });

      console.log("triggerReminderEmail: email sent and status updated to 'sent'", args.bookmarkId);
    } catch (e) {
      await ctx.runMutation(internal.email.patchReminderAfterTrigger, {
        bookmarkId: args.bookmarkId,
        status: "failed",
      });

      throw new Error(
        "triggerReminderEmail: sendEmail failed for bookmarkId " +
          args.bookmarkId +
          ": " +
          String(e)
      );
    }
  },
});
export const scheduleEmail = mutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    reminderAt: v.number(),
    reminderEmail: v.string(),
  },
  handler: async (ctx, args): Promise<{ ok: true; scheduledId: Id<"_scheduled_functions"> }> => {
    const bookmark = await ctx.db.get(args.bookmarkId);

    // error checking
    if (!bookmark) {
      throw new Error("scheduleEmail: bookmark not found");
    }
    if (args.reminderAt <= Date.now()) {
      throw new Error("scheduleEmail: reminderAt must be in the future");
    }
    
    if (bookmark.reminderScheduledId) {
      try {
        await ctx.scheduler.cancel(bookmark.reminderScheduledId);
      } catch (e) {
        console.log("scheduleEmail: could not cancel existing scheduled job (may have already run)", e);
      }
    }
    const scheduledId = await ctx.scheduler.runAt(
      args.reminderAt,
      internal.email.triggerReminderEmail,
      { bookmarkId: args.bookmarkId, reminderAt: args.reminderAt }
    );
    await ctx.db.patch(args.bookmarkId, {
      reminderAt: args.reminderAt,
      reminderEmail: args.reminderEmail,
      reminderStatus: "scheduled",
      reminderScheduledId: scheduledId,
      updatedAt: Date.now(),
    });
    return { ok: true, scheduledId };
  },
});

export const cancelScheduledEmail = mutation({
  args: {
    bookmarkId: v.id("bookmarks"),
  },
  handler: async (ctx, args) => {
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark) {
      throw new Error("cancelScheduledEmail: bookmark not found");
    }
    if (bookmark.reminderScheduledId) {
      try {
        await ctx.scheduler.cancel(bookmark.reminderScheduledId);
      } catch (e) {
        console.log("cancelScheduledEmail: could not cancel scheduled job (may have already run)", e);
      }
    }
    await ctx.db.patch(args.bookmarkId, {
      reminderStatus: "canceled",
      reminderScheduledId: undefined,
      reminderAt: null,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});