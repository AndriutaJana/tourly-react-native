import React from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import ExploreScreen from "../screens/explore/ExploreScreen";
import RestaurantsScreen from "../screens/explore/RestaurantsScreen";

import FlightsScreen from "../screens/explore/FlightsScreen";
import FlightDetailsScreen from "../screens/explore/FlightDetailsScreen";
import FlightBookingScreen from "../screens/explore/FlightBookingScreen";
import PaymentScreen from "../screens/explore/PaymentScreen";
import BookingConfirmationScreen from "../screens/explore/BookingConfirmationScreen";
import BookingDetailsScreen from "../screens/explore/BookingDetailsScreen";
import MyBookingsScreen from "../screens/explore/MyBookingsScreen";
import SavedFlightsScreen from "../screens/explore/SavedFlightsScreen";

import HotelsScreen from "../screens/explore/HotelsScreen";
import HotelDetailsScreen from "../screens/explore/HotelDetailsScreen";

import SelectCityScreen from "../screens/explore/SelectCityScreen";

import HotelPaymentScreen from "../screens/explore/HotelPaymentScreen";
import HotelBookingConfirmationScreen from "../screens/explore/HotelBookingConfirmationScreen";
import HotelBookingDetailsScreen from "../screens/explore/HotelBookingDetailsScreen";
import MyHotelBookingsScreen from "../screens/explore/MyHotelBookingsScreen";
import HotelBookingScreen from "../screens/explore/HotelBookingScreen";
import PlacesListScreen from "../screens/explore/PlacesListScreen";
import PlaceDetailsScreen from "../screens/explore/PlaceDetailsScreen";
import MyPlaceBookingsScreen from "../screens/explore/MyPlaceBookingsScreen";
import PlaceBookingDetailsScreen from "../screens/explore/PlaceBookingDetailsScreen";
import { useExploreLocation } from "../context/ExploreLocationContext";

const Stack = createNativeStackNavigator();

export default function ExploreStack() {
  const { location, locationReady } = useExploreLocation();
  const { t } = useTranslation();

  if (!locationReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={location ? "has-location" : "no-location"}
      screenOptions={{ headerShown: false }}
      initialRouteName={location ? "ExploreHome" : "SelectCity"}
    >
      <Stack.Screen
        name="ExploreHome"
        component={ExploreScreen}
        options={{ title: t("navigation.exploreHome") }}
      />
      <Stack.Screen
        name="SelectCity"
        component={SelectCityScreen}
        options={{ title: t("navigation.selectCity") }}
      />

      <Stack.Screen
        name="Restaurants"
        component={RestaurantsScreen}
        options={{ title: t("navigation.restaurants") }}
      />

      <Stack.Screen
        name="PlacesList"
        component={PlacesListScreen}
        options={{ title: t("navigation.placesList") }}
      />
      <Stack.Screen
        name="PlaceDetails"
        component={PlaceDetailsScreen}
        options={{ title: t("navigation.placeDetails") }}
      />
      <Stack.Screen
        name="MyPlaceBookings"
        component={MyPlaceBookingsScreen}
        options={{ title: t("navigation.myPlaceBookings") }}
      />
      <Stack.Screen
        name="PlaceBookingDetails"
        component={PlaceBookingDetailsScreen}
        options={{ title: t("navigation.placeBookingDetails") }}
      />

      <Stack.Screen
        name="Flights"
        component={FlightsScreen}
        options={{ title: t("navigation.flights") }}
      />
      <Stack.Screen
        name="FlightDetails"
        component={FlightDetailsScreen}
        options={{ title: t("navigation.flightDetails") }}
      />
      <Stack.Screen
        name="FlightBooking"
        component={FlightBookingScreen}
        options={{ title: t("navigation.flightBooking") }}
      />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ title: t("navigation.payment") }}
      />
      <Stack.Screen
        name="BookingConfirmation"
        component={BookingConfirmationScreen}
        options={{ title: t("navigation.bookingConfirmation") }}
      />
      <Stack.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{ title: t("navigation.myBookings") }}
      />
      <Stack.Screen
        name="BookingDetails"
        component={BookingDetailsScreen}
        options={{ title: t("navigation.bookingDetails") }}
      />
      <Stack.Screen
        name="SavedFlights"
        component={SavedFlightsScreen}
        options={{ title: t("navigation.savedFlights") }}
      />

      <Stack.Screen
        name="Hotels"
        component={HotelsScreen}
        options={{ title: t("navigation.hotels") }}
      />
      <Stack.Screen
        name="HotelDetails"
        component={HotelDetailsScreen}
        options={{ title: t("navigation.hotelDetails") }}
      />

      <Stack.Screen
        name="HotelPayment"
        component={HotelPaymentScreen}
        options={{ title: t("navigation.hotelPayment") }}
      />
      <Stack.Screen
        name="HotelBookingConfirmation"
        component={HotelBookingConfirmationScreen}
        options={{ title: t("navigation.hotelBookingConfirmation") }}
      />
      <Stack.Screen
        name="HotelBooking"
        component={HotelBookingScreen}
        options={{ title: t("navigation.hotelBooking") }}
      />
      <Stack.Screen
        name="MyHotelBookings"
        component={MyHotelBookingsScreen}
        options={{ title: t("navigation.myHotelBookings") }}
      />
      <Stack.Screen
        name="HotelBookingDetails"
        component={HotelBookingDetailsScreen}
        options={{ title: t("navigation.hotelBookingDetails") }}
      />
    </Stack.Navigator>
  );
}
