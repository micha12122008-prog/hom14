import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { COLORS } from "@/constants/theme";
import { SwipeableNotificationItem } from "@/components/SwipeableNotificationItem";
import { Ionicons } from "@expo/vector-icons";

export default function NotificationsScreen() {
  const notifications = useQuery(api.notifications.getNotifications);
  const deleteNotification = useMutation(api.notifications.deleteNotification);

  const handleDeleteNotification = async (notificationId: Id<"notifications">) => {
    try {
      await deleteNotification({ notificationId });
    } catch (error) {
      console.error("Помилка видалення сповіщення:", error);
    }
  };

  if (notifications === undefined) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1 bg-black">
      <View className="flex-1 bg-black">
        {/* Хедер сторінки */}
        <View className="px-4 py-3 border-b border-surface">
          <Text className="text-2xl font-bold text-primary">Сповіщення</Text>
        </View>

        {notifications.length === 0 ? (
          <View className="flex-1 justify-center items-center px-6">
            <Ionicons
              name="notifications-outline"
              size={52}
              color={COLORS.grey}
              style={{ marginBottom: 12 }}
            />
            <Text className="text-white text-lg font-semibold mb-1">
              Сповіщень ще немає
            </Text>
            <Text className="text-grey text-sm text-center">
              Коли хтось вподобає ваші пости, прокоментує їх або підпишеться на вас, ви побачите це тут.
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={({ item }) => (
              <SwipeableNotificationItem
                notification={item}
                onDelete={handleDeleteNotification}
              />
            )}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60 }}
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
}