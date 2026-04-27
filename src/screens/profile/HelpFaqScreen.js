import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme/useAppTheme";

export default function HelpFaqScreen({ navigation }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState(null);

  const FAQS = [
    {
      q: t("helpFaq.faqs.0.q"),
      a: t("helpFaq.faqs.0.a"),
    },
    {
      q: t("helpFaq.faqs.1.q"),
      a: t("helpFaq.faqs.1.a"),
    },
    {
      q: t("helpFaq.faqs.2.q"),
      a: t("helpFaq.faqs.2.a"),
    },
    {
      q: t("helpFaq.faqs.3.q"),
      a: t("helpFaq.faqs.3.a"),
    },
    {
      q: t("helpFaq.faqs.4.q"),
      a: t("helpFaq.faqs.4.a"),
    },
    {
      q: t("helpFaq.faqs.5.q"),
      a: t("helpFaq.faqs.5.a"),
    },
    {
      q: t("helpFaq.faqs.6.q"),
      a: t("helpFaq.faqs.6.a"),
    },
    {
      q: t("helpFaq.faqs.7.q"),
      a: t("helpFaq.faqs.7.a"),
    },
    {
      q: t("helpFaq.faqs.8.q"),
      a: t("helpFaq.faqs.8.a"),
    },
    {
      q: t("helpFaq.faqs.9.q"),
      a: t("helpFaq.faqs.9.a"),
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={[styles.title, { color: theme.text }]}>
        {t("helpFaq.title")}
      </Text>
      <Text style={[styles.sub, { color: theme.sub }]}>
        {t("helpFaq.subtitle")}
      </Text>

      <View style={styles.list}>
        {FAQS.map((item, i) => {
          const open = openIndex === i;
          return (
            <Pressable
              key={i}
              onPress={() => setOpenIndex(open ? null : i)}
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={styles.qRow}>
                <Text style={[styles.qText, { color: theme.text }]}>
                  {item.q}
                </Text>
                <Ionicons
                  name={open ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={theme.sub}
                />
              </View>

              {open && (
                <Text style={[styles.aText, { color: theme.sub }]}>
                  {item.a}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={() => navigation.goBack()} style={styles.btn}>
        <Text style={styles.btnText}>{t("common.back")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 70, paddingHorizontal: 22 },
  title: { fontSize: 26, fontFamily: "Montserrat_400Regular" },
  sub: { marginTop: 8, fontSize: 13, fontFamily: "Montserrat_400Regular" },

  list: { marginTop: 18 },

  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },

  qRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  qText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    flex: 1,
    paddingRight: 10,
  },

  aText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Montserrat_400Regular",
  },

  btn: {
    marginTop: 22,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#5E936C",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontFamily: "Montserrat_400Regular" },
});
