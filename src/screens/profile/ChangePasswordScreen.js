import React, { useState } from "react";
import {
  View,
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
import { apiChangePassword } from "../../api/authApi";

export default function ChangePasswordScreen({ navigation }) {
  const { user, token } = useAuth();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");

  const validate = () => {
    if (!currentPass.trim()) {
      Alert.alert(
        t("changePassword.validationTitle"),
        t("changePassword.currentPasswordRequired")
      );
      return false;
    }
    if (!newPass || newPass.length < 8) {
      Alert.alert(
        t("changePassword.validationTitle"),
        t("changePassword.newPasswordMin")
      );
      return false;
    }
    if (newPass !== confirm) {
      Alert.alert(
        t("changePassword.validationTitle"),
        t("changePassword.passwordsDoNotMatch")
      );
      return false;
    }
    return true;
  };

  const onSave = async () => {
    if (!user || !token) {
      return Alert.alert(t("common.error"), t("changePassword.notLoggedIn"));
    }

    if (!validate()) return;

    try {
      setLoading(true);

      await apiChangePassword(token, {
        currentPassword: currentPass.trim(),
        newPassword: newPass,
      });

      Alert.alert(t("common.success"), t("changePassword.passwordUpdated"));
      navigation.goBack();
    } catch (e) {
      Alert.alert(
        t("changePassword.changePasswordFailed"),
        e.message || t("changePassword.changePasswordFailed")
      );
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.title}>{t("changePassword.title")}</Text>
          <Text style={styles.subtitle}>{t("changePassword.subtitle")}</Text>

          <TextInput
            mode="outlined"
            label={t("changePassword.currentPassword")}
            value={currentPass}
            onChangeText={setCurrentPass}
            secureTextEntry
            style={styles.input}
            outlineStyle={styles.outline}
            theme={{ colors: { primary: "#222" } }}
            returnKeyType="next"
            blurOnSubmit={false}
          />

          <TextInput
            mode="outlined"
            label={t("changePassword.newPassword")}
            value={newPass}
            onChangeText={setNewPass}
            secureTextEntry
            style={styles.input}
            outlineStyle={styles.outline}
            theme={{ colors: { primary: "#222" } }}
            returnKeyType="next"
            blurOnSubmit={false}
          />

          <TextInput
            mode="outlined"
            label={t("changePassword.confirmNewPassword")}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            style={styles.input}
            outlineStyle={styles.outline}
            theme={{ colors: { primary: "#222" } }}
            returnKeyType="done"
          />

          <Pressable
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={onSave}
            disabled={loading}
          >
            <Text style={styles.primaryText}>
              {loading ? t("common.saving") : t("common.save")}
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

  primaryBtn: {
    marginTop: 22,
    height: 52,
    borderRadius: 6,
    backgroundColor: "#5E936C",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
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
