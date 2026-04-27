import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import TripsScreen from "../screens/trips/TripsScreen";
import CreateTripScreen from "../screens/trips/CreateTripScreen";
import TripDetailsScreen from "../screens/trips/TripDetailsScreen";
import SelectTripScreen from "../screens/trips/SelectTripScreen";
import EditTripScreen from "../screens/trips/EditTripScreen";
import TripPlaceDetailsScreen from "../screens/trips/TripPlaceDetailsScreen";

const Stack = createNativeStackNavigator();

export default function TripsStack() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="TripsHome"
        component={TripsScreen}
        options={{ title: t("navigation.tripsHome") }}
      />
      <Stack.Screen
        name="CreateTrip"
        component={CreateTripScreen}
        options={{ title: t("navigation.createTrip") }}
      />
      <Stack.Screen
        name="TripDetails"
        component={TripDetailsScreen}
        options={{ title: t("navigation.tripDetails") }}
      />
      <Stack.Screen
        name="SelectTrip"
        component={SelectTripScreen}
        options={{ title: t("navigation.selectTrip") }}
      />
      <Stack.Screen
        name="EditTrip"
        component={EditTripScreen}
        options={{ title: t("navigation.editTrip") }}
      />
      <Stack.Screen
        name="TripPlaceDetails"
        component={TripPlaceDetailsScreen}
        options={{ title: t("navigation.tripPlaceDetails") }}
      />
    </Stack.Navigator>
  );
}
