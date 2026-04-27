import React, { useState, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { colors } from "../../../theme/colors";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";

export default function SignUpScreen({ navigation }) {
  const { t } = useTranslation();

  const schema = yup.object({
    name: yup
      .string()
      .required(t("auth.errors.nameRequired"))
      .min(2, t("auth.errors.nameMin"))
      .max(40, t("auth.errors.nameMax"))
      .matches(/^[A-Za-zĂÂÎȘȚăâîșț\s-]+$/, t("auth.errors.nameInvalid")),

    username: yup
      .string()
      .required(t("auth.errors.usernameRequired"))
      .min(3, t("auth.errors.usernameMin"))
      .max(20, t("auth.errors.usernameMax"))
      .matches(/^[A-Za-z][A-Za-z0-9._]*$/, t("auth.errors.usernameLetter"))
      .matches(/^\S+$/, t("auth.errors.usernameNoSpaces")),

    email: yup
      .string()
      .required(t("auth.errors.emailRequired"))
      .email(t("auth.errors.invalidEmail")),

    password: yup
      .string()
      .required(t("auth.errors.passwordRequired"))
      .min(8, t("auth.errors.passwordMin8"))
      .matches(/[a-z]/, t("auth.errors.passwordLower"))
      .matches(/[A-Z]/, t("auth.errors.passwordUpper"))
      .matches(/[0-9]/, t("auth.errors.passwordNumber"))
      .matches(/[^A-Za-z0-9]/, t("auth.errors.passwordSymbol")),

    confirm: yup
      .string()
      .required(t("auth.errors.confirmRequired"))
      .oneOf([yup.ref("password")], t("auth.errors.passwordMatch")),
  });

  const InputField = memo(function InputField({
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    keyboardType,
    autoCapitalize = "none",
    autoComplete,
    textContentType,
  }) {
    return (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8B8B8B"
        style={styles.input}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        autoComplete={autoComplete}
        textContentType={textContentType}
        underlineColorAndroid="transparent"
      />
    );
  });

  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const { signUp } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      confirm: "",
    },
    mode: "onSubmit",
  });

  const onSubmit = async ({ name, username, email, password }) => {
    try {
      setLoading(true);
      await signUp(
        name.trim(),
        username.trim(),
        email.trim().toLowerCase(),
        password
      );
      Alert.alert(t("auth.signUp.successTitle"), t("auth.signUp.successMsg"));
    } catch (e) {
      Alert.alert(
        t("auth.errors.signUpFailed"),
        e?.message || t("auth.errors.signUpFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("auth.signUp.title")}</Text>
          <Text style={styles.subtitle}>{t("auth.signUp.subtitle")}</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <InputField
                value={value}
                onChangeText={onChange}
                placeholder={t("auth.signUp.name")}
                autoCapitalize="words"
              />
            )}
          />
          {!!errors.name && (
            <Text style={styles.error}>{errors.name.message}</Text>
          )}

          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, value } }) => (
              <InputField
                value={value}
                onChangeText={onChange}
                placeholder={t("auth.signUp.username")}
              />
            )}
          />
          {!!errors.username && (
            <Text style={styles.error}>{errors.username.message}</Text>
          )}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <InputField
                value={value}
                onChangeText={onChange}
                placeholder={t("auth.signUp.email")}
                keyboardType="email-address"
              />
            )}
          />
          {!!errors.email && (
            <Text style={styles.error}>{errors.email.message}</Text>
          )}

          <View style={styles.passwordWrap}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <InputField
                  value={value}
                  onChangeText={onChange}
                  placeholder={t("auth.signUp.password")}
                  secureTextEntry={!showPass}
                />
              )}
            />
            <Pressable onPress={() => setShowPass((v) => !v)}>
              <Text>{showPass ? t("common.hide") : t("common.show")}</Text>
            </Pressable>
          </View>
          {!!errors.password && (
            <Text style={styles.error}>{errors.password.message}</Text>
          )}

          <View style={styles.passwordWrap}>
            <Controller
              control={control}
              name="confirm"
              render={({ field: { onChange, value } }) => (
                <InputField
                  value={value}
                  onChangeText={onChange}
                  placeholder={t("auth.signUp.confirmPassword")}
                  secureTextEntry={!showConfirmPass}
                />
              )}
            />
            <Pressable onPress={() => setShowConfirmPass((v) => !v)}>
              <Text>
                {showConfirmPass ? t("common.hide") : t("common.show")}
              </Text>
            </Pressable>
          </View>
          {!!errors.confirm && (
            <Text style={styles.error}>{errors.confirm.message}</Text>
          )}

          <Pressable
            style={[styles.primaryBtn, loading && styles.disabledBtn]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            <Text style={styles.primaryText}>
              {loading ? t("auth.signUp.creating") : t("auth.signUp.signUp")}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text>{t("auth.signUp.haveAccount")}</Text>
          <Pressable onPress={() => navigation.navigate("SignIn")}>
            <Text style={styles.link}>{t("auth.signUp.login")}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView style={styles.screen} behavior="padding">
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.screen}>{content}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F6F7F4",
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 36,
    paddingBottom: 28,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 26,
  },
  title: {
    fontSize: 42,
    color: colors.brand,
    fontFamily: "Montserrat_400Regular",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    fontFamily: "Montserrat_400Regular",
  },
  form: {
    gap: 10,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: "#D7DDD8",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#222",
  },
  passwordWrap: {
    position: "relative",
    justifyContent: "center",
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    height: 56,
    justifyContent: "center",
  },
  eyeText: {
    color: colors.brand,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },
  error: {
    color: "crimson",
    fontSize: 12,
    marginTop: -2,
    fontFamily: "Montserrat_400Regular",
  },
  primaryBtn: {
    marginTop: 10,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#5E936C",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledBtn: {
    opacity: 0.7,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
  },
  footer: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  footerText: {
    color: colors.text,
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },
  link: {
    color: colors.brand,
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
  },
});
