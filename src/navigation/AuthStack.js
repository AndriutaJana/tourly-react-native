import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import OnboardingScreen from "../screens/auth/OnboardingScreen";
import SignInScreen from "../screens/auth/SignInScreen";
import SignUpScreen from "../screens/auth/SignUpScreen";

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ title: t("navigation.onboarding") }}
      />
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ title: t("navigation.signIn") }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ title: t("navigation.signUp") }}
      />
    </Stack.Navigator>
  );
}
