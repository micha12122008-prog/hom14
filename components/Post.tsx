import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  Alert, 
  Animated,
  Modal,
  Pressable,
  StyleSheet
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";
import { Id } from "@/convex/_generated/dataModel";
import { CommentsModal } from "./CommentsModal";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "expo-router"; 
import { ImageViewerModal } from "./ImageViewerModal";
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing,
  withSequence,
  withSpring,
  withDelay,
  runOnJS
} from "react-native-reanimated";
import { HoldToConfirmButton } from "./HoldToConfirmButton";
import { PostAudioPlayer } from "./PostAudioPlayer";
import { VideoNotePlayer } from "./VideoNotePlayer";

export type PostProps = {
  post: {
    _id: Id<"posts">;
    imageUrl?: string;
    caption?: string;
    likes: number;
    comments: number;
    _creationTime: number;
    isLiked: boolean;
    isBookmarked: boolean;
    author: {
      _id?: Id<"users">;
      username: string;
      image: string;
    };
    audioUrl?: string;
    audioDuration?: number;
    videoUrl?: string;
    videoDuration?: number;
    isVideoNote?: boolean;
  };
};

export const Post = ({ post }: PostProps) => {
  const currentUser = useQuery(api.users.currentUser);
  const router = useRouter(); 

  // Локальні оптимістичні стани
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked);
  const [commentsCount, setCommentsCount] = useState(post.comments);
  const [showComments, setShowComments] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current; 
  const bookmarkScaleAnim = useRef(new Animated.Value(1)).current; 
  const commentScaleAnim = useRef(new Animated.Value(1)).current; 

  // Reanimated для анімації появи всього поста
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(80);

  // Reanimated для анімації великого серця по центру
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });

    translateY.value = withTiming(0, {
      duration: 2000,
      easing: Easing.out(Easing.cubic),
    });
  }, [opacity, translateY]);

  const animatedPostStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // Мутації
  const toggleLike = useMutation(api.likes.toggleLike);
  const toggleBookmark = useMutation(api.bookmarks.toggleBookmark);
  const deletePost = useMutation(api.posts.deletePost);

  // Перемикач лайка з оптимістичним оновленням та анімацією
  const handleLike = async () => {
    const nextIsLiked = !isLiked;
    const previousLikesCount = likesCount;

    setIsLiked(nextIsLiked);
    setLikesCount((prev) => (nextIsLiked ? prev + 1 : Math.max(0, prev - 1)));

    // Запускаємо анімацію пульсації лише коли користувач ставить лайк
    if (nextIsLiked) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }

    try {
      const serverIsLiked = await toggleLike({ postId: post._id });
      if (serverIsLiked !== nextIsLiked) {
        setIsLiked(serverIsLiked);
        setLikesCount((prev) => (serverIsLiked ? prev + 1 : Math.max(0, prev - 1)));
      }
    } catch (error) {
      console.error(error);
      setIsLiked(post.isLiked);
      setLikesCount(previousLikesCount);
    }
  };

  // Жест подвійного тапу
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      // Запускаємо анімацію великого серця
      heartScale.value = 0;
      heartOpacity.value = 1;
      
      heartScale.value = withSequence(
        withSpring(1.2, { damping: 6, stiffness: 200 }),
        withDelay(600, withTiming(0, { duration: 250 }))
      );
      
      heartOpacity.value = withDelay(400, withTiming(0, { duration: 200 }));

      // Якщо лайк ще не стоїть, ставимо його
      if (!isLiked) {
        runOnJS(handleLike)();
      }
    });

  // Анімовані стилі для великого серця
  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: Math.max(heartScale.value, 0) }],
    opacity: heartOpacity.value,
  }));

  // Перемикач закладки з анімацією
  const handleBookmark = async () => {
    const nextIsBookmarked = !isBookmarked;
    setIsBookmarked(nextIsBookmarked);

    if (nextIsBookmarked) {
      Animated.sequence([
        Animated.timing(bookmarkScaleAnim, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(bookmarkScaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }

    try {
      const serverIsBookmarked = await toggleBookmark({ postId: post._id });
      if (serverIsBookmarked !== nextIsBookmarked) {
        setIsBookmarked(serverIsBookmarked);
      }
    } catch (error) {
      console.error(error);
      setIsBookmarked(post.isBookmarked);
    }
  };

  // Відкриття коментарів з анімацією іконки
  const handleCommentPress = () => {
    Animated.sequence([
      Animated.timing(commentScaleAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(commentScaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    setShowComments(true);
  };

  // Обробник підтвердженого видалення
  const handleConfirmDelete = async () => {
    try {
      await deletePost({ postId: post._id });
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Помилка видалення поста:", error);
      Alert.alert("Помилка", "Не вдалося видалити публікацію.");
    }
  };

  // Безпечна перевірка на власника поста
  const isOwner = Boolean(
    currentUser?._id && 
    post.author._id && 
    currentUser._id === post.author._id
  );

  return (
    <Reanimated.View className="mb-4 bg-black" style={animatedPostStyle}>
      <View className="flex-row items-center justify-between p-3">
        <TouchableOpacity
          onPress={() => {
            if (post.author._id) {
              if (currentUser?._id === post.author._id) {
                router.push("/profile");
              } else {
                router.push({ pathname: "/user/[id]", params: { id: post.author._id } });
              }
            }
          }}
          activeOpacity={0.8}
          className="flex-row items-center"
        >
          <Image
            source={{ uri: post.author.image }}
            className="w-8 h-8 rounded-full mr-2.5 border border-surfaceLight"
          />
          <Text className="text-white text-sm font-semibold">
            {post.author.username}
          </Text>
        </TouchableOpacity>

        {isOwner && (
          <TouchableOpacity
            onPress={() => setShowDeleteModal(true)}
            className="p-1 active:opacity-70"
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Медіаконтент поста з обробником жестів */}
      <GestureDetector gesture={doubleTapGesture}>
        <View className="w-full aspect-square relative justify-center items-center bg-surface">
          {/* Медіаконтент поста: або відеокружечок, або зображення */}
          {post.videoUrl && post.isVideoNote ? (
            <VideoNotePlayer 
              videoUrl={post.videoUrl}
            />
          ) : post.imageUrl ? (
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => setIsImageViewerVisible(true)}
              className="w-full h-full"
            >
              <Image
                source={{ uri: post.imageUrl }}
                className="w-full h-full bg-surface"
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : null}
          
          {/* Анімоване серце поверх медіа */}
          <Reanimated.View 
            style={[heartAnimatedStyle, { zIndex: 10, position: 'absolute' }]}
            pointerEvents="none"
          >
            <Ionicons name="heart" size={100} color="#EF4444" />
          </Reanimated.View>
        </View>
      </GestureDetector>

      {/* Аудіодоріжка публікації (якщо додана) */}
      {post.audioUrl ? (
        <PostAudioPlayer 
          audioUrl={post.audioUrl} 
          duration={post.audioDuration} 
        />
      ) : null}

      {/* Рядок дій */}
      <View className="flex-row items-center justify-between px-3 py-3">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={handleLike} activeOpacity={0.7}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={24}
                color={isLiked ? "#EF4444" : COLORS.white}
              />
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCommentPress} activeOpacity={0.7}>
            <Animated.View style={{ transform: [{ scale: commentScaleAnim }] }}>
              <Ionicons
                name="chatbubble-outline"
                size={22}
                color={COLORS.white}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleBookmark} activeOpacity={0.7}>
          <Animated.View style={{ transform: [{ scale: bookmarkScaleAnim }] }}>
            <Ionicons
              name={isBookmarked ? "bookmark" : "bookmark-outline"}
              size={22}
              color={COLORS.white}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Інформація про пост */}
      <View className="px-3">
        <Text className="text-white text-sm font-semibold mb-1.5">
          {likesCount > 0
            ? `${likesCount.toLocaleString()} вподобань`
            : "Будьте першим, кому це сподобалося"}
        </Text>

        {post.caption ? (
          <View className="flex-row flex-wrap mb-1.5">
            <Text className="text-white text-sm font-semibold mr-1.5">
              {post.author.username}
            </Text>
            <Text className="text-white text-sm flex-1">{post.caption}</Text>
          </View>
        ) : null}

        {commentsCount > 0 && (
          <TouchableOpacity
            onPress={handleCommentPress}
            className="mt-0.5 mb-1"
          >
            <Text className="text-grey text-sm">
              Переглянути всі {commentsCount} коментарів
            </Text>
          </TouchableOpacity>
        )}

        <Text className="text-grey text-xs mb-2">
          {formatDistanceToNow(post._creationTime, { addSuffix: true })}
        </Text>
      </View>

      {/* Модальне вікно коментарів */}
      {showComments && (
        <CommentsModal
          postId={post._id}
          visible={showComments}
          onClose={() => setShowComments(false)}
          onCommentsCountChange={setCommentsCount}
        />
      )}
      
      {/* Модальне вікно перегляду зображення (безпечна передача URL) */}
      <ImageViewerModal
        visible={isImageViewerVisible}
        imageUrl={post.imageUrl ?? ""}
        onClose={() => setIsImageViewerVisible(false)}
      />

      {/* Модальне вікно безпечного видалення публікації */}
      {isOwner && (
        <Modal
          visible={showDeleteModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          {/* Обгортка для коректної роботи жестів всередині модального вікна */}
          <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              {/* Фоновий оверлей: натискання закриває модалку */}
              <Pressable
                style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
                onPress={() => setShowDeleteModal(false)}
              />

              {/* Контент модального вікна */}
              <View className="bg-[#1E1E1E] w-[85%] rounded-2xl p-6 items-center z-10 border border-gray-800">
                <View className="w-12 h-12 rounded-full bg-red-500/10 items-center justify-center mb-4">
                  <Ionicons name="trash" size={24} color="#EF4444" />
                </View>
                
                <Text className="text-white text-lg font-bold mb-2">
                  Видалити публікацію?
                </Text>
                
                <Text className="text-gray-400 text-center text-sm mb-6">
                  Цю дію неможливо скасувати. Для підтвердження затисніть кнопку нижче на 1.2 секунди.
                </Text>

                {/* Кнопка з утриманням */}
                <View className="w-full mb-3">
                  <HoldToConfirmButton onConfirm={handleConfirmDelete} />
                </View>

                <TouchableOpacity
                  onPress={() => setShowDeleteModal(false)}
                  className="py-3 items-center w-full"
                >
                  <Text className="text-white font-medium">Скасувати</Text>
                </TouchableOpacity>
              </View>
            </View>
          </GestureHandlerRootView>
        </Modal>
      )}
    </Reanimated.View>
  );
};