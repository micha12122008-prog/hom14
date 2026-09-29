import { COLORS } from "@/constants/theme";
import { useAuthActions } from "@convex-dev/auth/react";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

// Необхідно для коректного закриття браузера після OAuth редиректу
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signIn } = useAuthActions();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Класичний вхід/реєстрація за паролем
  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Помилка", "Будь ласка, заповніть обов'язкові поля.");
      return;
    }

    if (isSignUp && !name.trim()) {
      Alert.alert("Помилка", "Будь ласка, вкажіть ваше ім'я.");
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        await signIn("password", {
          email,
          password,
          name,
          flow: "signUp",
        });
        Alert.alert("Успіх", "Акаунт успішно створено!");
      } else {
        await signIn("password", {
          email,
          password,
          flow: "signIn",
        });
      }
    } catch (err) {
      console.error("Auth Error", err);
      Alert.alert(
        "Помилка",
        isSignUp
          ? "Не вдалося створити акаунт. Можливо, пошта вже зайнята."
          : "Неправильний email або пароль."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Вхід через Google OAuth
  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);

      // 1. Отримуємо deep link зворотного виклику для повернення в додаток
      const redirectTo = Linking.createURL("");

      // 2. Запитуємо у Convex Auth посилання на сторінку входу Google
      const { redirect } = await signIn("google", { redirectTo });
      if (!redirect) return;

      // 3. Відкриваємо захищене вікно авторизації в системному браузері
      const result = await WebBrowser.openAuthSessionAsync(
        redirect.toString(),
        redirectTo
      );

      // 4. Якщо користувач успішно вибрав акаунт і браузер повернув код:
      if (result.type === "success" && result.url) {
        const code = new URL(result.url).searchParams.get("code");
        if (code) {
          await signIn("google", { code });
        }
      }
    } catch (error) {
      console.error("Помилка входу через Google:", error);
      Alert.alert(
        "Помилка входу",
        "Не вдалося виконати авторизацію через Google. Спробуйте ще раз."
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-black"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Брендинг та логотип */}
        <View className="items-center mt-16">
          <View className="w-16 h-16 rounded-full bg-surface items-center justify-center border border-surfaceLight">
            <Ionicons
              name="accessibility-outline"
              size={28}
              color={COLORS.primary}
            />
          </View>
          <Text className="text-3xl font-bold text-white mt-4">Prostir</Text>
          <Text className="text-sm text-grey mt-2">
            {isSignUp ? "Створіть новий акаунт" : "Знайдіть нові знайомства"}
          </Text>
        </View>

        {/* Форма введення даних */}
        <View className="px-6 mt-10 w-full items-center gap-4">
          {isSignUp && (
            <View className="flex-row items-center bg-surface border border-surfaceLight rounded-2xl px-4 w-full max-w-xs">
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.grey}
                style={{ marginRight: 10 }}
              />
              <TextInput
                placeholder="Ваше ім'я"
                placeholderTextColor={COLORS.grey}
                value={name}
                onChangeText={setName}
                className="flex-1 py-3.5 text-white text-base"
                autoCapitalize="words"
              />
            </View>
          )}

          <View className="flex-row items-center bg-surface border border-surfaceLight rounded-2xl px-4 w-full max-w-xs">
            <Ionicons
              name="mail-outline"
              size={20}
              color={COLORS.grey}
              style={{ marginRight: 10 }}
            />
            <TextInput
              placeholder="Email"
              placeholderTextColor={COLORS.grey}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              className="flex-1 py-3.5 text-white text-base"
            />
          </View>

          <View className="flex-row items-center bg-surface border border-surfaceLight rounded-2xl px-4 w-full max-w-xs">
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={COLORS.grey}
              style={{ marginRight: 10 }}
            />
            <TextInput
              placeholder="Пароль"
              placeholderTextColor={COLORS.grey}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              className="flex-1 py-3.5 text-white text-base"
            />
          </View>

          {/* Головна кнопка входу за паролем */}
          <TouchableOpacity
            onPress={handleAuth}
            disabled={isLoading || isGoogleLoading}
            className="bg-primary py-3.5 rounded-2xl w-full max-w-xs items-center mt-2 active:opacity-80"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-base">
                {isSignUp ? "Зареєструватися" : "Увійти"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Розділювач "АБО" */}
          <View className="flex-row items-center w-full max-w-xs my-2">
            <View className="flex-1 h-[1px] bg-surfaceLight" />
            <Text className="text-grey text-xs px-3 uppercase tracking-wider font-semibold">
              або
            </Text>
            <View className="flex-1 h-[1px] bg-surfaceLight" />
          </View>

          {/* Кнопка входу через Google */}
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
            activeOpacity={0.85}
            className="flex-row items-center justify-center gap-3 bg-white py-3.5 px-6 rounded-2xl w-full max-w-xs border border-surfaceLight"
          >
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#EA4335" />
                <Text className="text-black font-semibold text-base">
                  Продовжити з Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Перемикання Вхід / Реєстрація */}
          <TouchableOpacity
            onPress={() => setIsSignUp(!isSignUp)}
            disabled={isLoading || isGoogleLoading}
            className="mt-4 p-2 active:opacity-70"
          >
            <Text className="text-grey text-sm">
              {isSignUp ? "Вже маєте акаунт? " : "Ще не маєте акаунту? "}
              <Text className="text-primary font-bold">
                {isSignUp ? "Увійти" : "Зареєструватися"}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}