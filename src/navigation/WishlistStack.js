import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import WishlistScreen from "../screens/wishlist/WishlistScreen";
import HotelDetailsScreen from "../screens/explore/HotelDetailsScreen";
import FlightDetailsScreen from "../screens/explore/FlightDetailsScreen";
import PlaceDetailsScreen from "../screens/explore/PlaceDetailsScreen";

const Stack = createNativeStackNavigator();

export default function WishlistStack() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="WishlistHome"
        component={WishlistScreen}
        options={{ title: t("navigation.wishlistHome") }}
      />
      <Stack.Screen
        name="HotelDetails"
        component={HotelDetailsScreen}
        options={{ title: t("navigation.hotelDetails") }}
      />
      <Stack.Screen
        name="FlightDetails"
        component={FlightDetailsScreen}
        options={{ title: t("navigation.flightDetails") }}
      />
      <Stack.Screen
        name="PlaceDetails"
        component={PlaceDetailsScreen}
        options={{ title: t("navigation.placeDetails") }}
      />
    </Stack.Navigator>
  );
}
