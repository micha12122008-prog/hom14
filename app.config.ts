
import { ConfigContext, ExpoConfig } from "expo/config";

// EAS налаштування (замініть на ваш реальний EAS Project ID після виконання eas project:init)
const EAS_PROJECT_ID = "64087add-7127-4296-bf5e-23d362670c55"; // наприклад, "3137fc56-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
const PROJECT_SLUG = "prostir";
const OWNER = "gariktaziks-team"; // Ваш Expo username

const APP_NAME = "Prostir";
const PACKAGE_NAME = "com.gariktaziksteam.prostir";
const SCHEME = "prostir";

export default ({ config }: ConfigContext): ExpoConfig => {
  const environment =
    (process.env.APP_ENV as "development" | "preview" | "production") ||
    "development";

  const isDev = environment === "development";

  return {
    ...config,
    name: isDev ? `${APP_NAME} Dev` : APP_NAME,
    slug: PROJECT_SLUG,
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: isDev ? `${SCHEME}-dev` : SCHEME,
    userInterfaceStyle: "automatic",

    android: {
      package: isDev ? `${PACKAGE_NAME}.dev` : PACKAGE_NAME,
      googleServicesFile: "./google-services.json", // ✅ Шлях до Firebase конфігу
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.VIBRATE",             // ✅ Дозвіл вібрації
        "android.permission.POST_NOTIFICATIONS",   // ✅ Дозвіл Android 13+
      ],
    },

    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#208AEF",
          image: "./assets/images/splash-icon.png",
          imageWidth: 76,
        },
      ],
      "expo-secure-store",
      [
        "expo-audio",
        {
          microphonePermission:
            "Дозвольте Prostir доступ до мікрофона для запису голосових сповіщень до публікацій.",
          recordAudioAndroid: true,
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission:
            "Додатку Prostir потрібен доступ до камери для запису відеокружечків.",
          microphonePermission:
            "Додатку Prostir потрібен доступ до мікрофона для запису звуку у відеокружечках.",
        },
      ],
      ["expo-video"],
      // ✅ Плагін expo-notifications
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#208AEF",
          defaultChannel: "default",
        },
      ],
    ],

    extra: {
      ...config.extra,
      eas: {
        projectId: config.extra?.eas?.projectId ?? EAS_PROJECT_ID,
      },
      owner: OWNER,
    },

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };
};

