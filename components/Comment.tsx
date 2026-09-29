import { View, Text, Image, TouchableOpacity } from "react-native";
import { formatDistanceToNow } from "date-fns";
import { Ionicons } from "@expo/vector-icons";

interface CommentProps {
  comment: {
    _id: string; // Потрібно для ідентифікації коментаря при видаленні
    content: string;
    userId: string; // Потрібно для перевірки власника
    _creationTime: number;
    user: {
      fullname: string;
      image: string;
    };
  };
  currentUserId?: string; // Передаємо ID поточного користувача
  onDelete: (commentId: string) => void; // Функція для видалення
}

export function Comment({ comment, currentUserId, onDelete }: CommentProps) {
  const isOwner = currentUserId === comment.userId;

  return (
    <View className="flex-row px-4 py-3 border-b border-surface justify-between items-start">
      <View className="flex-row flex-1 mr-2">
        <Image
          source={{ uri: comment.user.image }}
          className="w-8 h-8 rounded-full mr-3 border border-surfaceLight"
        />
        <View className="flex-1">
          <Text className="text-white font-semibold text-sm mb-0.5">
            {comment.user.fullname}
          </Text>
          <Text className="text-white text-sm leading-5">
            {comment.content}
          </Text>
          <Text className="text-grey text-xs mt-1">
            {formatDistanceToNow(comment._creationTime, { addSuffix: true })}
          </Text>
        </View>
      </View>

      {/* Кнопка видалення (відображається лише для власника коментаря) */}
      {isOwner && (
        <TouchableOpacity
          onPress={() => onDelete(comment._id)}
          className="p-1 mt-1"
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );
}