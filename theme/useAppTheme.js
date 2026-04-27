import { useMemo } from "react";
import { useSettings } from "../src/settings/SettingsProvider";

export function useAppTheme() {
  const { settings } = useSettings();
  const isDark = settings.theme === "dark";

  return useMemo(() => {
    const brand = "#5E936C";

    const bg = isDark ? "#0F0F10" : "#FFFFFF";
    const card = isDark ? "#161618" : "#FFFFFF";
    const text = isDark ? "#F2F2F2" : "#111111";
    const sub = isDark ? "rgba(255,255,255,0.65)" : "#8A8A8A";
    const border = isDark ? "rgba(255,255,255,0.12)" : "#ECECEC";

    return { isDark, brand, bg, card, text, sub, border };
  }, [isDark]);
}
