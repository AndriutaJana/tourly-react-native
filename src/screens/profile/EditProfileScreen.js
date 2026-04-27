import React, { useMemo, useState } from "react";
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
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { apiUpdateProfile } from "../../api/authApi";

export default function EditProfileScreen({ navigation }) {
  const { user, token, setUserSafe } = useAuth();
  const { t } = useTranslation();

  const initial = useMemo(() => {
    return {
      fullName: user?.fullName || "",
      username: user?.username || "",
      phone: user?.phone || "",
      photoURL: user?.photoURL || null,
    };
  }, [user]);

  const [fullName, setFullName] = useState(initial.fullName);
  const [username, setUsername] = useState(initial.username);
  const [phone, setPhone] = useState(initial.phone);

  const [localImage, setLocalImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          t("editProfile.permissionTitle"),
          t("editProfile.permissionMessage")
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
    if (!token) {
      return Alert.alert(t("common.error"), t("editProfile.notLoggedIn"));
    }

    const n = fullName.trim();
    const u = username.trim();
    const p = phone.trim();

    if (!n || n.length < 2) {
      return Alert.alert(
        t("editProfile.validationTitle"),
        t("editProfile.nameMin")
      );
    }

    if (u && u.length < 3) {
      return Alert.alert(
        t("editProfile.validationTitle"),
        t("editProfile.usernameMin")
      );
    }

    try {
      setLoading(true);

      const res = await apiUpdateProfile(token, {
        fullName: n,
        username: u || undefined,
        phone: p || null,
        avatarUri: localImage,
      });

      setUserSafe(res.user);
      Alert.alert(t("common.success"), t("editProfile.updated"));
      navigation.goBack();
    } catch (e) {
      Alert.alert(t("common.error"), String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const preview = localImage || initial.photoURL;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView style={styles.container}>
          <Text style={styles.title}>{t("editProfile.title")}</Text>

          <Pressable onPress={pickImage} style={styles.avatarWrap}>
            {preview ? (
              <Image source={{ uri: preview }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={{ color: "#fff", fontSize: 20 }}>+</Text>
              </View>
            )}
            <Text style={styles.changeText}>
              {t("editProfile.changePhoto")}
            </Text>
          </Pressable>

          <TextInput
            mode="outlined"
            label={t("editProfile.name")}
            value={fullName}
            onChangeText={setFullName}
            style={styles.input}
            outlineStyle={styles.outline}
            theme={{ colors: { primary: "#222" } }}
          />

          <TextInput
            mode="outlined"
            label={t("editProfile.username")}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            style={styles.input}
            outlineStyle={styles.outline}
            theme={{ colors: { primary: "#222" } }}
          />

          <TextInput
            mode="outlined"
            label={t("editProfile.phone")}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
            outlineStyle={styles.outline}
            theme={{ colors: { primary: "#222" } }}
          />

          <Pressable
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={onSave}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? t("common.saving") : t("common.save")}
            </Text>
          </Pressable>

          <Pressable style={styles.cancel} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>{t("common.cancel")}</Text>
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
  title: {
    fontSize: 28,
    color: colors.brand,
    fontFamily: "Montserrat_400Regular",
  },

  avatarWrap: { alignItems: "center", marginTop: 26 },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#eee",
  },
  avatarFallback: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  changeText: {
    marginTop: 10,
    color: colors.brand,
    fontFamily: "Montserrat_400Regular",
  },

  input: { marginTop: 14, backgroundColor: "#fff" },
  outline: { borderRadius: 8, borderColor: "#222" },

  btn: {
    marginTop: 22,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#5E936C",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Montserrat_400Regular" },

  cancel: { marginTop: 14, alignItems: "center" },
  cancelText: { color: colors.text, fontFamily: "Montserrat_400Regular" },
});
