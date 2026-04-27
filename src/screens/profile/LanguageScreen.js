import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { useSettings } from "../../settings/SettingsProvider";
import { useAppTheme } from "../../../theme/useAppTheme";

export default function LanguageScreen({ navigation }) {
  const { settings, setSetting } = useSettings();
  const theme = useAppTheme();
  const { t } = useTranslation();

  const handleChangeLanguage = async (code) => {
    await setSetting("language", code);
    await i18n.changeLanguage(code);
  };

  const Option = ({ code, label, nativeLabel, icon }) => {
    const active = settings.language === code;

    return (
      <Pressable
        onPress={() => handleChangeLanguage(code)}
        style={({ pressed }) => [
          styles.optionCard,
          {
            backgroundColor: active ? `${theme.brand}12` : theme.card,
            borderColor: active ? theme.brand : theme.border,
          },
          pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
        ]}
      >
        <View style={styles.optionLeft}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: active ? `${theme.brand}18` : theme.bg,
                borderColor: active ? `${theme.brand}30` : theme.border,
              },
            ]}
          >
            <Ionicons
              name={icon}
              size={18}
              color={active ? theme.brand : theme.text}
            />
          </View>

          <View style={styles.textWrap}>
            <Text
              style={[
                styles.optionTitle,
                { color: active ? theme.brand : theme.text },
              ]}
            >
              {label}
            </Text>
            <Text style={[styles.optionSubtitle, { color: theme.sub }]}>
              {nativeLabel}
            </Text>
          </View>
        </View>

        {active ? (
          <View
            style={[
              styles.selectedBadge,
              { backgroundColor: theme.brand, borderColor: theme.brand },
            ]}
          >
            <Ionicons name="checkmark" size={15} color="#FFFFFF" />
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={theme.sub} />
        )}
      </Pressable>
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
          <Ionicons name="language-outline" size={22} color={theme.brand} />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          {t("language.title")}
        </Text>

        <Text style={[styles.subtitle, { color: theme.sub }]}>
          {t("language.subtitle")}
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {t("profile.language")}
      </Text>

      <View style={styles.optionsList}>
        <Option
          code="en"
          label="English"
          nativeLabel="English"
          icon="globe-outline"
        />
        <Option
          code="ro"
          label="Romanian"
          nativeLabel="Română"
          icon="globe-outline"
        />
        <Option
          code="ru"
          label="Russian"
          nativeLabel="Русский"
          icon="globe-outline"
        />
      </View>

      <Pressable
        style={[
          styles.backBtn,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons
          name="arrow-back-outline"
          size={18}
          color={theme.text}
          style={{ marginRight: 8 }}
        />
        <Text style={[styles.backText, { color: theme.text }]}>
          {t("common.back")}
        </Text>
      </Pressable>
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

  optionsList: {
    gap: 12,
  },

  optionCard: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  iconWrap: {
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

  optionTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
  },

  optionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  selectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginLeft: 12,
  },

  backBtn: {
    marginTop: 24,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  backText: {
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
  },
});
