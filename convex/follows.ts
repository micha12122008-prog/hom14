import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api"; // ✅ ДОДАТИ ІМПОРТ

/**
 * Перевіряє, чи підписаний поточний користувач на іншого користувача
 */
export const isFollowing = query({
  args: { followingId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const follow = await ctx.db
      .query("follows")
      .withIndex("by_both", (q) =>
        q.eq("followerId", userId).eq("followingId", args.followingId),
      )
      .first();

    return !!follow;
  },
});

/**
 * Перемикає підписку (Follow/Unfollow), оновлює лічильники та створює сповіщення
 */
export const toggleFollow = mutation({
  args: { followingId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized: Неавторизований доступ");
    }

    if (userId === args.followingId) {
      throw new Error("Ви не можете підписатися на самого себе");
    }

    const follower = await ctx.db.get(userId);
    const following = await ctx.db.get(args.followingId);
    if (!following) {
      throw new Error("Користувача не знайдено");
    }

    const existingFollow = await ctx.db
      .query("follows")
      .withIndex("by_both", (q) =>
        q.eq("followerId", userId).eq("followingId", args.followingId),
      )
      .first();

    if (existingFollow) {
      // Відписка (Unfollow)
      await ctx.db.delete(existingFollow._id);

      await ctx.db.patch(userId, {
        following: Math.max(0, (follower?.following ?? 1) - 1),
      });
      await ctx.db.patch(args.followingId, {
        followers: Math.max(0, (following.followers ?? 1) - 1),
      });

      return false;
    } else {
      // Підписка (Follow)
      await ctx.db.insert("follows", {
        followerId: userId,
        followingId: args.followingId,
      });

      await ctx.db.patch(userId, {
        following: (follower?.following ?? 0) + 1,
      });
      await ctx.db.patch(args.followingId, {
        followers: (following.followers ?? 0) + 1,
      });

      // Сповіщення в базу даних
      await ctx.db.insert("notifications", {
        type: "follow",
        receiverId: args.followingId,
        senderId: userId,
      });

      // ✅ ДОДАТИ: відправка push-сповіщення новому автору
      if (following.pushToken && follower) {
        const followerName =
          follower.fullname ?? follower.username ?? follower.name ?? "Хтось";

        await ctx.scheduler.runAfter(
          0,
          internal.pushNotifications.sendPushNotification,
          {
            pushToken: following.pushToken,
            title: "Новий підписник ;",               //додати смайлик
            body: `${followerName} почав(-ла) стежити за вами`,
            data: {
              type: "follow",
              userId: follower._id,
            },
          },
        );
      }

      return true;
    }
  },
});