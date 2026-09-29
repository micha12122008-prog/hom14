import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useQuery, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { EditProfileModal } from "@/components/EditProfileModal";
import { HoldToConfirmButton } from "@/components/HoldToConfirmButton";

const PROFILE_PAGE_SIZE = 12;

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuthActions();

  // 1. Дані користувача
  const user = useQuery(api.users.currentUser);

  // 2. Пости з курсорною пагінацією
  const {
    results: posts,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.posts.getPaginatedPostsByUser,
    {},
    { initialNumItems: PROFILE_PAGE_SIZE }
  );

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  // Обробник довантаження при скролі сітки
  const handleLoadMore = () => {
    if (status === "CanLoadMore") {
      loadMore(PROFILE_PAGE_SIZE);
    }
  };

  // Безпечна перевірка на завантаження або відсутність даних
  if (!user || (isLoading && posts.length === 0)) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Шапка профілю (передається у ListHeaderComponent)
  const renderHeader = () => (
    <View>
      <View className="p-4">
        {/* Аватар та статистика */}
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => setIsEditModalVisible(true)}
            className="relative"
            activeOpacity={0.8}
          >
            {user?.image ? (
              <Image
                source={{ uri: user.image }}
                className="w-20 h-20 rounded-full border-2 border-surfaceLight"
              />
            ) : (
              <View className="w-20 h-20 rounded-full bg-surface border-2 border-surfaceLight items-center justify-center">
                <Ionicons name="person" size={38} color={COLORS.primary} />
              </View>
            )}
            <View className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary items-center justify-center border-2 border-black">
              <Ionicons name="pencil" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center flex-1 justify-around ml-4">
            <View className="items-center">
              <Text className="text-white text-lg font-bold">
                {user?.posts ?? posts.length}
              </Text>
              <Text className="text-grey text-xs">Публікації</Text>
            </View>

            <View className="items-center">
              <Text className="text-white text-lg font-bold">
                {user?.followers ?? 0}
              </Text>
              <Text className="text-grey text-xs">Читачі</Text>
            </View>

            <View className="items-center">
              <Text className="text-white text-lg font-bold">
                {user?.following ?? 0}
              </Text>
              <Text className="text-grey text-xs">Стежить</Text>
            </View>
          </View>
        </View>

        {/* Ім'я та Bio */}
        <View className="mb-4">
          <Text className="text-white font-bold text-base">
            {user?.fullname ?? user?.name ?? "Без імені"}
          </Text>
          {user?.bio ? (
            <Text className="text-white/90 text-sm mt-1 leading-5">
              {user.bio}
            </Text>
          ) : null}
        </View>

        {/* Кнопка редагування профілю */}
        <TouchableOpacity
          onPress={() => setIsEditModalVisible(true)}
          className="w-full bg-surface border border-surfaceLight py-2.5 rounded-xl items-center active:bg-surfaceLight"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold text-sm">
            Редагувати профіль
          </Text>
        </TouchableOpacity>
      </View>

      {/* Розділювач та таб сітки */}
      <View className="flex-row border-t border-b border-surface py-3 justify-center items-center">
        <Ionicons name="grid" size={20} color={COLORS.primary} />
        <Text className="text-white text-xs font-semibold uppercase ml-2 tracking-wider">
          Публікації
        </Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-black">
      {/* Хедер сторінки */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface">
        <Text className="text-xl font-bold text-white">
          {user?.username ? `@${user.username}` : user?.fullname ?? user?.name ?? "Мій профіль"}
        </Text>

        <TouchableOpacity
          onPress={() => setIsEditModalVisible(true)}
          className="p-1 active:opacity-70"
        >
          <Ionicons name="settings-outline" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Оптимізована сітка 3x3 через FlatList з віртуалізацією */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        numColumns={3}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <View className="w-1/3 aspect-square p-0.5">
            <TouchableOpacity
              activeOpacity={0.8}
              className="w-full h-full bg-surface items-center justify-center overflow-hidden"
              onPress={() => router.push(`/post/${item._id}`)}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : item.videoUrl && item.isVideoNote ? (
                <View className="w-full h-full bg-surfaceLight items-center justify-center">
                  <Ionicons name="videocam" size={28} color={COLORS.primary} />
                  <Text className="text-[10px] text-grey mt-1">Відео</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={
          <View>
            {status === "LoadingMore" && (
              <View className="py-4 items-center w-full">
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            )}

            {/* Блок керування акаунтом та безпечний вихід */}
            <View className="p-4 mt-6 mb-10 border-t border-surface">
              <Text className="text-grey text-xs font-semibold uppercase mb-3 tracking-wider">
                Обліковий запис
              </Text>

              <HoldToConfirmButton
                title="Утримуйте для виходу з акаунта"
                confirmTitle="Виходимо..."
                icon="log-out-outline"
                variant="danger"
                durationMs={1200}
                onConfirm={async () => {
                  await signOut();
                  router.replace("/(auth)/login");
                }}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="py-16 items-center px-6">
              <Ionicons name="camera-outline" size={48} color={COLORS.grey} />
              <Text className="text-white text-base font-bold mt-2">
                Ще немає публікацій
              </Text>
              <Text className="text-grey text-sm text-center mt-1">
                Коли ви опублікуєте свої перші фотографії, вони з'являться тут.
              </Text>
            </View>
          ) : null
        }
      />

      {/* Модальне вікно редагування даних */}
      <EditProfileModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        user={{
          fullname: user?.fullname ?? user?.name ?? "",
          username: user?.username ?? "",
          bio: user?.bio ?? "",
          image: user?.image ?? "",
        }}
      />
    </View>
  );
}