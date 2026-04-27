import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { TextInput } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { apiDeleteAccount } from "../../api/authApi";

export default function DeleteAccountScreen({ navigation }) {
  const { user, token, signOut } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");

  const onDelete = async () => {
    if (!user || !token) {
      return Alert.alert(t("common.error"), t("deleteAccount.notLoggedIn"));
    }

    Alert.alert(
      t("deleteAccount.confirmTitle"),
      t("deleteAccount.confirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("deleteAccount.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              if (!password.trim()) {
                Alert.alert(
                  t("deleteAccount.validationTitle"),
                  t("deleteAccount.passwordRequired")
                );
                return;
              }

              setLoading(true);

              await apiDeleteAccount(token, { password: password.trim() });
              await signOut();

              Alert.alert(
                t("deleteAccount.deletedTitle"),
                t("deleteAccount.deletedMessage")
              );
            } catch (e) {
              Alert.alert(
                t("deleteAccount.deleteFailed"),
                e.message || t("deleteAccount.deleteFailed")
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{t("deleteAccount.title")}</Text>
          <Text style={styles.subtitle}>{t("deleteAccount.subtitle")}</Text>

          <TextInput
            mode="outlined"
            label={t("deleteAccount.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            outlineStyle={styles.outline}
            theme={{ colors: { primary: "#222" } }}
            returnKeyType="done"
          />

          <Pressable
            style={[styles.dangerBtn, loading && { opacity: 0.7 }]}
            onPress={onDelete}
            disabled={loading}
          >
            <Text style={styles.dangerText}>
              {loading
                ? t("deleteAccount.deleting")
                : t("deleteAccount.delete")}
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.secondaryText}>{t("common.cancel")}</Text>
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 22,
    paddingTop: 70,
  },
  title: { fontSize: 26, color: "#111", fontFamily: "Montserrat_400Regular" },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#8A8A8A",
    fontFamily: "Montserrat_400Regular",
  },

  input: { marginTop: 14, backgroundColor: "#fff" },
  outline: { borderRadius: 8, borderColor: "#222" },

  dangerBtn: {
    marginTop: 22,
    height: 52,
    borderRadius: 6,
    backgroundColor: "#B00020",
    alignItems: "center",
    justifyContent: "center",
  },
  dangerText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },

  secondaryBtn: {
    marginTop: 12,
    height: 52,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DADADA",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: "#111",
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },
});
