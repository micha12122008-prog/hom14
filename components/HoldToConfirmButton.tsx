// components/HoldToConfirmButton.tsx
import React, { useState } from "react";
import { View, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

interface HoldToConfirmButtonProps {
  onConfirm: () => void | Promise<void>;
  title?: string;
  confirmTitle?: string;
  durationMs?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "danger" | "primary";
}

export const HoldToConfirmButton: React.FC<HoldToConfirmButtonProps> = ({
  onConfirm,
  title = "Утримуйте для підтвердження",
  confirmTitle = "Виконано! ✅",
  durationMs = 1200,
  icon,
  variant = "danger",
}) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const scale = useSharedValue(1);
  const progress = useSharedValue(0);

  const handleTrigger = async () => {
    setIsCompleted(true);
    try {
      await onConfirm();
    } finally {
      setTimeout(() => {
        setIsCompleted(false);
        scale.value = withSpring(1);
        progress.value = 0;
      }, 500);
    }
  };

  const longPressGesture = Gesture.LongPress()
    .minDuration(durationMs)
    .maxDistance(40) // Дозволяє природні мікрорухи пальця під час утримання
    .onBegin(() => {
      // 1. Палець торкнувся кнопки: починаємо стиснення та заповнення смужки
      scale.value = withTiming(0.96, {
        duration: durationMs,
        easing: Easing.linear,
      });
      progress.value = withTiming(1, {
        duration: durationMs,
        easing: Easing.linear,
      });
    })
    .onStart(() => {
      // 2. Час утримання минув: дія підтверджена!
      scale.value = withSpring(1.04);
      runOnJS(handleTrigger)();
    })
    .onFinalize((event, success) => {
      // 3. Палець відірвано: якщо користувач не дотримав час, скидаємо все в нуль
      if (!success) {
        scale.value = withSpring(1);
        progress.value = withTiming(0, { duration: 200 });
      }
    });

      const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const isDanger = variant === "danger";
  const baseBg = isDanger
    ? "bg-red-950/40 border-red-800/60"
    : "bg-primary/20 border-primary/40";
  const progressBg = isDanger ? "bg-red-600" : "bg-primary";

  return (
    <GestureDetector gesture={longPressGesture}>
      <Animated.View
        className={`h-12 px-4 rounded-xl border relative overflow-hidden justify-center items-center ${baseBg}`}
        style={animatedButtonStyle}
      >
        {/* Анімований фон прогресу */}
        <Animated.View
          className={`absolute left-0 top-0 bottom-0 ${progressBg}`}
          style={animatedProgressStyle}
        />

        {/* Текст та іконка кнопки */}
        <View className="flex-row items-center gap-2 z-10">
          {icon && <Ionicons name={icon} size={18} color="#FFFFFF" />}
          <Text className="text-white font-semibold text-sm">
            {isCompleted ? confirmTitle : title}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};