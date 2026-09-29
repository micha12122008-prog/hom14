import {
  View,
  Text,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";
import { Comment } from "./Comment";

type Props = {
  postId: Id<"posts">;
  visible: boolean;
  onClose: () => void;
  onCommentsCountChange: (newCount: number) => void;
};

export function CommentsModal({
  postId,
  visible,
  onClose,
  onCommentsCountChange,
}: Props) {
  const [newComment, setNewComment] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Отримуємо коментарі та поточного користувача
  const currentUser = useQuery(api.users.currentUser);
  const comments = useQuery(api.comments.getComments, { postId });
  
  const addComment = useMutation(api.comments.addComment);
  const deleteComment = useMutation(api.comments.deleteComment);

  const handleSend = async () => {
    if (!newComment.trim() || isSending) return;

    try {
      setIsSending(true);
      await addComment({
        postId,
        content: newComment.trim(),
      });
      setNewComment("");

      // Оновлюємо лічильник у батьківському компоненті
      if (comments) {
        onCommentsCountChange(comments.length + 1);
      }
    } catch (error) {
      console.error("Помилка відправки коментаря:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Функція обробки видалення коментаря
  const handleDelete = (commentId: string) => {
    Alert.alert(
      "Видалити коментар?",
      "Ви впевнені, що хочете видалити цей коментар? Ця дія не може бути скасована.",
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Видалити",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteComment({ 
                commentId: commentId as Id<"comments">, 
                postId 
              });
              
              // Оновлюємо локальний лічильник коментарів у пості
              if (comments) {
                onCommentsCountChange(Math.max(0, comments.length - 1));
              }
            } catch (error) {
              console.error("Помилка видалення:", error);
              Alert.alert("Помилка", "Не вдалося видалити коментар.");
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-black mt-11"
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        {/* Хедер модального вікна */}
        <View className="flex-row justify-between items-center px-4 h-14 border-b border-surface">
          <TouchableOpacity onPress={onClose} className="p-1">
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-white text-base font-semibold">Коментарі</Text>
          <View className="w-8" />
        </View>

        {/* Список коментарів */}
        {comments === undefined ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <Comment 
                comment={item} 
                currentUserId={currentUser?._id}
                onDelete={handleDelete}
              />
            )}
            className="flex-1"
            ListEmptyComponent={
              <View className="flex-1 justify-center items-center mt-12 px-6">
                <Text className="text-grey text-base text-center">
                  Коментарів ще немає. Будьте першим!
                </Text>
              </View>
            }
          />
        )}

        {/* Панель введення нового коментаря */}
        <View className="flex-row items-center px-4 py-3 border-t border-surface bg-black">
          <TextInput
            className="flex-1 text-white py-2.5 px-4 mr-3 bg-surface rounded-full text-sm border border-surfaceLight"
            placeholder="Напишіть коментар..."
            placeholderTextColor={COLORS.grey}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            editable={!isSending}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!newComment.trim() || isSending}
            className="px-3 py-1.5"
          >
            {isSending ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text
                className={`text-sm font-bold ${
                  !newComment.trim() ? "text-grey" : "text-primary"
                }`}
              >
                Надіслати
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}