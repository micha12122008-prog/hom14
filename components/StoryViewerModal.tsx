import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  cancelAnimation,
  runOnJS,
  SharedValue,
} from "react-native-reanimated";

const STORY_DURATION = 5000; // 5 секунд на один слайд

type StoryItem = {
  _id: Id<"stories">;
  imageUrl: string;
  userId: Id<"users">;
  views: number;
  expiresAt: number;
};

type StoryUser = {
  id: string;
  username: string;
  avatar: string;
};

type Props = {
  visible: boolean;
  user: StoryUser;
  stories: StoryItem[];
  onClose: () => void;
};

interface StoryProgressBarProps {
  index: number;
  currentIndex: number;
  progress: SharedValue<number>;
}

function StoryProgressBar({
  index,
  currentIndex,
  progress,
}: StoryProgressBarProps) {
  // Анімований стиль ширини для кожного сегмента:
  const animatedWidthStyle = useAnimatedStyle(() => {
    if (index < currentIndex) {
      // Історія вже переглянута — 100% заповнення
      return { width: "100%" };
    }
    if (index === currentIndex) {
      // Поточна активна історія — динамічне зростання 0% -> 100%
      return { width: `${progress.value * 100}%` };
    }
    // Майбутні історії — 0% заповнення
    return { width: "0%" };
  });

  return (
    <View className="flex-1 h-0.5 bg-white/40 rounded-full overflow-hidden">
      <Animated.View
        className="h-full bg-white rounded-full"
        style={animatedWidthStyle}
      />
    </View>
  );
}

export function StoryViewerModal({ visible, user, stories, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const progress = useSharedValue(0);
  
  const incrementViews = useMutation(api.stories.incrementViews);
  const currentStory = stories[currentIndex];

  const handleClose = () => {
    stopProgress();
    setCurrentIndex(0);
    onClose();
  };

  const goNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      handleClose();
    }
  };

  // Метод запуску анімації через Reanimated
  const startProgress = () => {
    progress.value = 0; // Скидаємо в початок
    progress.value = withTiming(
      1,
      {
        duration: STORY_DURATION,
        easing: Easing.linear, // Рівномірний рух індикатора
      },
      (finished) => {
        // Важливо: колбек виконується в UI-ворклеті, 
        // тому виклик JS-функції загортаємо в runOnJS!
        if (finished) {
          runOnJS(goNext)();
        }
      }
    );
  };

  // Зупинка анімації
  const stopProgress = () => {
    cancelAnimation(progress);
  };

  // Метод переходу назад
  const goPrev = () => {
    if (currentIndex > 0) {
      stopProgress();
      setCurrentIndex((i) => i - 1);
    }
  };

  useEffect(() => {
    if (!visible || stories.length === 0) return;
    
    startProgress();

    if (currentStory) {
      incrementViews({ storyId: currentStory._id }).catch(() => {});
    }

    return () => stopProgress();
  }, [visible, currentIndex]);

  if (!visible || stories.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black relative">
        {/* Фонове зображення історії */}
        <Image
          source={{ uri: currentStory?.imageUrl }}
          className="w-full h-full absolute"
          resizeMode="cover"
        />

        {/* Прогрес-бари кожної історії */}
        <View className="flex-row px-2 pt-12 gap-1 z-10">
          {stories.map((_, index) => (
            <StoryProgressBar
              key={index}
              index={index}
              currentIndex={currentIndex}
              progress={progress}
            />
          ))}
        </View>

        {/* Хедер: інформація про автора та кнопка закриття */}
        <View className="flex-row items-center justify-between px-4 pt-3 z-10">
          <View className="flex-row items-center gap-2.5">
            <Image
              source={{ uri: user.avatar }}
              className="w-9 h-9 rounded-full border-2 border-white"
            />
            <Text className="text-white font-semibold text-sm">
              {user.username}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} className="p-1">
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Сенсорні зони перемикання (ліворуч / праворуч) */}
        <View className="absolute inset-0 flex-row z-5">
          <TouchableOpacity
            className="flex-1"
            onPress={goPrev}
            activeOpacity={1}
          />
          <TouchableOpacity
            className="flex-1"
            onPress={goNext}
            activeOpacity={1}
          />
        </View>
      </View>
    </Modal>
  );
}