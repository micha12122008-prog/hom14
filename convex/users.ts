import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

/**
 * Запит для отримання профілю поточного авторизованого користувача
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    // Отримуємо ID користувача із сесії Convex Auth
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    // Завантажуємо документ користувача з таблиці "users"
    return await ctx.db.get(userId);
  },
});

/**
 * Мутація для оновлення профілю користувача
 */
export const updateUserProfile = mutation({
  args: {
    username: v.optional(v.string()),
    fullname: v.optional(v.string()),
    bio: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized: Користувач не авторизований");
    }

    const patchData: any = {};
    if (args.username !== undefined) patchData.username = args.username.trim();
    if (args.fullname !== undefined) patchData.fullname = args.fullname.trim();
    if (args.bio !== undefined) patchData.bio = args.bio.trim();

    if (args.imageStorageId) {
      const imageUrl = await ctx.storage.getUrl(args.imageStorageId);
      if (imageUrl) {
        patchData.image = imageUrl;
      }
    }

    await ctx.db.patch(userId, patchData);
    return { success: true };
  },
});

export const getStoriesUsers = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const currentUser = await ctx.db.get(userId);
    if (!currentUser) return null;

    const now = Date.now();

    // Завантажуємо список людей, на яких підписаний поточний користувач
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", userId))
      .collect();

    const followingUsers = await Promise.all(
      follows.map((f) => ctx.db.get(f.followingId))
    );

    // Допоміжна функція для перевірки наявності активної історії
    const hasActiveStory = async (uId: Id<"users">) => {
      const story = await ctx.db
        .query("stories")
        .withIndex("by_user", (q) => q.eq("userId", uId))
        .filter((q) => q.gt(q.field("expiresAt"), now))
        .first();
      return !!story;
    };

    const currentUserHasStory = await hasActiveStory(userId);

    // Формуємо масив користувачів для рендерингу історій
    const storiesList = [
      {
        id: userId,
        username: "You",
        avatar: currentUser.image ?? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
        hasStory: currentUserHasStory,
      },
      ...(await Promise.all(
        followingUsers
          .filter((user): user is NonNullable<typeof user> => user !== null)
          .map(async (user) => ({
            id: user._id,
            username: user.username ?? user.name ?? "user",
            avatar: user.image ?? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
            hasStory: await hasActiveStory(user._id),
          }))
      )),
    ];

    return storiesList;
  },
});

export const getUserProfile = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const savePushToken = mutation({
  args: {
    pushToken: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized: Неавторизований доступ");
    }

    // Зберігаємо актуальний токен у записі користувача
    await ctx.db.patch(userId, {
      pushToken: args.pushToken,
    });

    return { success: true };
  },
});