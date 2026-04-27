import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSettings } from "../../settings/SettingsProvider";
import { useAppTheme } from "../../../theme/useAppTheme";
import { useTranslation } from "react-i18next";

export default function PrivacyScreen() {
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
            pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
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
            name="shield-checkmark-outline"
            size={22}
            color={theme.brand}
          />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          {t("privacy.title")}
        </Text>

        <Text style={[styles.subtitle, { color: theme.sub }]}>
          {t("privacy.subtitle")}
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Privacy settings
      </Text>

      <View style={styles.list}>
        <Row
          icon="location-outline"
          label={t("privacy.locationSharing")}
          subtitle="Allow the app to use your location for better recommendations"
          right={
            <Switch
              value={settings.privacy.locationSharing}
              onValueChange={(v) => setSetting("privacy.locationSharing", v)}
              trackColor={{ false: "#DADADA", true: `${theme.brand}66` }}
              thumbColor={
                settings.privacy.locationSharing ? theme.brand : "#FFFFFF"
              }
            />
          }
        />

        <Row
          icon="document-text-outline"
          label={t("privacy.terms")}
          subtitle="Read the terms and privacy details"
          right={
            <Ionicons name="chevron-forward" size={18} color={theme.sub} />
          }
          onPress={() =>
            Alert.alert(t("privacy.termsTitle"), t("privacy.termsText"))
          }
        />

        <Row
          icon="lock-closed-outline"
          label={t("privacy.permissions")}
          subtitle="Manage app permissions and access"
          right={
            <Ionicons name="chevron-forward" size={18} color={theme.sub} />
          }
          onPress={() =>
            Alert.alert(
              t("privacy.permissionsTitle"),
              t("privacy.permissionsText")
            )
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
