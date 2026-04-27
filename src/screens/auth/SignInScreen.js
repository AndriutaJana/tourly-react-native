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

export default function SignInScreen({ navigation }) {
  const { t } = useTranslation();

  const schema = yup.object({
    email: yup
      .string()
      .required(t("auth.errors.emailRequired"))
      .email(t("auth.errors.invalidEmail")),
    password: yup
      .string()
      .required(t("auth.errors.passwordRequired"))
      .min(6, t("auth.errors.passwordMin")),
  });

  const InputField = memo(function InputField({
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    keyboardType,
    autoCapitalize = "none",
    returnKeyType,
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
        returnKeyType={returnKeyType}
        autoCorrect={false}
        autoComplete={autoComplete}
        textContentType={textContentType}
        underlineColorAndroid="transparent"
      />
    );
  });

  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { signIn } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onSubmit",
  });

  const onSubmit = async ({ email, password }) => {
    try {
      setLoading(true);
      await signIn(email.trim().toLowerCase(), password);
    } catch (e) {
      Alert.alert(
        t("auth.errors.signInFailed"),
        e?.message || t("auth.errors.signInFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("auth.signIn.title")}</Text>
          <Text style={styles.subtitle}>{t("auth.signIn.subtitle")}</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <InputField
                value={value}
                onChangeText={onChange}
                placeholder={t("auth.signIn.email")}
                keyboardType="email-address"
                returnKeyType="next"
                autoComplete="email"
                textContentType="emailAddress"
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
                  placeholder={t("auth.signIn.password")}
                  secureTextEntry={!showPass}
                  returnKeyType="done"
                  autoComplete="password"
                  textContentType="password"
                />
              )}
            />

            <Pressable
              style={styles.eyeBtn}
              onPress={() => setShowPass((v) => !v)}
            >
              <Text style={styles.eyeText}>
                {showPass ? t("common.hide") : t("common.show")}
              </Text>
            </Pressable>
          </View>
          {!!errors.password && (
            <Text style={styles.error}>{errors.password.message}</Text>
          )}

          <Pressable
            style={[styles.primaryBtn, loading && styles.disabledBtn]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            <Text style={styles.primaryText}>
              {loading ? t("auth.signIn.signingIn") : t("auth.signIn.signIn")}
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate("SignUp")}
          >
            <Text style={styles.secondaryText}>
              {t("auth.signIn.createAccount")}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t("auth.signIn.noAccount")}</Text>
          <Pressable onPress={() => navigation.navigate("SignUp")}>
            <Text style={styles.link}>{t("auth.signIn.register")}</Text>
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
    paddingTop: 40,
    paddingBottom: 28,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 28,
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
  secondaryBtn: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#A8C8B0",
    backgroundColor: "#FFFFFF",
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
  secondaryText: {
    color: "#5E936C",
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
