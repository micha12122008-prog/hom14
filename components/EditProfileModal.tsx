import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { fetch } from "expo/fetch";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  user: {
    fullname?: string;
    username?: string;
    bio?: string;
    image?: string;
  };
}

export function EditProfileModal({
  visible,
  onClose,
  user,
}: EditProfileModalProps) {
  const [fullname, setFullname] = useState(user.fullname ?? "");
  const [username, setUsername] = useState(user.username ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Скидаємо/синхронізуємо стан форми з актуальними даними користувача при відкритті вікна
  useEffect(() => {
    if (visible) {
      setFullname(user.fullname ?? "");
      setUsername(user.username ?? "");
      setBio(user.bio ?? "");
      setSelectedImageUri(null);
    }
  }, [visible, user.fullname, user.username, user.bio, user.image]);

  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const updateUserProfile = useMutation(api.users.updateUserProfile);

  // Функція вибору зображення з галереї
  const pickImageFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  // Функція зйомки нового фото з камери
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Потрібен доступ",
        "Надайте додатку дозвіл на використання камери у налаштуваннях пристрою",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  // Головний селектор вибору джерела фото
  const pickImage = () => {
    Alert.alert("Оберіть дію", "Оберіть джерело для фото профілю", [
      {
        text: "Зробити фото",
        onPress: takePhoto,
      },
      {
        text: "Обрати з галереї",
        onPress: pickImageFromLibrary,
      },
      {
        text: "Скасувати",
        style: "cancel",
      },
    ]);
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);

      let imageStorageId = undefined;

      // Якщо користувач обрав новий аватар — завантажуємо через expo-file-system та expo/fetch
      if (selectedImageUri) {
        const uploadUrl = await generateUploadUrl();
        const file = new File(selectedImageUri);

        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: file,
        });

        if (!uploadResult.ok) {
          throw new Error("Не вдалося завантажити зображення на сервер");
        }

        const json = await uploadResult.json();
        imageStorageId = json.storageId;
      }

      await updateUserProfile({
        fullname,
        username,
        bio,
        imageStorageId,
      });

      setSelectedImageUri(null);
      onClose();
    } catch (error) {
      console.error("Помилка збереження профілю:", error);
      Alert.alert("Помилка", "Не вдалося зберегти зміни профілю.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end bg-black/60"
      >
        <View className="bg-surface border-t border-surfaceLight rounded-t-3xl p-5 max-h-[88%]">
          {/* Хедер модального вікна */}
          <View className="flex-row items-center justify-between pb-4 border-b border-surfaceLight">
            <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
              <Text className="text-grey text-base">Скасувати</Text>
            </TouchableOpacity>

            <Text className="text-white font-bold text-lg">
              Редагувати профіль
            </Text>

            <TouchableOpacity onPress={handleSave} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text className="text-primary font-bold text-base">
                  Зберегти
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="pt-4">
            {/* Аватар та кнопка зміни */}
            <View className="items-center mb-6">
              <TouchableOpacity
                onPress={pickImage}
                disabled={isSubmitting}
                className="relative active:opacity-80"
              >
                {selectedImageUri || user.image ? (
                  <Image
                    source={{
                      uri: selectedImageUri || user.image,
                    }}
                    className="w-24 h-24 rounded-full border-2 border-primary"
                  />
                ) : (
                  <View className="w-24 h-24 rounded-full bg-surfaceLight items-center justify-center border-2 border-surfaceLight">
                    <Ionicons name="person" size={44} color={COLORS.grey} />
                  </View>
                )}

                <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary items-center justify-center border-2 border-surface">
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={pickImage} className="mt-2">
                <Text className="text-primary text-sm font-semibold">
                  Змінити фото профілю
                </Text>
              </TouchableOpacity>
            </View>

            {/* Поля вводу */}
            <View className="gap-4 pb-10">
              <View>
                <Text className="text-grey text-xs font-semibold mb-1.5 uppercase">
                  Повне ім'я
                </Text>
                <TextInput
                  value={fullname}
                  onChangeText={setFullname}
                  placeholder="Введіть повне ім'я..."
                  placeholderTextColor={COLORS.grey}
                  className="bg-black text-white px-4 py-3 rounded-xl border border-surfaceLight text-base"
                />
              </View>

              <View>
                <Text className="text-grey text-xs font-semibold mb-1.5 uppercase">
                  Ім'я користувача
                </Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  placeholder="username"
                  placeholderTextColor={COLORS.grey}
                  className="bg-black text-white px-4 py-3 rounded-xl border border-surfaceLight text-base"
                />
              </View>

              <View>
                <Text className="text-grey text-xs font-semibold mb-1.5 uppercase">
                  Про себе (Bio)
                </Text>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={4}
                  placeholder="Розкажіть про себе..."
                  placeholderTextColor={COLORS.grey}
                  textAlignVertical="top"
                  className="bg-black text-white px-4 py-3 rounded-xl border border-surfaceLight text-base h-28"
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}