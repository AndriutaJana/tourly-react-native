import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { loadSettings, saveSettings, defaultSettings } from "./appSettings";
import i18n from "../i18n";

const SettingsContext = createContext({
  settings: defaultSettings,
  setSetting: async () => {},
  setMany: async () => {},
  loading: true,
});

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setSettings(s);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!loading && settings?.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings?.language, loading]);

  const setMany = async (updater) => {
    let next;
    setSettings((prev) => {
      next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });
    if (next) await saveSettings(next);
  };

  const setSetting = async (path, value) => {
    let next;

    setSettings((prev) => {
      const parts = path.split(".");
      next = { ...prev };
      let cur = next;

      for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        cur[k] = { ...(cur[k] || {}) };
        cur = cur[k];
      }

      cur[parts[parts.length - 1]] = value;
      return next;
    });

    if (next) await saveSettings(next);
  };

  const value = useMemo(
    () => ({ settings, setSetting, setMany, loading }),
    [settings, loading]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
