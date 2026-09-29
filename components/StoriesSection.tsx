import {
  ScrollView,
  ActivityIndicator,
  View,
  TouchableOpacity,
  Text,
  Alert,
} from "react-native";
import { useState } from "react";
import Story from "./Story";
import { StoryViewerModal } from "./StoryViewerModal";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { COLORS } from "@/constants/theme";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import { Ionicons } from "@expo/vector-icons";

type StoryUser = {
  id: string;
  username: string;
  avatar: string;
  hasStory: boolean;
  isCurrentUser?: boolean;
};

// Обгортка для користувача з підвантаженням його історій
function StoryWithViewer({ story }: { story: StoryUser }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const userStories = useQuery(
    api.stories.getStoriesByUser,
    story.hasStory ? { userId: story.id as Id<"users"> } : "skip"
  );

  const handlePress = () => {
    if (story.hasStory && userStories && userStories.length > 0) {
      setViewerOpen(true);
    }
  };

  return (
    <>
      <Story story={story} onPress={handlePress} />
      {viewerOpen && userStories && (
        <StoryViewerModal
          visible={viewerOpen}
          user={story}
          stories={userStories}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}

export const StoriesSection = () => {
  const stories = useQuery(api.users.getStoriesUsers);
  const generateUploadUrl = useMutation(api.stories.generateUploadUrl);
  const createStory = useMutation(api.stories.createStory);
  const [isUploading, setIsUploading] = useState(false);

  const handleCreateStory = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (result.canceled) return;

      setIsUploading(true);
      const asset = result.assets[0];

      // 1. Отримуємо одноразове посилання для завантаження
      const uploadUrl = await generateUploadUrl();

      // 2. Створюємо інстанс файлу через expo-file-system
      const file = new File(asset.uri);

      // 3. Відправляємо файл у Convex Storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: file,
      });

      if (!uploadResponse.ok) throw new Error("Upload failed");

      // 4. Отримуємо storageId
      const { storageId } = await uploadResponse.json();

      // 5. Створюємо історію в БД
      await createStory({ storageId });
      Alert.alert("Успіх", "Історію успішно опубліковано!");
    } catch (error) {
      console.error("Помилка додавання історії:", error);
      Alert.alert("Помилка", "Не вдалося опублікувати історію.");
    } finally {
      setIsUploading(false);
    }
  };

  if (stories === undefined) {
    return (
      <View className="py-4 border-b border-surface justify-center items-center h-24">
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="py-3 border-b border-surface"
      contentContainerStyle={{ paddingHorizontal: 8 }}
    >
      {/* Кнопка створення власної історії */}
      <TouchableOpacity
        className="items-center mx-2 w-[72px]"
        onPress={handleCreateStory}
        disabled={isUploading}
        activeOpacity={0.8}
      >
        <View className="w-[68px] h-[68px] rounded-full border-2 border-dashed border-primary justify-center items-center mb-1 bg-surface">
          {isUploading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="add" size={30} color={COLORS.primary} />
          )}
        </View>
        <Text className="text-white text-xs text-center" numberOfLines={1}>
          Додати
        </Text>
      </TouchableOpacity>

      {/* Список історій користувачів */}
      {stories?.map((story) => (
        <StoryWithViewer key={story.id} story={story} />
      ))}
    </ScrollView>
  );
};