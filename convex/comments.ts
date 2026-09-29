import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api"; // ✅ ДОДАТИ ІМПОРТ

export const addComment = mutation({
  args: {
    content: v.string(),
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized: Неавторизований доступ");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) throw new ConvexError("Пост не знайдено");

    // 1. Зберігаємо коментар
    const commentId = await ctx.db.insert("comments", {
      userId,
      postId: args.postId,
      content: args.content,
    });

    // 2. Збільшуємо лічильник коментарів у пості
    await ctx.db.patch(args.postId, {
      comments: post.comments + 1,
    });

    // 3. Створюємо сповіщення автору посту (якщо коментує інший користувач)
    if (post.userId !== userId) {
      await ctx.db.insert("notifications", {
        receiverId: post.userId,
        senderId: userId,
        type: "comment",
        postId: args.postId,
        commentId,
      });

      // ✅ ДОДАТИ: відправка push-сповіщення автору посту
      const receiver = await ctx.db.get(post.userId);
      const sender = await ctx.db.get(userId);

      if (receiver?.pushToken && sender) {
        const senderName =
          sender.fullname ?? sender.username ?? sender.name ?? "Хтось";

        await ctx.scheduler.runAfter(
          0,
          internal.pushNotifications.sendPushNotification,
          {
            pushToken: receiver.pushToken,
            title: "Новий коментар ",                                                     //додати смайлик
            body: `${senderName}: ${args.content}`,
            data: {
              type: "comment",
              postId: args.postId,
            },
          },
        );
      }
    }

    return commentId;
  },
});

/**
 * Отримує всі коментарі до поста разом з даними профілів авторів
 */
export const getComments = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    // Шукаємо всі коментарі за індексом "by_post"
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    if (comments.length === 0) return [];

    // Завантажуємо профілі авторів паралельно
    const commentsWithUsers = await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId);
        return {
          ...comment,
          user: {
            fullname: user?.fullname ?? user?.name ?? "Користувач",
            image:
              user?.image ??
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
          },
        };
      })
    );

    return commentsWithUsers;
  },
});

/**
 * Видаляє коментар, оновлює лічильник у пості та підчищає сповіщення
 */
export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized: Неавторизований доступ");
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new ConvexError("Коментар не знайдено");

    // Перевірка на власника коментаря
    if (comment.userId !== userId) {
      throw new ConvexError("Ви можете видаляти лише власні коментарі");
    }

    // 1. Видаляємо сам коментар
    await ctx.db.delete(args.commentId);

    // 2. Зменшуємо лічильник коментарів у пості
    const post = await ctx.db.get(args.postId);
    if (post && post.comments > 0) {
      await ctx.db.patch(args.postId, {
        comments: post.comments - 1,
      });
    }

    // 3. Видаляємо пов'язане сповіщення, щоб не залишати "битих" посилань
    const notifications = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("commentId"), args.commentId))
      .collect();

    for (const notif of notifications) {
      await ctx.db.delete(notif._id);
    }

    return true;
  },
});