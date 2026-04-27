import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme/useAppTheme";
import { getHotelBookingById } from "../../api/hotelBookingsBackendApi";

function money(total, currency) {
  if (total == null || total === "") return "—";
  const n = Number(total);
  if (!Number.isFinite(n)) return `${total}${currency ? ` ${currency}` : ""}`;
  return `${Math.round(n)}${currency ? ` ${currency}` : ""}`;
}

export default function HotelBookingConfirmationScreen({ navigation, route }) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const bookingId =
    route?.params?.bookingId || route?.params?.booking?.bookingId || null;

  const [booking, setBooking] = useState(route?.params?.booking || null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      const res = await getHotelBookingById(bookingId);
      setBooking(res?.booking || null);
    } catch (e) {
      Alert.alert(
        t("hotelConfirmation.title"),
        e?.message || t("hotelConfirmation.errors.loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [bookingId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const status = String(booking?.status || "pending_payment").toLowerCase();
  const isCancelled = status === "cancelled";
  const isPaid = !!booking?.paidAt || status === "confirmed";

  const vm = useMemo(() => {
    const hotelName = booking?.hotel?.name || t("hotelBooking.hotel");
    const dates = booking?.dates || {};
    const roomName = booking?.room?.name || booking?.room?.code || "—";

    const currency =
      booking?.pricing?.currency || booking?.hotel?.currency || "EUR";

    const total =
      booking?.pricing?.total ??
      (booking?.room?.pricePerNight != null && dates?.nights
        ? Math.round(Number(booking.room.pricePerNight) * Number(dates.nights))
        : null);

    return {
      hotelName,
      checkIn: dates.checkIn || "—",
      checkOut: dates.checkOut || "—",
      nights: dates.nights || "—",
      roomName,
      total,
      currency,
    };
  }, [booking, t]);

  if (!bookingId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.sub, fontFamily: "Montserrat_400Regular" }}>
          {t("hotelConfirmation.missingBookingId")}
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ marginTop: 12 }}
        >
          <Text style={{ color: theme.brand }}>{t("common.back")}</Text>
        </Pressable>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>
            {t("hotelConfirmation.title")}
          </Text>
          <Pressable onPress={load} hitSlop={10}>
            <Ionicons name="refresh-outline" size={20} color={theme.text} />
          </Pressable>
        </View>

        <Text style={{ color: theme.sub }}>
          {loading ? t("common.loading") : t("hotelConfirmation.notFound")}
        </Text>
      </View>
    );
  }

  const titleText = isPaid
    ? t("hotelConfirmation.confirmed")
    : isCancelled
    ? t("hotelConfirmation.cancelled")
    : t("hotelConfirmation.created");

  const subtitleText = isPaid
    ? t("hotelConfirmation.paymentSuccess")
    : isCancelled
    ? t("hotelConfirmation.bookingCancelled")
    : t("hotelConfirmation.paymentPending");

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>
          {t("hotelConfirmation.title")}
        </Text>
        <Pressable onPress={load} hitSlop={10}>
          <Ionicons name="refresh-outline" size={20} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.successRow}>
            <Ionicons
              name={
                isPaid
                  ? "checkmark-circle"
                  : isCancelled
                  ? "close-circle"
                  : "time-outline"
              }
              size={26}
              color={isCancelled ? "#C0392B" : theme.brand}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.h1, { color: theme.text }]}>
                {titleText}
              </Text>
              <Text style={[styles.sub, { color: theme.sub }]}>
                {subtitleText}
              </Text>
            </View>
          </View>

          <View style={[styles.div, { borderTopColor: theme.border }]} />

          <Text style={[styles.label, { color: theme.sub }]}>
            {t("hotelConfirmation.bookingId")}
          </Text>
          <Text style={[styles.bookingId, { color: theme.text }]} selectable>
            {bookingId}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              marginTop: 12,
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.h2, { color: theme.text }]}>
            {t("hotelConfirmation.hotel")}
          </Text>

          <Text style={[styles.rowText, { color: theme.text }]}>
            {vm.hotelName}
          </Text>

          <View style={{ marginTop: 10 }}>
            <Text style={[styles.rowText, { color: theme.text }]}>
              <Text style={[styles.labelInline, { color: theme.sub }]}>
                {t("hotelConfirmation.dates")}:
              </Text>{" "}
              {vm.checkIn} → {vm.checkOut} ({vm.nights}{" "}
              {t("hotelBooking.nights")})
            </Text>

            <Text style={[styles.rowText, { color: theme.text }]}>
              <Text style={[styles.labelInline, { color: theme.sub }]}>
                {t("hotelConfirmation.room")}:
              </Text>{" "}
              {vm.roomName}
            </Text>
          </View>

          <View style={[styles.div, { borderTopColor: theme.border }]} />

          <View style={styles.priceRow}>
            <Text style={[styles.label, { color: theme.sub }]}>
              {t("hotelBooking.total")}
            </Text>
            <Text style={[styles.price, { color: theme.text }]}>
              {money(vm.total, vm.currency)}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 14, gap: 10 }}>
          <Pressable
            onPress={() => navigation.popToTop()}
            style={[styles.btn, { backgroundColor: theme.brand }]}
          >
            <Ionicons name="compass-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>
              {t("hotelConfirmation.backToExplore")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("MyHotelBookings")}
            style={[
              styles.btn,
              {
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons name="receipt-outline" size={18} color={theme.text} />
            <Text style={[styles.btnText, { color: theme.text }]}>
              {t("hotelConfirmation.myBookings")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              navigation.navigate("HotelBookingDetails", { bookingId, booking })
            }
            style={[
              styles.btn,
              {
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={theme.text}
            />
            <Text style={[styles.btnText, { color: theme.text }]}>
              {t("hotelConfirmation.viewDetails")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
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
  successRow: { flexDirection: "row", gap: 10, alignItems: "center" },

  h1: { fontSize: 16, fontFamily: "Montserrat_400Regular" },
  h2: { fontSize: 14, fontFamily: "Montserrat_400Regular" },
  sub: { marginTop: 4, fontSize: 12, fontFamily: "Montserrat_400Regular" },

  div: { borderTopWidth: 1, marginTop: 12, paddingTop: 12 },

  label: { fontSize: 12, fontFamily: "Montserrat_400Regular" },
  bookingId: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },

  rowText: { marginTop: 8, fontSize: 13, fontFamily: "Montserrat_400Regular" },
  labelInline: { fontSize: 13, fontFamily: "Montserrat_400Regular" },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: { fontSize: 16, fontFamily: "Montserrat_400Regular" },

  btn: {
    marginTop: 14,
    height: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnText: { color: "#fff", fontFamily: "Montserrat_400Regular" },
});
