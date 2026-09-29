import { Dimensions, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Id } from "@/convex/_generated/dataModel";
import { NotificationItem, NotificationProps } from "./NotificationItem";

interface SwipeableNotificationItemProps {
  notification: NotificationProps["notification"];
  onDelete: (id: Id<"notifications">) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

export function SwipeableNotificationItem({
  notification,
  onDelete,
}: SwipeableNotificationItemProps) {
  const translateX = useSharedValue(0);

  const handleDelete = () => {
    onDelete(notification._id);
  };

  // Жест горизонтального свайпу (Pan)
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      // Дозволяємо зсув тільки вліво (від'ємні значення)
      translateX.value = Math.min(0, event.translationX);
    })
    .onEnd((event) => {
      if (translateX.value < -SWIPE_THRESHOLD) {
        // Якщо перевищено поріг свайпу — доводимо анімацію за екран і видаляємо
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 200 }, () => {
          runOnJS(handleDelete)();
        });
      } else {
        // Повернення на початкову позицію
        translateX.value = withTiming(0, { duration: 200 });
      }
    });

  // Анімація зміщення верхнього шару
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Плавна зміна прозорості кнопки видалення
  const deleteButtonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <View className="relative overflow-hidden bg-red-600  border-b border-surface">
      {/* Кнопка видалення під контентом */}
      <Animated.View
        style={deleteButtonStyle}
        className="absolute right-0 top-0 bottom-0 w-24 bg-red-600 items-center justify-center flex-row gap-1.5"
      >
        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
        <Text className="text-white text-xs font-bold">Видалити</Text>
      </Animated.View>

      {/* Верхній шар з елементом сповіщення, який зміщується */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle} className="bg-black">
          <NotificationItem notification={notification} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}