import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Post } from "@/components/Post";
import { Comment } from "@/components/Comment";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function PostDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = id as Id<"posts">;
  const router = useRouter();

  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Отримуємо дані поста та коментарів
  const post = useQuery(api.posts.getPostById, { postId });
  const comments = useQuery(api.comments.getComments, { postId });
  const addComment = useMutation(api.comments.addComment);

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await addComment({ postId, content: text });
      setCommentText("");
    } catch (error) {
      console.error(error);
      Alert.alert("Помилка", "Не вдалося надіслати коментар");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (post === undefined) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (post === null) {
    return (
      <View className="flex-1 bg-black justify-center items-center px-6">
        <Ionicons name="alert-circle-outline" size={56} color={COLORS.grey} />
        <Text className="text-white text-lg font-bold mt-3">Публікацію не знайдено</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 px-5 py-2.5 bg-surface rounded-full border border-surfaceLight"
        >
          <Text className="text-primary font-semibold">Повернутися назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-black"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Stack.Screen
        options={{
          headerTitle: "Публікація",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="p-1 mr-2">
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Сам пост */}
        <Post post={post} />

        {/* Секція коментарів */}
        <View className="px-4 pt-2 pb-8 border-t border-surface">
          <Text className="text-white text-lg font-bold mb-4">
            Коментарі ({comments?.length ?? 0})
          </Text>

          {comments === undefined ? (
            <ActivityIndicator size="small" color={COLORS.primary} className="my-4" />
          ) : comments.length === 0 ? (
            <View className="py-6 items-center">
              <Ionicons name="chatbubbles-outline" size={36} color={COLORS.grey} />
              <Text className="text-grey text-sm mt-2">
                Коментарів ще немає. Будьте першим!
              </Text>
            </View>
          ) : (
            comments.map((comment) => (
              <Comment key={comment._id} comment={comment} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Панель додавання коментаря знизу */}
      <View className="flex-row items-center px-4 py-3 bg-surface border-t border-surfaceLight">
        <TextInput
          className="flex-1 bg-black text-white px-4 py-2.5 rounded-full text-base border border-surfaceLight mr-2"
          placeholder="Напишіть коментар..."
          placeholderTextColor={COLORS.grey}
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />

        <TouchableOpacity
          onPress={handleAddComment}
          disabled={!commentText.trim() || isSubmitting}
          className={`w-10 h-10 rounded-full items-center justify-center bg-primary ${
            !commentText.trim() || isSubmitting ? "opacity-50" : "active:opacity-80"
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}