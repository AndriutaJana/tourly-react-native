import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../theme/useAppTheme";
import * as MailComposer from "expo-mail-composer";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";

export default function ProfileScreen({ navigation }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  const displayName = useMemo(() => {
    if (user?.fullName && user.fullName.trim().length > 0)
      return user.fullName.trim();
    if (user?.username) return user.username;
    if (user?.email) return user.email.split("@")[0];
    return "User";
  }, [user]);

  const email = user?.email || "";
  const photoURL = user?.photoURL || null;

  const onLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      Alert.alert(t("profile.logoutFailed"), e.message);
    }
  };

  const onHelp = () => navigation.navigate("HelpFaq");
  const onAbout = () => navigation.navigate("About");

  const onContactSupport = async () => {
    const to = ["support@tourly.app"];
    const subject = "Tourly support";
    const body = t("profile.supportEmailBody");

    try {
      const available = await MailComposer.isAvailableAsync();

      if (available) {
        await MailComposer.composeAsync({ recipients: to, subject, body });
        return;
      }

      const url = `mailto:${to[0]}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
      const can = await Linking.canOpenURL(url);
      if (can) return Linking.openURL(url);

      Alert.alert(t("profile.noEmailApp"), t("profile.noEmailAppMsg"));
    } catch (e) {
      Alert.alert(t("profile.contactFailed"), e.message);
    }
  };

  const Row = ({ icon, label, danger, onPress }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconBox, { backgroundColor: theme.card }]}>
          <Ionicons
            name={icon}
            size={18}
            color={danger ? "#B00020" : theme.text}
          />
        </View>
        <Text
          style={[styles.rowText, { color: danger ? "#B00020" : theme.text }]}
        >
          {label}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.sub} />
    </Pressable>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.topBlock}>
        <View style={styles.avatarWrap}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} />
          ) : (
            <View
              style={[styles.avatarFallback, { backgroundColor: theme.brand }]}
            >
              <Ionicons name="person" size={22} color="#FFFFFF" />
            </View>
          )}
        </View>

        <Text style={[styles.name, { color: theme.text }]}>{displayName}</Text>
        {!!email && (
          <Text style={[styles.email, { color: theme.sub }]}>{email}</Text>
        )}

        <View style={styles.headerBtns}>
          <Pressable
            style={[
              styles.headerBtn,
              styles.outlineBtn,
              { borderColor: theme.border, backgroundColor: theme.brand },
            ]}
            onPress={() => navigation.navigate("PersonalInfo")}
          >
            <Text style={[styles.outlineBtnText, { color: "white" }]}>
              {t("profile.editProfile")}
            </Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {t("profile.accountSettings")}
      </Text>

      <View style={[styles.list, { borderTopColor: theme.border }]}>
        <Row
          icon="person-outline"
          label={t("profile.personalInfo")}
          onPress={() => navigation.navigate("PersonalInfo")}
        />
        <Row
          icon="key-outline"
          label={t("profile.changePassword")}
          onPress={() => navigation.navigate("ChangePassword")}
        />
        <Row
          icon="log-out-outline"
          label={t("profile.logout")}
          onPress={onLogout}
        />
        <Row
          icon="trash-outline"
          label={t("profile.deleteAccount")}
          danger
          onPress={() => navigation.navigate("DeleteAccount")}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {t("profile.appSettings")}
      </Text>

      <View style={[styles.list, { borderTopColor: theme.border }]}>
        <Row
          icon="notifications-outline"
          label={t("profile.notifications")}
          onPress={() => navigation.navigate("AppSettings")}
        />
        <Row
          icon="language-outline"
          label={t("profile.language")}
          onPress={() => navigation.navigate("Language")}
        />
        <Row
          icon="lock-closed-outline"
          label={t("profile.privacy")}
          onPress={() => navigation.navigate("Privacy")}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {t("profile.support")}
      </Text>

      <View style={[styles.list, { borderTopColor: theme.border }]}>
        <Row
          icon="help-circle-outline"
          label={t("profile.help")}
          onPress={onHelp}
        />
        <Row
          icon="mail-outline"
          label={t("profile.contactSupport")}
          onPress={onContactSupport}
        />
        <Row
          icon="information-circle-outline"
          label={t("profile.about")}
          onPress={onAbout}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22 },

  topBlock: { paddingTop: 70, paddingBottom: 18 },

  avatarWrap: { marginBottom: 12 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F5F5F5",
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  name: { fontSize: 26, fontFamily: "Montserrat_400Regular" },
  email: { marginTop: 4, fontSize: 13, fontFamily: "Montserrat_400Regular" },

  headerBtns: { marginTop: 14, flexDirection: "row", gap: 12 },
  headerBtn: {
    width: "100%",
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtn: { borderWidth: 1 },
  outlineBtnText: { fontFamily: "Montserrat_400Regular", fontSize: 13 },
  primaryBtnText: {
    color: "#FFFFFF",
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
  },

  sectionTitle: {
    marginTop: 12,
    marginBottom: 10,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },

  list: { borderTopWidth: 1, marginBottom: 10 },

  row: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },

  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },

  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  rowText: { fontSize: 13, fontFamily: "Montserrat_400Regular" },
});
