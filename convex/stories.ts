import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const STORY_DURATION_MS = 24 * 60 * 60 * 1000; // 24 години

/**
 * Генерує тимчасове посилання для завантаження зображення історії
 */
export const generateUploadUrl = mutation(async (ctx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Unauthorized: Неавторизований доступ");
  }
  return await ctx.storage.generateUploadUrl();
});

/**
 * Створює нову історію в базі даних
 */
export const createStory = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized: Неавторизований доступ");
    }

    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      throw new Error("Не вдалося отримати посилання на зображення");
    }

    return await ctx.db.insert("stories", {
      userId,
      imageUrl,
      storageId: args.storageId,
      expiresAt: Date.now() + STORY_DURATION_MS,
      views: 0,
    });
  },
});

/**
 * Отримує активні історії конкретного користувача за його ID
 */
export const getStoriesByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db
      .query("stories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .collect();
  },
});

/**
 * Збільшує лічильник переглядів історії
 */
export const incrementViews = mutation({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story) throw new Error("Історію не знайдено");
    
    await ctx.db.patch(args.storyId, {
      views: story.views + 1,
    });
  },
});