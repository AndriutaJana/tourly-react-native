import React from "react";
import "./src/i18n";

import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AuthStack from "./src/navigation/AuthStack";
import MainTabs from "./src/navigation/MainTabs";

import { SettingsProvider } from "./src/settings/SettingsProvider";
import { WishlistProvider } from "./src/context/WishlistContext";
import { TripsProvider } from "./src/context/TripsContext";
import { ExploreLocationProvider } from "./src/context/ExploreLocationContext";
import { AuthProvider, useAuth } from "./src/context/AuthContext";

function RootNavigator() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider>
          <AuthProvider>
            <SettingsProvider>
              <WishlistProvider>
                <TripsProvider>
                  <ExploreLocationProvider>
                    <RootNavigator />
                  </ExploreLocationProvider>
                </TripsProvider>
              </WishlistProvider>
            </SettingsProvider>
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
