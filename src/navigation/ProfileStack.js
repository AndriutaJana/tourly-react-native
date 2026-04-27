import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import ProfileScreen from "../screens/profile/ProfileScreen";
import PersonalInfoScreen from "../screens/profile/PersonalInfoScreen";
import ChangePasswordScreen from "../screens/profile/ChangePasswordScreen";
import DeleteAccountScreen from "../screens/profile/DeleteAccountScreen";
import AppSettingsScreen from "../screens/profile/AppSettingsScreen";
import LanguageScreen from "../screens/profile/LanguageScreen";
import PrivacyScreen from "../screens/profile/PrivacyScreen";
import HelpFaqScreen from "../screens/profile/HelpFaqScreen";
import AboutScreen from "../screens/profile/AboutScreen";

const Stack = createNativeStackNavigator();

export default function ProfileStack() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ title: t("navigation.profileHome") }}
      />
      <Stack.Screen
        name="PersonalInfo"
        component={PersonalInfoScreen}
        options={{ title: t("navigation.personalInfo") }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: t("navigation.changePassword") }}
      />
      <Stack.Screen
        name="DeleteAccount"
        component={DeleteAccountScreen}
        options={{ title: t("navigation.deleteAccount") }}
      />
      <Stack.Screen
        name="AppSettings"
        component={AppSettingsScreen}
        options={{ title: t("navigation.appSettings") }}
      />
      <Stack.Screen
        name="Language"
        component={LanguageScreen}
        options={{ title: t("navigation.language") }}
      />
      <Stack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{ title: t("navigation.privacy") }}
      />
      <Stack.Screen
        name="HelpFaq"
        component={HelpFaqScreen}
        options={{ title: t("navigation.helpFaq") }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ title: t("navigation.about") }}
      />
    </Stack.Navigator>
  );
}
