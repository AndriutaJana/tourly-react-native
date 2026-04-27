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
import { useAppTheme } from "../../../theme/useAppTheme";
import { payBooking, getBookingById } from "../../api/bookingsBackendApi";
import i18n from "../../i18n";
import { useTranslation } from "react-i18next";

function money(total, currency) {
  if (total == null || total === "") return "—";
  const n = Number(total);
  if (!Number.isFinite(n)) return `${total}${currency ? ` ${currency}` : ""}`;
  return `${Math.round(n)}${currency ? ` ${currency}` : ""}`;
}

export default function PaymentScreen({ navigation, route }) {
  const t = useAppTheme();
  const { t: tr } = useTranslation();
  const bookingId = route?.params?.bookingId || null;
  const data = route?.params?.data;

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
      const res = await getBookingById(bookingId);
      setBooking(res?.booking || null);
    } catch (e) {
      Alert.alert(
        tr("payment.payment"),
        e?.message || tr("payment.failedLoad")
      );
    }
  }, [bookingId, tr]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!bookingId) {
    return (
      <View style={[styles.container, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.sub }}>{tr("payment.missingBookingId")}</Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ marginTop: 12 }}
        >
          <Text style={{ color: t.brand }}>{tr("common.back")}</Text>
        </Pressable>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.container, { backgroundColor: t.bg }]}>
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={t.text} />
          </Pressable>
          <Text style={[styles.title, { color: t.text }]}>
            {tr("payment.payment")}
          </Text>
          <Pressable onPress={load} hitSlop={10}>
            <Ionicons name="refresh-outline" size={20} color={t.text} />
          </Pressable>
        </View>

        <Text style={{ color: t.sub }}>{tr("payment.bookingNotFound")}</Text>
      </View>
    );
  }

  const offer = booking?.offer;
  const passenger = booking?.passenger;

  const status = String(booking?.status || "pending_payment").toLowerCase();
  const isCancelled = status === "cancelled";
  const isPaid = !!booking?.paidAt || status === "confirmed";

  const price = offer?.price?.total;
  const currency = offer?.price?.currency;

  const canPay =
    !!offer &&
    !!passenger?.fullName &&
    !!passenger?.email &&
    !!passenger?.phone &&
    !!selectedId &&
    !loading &&
    !isCancelled &&
    !isPaid;

  const onPay = useCallback(async () => {
    if (!canPay) return;

    try {
      setLoading(true);

      const last4 = cards.find((x) => x.id === selectedId)?.last4 || "4242";
      const res = await payBooking(bookingId, { cardLast4: last4 });

      navigation.replace("BookingConfirmation", {
        bookingId,
        booking: res?.booking,
      });
    } catch (e) {
      Alert.alert(
        tr("payment.payment"),
        e?.message || tr("payment.paymentFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [canPay, bookingId, selectedId, cards, navigation, tr]);

  if (isPaid) {
    return (
      <View style={[styles.container, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.text }}>{tr("payment.alreadyPaid")}</Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ marginTop: 12 }}
        >
          <Text style={{ color: t.brand }}>{tr("common.back")}</Text>
        </Pressable>
      </View>
    );
  }

  if (isCancelled) {
    return (
      <View style={[styles.container, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.text }}>{tr("payment.bookingCancelled")}</Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ marginTop: 12 }}
        >
          <Text style={{ color: t.brand }}>{tr("common.back")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>
        <Text style={[styles.title, { color: t.text }]}>
          {tr("payment.payment")}
        </Text>
        <Pressable onPress={load} hitSlop={10}>
          <Ionicons name="refresh-outline" size={20} color={t.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View
          style={[
            styles.card,
            { backgroundColor: t.card, borderColor: t.border },
          ]}
        >
          <Text style={[styles.h2, { color: t.sub }]}>
            {tr("payment.totalToPay")}
          </Text>
          <Text style={[styles.amount, { color: t.text }]}>
            {money(price, currency)}
          </Text>

          {!!data?.routeStr && (
            <Text style={[styles.sub, { color: t.sub }]} numberOfLines={2}>
              {data.routeStr}
            </Text>
          )}
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>
            {tr("payment.selectCard")}
          </Text>

          {cards.map((c) => {
            const selected = c.id === selectedId;
            return (
              <Pressable
                key={c.id}
                onPress={() => setSelectedId(c.id)}
                style={[
                  styles.payCard,
                  {
                    backgroundColor: t.card,
                    borderColor: selected ? t.brand : t.border,
                  },
                ]}
              >
                <View style={styles.cardRow}>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: selected ? t.brand : t.border,
                        backgroundColor: selected ? t.brand : "transparent",
                      },
                    ]}
                  >
                    {selected && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: t.text }]}>
                      {c.brand} •••• {c.last4}
                    </Text>
                    <Text style={[styles.cardSub, { color: t.sub }]}>
                      {tr("payment.exp")} {c.exp}
                    </Text>
                  </View>

                  <Ionicons name="card-outline" size={20} color={t.sub} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={[
          styles.sticky,
          { backgroundColor: t.card, borderTopColor: t.border },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.stickyAmount, { color: t.text }]}>
            {money(price, currency)}
          </Text>
          <Text style={[styles.stickySub, { color: t.sub }]}>
            {tr("payment.secureCheckout")}
          </Text>
        </View>

        <Pressable
          onPress={canPay ? onPay : null}
          disabled={!canPay}
          style={[styles.payBtn, { backgroundColor: t.brand }]}
        >
          <Ionicons name="lock-closed-outline" size={18} color="#fff" />
          <Text style={styles.payText}>
            {loading ? tr("payment.processing") : tr("payment.payNow")}
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
