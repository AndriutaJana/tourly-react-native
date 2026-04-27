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
import {
  getHotelBookingById,
  cancelHotelBooking,
  requestHotelRefund,
} from "../../api/hotelBookingsBackendApi";

function money(total, currency) {
  if (total == null || total === "") return "—";
  const n = Number(total);
  if (!Number.isFinite(n)) return `${total}${currency ? ` ${currency}` : ""}`;
  return `${Math.round(n)}${currency ? ` ${currency}` : ""}`;
}

export default function HotelBookingDetailsScreen({ navigation, route }) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const bookingId =
    route?.params?.bookingId || route?.params?.booking?.bookingId || null;

  const [booking, setBooking] = useState(route?.params?.booking || null);
  const [loading, setLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const load = useCallback(async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      const res = await getHotelBookingById(bookingId);
      setBooking(res?.booking || null);
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
        setBooking(null);
      } else {
        Alert.alert(
          t("hotelBookingDetails.title"),
          msg || t("hotelBookingDetails.errors.loadFailed")
        );
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const vm = useMemo(() => {
    const st = String(booking?.status || "pending_payment").toLowerCase();
    const isCancelled = st === "cancelled";
    const isPaid = !!booking?.paidAt || st === "confirmed";
    const isRefundRequested =
      booking?.refund?.status === "requested" || !!booking?.refund?.requestedAt;

    const currency =
      booking?.pricing?.currency || booking?.hotel?.currency || "EUR";

    return {
      isCancelled,
      isPaid,
      isRefundRequested,
      currency,
      hotelName: booking?.hotel?.name || t("hotelBooking.hotel"),
      dates: booking?.dates || {},
      room: booking?.room || null,
      guest: booking?.guest || {},
      pricing: booking?.pricing || {},
      createdAt: booking?.createdAt,
      paidAt: booking?.paidAt,
      cancelledAt: booking?.cancelledAt,
      bookingId: booking?.bookingId || bookingId,
    };
  }, [booking, bookingId, t]);

  const isUnpaid = booking && !vm.isCancelled && !vm.isPaid;

  const statusLabel = vm.isCancelled
    ? t("hotelBookingDetails.cancelled")
    : vm.isRefundRequested
    ? t("hotelBookingDetails.refundRequested")
    : vm.isPaid
    ? t("hotelBookingDetails.paid")
    : t("hotelBookingDetails.unpaid");

  const onPayNow = useCallback(() => {
    navigation.navigate("HotelPayment", { bookingId: vm.bookingId, booking });
  }, [navigation, vm.bookingId, booking]);

  const onCancel = useCallback(() => {
    if (!vm.bookingId || cancelLoading) return;

    Alert.alert(
      t("hotelBookingDetails.cancelTitle"),
      t("hotelBookingDetails.cancelConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("hotelBookingDetails.yesCancel"),
          style: "destructive",
          onPress: async () => {
            try {
              setCancelLoading(true);
              await cancelHotelBooking(vm.bookingId);
              await load();
              Alert.alert(
                t("hotelBookingDetails.cancelled"),
                t("hotelBookingDetails.cancelSuccess")
              );
            } catch (e) {
              Alert.alert(
                t("hotelBookingDetails.cancelTitle"),
                e?.message || t("hotelBookingDetails.errors.cancelFailed")
              );
            } finally {
              setCancelLoading(false);
            }
          },
        },
      ]
    );
  }, [vm.bookingId, cancelLoading, load, t]);

  const onRefund = useCallback(() => {
    if (!vm.bookingId || refundLoading) return;

    Alert.alert(
      t("hotelBookingDetails.refundTitle"),
      t("hotelBookingDetails.refundConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("hotelBookingDetails.yesRefund"),
          onPress: async () => {
            try {
              setRefundLoading(true);
              await requestHotelRefund(vm.bookingId);
              await load();
              Alert.alert(
                t("hotelBookingDetails.refundRequested"),
                t("hotelBookingDetails.refundSuccess")
              );
            } catch (e) {
              Alert.alert(
                t("hotelBookingDetails.refundTitle"),
                e?.message || t("hotelBookingDetails.errors.refundFailed")
              );
            } finally {
              setRefundLoading(false);
            }
          },
        },
      ]
    );
  }, [vm.bookingId, refundLoading, load, t]);

  if (!bookingId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.sub, fontFamily: "Montserrat_400Regular" }}>
          {t("hotelBookingDetails.missingBookingId")}
        </Text>
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
            {t("hotelBookingDetails.title")}
          </Text>
          <Pressable onPress={load} hitSlop={10}>
            <Ionicons name="refresh-outline" size={20} color={theme.text} />
          </Pressable>
        </View>

        <Text style={{ color: theme.sub, fontFamily: "Montserrat_400Regular" }}>
          {loading ? t("common.loading") : t("hotelBookingDetails.notFound")}
        </Text>
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
          {t("hotelBookingDetails.title")}
        </Text>

        <Pressable onPress={load} hitSlop={10}>
          <Ionicons name="refresh-outline" size={20} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.h2, { color: theme.text }]}>
            {t("hotelBookingDetails.booking")}
          </Text>

          <Text style={[styles.rowText, { color: theme.text }]}>
            <Text style={[styles.labelInline, { color: theme.sub }]}>
              {t("hotelBookingDetails.bookingId")}:
            </Text>{" "}
            {vm.bookingId}
          </Text>

          <Text style={[styles.rowText, { color: theme.text }]}>
            <Text style={[styles.labelInline, { color: theme.sub }]}>
              {t("hotelBookingDetails.status")}:
            </Text>{" "}
            {statusLabel}
          </Text>

          <Text style={[styles.rowText, { color: theme.text }]}>
            <Text style={[styles.labelInline, { color: theme.sub }]}>
              {t("hotelBookingDetails.created")}:
            </Text>{" "}
            {vm.createdAt ? new Date(vm.createdAt).toLocaleString() : "—"}
          </Text>

          {vm.isPaid && vm.paidAt ? (
            <Text style={[styles.rowText, { color: theme.text }]}>
              <Text style={[styles.labelInline, { color: theme.sub }]}>
                {t("hotelBookingDetails.paidAt")}:
              </Text>{" "}
              {new Date(vm.paidAt).toLocaleString()}
            </Text>
          ) : null}

          {vm.isCancelled && vm.cancelledAt ? (
            <Text style={[styles.rowText, { color: theme.text }]}>
              <Text style={[styles.labelInline, { color: theme.sub }]}>
                {t("hotelBookingDetails.cancelledAt")}:
              </Text>{" "}
              {new Date(vm.cancelledAt).toLocaleString()}
            </Text>
          ) : null}
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
            {t("hotelBookingDetails.hotel")}
          </Text>
          <Text style={[styles.route, { color: theme.text }]} numberOfLines={2}>
            {vm.hotelName}
          </Text>

          <View style={[styles.div, { borderTopColor: theme.border }]} />

          <Text style={[styles.rowText, { color: theme.text }]}>
            <Text style={[styles.labelInline, { color: theme.sub }]}>
              {t("hotelBookingDetails.dates")}:
            </Text>{" "}
            {vm.dates?.checkIn || "—"} → {vm.dates?.checkOut || "—"} (
            {vm.dates?.nights || "—"} {t("hotelBooking.nights")})
          </Text>

          <Text style={[styles.rowText, { color: theme.text }]}>
            <Text style={[styles.labelInline, { color: theme.sub }]}>
              {t("hotelBookingDetails.room")}:
            </Text>{" "}
            {vm.room?.name || "—"}
          </Text>

          <View style={[styles.div, { borderTopColor: theme.border }]} />

          <View style={styles.priceRow}>
            <Text style={[styles.label, { color: theme.sub }]}>
              {t("hotelBooking.total")}
            </Text>
            <Text style={[styles.price, { color: theme.text }]}>
              {money(vm.pricing?.total, vm.currency)}
            </Text>
          </View>
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
            {t("hotelBookingDetails.guest")}
          </Text>

          <Text style={[styles.rowText, { color: theme.text }]}>
            <Text style={[styles.labelInline, { color: theme.sub }]}>
              {t("hotelBookingDetails.name")}:
            </Text>{" "}
            {vm.guest?.fullName || "—"}
          </Text>

          <Text style={[styles.rowText, { color: theme.text }]}>
            <Text style={[styles.labelInline, { color: theme.sub }]}>
              {t("hotelBookingDetails.email")}:
            </Text>{" "}
            {vm.guest?.email || "—"}
          </Text>

          <Text style={[styles.rowText, { color: theme.text }]}>
            <Text style={[styles.labelInline, { color: theme.sub }]}>
              {t("hotelBookingDetails.phone")}:
            </Text>{" "}
            {vm.guest?.phone || "—"}
          </Text>
        </View>

        {isUnpaid && (
          <Pressable
            onPress={onPayNow}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: theme.brand, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="card-outline" size={18} color="#fff" />
            <Text style={styles.actionText}>
              {t("hotelBookingDetails.payNow")}
            </Text>
          </Pressable>
        )}

        {isUnpaid && (
          <Pressable
            onPress={onCancel}
            disabled={cancelLoading}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: "#E74C3C",
                opacity: cancelLoading ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons name="close-circle-outline" size={18} color="#fff" />
            <Text style={styles.actionText}>
              {cancelLoading
                ? t("hotelBookingDetails.cancelling")
                : t("hotelBookingDetails.cancelBooking")}
            </Text>
          </Pressable>
        )}

        {!vm.isCancelled && vm.isPaid && !vm.isRefundRequested && (
          <Pressable
            onPress={onRefund}
            disabled={refundLoading}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: "#E67E22",
                opacity: refundLoading ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons name="return-down-back-outline" size={18} color="#fff" />
            <Text style={styles.actionText}>
              {refundLoading
                ? t("hotelBookingDetails.requesting")
                : t("hotelBookingDetails.requestRefund")}
            </Text>
          </Pressable>
        )}
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

  h2: { fontSize: 14, fontFamily: "Montserrat_400Regular" },
  label: { fontSize: 12, fontFamily: "Montserrat_400Regular" },
  rowText: { marginTop: 8, fontSize: 13, fontFamily: "Montserrat_400Regular" },
  labelInline: { fontSize: 13, fontFamily: "Montserrat_400Regular" },

  route: { marginTop: 8, fontSize: 16, fontFamily: "Montserrat_400Regular" },

  div: { borderTopWidth: 1, marginTop: 12, paddingTop: 12 },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: { fontSize: 16, fontFamily: "Montserrat_400Regular" },

  actionBtn: {
    marginTop: 12,
    height: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionText: { color: "#fff", fontFamily: "Montserrat_400Regular" },
});
