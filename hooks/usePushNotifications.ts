
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";

/**
 * Глобальне налаштування поведінки сповіщень у режимі Foreground (коли додаток відкритий).
 * Вказує системі: показувати банер, грати звук та оновлювати лічильник на іконці.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Клієнтський хук для реєстрації Push-сповіщень та обробки переходів (Deep Linking)
 */
export function usePushNotifications() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const savePushToken = useMutation(api.users.savePushToken);
  const router = useRouter();

  // Відповідь сповіщення при "холодному старті" (коли додаток був повністю закритий)
  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  /**
   * Навігація за даними зі сповіщення
   */
  const handleNotificationNavigation = (data: any) => {
    if (!data) return;

    console.log("&#x1f9ed; Перехід за сповіщенням:", data);

    // 1. Сповіщення про лайк чи коментар -> перехід до публікації
    if (data.postId || data.type === "like" || data.type === "comment") {
      router.push(`/post/${data.postId}`);
    }
    // 2. Сповіщення про підписку -> перехід до профілю підписника
    else if (data.userId || data.type === "follow") {
      router.push(`/user/${data.userId}`);
    }
    // 3. Інші типи -> вкладка сповіщень
    else {
      router.push("/(tabs)/notifications");
    }
  };

  // Ефект 1: Обробка відкриття додатку зі сповіщення при холодному старті
  useEffect(() => {
    if (
      lastNotificationResponse &&
      lastNotificationResponse.actionIdentifier ===
        Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      const data = lastNotificationResponse.notification.request.content.data;
      handleNotificationNavigation(data);
    }
  }, [lastNotificationResponse]);

  // Ефект 2: Реєстрація токена та підписка на кліки у фоновому/активному режимі
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    // Отримання токена та відправка в Convex
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        console.log("&#x1f4f2; Отримано Expo Push Token:", token);
        savePushToken({ pushToken: token }).catch((err) => {
          console.error("Помилка збереження pushToken у Convex:", err);
        });
      }
    });

    // Отримання сповіщення у Foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("&#x1f514; Foreground notification:", notification);
      });

    // Клік по сповіщенню у Background або Foreground
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated, isLoading]);
}

/**
 * Налаштування каналу сповіщень для Android та отримання токена
 */
async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Налаштування системного каналу для Android
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#208AEF",
    });
  }

  // Перевірка поточних прав
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("⚠️ Дозвіл на сповіщення не надано користувачем");
    return null;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn("⚠️ Project ID не знайдено в конфігурації Expo / EAS!");
    }

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    return tokenData.data;
  } catch (error) {
    console.error("❌ Не вдалося отримати pushToken:", error);
    return null;
  }
}