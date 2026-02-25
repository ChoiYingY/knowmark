// import { v } from "convex/values";
// import { action } from "./_generated/server";

// const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
// const DEFAULT_FROM_NAME = "Knowmark";

// type SendEmailArgs = {
//   to: string;
//   subject: string;
//   text?: string;
//   html?: string;
// };

// type SendEmailResult = {
//   ok: true;
// };

// async function sendEmailImpl(args: SendEmailArgs): Promise<SendEmailResult> {
//   if (!args.text && !args.html) {
//     throw new Error("sendEmail: at least one of 'text' or 'html' is required");
//   }

//   const apiKey = process.env.SENDGRID_API_KEY;
//   if (!apiKey) {
//     throw new Error("sendEmail: SENDGRID_API_KEY is not configured");
//   }

//   const fromEmail = process.env.SENDGRID_FROM_EMAIL;
//   if (!fromEmail) {
//     throw new Error("sendEmail: SENDGRID_FROM_EMAIL is not configured");
//   }

//   const fromName = process.env.SENDGRID_FROM_NAME ?? DEFAULT_FROM_NAME;

//   const content: Array<{ type: string; value: string }> = [];
//   if (args.text) {
//     content.push({ type: "text/plain", value: args.text });
//   }
//   if (args.html) {
//     content.push({ type: "text/html", value: args.html });
//   }

//   const body = {
//     personalizations: [{ to: [{ email: args.to }] }],
//     from: { email: fromEmail, name: fromName },
//     subject: args.subject,
//     content,
//   };

//   const response = await fetch(SENDGRID_API_URL, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": `Bearer ${apiKey}`,
//     },
//     body: JSON.stringify(body),
//   });

//   if (response.ok) {
//     console.log("SendGrid: email sent successfully");
//     return { ok: true };
//   }

//   const errorBody = await response.text();
//   throw new Error("SendGrid error " + response.status + ": " + errorBody);
// }

// export const sendEmail = action({
//   args: {
//     to: v.string(),
//     subject: v.string(),
//     text: v.string(),
//     html: v.optional(v.string()),
//   },
//   handler: async (_ctx, args): Promise<SendEmailResult> => {
//     return sendEmailImpl(args);
//   },
// });

// export const sendTestEmail = action({
//   args: {
//     to: v.string(),
//   },
//   handler: async (_ctx, args): Promise<SendEmailResult> => {
//     return sendEmailImpl({
//       to: args.to,
//       subject: "[Test] Bookmark Recall Email",
//       text: "This is a test email from Bookmark Recall. If you received this, SendGrid is working correctly.",
//       html: "<p>This is a <strong>test email</strong> from Bookmark Recall. If you received this, SendGrid is working correctly.</p>",
//     });
//   },
// });