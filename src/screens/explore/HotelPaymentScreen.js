import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme/useAppTheme";
import {
  payHotelBooking,
  getHotelBookingById,
} from "../../api/hotelBookingsBackendApi";

function money(total, currency) {
  if (total == null || total === "") return "—";
  const n = Number(total);
  if (!Number.isFinite(n)) return `${total}${currency ? ` ${currency}` : ""}`;
  return `${Math.round(n)}${currency ? ` ${currency}` : ""}`;
}

export default function HotelPaymentScreen({ navigation, route }) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const bookingId =
    route?.params?.bookingId || route?.params?.booking?.bookingId || null;

  const [booking, setBooking] = useState(route?.params?.booking || null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("card_1");

  const cards = useMemo(
    () => [
      { id: "card_1", brand: "Visa", last4: "4242", exp: "12/28" },
      { id: "card_2", brand: "Mastercard", last4: "4444", exp: "09/27" },
      { id: "card_3", brand: "Amex", last4: "0005", exp: "01/29" },
    ],
    []
  );

  const load = useCallback(async () => {
    if (!bookingId) return;
    try {
      const res = await getHotelBookingById(bookingId);
      setBooking(res?.booking || null);
    } catch (e) {
      Alert.alert(
        t("hotelPayment.title"),
        e?.message || t("hotelPayment.errors.loadFailed")
      );
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
          {t("hotelPayment.missingBookingId")}
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ marginTop: 12 }}
        >
          <Text
            style={{ color: theme.brand, fontFamily: "Montserrat_400Regular" }}
          >
            {t("common.back")}
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
            {t("hotelPayment.title")}
          </Text>
          <Pressable onPress={load} hitSlop={10}>
            <Ionicons name="refresh-outline" size={20} color={theme.text} />
          </Pressable>
        </View>

        <Text style={{ color: theme.sub, fontFamily: "Montserrat_400Regular" }}>
          {t("hotelPayment.bookingNotFound")}
        </Text>
      </View>
    );
  }

  const status = String(booking?.status || "pending_payment").toLowerCase();
  const isCancelled = status === "cancelled";
  const isPaid = !!booking?.paidAt || status === "confirmed";

  const hotelName = booking?.hotel?.name || t("hotelPayment.hotel");
  const dates = booking?.dates || {};
  const dateStr = `${dates.checkIn || "—"} → ${dates.checkOut || "—"} (${
    dates.nights || "—"
  } ${t("hotelPayment.nights")})`;

  const currency =
    booking?.pricing?.currency || booking?.hotel?.currency || "EUR";
  const total =
    booking?.pricing?.total ??
    (booking?.room?.pricePerNight != null && dates?.nights
      ? Math.round(Number(booking.room.pricePerNight) * Number(dates.nights))
      : null);

  const canPay =
    !!bookingId && !!selectedId && !loading && !isCancelled && !isPaid;

  const onPay = useCallback(async () => {
    if (!canPay) return;

    try {
      setLoading(true);
      const last4 = cards.find((x) => x.id === selectedId)?.last4 || "4242";

      const res = await payHotelBooking(bookingId, { cardLast4: last4 });

      navigation.replace("HotelBookingConfirmation", {
        bookingId,
        booking: res?.booking,
      });
    } catch (e) {
      Alert.alert(
        t("hotelPayment.title"),
        e?.message || t("hotelPayment.errors.paymentFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [canPay, bookingId, selectedId, cards, navigation, t]);

  if (isPaid) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text
          style={{ color: theme.text, fontFamily: "Montserrat_400Regular" }}
        >
          {t("hotelPayment.alreadyPaid")}
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ marginTop: 12 }}
        >
          <Text
            style={{ color: theme.brand, fontFamily: "Montserrat_400Regular" }}
          >
            {t("common.back")}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (isCancelled) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text
          style={{ color: theme.text, fontFamily: "Montserrat_400Regular" }}
        >
          {t("hotelPayment.cancelled")}
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ marginTop: 12 }}
        >
          <Text
            style={{ color: theme.brand, fontFamily: "Montserrat_400Regular" }}
          >
            {t("common.back")}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>
          {t("hotelPayment.title")}
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
          <Text style={[styles.h2, { color: theme.sub }]}>
            {t("hotelPayment.totalToPay")}
          </Text>
          <Text style={[styles.amount, { color: theme.text }]}>
            {money(total, currency)}
          </Text>

          <Text style={[styles.sub, { color: theme.sub }]} numberOfLines={2}>
            {hotelName}
          </Text>
          <Text style={[styles.sub, { color: theme.sub }]} numberOfLines={2}>
            {dateStr}
          </Text>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t("hotelPayment.selectCard")}
          </Text>

          {cards.map((c) => {
            const selected = c.id === selectedId;
            return (
              <Pressable
                key={c.id}
                onPress={() => setSelectedId(c.id)}
                style={({ pressed }) => [
                  styles.payCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: selected ? theme.brand : theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.cardRow}>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: selected ? theme.brand : theme.border,
                        backgroundColor: selected ? theme.brand : "transparent",
                      },
                    ]}
                  >
                    {selected && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[styles.cardTitle, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {c.brand} •••• {c.last4}
                    </Text>
                    <Text style={[styles.cardSub, { color: theme.sub }]}>
                      {t("hotelPayment.exp")} {c.exp}
                    </Text>
                  </View>

                  <Ionicons name="card-outline" size={20} color={theme.sub} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={[
          styles.sticky,
          { backgroundColor: theme.card, borderTopColor: theme.border },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.stickyAmount, { color: theme.text }]}>
            {money(total, currency)}
          </Text>
          <Text style={[styles.stickySub, { color: theme.sub }]}>
            {t("hotelPayment.secureCheckout")}
          </Text>
        </View>

        <Pressable
          onPress={canPay ? onPay : null}
          disabled={!canPay}
          style={({ pressed }) => [
            styles.payBtn,
            {
              backgroundColor: theme.brand,
              opacity: !canPay ? 0.45 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="lock-closed-outline" size={18} color="#fff" />
          <Text style={styles.payText}>
            {loading ? t("hotelPayment.processing") : t("hotelPayment.payNow")}
          </Text>
        </Pressable>
      </View>
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
  h2: { fontSize: 12, fontFamily: "Montserrat_400Regular" },
  amount: { marginTop: 8, fontSize: 22, fontFamily: "Montserrat_400Regular" },
  sub: { marginTop: 6, fontSize: 12, fontFamily: "Montserrat_400Regular" },

  sectionTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    marginBottom: 8,
  },

  payCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 14, fontFamily: "Montserrat_400Regular" },
  cardSub: { marginTop: 3, fontSize: 12, fontFamily: "Montserrat_400Regular" },

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
  stickyAmount: { fontSize: 18, fontFamily: "Montserrat_400Regular" },
  stickySub: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  payBtn: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  payText: { color: "#fff", fontFamily: "Montserrat_400Regular" },
});
