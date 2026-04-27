import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSettings } from "../../settings/SettingsProvider";
import { useAppTheme } from "../../../theme/useAppTheme";
import { useTranslation } from "react-i18next";

export default function AppSettingsScreen({ navigation }) {
  const { settings, setSetting } = useSettings();
  const theme = useAppTheme();
  const { t } = useTranslation();

  const Row = ({ icon, label, subtitle, right, onPress }) => {
    const content = (
      <>
        <View style={styles.rowLeft}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons name={icon} size={18} color={theme.text} />
          </View>

          <View style={styles.textWrap}>
            <Text style={[styles.rowText, { color: theme.text }]}>{label}</Text>
            {!!subtitle && (
              <Text style={[styles.rowSubtext, { color: theme.sub }]}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {right}
      </>
    );

    if (onPress) {
      return (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.rowCard,
            {
              backgroundColor: theme.bg,
              borderColor: theme.border,
            },
            pressed && { opacity: 0.82, transform: [{ scale: 0.99 }] },
          ]}
        >
          {content}
        </Pressable>
      );
    }

    return (
      <View
        style={[
          styles.rowCard,
          {
            backgroundColor: theme.bg,
            borderColor: theme.border,
          },
        ]}
      >
        {content}
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.heroIcon,
            {
              backgroundColor: `${theme.brand}16`,
              borderColor: `${theme.brand}28`,
            },
          ]}
        >
          <Ionicons
            name="notifications-outline"
            size={22}
            color={theme.brand}
          />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          {t("settings.title")}
        </Text>

        <Text style={[styles.subtitle, { color: theme.sub }]}>
          {t("settings.subtitle")}
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {t("settings.notifications")}
      </Text>

      <View style={styles.list}>
        <Row
          icon="alarm-outline"
          label={t("settings.itineraryReminders")}
          subtitle="Receive reminders for your saved trips and itinerary plans"
          right={
            <Switch
              value={settings.notifications.reminders}
              onValueChange={(v) => setSetting("notifications.reminders", v)}
              trackColor={{ false: "#DADADA", true: `${theme.brand}66` }}
              thumbColor={
                settings.notifications.reminders ? theme.brand : "#FFFFFF"
              }
            />
          }
        />

        <Row
          icon="airplane-outline"
          label={t("settings.tripUpdates")}
          subtitle="Get notified about important travel updates and changes"
          right={
            <Switch
              value={settings.notifications.trips}
              onValueChange={(v) => setSetting("notifications.trips", v)}
              trackColor={{ false: "#DADADA", true: `${theme.brand}66` }}
              thumbColor={
                settings.notifications.trips ? theme.brand : "#FFFFFF"
              }
            />
          }
        />

        <Row
          icon="pricetag-outline"
          label={t("settings.promotions")}
          subtitle="Receive offers, discounts, and special promotions"
          right={
            <Switch
              value={settings.notifications.promos}
              onValueChange={(v) => setSetting("notifications.promos", v)}
              trackColor={{ false: "#DADADA", true: `${theme.brand}66` }}
              thumbColor={
                settings.notifications.promos ? theme.brand : "#FFFFFF"
              }
            />
          }
        />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {t("settings.preferences")}
      </Text>

      <View style={styles.list}>
        <Row
          icon="lock-closed-outline"
          label={t("settings.privacy")}
          subtitle="Manage permissions, terms, and privacy controls"
          right={
            <Ionicons name="chevron-forward" size={18} color={theme.sub} />
          }
          onPress={() => navigation.navigate("Privacy")}
        />

        <Row
          icon="moon-outline"
          label={t("settings.darkMode")}
          subtitle="Switch between light and dark appearance"
          right={
            <Switch
              value={theme.isDark}
              onValueChange={(v) => setSetting("theme", v ? "dark" : "light")}
              trackColor={{ false: "#DADADA", true: `${theme.brand}66` }}
              thumbColor={theme.isDark ? theme.brand : "#FFFFFF"}
            />
          }
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 70,
    paddingBottom: 40,
  },

  heroCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },

  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 14,
  },

  title: {
    fontSize: 26,
    fontFamily: "Montserrat_400Regular",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Montserrat_400Regular",
  },

  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },

  list: {
    gap: 12,
  },

  rowCard: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },

  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginRight: 12,
  },

  textWrap: {
    flex: 1,
  },

  rowText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },

  rowSubtext: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Montserrat_400Regular",
  },
});
