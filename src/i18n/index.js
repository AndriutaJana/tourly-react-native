import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./locales/en.json";
import ro from "./locales/ro.json";
import ru from "./locales/ru.json";

const resources = {
  en: { translation: en },
  ro: { translation: ro },
  ru: { translation: ru },
};

const LANGUAGE_KEY = "appLanguage";

const languageDetector = {
  type: "languageDetector",
  async: true,
  detect: async (callback) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

      if (savedLanguage) {
        callback(savedLanguage);
        return;
      }

      const locales = Localization.getLocales();
      const deviceLanguage = locales?.[0]?.languageCode || "en";

      if (["en", "ro", "ru"].includes(deviceLanguage)) {
        callback(deviceLanguage);
      } else {
        callback("en");
      }
    } catch (error) {
      callback("en");
    }
  },
  init: () => {},
  cacheUserLanguage: async (language) => {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: "v4",
    resources,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
