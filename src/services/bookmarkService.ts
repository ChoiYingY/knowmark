import { api } from "../../convex/_generated/api";

export const listBookmarksQuery = api.bookmarks.listBookmarks;
export const listBookmarksWithRemindersQuery = api.bookmarks.listBookmarksWithReminders;
export const getByNormalizedUrlQuery = api.bookmarks.getByNormalizedUrl;
export const createBookmarkMutation = api.bookmarks.createBookmark;
export const fetchPageTitleAction = api.bookmarkActions.fetchPageTitle;
export const deleteBookmarkMutation = api.bookmarks.deleteBookmark;
export const updateBookmarkTitleMutation = api.bookmarks.updateBookmarkTitle;
export const previewEnrichmentAction = api.openaiEnrichmentActions.getPreviewEnrichment;
export const scheduleReminderEmailMutation = api.email.scheduleEmail
export const cancelReminderEmailMutation = api.email.cancelScheduledEmail;