import { v } from "convex/values";
import { action, mutation, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const DEFAULT_FROM_NAME = "Knowmark";

type SendEmailArgs = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

type SendEmailResult = {
  ok: true;
};

async function sendEmailImpl(args: SendEmailArgs): Promise<SendEmailResult> {
  if (!args.text && !args.html) {
    throw new Error("sendEmail: at least one of 'text' or 'html' is required");
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

  const content: Array<{ type: string; value: string }> = [];
  if (args.text) {
    content.push({ type: "text/plain", value: args.text });
  }
  if (args.html) {
    content.push({ type: "text/html", value: args.html });
  }

  const body = {
    personalizations: [{ to: [{ email: args.to }] }],
    from: { email: fromEmail, name: fromName },
    subject: args.subject,
    content,
  };

  const response = await fetch(SENDGRID_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
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

    const title = bookmark.title || bookmark.url;
    const summaryLine = bookmark.aiSummary ? `\n\nSummary: ${bookmark.aiSummary}` : "";

    const textBody =
      `You asked to be reminded about:\n\n` +
      `${title}\n` +
      `${bookmark.url}` +
      summaryLine;

    const htmlBody =
      `<p>You asked to be reminded about:</p>` +
      `<p><strong><a href="${bookmark.url}">${title}</a></strong></p>` +
      (bookmark.aiSummary ? `<p><em>${bookmark.aiSummary}</em></p>` : "");

    try {
      await ctx.runAction(api.email.sendEmail, {
        to: bookmark.reminderEmail,
        subject: `Reminder: ${title}`,
        text: textBody,
        html: htmlBody,
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