import React from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../theme/useAppTheme";

import ExploreStack from "./ExploreStack";
import TripsStack from "./TripsStack";
import ProfileStack from "./ProfileStack";
import WishlistStack from "./WishlistStack";

const Tab = createBottomTabNavigator();

function ActiveIndicator({ focused, color }) {
  if (!focused) return null;
  return <View style={[styles.indicator, { backgroundColor: color }]} />;
}

export default function MainTabs() {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: theme.isDark ? "#111" : theme.brand,
            borderTopColor: theme.border,
          },
        ],

        tabBarLabelStyle: styles.label,
        tabBarActiveTintColor: theme.isDark ? "#FFFFFF" : "#FFFFFF",
        tabBarInactiveTintColor: theme.isDark
          ? "rgba(255,255,255,0.70)"
          : "rgba(255,255,255,0.85)",

        tabBarIcon: ({ focused, color }) => {
          const map = {
            Explore: focused ? "search" : "search-outline",
            Wishlist: focused ? "heart" : "heart-outline",
            Trips: focused ? "leaf" : "leaf-outline",
            Profile: focused ? "person" : "person-outline",
          };

          return (
            <View style={styles.iconWrap}>
              <Ionicons name={map[route.name]} size={22} color={color} />
              <ActiveIndicator focused={focused} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreStack}
        options={{ tabBarLabel: t("tabs.explore") }}
      />
      <Tab.Screen
        name="Wishlist"
        component={WishlistStack}
        options={{ tabBarLabel: t("tabs.wishlist") }}
      />
      <Tab.Screen
        name="Trips"
        component={TripsStack}
        options={{ tabBarLabel: t("tabs.trips") }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ tabBarLabel: t("tabs.profile") }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 78,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    elevation: 0,
  },
  label: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    marginTop: 2,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 52,
  },
  indicator: {
    marginTop: 6,
    width: 28,
    height: 3,
    borderRadius: 3,
    opacity: 0.9,
  },
});
