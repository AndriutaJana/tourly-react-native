import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { TextInput } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAppTheme } from "../../../theme/useAppTheme";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../context/AuthContext";
import { apiUpdateProfile } from "../../api/authApi";

export default function PersonalInfoScreen({ navigation }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { user, token, setUserSafe } = useAuth();

  const initialName = useMemo(() => {
    if (user?.fullName?.trim()) return user.fullName;
    if (user?.email) return user.email.split("@")[0];
    return "";
  }, [user]);

  const initialPhone = useMemo(() => user?.phone || "", [user]);
  const initialUsername = useMemo(() => user?.username || "", [user]);
  const initialPhotoURL = useMemo(() => user?.photoURL || null, [user]);

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [username, setUsername] = useState(initialUsername);
  const [localImage, setLocalImage] = useState(null);

  useEffect(() => {
    setName(initialName);
    setPhone(initialPhone);
    setUsername(initialUsername);
  }, [initialName, initialPhone, initialUsername]);

  const validate = () => {
    const n = name.trim();
    const p = phone.trim();
    const u = username.trim();

    if (!n || n.length < 2) {
      Alert.alert(t("personalInfo.validationTitle"), t("personalInfo.nameMin"));
      return false;
    }
    if (p && !/^[0-9+() -]{7,20}$/.test(p)) {
      Alert.alert(
        t("personalInfo.validationTitle"),
        t("personalInfo.phoneInvalid")
      );
      return false;
    }
    if (u && (u.length < 3 || !/^[a-zA-Z0-9._]+$/.test(u))) {
      Alert.alert(
        t("personalInfo.validationTitle"),
        t("personalInfo.usernameInvalid")
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          t("personalInfo.permissionTitle"),
          t("personalInfo.permissionMessage")
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      setLocalImage(uri);
    } catch (e) {
      Alert.alert(t("common.error"), String(e?.message || e));
    }
  };

  const onSave = async () => {
    if (!user || !token) {
      return Alert.alert(t("common.error"), t("personalInfo.notLoggedIn"));
    }
    if (!validate()) return;

    try {
      setLoading(true);

      const res = await apiUpdateProfile(token, {
        fullName: name.trim(),
        phone: phone.trim() || null,
        avatarUri: localImage,
      });

      setUserSafe(res.user);
      Alert.alert(t("common.success"), t("personalInfo.saved"));
      navigation.goBack();
    } catch (e) {
      Alert.alert(
        t("personalInfo.saveFailed"),
        e.message || t("personalInfo.saveFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  const preview = localImage || initialPhotoURL;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={[styles.container, { backgroundColor: theme.bg }]}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
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
            <Text style={[styles.title, { color: theme.text }]}>
              {t("personalInfo.title")}
            </Text>

            <Text style={[styles.subtitle, { color: theme.sub }]}>
              {t("personalInfo.subtitle")}
            </Text>

            <Pressable onPress={pickImage} style={styles.avatarWrap}>
              <View style={styles.avatarHolder}>
                {preview ? (
                  <Image source={{ uri: preview }} style={styles.avatar} />
                ) : (
                  <View
                    style={[
                      styles.avatarFallback,
                      { backgroundColor: `${theme.brand}` },
                    ]}
                  >
                    <Ionicons name="person" size={34} color="#FFFFFF" />
                  </View>
                )}

                <View
                  style={[
                    styles.editBadge,
                    {
                      backgroundColor: theme.brand,
                      borderColor: theme.card,
                    },
                  ]}
                >
                  <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
                </View>
              </View>

              <Text style={[styles.changeText, { color: theme.brand }]}>
                {t("personalInfo.changePhoto")}
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t("personalInfo.detailsTitle")}
          </Text>

          <View
            style={[
              styles.formCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <TextInput
              mode="outlined"
              label={t("personalInfo.name")}
              value={name}
              onChangeText={setName}
              style={[styles.input, { backgroundColor: theme.card }]}
              outlineStyle={styles.inputOutline}
              activeOutlineColor={theme.brand}
              outlineColor={theme.border}
              textColor={theme.text}
              theme={{
                colors: {
                  primary: theme.brand,
                  background: theme.card,
                },
              }}
            />

            <TextInput
              mode="outlined"
              label={t("personalInfo.username")}
              value={username}
              disabled
              style={[styles.input, { backgroundColor: theme.card }]}
              outlineStyle={styles.inputOutline}
              outlineColor={theme.border}
              activeOutlineColor={theme.border}
              textColor={theme.sub}
              theme={{
                colors: {
                  primary: theme.brand,
                  background: theme.card,
                },
              }}
            />

            <TextInput
              mode="outlined"
              label={t("personalInfo.phone")}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={[styles.input, { backgroundColor: theme.card }]}
              outlineStyle={styles.inputOutline}
              outlineColor={theme.border}
              activeOutlineColor={theme.brand}
              textColor={theme.text}
              theme={{
                colors: {
                  primary: theme.brand,
                  background: theme.card,
                },
              }}
            />
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[
                styles.primaryBtn,
                { backgroundColor: theme.brand },
                loading && { opacity: 0.7 },
              ]}
              onPress={onSave}
              disabled={loading}
            >
              <Text style={styles.primaryText}>
                {loading ? t("common.saving") : t("common.save")}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.secondaryBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                },
              ]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.secondaryText, { color: theme.text }]}>
                {t("common.cancel")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
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

  avatarWrap: {
    alignItems: "center",
    marginTop: 22,
  },

  avatarHolder: {
    position: "relative",
  },

  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#EAEAEA",
  },

  avatarFallback: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
  },

  editBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },

  changeText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },

  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },

  formCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
  },

  input: {
    marginTop: 12,
  },

  inputOutline: {
    borderRadius: 14,
  },

  actions: {
    marginTop: 22,
  },

  primaryBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },

  secondaryBtn: {
    marginTop: 12,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryText: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },
});
