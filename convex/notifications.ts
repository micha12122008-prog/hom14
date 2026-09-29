import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Отримує всі сповіщення для поточного користувача
 */
export const getNotifications = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_receiver", (q) => q.eq("receiverId", userId))
      .order("desc")
      .collect();

    if (notifications.length === 0) return [];

    const notificationsWithInfo = await Promise.all(
      notifications.map(async (notification) => {
        const sender = await ctx.db.get(notification.senderId);
        if (!sender) return null;

        let post = null;
        if (notification.postId) {
          post = await ctx.db.get(notification.postId);
        }

        let comment = null;
        if (notification.type === "comment" && notification.commentId) {
          comment = await ctx.db.get(notification.commentId);
        }

        return {
          ...notification,
          sender: {
            _id: sender._id,
            username: sender.username ?? sender.name ?? "user",
            image:
              sender.image ??
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
          },
          post: post
            ? {
                _id: post._id,
                imageUrl: post.imageUrl,
              }
            : null,
          comment: comment?.content,
        };
      }),
    );

    return notificationsWithInfo.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );
  },
});

export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized: Неавторизований доступ");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Сповіщення не знайдено");
    }

    // Перевірка безпеки: чи належить сповіщення поточному користувачу
    if (notification.receiverId !== userId) {
      throw new Error("Ви можете видаляти лише власні сповіщення");
    }

    await ctx.db.delete(args.notificationId);

    return { success: true };
  },
});