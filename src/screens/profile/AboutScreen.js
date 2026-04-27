import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import { useAppTheme } from "../../../theme/useAppTheme";
import { useTranslation } from "react-i18next";

export default function AboutScreen({ navigation }) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const InfoCard = ({ icon, title, text }) => (
    <View
      style={[
        styles.infoCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <View
        style={[
          styles.infoIcon,
          {
            backgroundColor: `${theme.brand}16`,
            borderColor: `${theme.brand}28`,
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={theme.brand} />
      </View>

      <View style={styles.infoTextWrap}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {title}
        </Text>
        <Text style={[styles.p, { color: theme.sub }]}>{text}</Text>
      </View>
    </View>
  );

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
            name="information-circle-outline"
            size={22}
            color={theme.brand}
          />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          {t("about.title")}
        </Text>

        <Text style={[styles.subtitle, { color: theme.sub }]}>
          {t("about.description")}
        </Text>
      </View>

      <InfoCard
        icon="sparkles-outline"
        title={t("about.whatTitle")}
        text={t("about.whatList")}
      />

      <InfoCard
        icon="people-outline"
        title={t("about.forTitle")}
        text={t("about.forText")}
      />

      <InfoCard
        icon="flag-outline"
        title={t("about.missionTitle")}
        text={t("about.missionText")}
      />

      <Pressable
        onPress={() => navigation.goBack()}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: theme.brand },
          pressed && { opacity: 0.88 },
        ]}
      >
        <Ionicons
          name="arrow-back-outline"
          size={18}
          color="#FFFFFF"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.btnText}>{t("common.back")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingTop: 70,
    paddingHorizontal: 22,
    paddingBottom: 40,
  },

  heroCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
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

  versionBadge: {
    alignSelf: "flex-start",
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  versionText: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  infoCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginRight: 12,
  },

  infoTextWrap: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 15,
    marginBottom: 8,
    fontFamily: "Montserrat_400Regular",
  },

  p: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Montserrat_400Regular",
  },

  btn: {
    marginTop: 24,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  btnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
  },
});
