import React, { useMemo, useState, useCallback } from "react";
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
import { getBookingById } from "../../api/bookingsBackendApi";

function fmtMin(mins) {
  const n = Number(mins);
  if (!Number.isFinite(n)) return "—";
  const h = Math.floor(n / 60);
  const m = n % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

function money(total, currency) {
  if (total == null || total === "") return "—";
  const n = Number(total);
  if (!Number.isFinite(n)) return `${total}${currency ? ` ${currency}` : ""}`;
  return `${Math.round(n)}${currency ? ` ${currency}` : ""}`;
}

export default function BookingConfirmationScreen({ navigation, route }) {
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
      const res = await getBookingById(bookingId);
      setBooking(res?.booking || null);
    } catch (e) {
      Alert.alert(
        t("bookingConfirmation.confirmation"),
        e?.message || t("bookingConfirmation.failedToLoadBooking")
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

  if (!bookingId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.sub, fontFamily: "Montserrat_400Regular" }}>
          {t("bookingConfirmation.missingBookingId")}
        </Text>
        <Pressable
          onPress={() => navigation.navigate("MyBookings")}
          style={{ marginTop: 12 }}
        >
          <Text
            style={{ color: theme.brand, fontFamily: "Montserrat_400Regular" }}
          >
            {t("bookingConfirmation.goToMyBookings")}
          </Text>
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
            {t("bookingConfirmation.confirmation")}
          </Text>
          <Pressable onPress={load} hitSlop={10}>
            <Ionicons name="refresh-outline" size={20} color={theme.text} />
          </Pressable>
        </View>

        <Text style={{ color: theme.sub, fontFamily: "Montserrat_400Regular" }}>
          {loading
            ? t("bookingConfirmation.loading")
            : t("bookingConfirmation.bookingNotFound")}
        </Text>
      </View>
    );
  }

  const status = String(booking?.status || "pending_payment").toLowerCase();
  const isPaid = !!booking?.paidAt || status === "confirmed";

  const titleText = isPaid
    ? t("bookingConfirmation.bookingConfirmed")
    : t("bookingConfirmation.bookingCreated");

  const subtitleText = isPaid
    ? t("bookingConfirmation.paymentCompleted")
    : t("bookingConfirmation.paymentPendingMessage");

  const summary = useMemo(() => {
    const offer = booking?.offer;
    const passenger = booking?.passenger;
    const segs = offer?.itineraries?.[0]?.segments || [];
    const first = segs[0];
    const last = segs[segs.length - 1];

    const from = first?.departure?.iataCode || "—";
    const to = last?.arrival?.iataCode || "—";
    const depAt = first?.departure?.at || "";
    const arrAt = last?.arrival?.at || "";

    const depDate = depAt ? depAt.slice(0, 10) : "—";
    const depTime = depAt ? depAt.slice(11, 16) : "—";
    const arrDate = arrAt ? arrAt.slice(0, 10) : "—";
    const arrTime = arrAt ? arrAt.slice(11, 16) : "—";

    const duration = offer?.itineraries?.[0]?.durationMinutes;
    const stops = Number(offer?.stops ?? Math.max(0, segs.length - 1));
    const airline =
      offer?.airlineName || offer?.validatingAirlineCodes?.[0] || "—";

    const price = offer?.price?.total;
    const currency = offer?.price?.currency;

    return {
      passenger,
      from,
      to,
      depDate,
      depTime,
      arrDate,
      arrTime,
      duration,
      stops,
      airline,
      price,
      currency,
    };
  }, [booking]);

  const stopsLabel =
    summary.stops === 0
      ? t("bookingConfirmation.direct")
      : summary.stops === 1
      ? t("bookingConfirmation.oneStop")
      : t("bookingConfirmation.stops", { count: summary.stops });

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>
          {t("bookingConfirmation.confirmation")}
        </Text>
        <Pressable onPress={load} hitSlop={10}>
          <Ionicons name="refresh-outline" size={20} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.successRow}>
            <Ionicons
              name={isPaid ? "checkmark-circle" : "time-outline"}
              size={26}
              color={theme.brand}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
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
            {t("bookingConfirmation.bookingId")}
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
            {t("bookingDetails.passenger")}
          </Text>

          <Text style={[styles.rowText, { color: theme.text }]}>
            <Text style={[styles.labelInline, { color: theme.sub }]}>
              {t("bookingDetails.name")}:{" "}
            </Text>
            {summary.passenger?.fullName || "—"}
          </Text>

          <Text style={[styles.rowText, { color: theme.text }]}>
            <Text style={[styles.labelInline, { color: theme.sub }]}>
              {t("bookingDetails.email")}:{" "}
            </Text>
            {summary.passenger?.email || "—"}
          </Text>

          <Text style={[styles.rowText, { color: theme.text }]}>
            <Text style={[styles.labelInline, { color: theme.sub }]}>
              {t("bookingDetails.phone")}:{" "}
            </Text>
            {summary.passenger?.phone || "—"}
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
            {t("bookingDetails.flightSummary")}
          </Text>

          <Text style={[styles.route, { color: theme.text }]}>
            {summary.from} → {summary.to}
          </Text>
          <Text style={[styles.sub, { color: theme.sub }]}>
            {summary.airline}
          </Text>

          <View style={styles.metaRow}>
            <View
              style={[
                styles.pill,
                { borderColor: theme.border, backgroundColor: theme.bg },
              ]}
            >
              <Ionicons name="calendar-outline" size={14} color={theme.sub} />
              <Text style={[styles.pillText, { color: theme.sub }]}>
                {summary.depDate} {summary.depTime}
              </Text>
            </View>

            <View style={[styles.pill, { borderColor: theme.border }]}>
              <Ionicons name="time-outline" size={14} color={theme.sub} />
              <Text style={[styles.pillText, { color: theme.sub }]}>
                {fmtMin(summary.duration)}
              </Text>
            </View>

            <View style={[styles.pill, { borderColor: theme.border }]}>
              <Ionicons name="git-branch-outline" size={14} color={theme.sub} />
              <Text style={[styles.pillText, { color: theme.sub }]}>
                {stopsLabel}
              </Text>
            </View>
          </View>

          <View style={[styles.div, { borderTopColor: theme.border }]} />

          <View style={styles.priceRow}>
            <Text style={[styles.label, { color: theme.sub }]}>
              {t("bookingDetails.total")}
            </Text>
            <Text style={[styles.price, { color: theme.text }]}>
              {money(summary.price, summary.currency)}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 14, gap: 10 }}>
          <Pressable
            onPress={() => navigation.popToTop()}
            style={[styles.backBtn, { backgroundColor: theme.brand }]}
          >
            <Ionicons name="compass-outline" size={18} color="#fff" />
            <Text style={styles.backText}>
              {t("bookingConfirmation.backToExplore")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("MyBookings")}
            style={[
              styles.backBtn,
              {
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons name="receipt-outline" size={18} color={theme.text} />
            <Text style={[styles.backText, { color: theme.text }]}>
              {t("bookingConfirmation.myBookings")}
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

  route: { marginTop: 8, fontSize: 16, fontFamily: "Montserrat_400Regular" },

  metaRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
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

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: { fontSize: 16, fontFamily: "Montserrat_400Regular" },

  backBtn: {
    marginTop: 14,
    height: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  backText: { color: "#fff", fontFamily: "Montserrat_400Regular" },
});
