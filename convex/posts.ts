import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";

/**
 * Генерує тимчасове посилання для завантаження файлу в Convex Storage
 */
export const generateUploadUrl = mutation(async (ctx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Unauthorized: Неавторизований доступ");
  }
  return await ctx.storage.generateUploadUrl();
});

/**
 * Зберігає пост у БД та оновлює кількість постів у профілі користувача
 */
export const createPost = mutation({
  args: {
    caption: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    audioStorageId: v.optional(v.id("_storage")),
    audioDuration: v.optional(v.number()),
    // Нові поля:
    videoStorageId: v.optional(v.id("_storage")),
    videoDuration: v.optional(v.number()),
    isVideoNote: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized: Неавторизований доступ");
    }

    const currentUser = await ctx.db.get(userId);
    if (!currentUser) {
      throw new Error("User not found: Користувача не знайдено");
    }

    // Отримуємо URL фотографії (якщо передано)
    let imageUrl: string | undefined = undefined;
    if (args.storageId) {
      imageUrl = (await ctx.storage.getUrl(args.storageId)) ?? undefined;
    }

    // Отримуємо URL аудіозапису (якщо передано)
    let audioUrl: string | undefined = undefined;
    if (args.audioStorageId) {
      audioUrl = (await ctx.storage.getUrl(args.audioStorageId)) ?? undefined;
    }

    // Отримуємо URL відеокружечка (якщо передано)
    let videoUrl: string | undefined = undefined;
    if (args.videoStorageId) {
      videoUrl = (await ctx.storage.getUrl(args.videoStorageId)) ?? undefined;
    }

    // Перевіряємо, що пост містить хоча б один тип медіа
    if (!imageUrl && !videoUrl) {
      throw new Error("Помилка: пост повинен містити зображення або відеокружечок.");
    }

    // Вставляємо пост в таблицю "posts"
    const postId = await ctx.db.insert("posts", {
      userId,
      imageUrl,
      storageId: args.storageId,
      caption: args.caption,
      likes: 0,
      comments: 0,
      audioUrl,
      audioStorageId: args.audioStorageId,
      audioDuration: args.audioDuration,
      videoUrl,
      videoStorageId: args.videoStorageId,
      videoDuration: args.videoDuration,
      isVideoNote: args.isVideoNote,
    });

    // Збільшуємо лічильник публікацій у користувача
    await ctx.db.patch(userId, {
      posts: (currentUser.posts ?? 0) + 1,
    });

    return postId;
  },
});


export const getPosts = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    // Отримуємо всі пости, відсортовані за часом створення (спочатку найновіші)
    const posts = await ctx.db.query("posts").order("desc").collect();

    if (posts.length === 0) return [];

    const postsWithInfo = await Promise.all(
      posts.map(async (post) => {
        const postAuthor = await ctx.db.get(post.userId);

        // Перевіряємо, чи поточний користувач лайкнув цей пост
        const like = await ctx.db
          .query("likes")
          .withIndex("by_user_and_post", (q) =>
            q.eq("userId", userId).eq("postId", post._id),
          )
          .first();

        // Перевіряємо, чи пост збережено у закладках
        const bookmark = await ctx.db
          .query("bookmarks")
          .withIndex("by_both", (q) =>
            q.eq("userId", userId).eq("postId", post._id),
          )
          .first();

        return {
          ...post,
          author: {
            _id: postAuthor?._id,
            username: postAuthor?.username ?? postAuthor?.name ?? "користувач",
            image:
              postAuthor?.image ??
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
          },
          isLiked: !!like,
          isBookmarked: !!bookmark,
        };
      }),
    );

    return postsWithInfo;
  },
});

/**
 * Видаляє пост та всі пов'язані з ним сутності (лайки, коментарі, закладки, файли)
 */
export const deletePost = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Ви повинні увійти, щоб видалити пост");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found: Пост не знайдено");
    }

    if (post.userId !== userId) {
      throw new Error("Forbidden: Ви можете видаляти лише власні пости");
    }

    // 1. Видаляємо фотографію зі сховища
    if (post.storageId) {
      try {
        await ctx.storage.delete(post.storageId);
      } catch (error) {
        console.warn("Не вдалося видалити зображення зі сховища:", error);
      }
    }

    // 2. Видаляємо аудіофайл зі сховища
    if (post.audioStorageId) {
      try {
        await ctx.storage.delete(post.audioStorageId);
      } catch (error) {
        console.warn("Не вдалося видалити аудіофайл зі сховища:", error);
      }
    }

    // 3. Видаляємо відеокружечок зі сховища
    if (post.videoStorageId) {
      try {
        await ctx.storage.delete(post.videoStorageId);
      } catch (error) {
        console.warn("Не вдалося видалити відеофайл зі сховища:", error);
      }
    }

    // 4. Каскадне видалення лайків, коментарів, закладок
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const bookmark of bookmarks) {
      await ctx.db.delete(bookmark._id);
    }

    // 5. Видаляємо сам пост
    await ctx.db.delete(args.postId);

    // 6. Зменшуємо лічильник публікацій
    const currentUser = await ctx.db.get(userId);
    if (currentUser && (currentUser.posts ?? 0) > 0) {
      await ctx.db.patch(userId, {
        posts: currentUser.posts! - 1,
      });
    }

    return true;
  },
});

export const getPostById = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return null;

    const author = await ctx.db.get(post.userId);
    const userId = await getAuthUserId(ctx);

    let isLiked = false;
    let isBookmarked = false;

    if (userId) {
      const like = await ctx.db
        .query("likes")
        .withIndex("by_user_and_post", (q) =>
          q.eq("userId", userId).eq("postId", post._id),
        )
        .first();
      isLiked = !!like;

      const bookmark = await ctx.db
        .query("bookmarks")
        .withIndex("by_both", (q) =>
          q.eq("userId", userId).eq("postId", post._id),
        )
        .first();
      isBookmarked = !!bookmark;
    }

    return {
      ...post,
      author: {
        _id: author?._id,
        username: author?.username ?? author?.name ?? "user",
        image:
          author?.image ??
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
      },
      isLiked,
      isBookmarked,
    };
  },
});

export const getPostsByUser = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    const targetUserId = args.userId ?? currentUserId;
    
    if (!targetUserId) return [];

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .order("desc")
      .collect();

    if (posts.length === 0) return [];

    // Підтягуємо дані автора, лайки та закладки для кожного поста
    const postsWithInfo = await Promise.all(
      posts.map(async (post) => {
        const postAuthor = await ctx.db.get(post.userId);

        let isLiked = false;
        let isBookmarked = false;

        if (currentUserId) {
          const like = await ctx.db
            .query("likes")
            .withIndex("by_user_and_post", (q) =>
              q.eq("userId", currentUserId).eq("postId", post._id)
            )
            .first();
          isLiked = !!like;

          const bookmark = await ctx.db
            .query("bookmarks")
            .withIndex("by_both", (q) =>
              q.eq("userId", currentUserId).eq("postId", post._id)
            )
            .first();
          isBookmarked = !!bookmark;
        }

        return {
          ...post,
          author: {
            _id: postAuthor?._id,
            username: postAuthor?.username ?? postAuthor?.name ?? "користувач",
            image:
              postAuthor?.image ??
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
          },
          isLiked,
          isBookmarked,
        };
      })
    );

    return postsWithInfo;
  },
});

export const getPaginatedPosts = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    // 1. Завантажуємо порцію постів за курсором (наприклад, 5 або 10 штук)
    const paginated = await ctx.db
      .query("posts")
      .order("desc")
      .paginate(args.paginationOpts);

    if (paginated.page.length === 0) {
      return paginated;
    }

    // 2. Збагачуємо інформацією ТІЛЬКИ пости поточної завантаженої сторінки!
    const postsWithInfo = await Promise.all(
      paginated.page.map(async (post) => {
        const postAuthor = await ctx.db.get(post.userId);

        const like = await ctx.db
          .query("likes")
          .withIndex("by_user_and_post", (q) =>
            q.eq("userId", userId).eq("postId", post._id),
          )
          .first();

        const bookmark = await ctx.db
          .query("bookmarks")
          .withIndex("by_both", (q) =>
            q.eq("userId", userId).eq("postId", post._id),
          )
          .first();

        return {
          ...post,
          author: {
            _id: postAuthor?._id,
            username:
              postAuthor?.username ??
              postAuthor?.name ??
              "користувач",
            image:
              postAuthor?.image ??
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
          },
          isLiked: !!like,
          isBookmarked: !!bookmark,
        };
      }),
    );

    return {
      ...paginated,
      page: postsWithInfo,
    };
  },
});

export const getPaginatedPostsByUser = query({
  args: {
    userId: v.optional(v.id("users")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    // Якщо передано конкретний userId — шукаємо за ним, інакше за поточним користувачем
    const userId = args.userId ?? (await getAuthUserId(ctx));
    if (!userId) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    // Завантажуємо порцію публікацій за індексом "by_user" у зворотньому хронологічному порядку
    return await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});