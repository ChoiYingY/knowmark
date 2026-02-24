import { api } from "../../convex/_generated/api";

export const listBookmarksQuery = api.bookmarks.listBookmarks;
export const listBookmarksWithRemindersQuery = api.bookmarks.listBookmarksWithReminders;
export const getByNormalizedUrlQuery = api.bookmarks.getByNormalizedUrl;
export const createBookmarkMutation = api.bookmarks.createBookmark;
export const updateReminderMutation = api.bookmarks.updateReminder;
export const fetchPageTitleAction = api.bookmarkActions.fetchPageTitle;
export const deleteBookmarkMutation = api.bookmarks.deleteBookmark;
export const updateBookmarkTitleMutation = api.bookmarks.updateBookmarkTitle;