import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "tourly.app.settings.v1";

export const defaultSettings = {
  notifications: {
    reminders: true,
    promos: false,
    trips: true,
  },
  language: "en", // "ro" | "en"
  privacy: {
    locationSharing: false,
  },
  theme: "light", // "light" | "dark"
};

export async function loadSettings() {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return defaultSettings;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...defaultSettings,
      ...parsed,
      notifications: {
        ...defaultSettings.notifications,
        ...(parsed.notifications || {}),
      },
      privacy: { ...defaultSettings.privacy, ...(parsed.privacy || {}) },
    };
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(next) {
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}
