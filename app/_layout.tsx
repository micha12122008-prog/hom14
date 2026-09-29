import "../global.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import InitialLayout from "@/components/InitialLayout";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

// Сховище для збереження JWT та Refresh токенів на мобільному
const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConvexAuthProvider
        client={convex}
        storage={
          Platform.OS === "android" || Platform.OS === "ios"
            ? secureStorage
            : undefined
        }
      >
        <SafeAreaView className="flex-1 bg-black">
          <InitialLayout />
        </SafeAreaView>
      </ConvexAuthProvider>
    </GestureHandlerRootView>
  );
}