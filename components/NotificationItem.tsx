import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { Id } from "../convex/_generated/dataModel";
import { useRouter, Href } from "expo-router"; // Додано імпорт роутера та типу Href

export interface NotificationProps {
  notification: {
    _id: Id<"notifications">;
    type: "like" | "comment" | "follow";
    sender: {
      _id: Id<"users">;
      username: string;
      image: string;
    };
    post: {
      _id: Id<"posts">;
      imageUrl: string;
    } | null;
    comment?: string;
    _creationTime: number;
  };
}

export function NotificationItem({ notification }: NotificationProps) {
  const router = useRouter(); // Ініціалізація роутера

  const getActionText = () => {
    switch (notification.type) {
      case "follow":
        return "почав(-ла) стежити за вами";
      case "like":
        return "вподобав(-ла) вашу публікацію";
      case "comment":
        return `прокоментував(-ла): "${notification.comment ?? ""}"`;
      default:
        return "";
    }
  };

  return (
    <View className="flex-row items-center justify-between py-3 px-4 border-b border-surface">
      
      {/* Огорнуто аватар та текст відправника у TouchableOpacity */}
      <TouchableOpacity
        onPress={() => router.push(`/user/${notification.sender._id}` as Href)}
        activeOpacity={0.8}
        className="flex-row items-center flex-1 mr-3"
      >
        {/* Аватар з бейджем типу сповіщення */}
        <View className="relative mr-3">
          <Image
            source={{ uri: notification.sender.image }}
            className="w-11 h-11 rounded-full border border-surfaceLight"
          />
          <View className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black border border-surface items-center justify-center">
            {notification.type === "like" ? (
              <Ionicons name="heart" size={11} color="#EF4444" />
            ) : notification.type === "follow" ? (
              <Ionicons name="person-add" size={11} color="#8B5CF6" />
            ) : (
              <Ionicons name="chatbubble" size={11} color="#3B82F6" />
            )}
          </View>
        </View>

        {/* Текст сповіщення */}
        <View className="flex-1">
          <Text className="text-white text-sm font-semibold mb-0.5">
            {notification.sender.username}
          </Text>
          <Text className="text-grey text-sm mb-0.5" numberOfLines={2}>
            {getActionText()}
          </Text>
          <Text className="text-grey text-xs">
            {formatDistanceToNow(notification._creationTime, {
              addSuffix: true,
            })}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Мініатюра поста, до якого відноситься сповіщення */}
      {notification.post && (
        <Image
          source={{ uri: notification.post.imageUrl }}
          className="w-11 h-11 rounded-lg bg-surface"
          resizeMode="cover"
        />
      )}
    </View>
  );
}