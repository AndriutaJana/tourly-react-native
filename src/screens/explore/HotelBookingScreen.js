import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TextInput } from "react-native-paper";
import { useTranslation } from "react-i18next";

import { useAppTheme } from "../../../theme/useAppTheme";
import { createHotelBooking } from "../../api/hotelBookingsBackendApi";

function money(total, currency) {
  if (total == null || total === "") return "—";
  const n = Number(total);
  if (!Number.isFinite(n)) return `${total}${currency ? ` ${currency}` : ""}`;
  return `${Math.round(n)}${currency ? ` ${currency}` : ""}`;
}

function isEmailLike(s) {
  const x = String(s || "").trim();
  return x.includes("@") && x.includes(".");
}

export default function HotelBookingScreen({ navigation, route }) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const hotel = route?.params?.hotel;
  const room = route?.params?.room;
  const dates = route?.params?.dates;

  const [fullName, setFullName] = useState(
    route?.params?.guest?.fullName || ""
  );
  const [email, setEmail] = useState(route?.params?.guest?.email || "");
  const [phone, setPhone] = useState(route?.params?.guest?.phone || "");

  const summary = useMemo(() => {
    const title = hotel?.name || t("hotelBooking.hotel");
    const address = hotel?.address || hotel?.city || "—";
    const checkIn = dates?.checkIn || "—";
    const checkOut = dates?.checkOut || "—";
    const nights = dates?.nights ?? "—";

    const currency = room?.currency || hotel?.currency || "EUR";
    const pricePerNight = room?.pricePerNight ?? hotel?.priceFrom ?? null;
    const total =
      pricePerNight != null && Number.isFinite(Number(nights))
        ? Math.round(Number(pricePerNight) * Number(nights))
        : null;

    return {
      title,
      address,
      checkIn,
      checkOut,
      nights,
      currency,
      pricePerNight,
      total,
      roomName: room?.name || t("hotelBooking.room"),
      refundable: !!room?.refundable,
      breakfastIncluded: !!room?.breakfastIncluded,
    };
  }, [hotel, room, dates, t]);

  const canSubmit =
    !!hotel &&
    !!room &&
    !!dates &&
    fullName.trim().length >= 2 &&
    isEmailLike(email) &&
    phone.trim().length >= 5;

  const onContinue = useCallback(async () => {
    try {
      if (!hotel || !room || !dates) {
        Alert.alert(
          t("hotelBooking.title"),
          t("hotelBooking.errors.missingData")
        );
        return;
      }

      if (fullName.trim().length < 2) {
        Alert.alert(
          t("hotelBooking.title"),
          t("hotelBooking.errors.enterFullName")
        );
        return;
      }
      if (!isEmailLike(email)) {
        Alert.alert(
          t("hotelBooking.title"),
          t("hotelBooking.errors.validEmail")
        );
        return;
      }
      if (phone.trim().length < 5) {
        Alert.alert(
          t("hotelBooking.title"),
          t("hotelBooking.errors.enterPhone")
        );
        return;
      }

      const payload = {
        hotel,
        room,
        dates,
        guest: {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
        },
      };

      const res = await createHotelBooking(payload);

      navigation.navigate("HotelPayment", {
        bookingId: res?.bookingId,
        booking: res?.booking,
        data: {
          title: hotel?.name || t("hotelBooking.hotel"),
          dateStr: `${dates.checkIn} → ${dates.checkOut} (${dates.nights} ${t(
            "hotelBooking.nights"
          )})`,
        },
      });
    } catch (e) {
      Alert.alert(
        t("hotelBooking.title"),
        e?.message || t("hotelBooking.errors.continueFailed")
      );
    }
  }, [hotel, room, dates, fullName, email, phone, navigation, t]);

  if (!hotel || !room || !dates) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>
            {t("hotelBooking.title")}
          </Text>
          <View style={{ width: 22 }} />
        </View>

        <Text style={{ color: theme.sub, fontFamily: "Montserrat_400Regular" }}>
          {t("hotelBooking.missingBookingData")}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>
          {t("hotelBooking.title")}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text
            style={[styles.hTitle, { color: theme.text }]}
            numberOfLines={2}
          >
            {summary.title}
          </Text>

          <Text style={[styles.sub, { color: theme.sub }]} numberOfLines={2}>
            <Ionicons name="location-outline" size={14} color={theme.sub} />{" "}
            {summary.address}
          </Text>

          <View style={styles.row}>
            <View
              style={[
                styles.pill,
                { borderColor: theme.border, backgroundColor: theme.bg },
              ]}
            >
              <Ionicons name="calendar-outline" size={14} color={theme.sub} />
              <Text style={[styles.pillText, { color: theme.sub }]}>
                {summary.checkIn} → {summary.checkOut}
              </Text>
            </View>

            <View
              style={[
                styles.pill,
                { borderColor: theme.border, backgroundColor: theme.card },
              ]}
            >
              <Ionicons name="moon-outline" size={14} color={theme.sub} />
              <Text style={[styles.pillText, { color: theme.sub }]}>
                {summary.nights} {t("hotelBooking.nights")}
              </Text>
            </View>
          </View>

          <View style={[styles.sepRow, { borderTopColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.roomName, { color: theme.text }]}
                numberOfLines={1}
              >
                {summary.roomName}
              </Text>
              <Text
                style={[styles.sub, { color: theme.sub }]}
                numberOfLines={1}
              >
                {summary.pricePerNight != null
                  ? `${summary.pricePerNight} ${summary.currency} / ${t(
                      "hotelBooking.night"
                    )}`
                  : `— ${summary.currency} / ${t("hotelBooking.night")}`}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.badge,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.isDark ? "#141414" : "#F6F6F6",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      summary.refundable ? "refresh" : "close-circle-outline"
                    }
                    size={14}
                    color={theme.sub}
                  />
                  <Text style={[styles.badgeText, { color: theme.text }]}>
                    {summary.refundable
                      ? t("hotelDetails.refundable")
                      : t("hotelDetails.nonRefundable")}
                  </Text>
                </View>

                <View
                  style={[
                    styles.badge,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.isDark ? "#141414" : "#F6F6F6",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      summary.breakfastIncluded
                        ? "restaurant"
                        : "remove-circle-outline"
                    }
                    size={14}
                    color={theme.sub}
                  />
                  <Text style={[styles.badgeText, { color: theme.text }]}>
                    {summary.breakfastIncluded
                      ? t("amenities.breakfast")
                      : t("hotelDetails.noBreakfast")}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              marginTop: 12,
            },
          ]}
        >
          <Text style={[styles.hTitle, { color: theme.text }]}>
            {t("hotelBooking.guestDetails")}
          </Text>

          <TextInput
            mode="outlined"
            label={t("hotelBooking.fullName")}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            textContentType="name"
            style={{ marginTop: 10, backgroundColor: theme.card }}
            outlineStyle={{ borderRadius: 12, borderColor: theme.border }}
            theme={{ colors: { primary: theme.brand } }}
          />

          <TextInput
            mode="outlined"
            label={t("hotelBooking.email")}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            style={{ marginTop: 10, backgroundColor: theme.card }}
            outlineStyle={{ borderRadius: 12, borderColor: theme.border }}
            theme={{ colors: { primary: theme.brand } }}
          />

          <TextInput
            mode="outlined"
            label={t("hotelBooking.phone")}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            style={{ marginTop: 10, backgroundColor: theme.card }}
            outlineStyle={{ borderRadius: 12, borderColor: theme.border }}
            theme={{ colors: { primary: theme.brand } }}
          />
        </View>
      </ScrollView>

      <View
        style={[
          styles.sticky,
          { backgroundColor: theme.card, borderTopColor: theme.border },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.price, { color: theme.text }]}>
            {money(summary.total, summary.currency)}
          </Text>
          <Text style={[styles.sub, { color: theme.sub }]}>
            {t("hotelBooking.total")}
          </Text>
        </View>

        <Pressable
          onPress={canSubmit ? onContinue : null}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: theme.brand,
              opacity: !canSubmit ? 0.45 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="card-outline" size={18} color="#fff" />
          <Text style={styles.ctaText}>
            {t("hotelBooking.continueToPayment")}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 70, paddingHorizontal: 22 },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 18, fontFamily: "Montserrat_400Regular" },

  card: { borderRadius: 16, borderWidth: 1, padding: 14 },

  hTitle: { fontSize: 18, fontFamily: "Montserrat_400Regular" },
  sub: { marginTop: 6, fontSize: 12, fontFamily: "Montserrat_400Regular" },

  row: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  sepRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  roomName: { fontSize: 14, fontFamily: "Montserrat_400Regular" },

  badgeRow: { alignItems: "flex-end", gap: 8 },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeText: { fontSize: 11, fontFamily: "Montserrat_400Regular" },

  sticky: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 26,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  price: { fontSize: 18, fontFamily: "Montserrat_400Regular" },

  cta: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: { color: "#fff", fontFamily: "Montserrat_400Regular" },
});
