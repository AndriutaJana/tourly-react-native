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
import { requestRefund, getBookingById } from "../../api/bookingsBackendApi";

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

function fmtISODate(iso) {
  const s = String(iso || "");
  return s.length >= 10 ? s.slice(0, 10) : "—";
}

function fmtISOTime(iso) {
  const s = String(iso || "");
  return s.length >= 16 ? s.slice(11, 16) : "—";
}

function safeDate(iso) {
  const d = new Date(String(iso || ""));
  return Number.isNaN(d.getTime()) ? null : d;
}

function layoverMinutes(prevSeg, nextSeg) {
  const a = safeDate(prevSeg?.arrival?.at);
  const b = safeDate(nextSeg?.departure?.at);
  if (!a || !b) return NaN;
  const diff = Math.round((b.getTime() - a.getTime()) / 60000);
  return diff >= 0 ? diff : NaN;
}

function SegmentCard({ seg, index, tTheme, t }) {
  const dep = seg?.departure || {};
  const arr = seg?.arrival || {};
  const depAt = dep?.at;
  const arrAt = arr?.at;

  const flightNo = `${seg?.carrierCode || ""}${seg?.number || ""}`.trim();

  return (
    <View
      style={[
        styles.segmentCard,
        { backgroundColor: tTheme.card, borderColor: tTheme.border },
      ]}
    >
      <View style={styles.segmentTop}>
        <Text style={[styles.segTitle, { color: tTheme.text }]}>
          {t("bookingDetails.segment")} {index + 1}
        </Text>

        {!!flightNo && (
          <View
            style={[
              styles.flightNoPill,
              { borderColor: tTheme.border, backgroundColor: tTheme.bg },
            ]}
          >
            <Ionicons name="airplane-outline" size={14} color={tTheme.sub} />
            <Text style={[styles.flightNoText, { color: tTheme.sub }]}>
              {flightNo}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.segRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.big, { color: tTheme.text }]}>
            {dep?.iataCode || "—"}
          </Text>
          <Text style={[styles.sub, { color: tTheme.sub }]}>
            {fmtISODate(depAt)} • {fmtISOTime(depAt)}
          </Text>
          <Text style={[styles.sub, { color: tTheme.sub }]}>
            {t("bookingDetails.terminal")} {dep?.terminal || "—"} •{" "}
            {t("bookingDetails.gate")} {dep?.gate || "—"}
          </Text>
        </View>

        <Ionicons name="arrow-forward" size={18} color={tTheme.sub} />

        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text style={[styles.big, { color: tTheme.text }]}>
            {arr?.iataCode || "—"}
          </Text>
          <Text style={[styles.sub, { color: tTheme.sub }]}>
            {fmtISODate(arrAt)} • {fmtISOTime(arrAt)}
          </Text>
          <Text style={[styles.sub, { color: tTheme.sub }]}>
            {t("bookingDetails.terminal")} {arr?.terminal || "—"} •{" "}
            {t("bookingDetails.gate")} {arr?.gate || "—"}
          </Text>
        </View>
      </View>

      <View style={[styles.div, { borderTopColor: tTheme.border }]} />

      <View style={styles.metaRow}>
        <View
          style={[
            styles.pill,
            { borderColor: tTheme.border, backgroundColor: tTheme.bg },
          ]}
        >
          <Ionicons name="time-outline" size={14} color={tTheme.sub} />
          <Text style={[styles.pillText, { color: tTheme.sub }]}>
            {fmtMin(seg?.durationMinutes)}
          </Text>
        </View>

        <View style={[styles.pill, { borderColor: tTheme.border }]}>
          <Ionicons name="construct-outline" size={14} color={tTheme.sub} />
          <Text style={[styles.pillText, { color: tTheme.sub }]}>
            {t("bookingDetails.aircraft")}: {seg?.aircraft || "—"}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function BookingDetailsScreen({ navigation, route }) {
  const tTheme = useAppTheme();
  const { t } = useTranslation();

  const bookingId =
    route?.params?.bookingId || route?.params?.booking?.bookingId || null;

  const [booking, setBooking] = useState(route?.params?.booking || null);
  const [loading, setLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);

  const load = useCallback(async () => {
    if (!bookingId) return;

    try {
      setLoading(true);
      const res = await getBookingById(bookingId);
      setBooking(res?.booking || null);
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
        setBooking(null);
      } else {
        Alert.alert(
          t("bookingDetails.booking"),
          msg || t("bookingDetails.failedToLoadBooking")
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
    const offer = booking?.offer;
    const passenger = booking?.passenger;

    const segs = offer?.itineraries?.[0]?.segments || [];
    const first = segs[0];
    const last = segs[segs.length - 1];

    const from = first?.departure?.iataCode || "—";
    const to = last?.arrival?.iataCode || "—";
    const depAt = first?.departure?.at || "";
    const arrAt = last?.arrival?.at || "";

    const airline =
      offer?.airlineName || offer?.validatingAirlineCodes?.[0] || "—";

    const duration = offer?.itineraries?.[0]?.durationMinutes;
    const stops = Number.isFinite(Number(offer?.stops))
      ? Number(offer?.stops)
      : Math.max(0, segs.length - 1);

    const price = offer?.price?.total;
    const currency = offer?.price?.currency;

    const status = String(booking?.status || "pending_payment").toLowerCase();

    return {
      offer,
      passenger,
      segs,
      from,
      to,
      depAt,
      arrAt,
      airline,
      duration,
      stops,
      price,
      currency,
      createdAt: booking?.createdAt,
      cancelledAt: booking?.cancelledAt,
      paidAt: booking?.paidAt,
      refund: booking?.refund,
      bookingId: booking?.bookingId || bookingId,
      status,
    };
  }, [booking, bookingId]);

  const isCancelled = vm.status === "cancelled";
  const isPaid = !!vm.paidAt;
  const isRefundRequested =
    vm?.refund?.status === "requested" || !!vm?.refund?.requestedAt;
  const isUnpaid = !isCancelled && !isPaid;

  const showPaymentPending = isUnpaid && !isRefundRequested;

  const stopsLabel =
    vm.stops === 0
      ? t("bookingDetails.direct")
      : vm.stops === 1
      ? t("bookingDetails.oneStop")
      : t("bookingDetails.stops", { count: vm.stops });

  const onPayNow = useCallback(() => {
    navigation.navigate("Payment", {
      bookingId: vm.bookingId,
      booking,
      data: { routeStr: `${vm.from} → ${vm.to}` },
    });
  }, [navigation, vm.bookingId, booking, vm.from, vm.to]);

  const onRefund = useCallback(() => {
    if (!vm.bookingId || refundLoading) return;

    Alert.alert(
      t("bookingDetails.refundRequest"),
      t("bookingDetails.refundConfirmMessage"),
      [
        { text: t("bookingDetails.no"), style: "cancel" },
        {
          text: t("bookingDetails.yesRequest"),
          onPress: async () => {
            try {
              setRefundLoading(true);
              await requestRefund(vm.bookingId);
              await load();
              Alert.alert(
                t("bookingDetails.refund"),
                t("bookingDetails.refundSubmitted")
              );
            } catch (e) {
              Alert.alert(
                t("bookingDetails.refundRequest"),
                e?.message || t("bookingDetails.failedRefundRequest")
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
      <View style={[styles.container, { backgroundColor: tTheme.bg }]}>
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={tTheme.text} />
          </Pressable>
          <Text style={[styles.title, { color: tTheme.text }]}>
            {t("navigation.bookingDetails")}
          </Text>
          <View style={{ width: 22 }} />
        </View>

        <Text
          style={{ color: tTheme.sub, fontFamily: "Montserrat_400Regular" }}
        >
          {t("bookingDetails.missingBookingId")}
        </Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.container, { backgroundColor: tTheme.bg }]}>
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={tTheme.text} />
          </Pressable>
          <Text style={[styles.title, { color: tTheme.text }]}>
            {t("navigation.bookingDetails")}
          </Text>
          <Pressable onPress={load} hitSlop={10}>
            <Ionicons name="refresh-outline" size={20} color={tTheme.text} />
          </Pressable>
        </View>

        <Text
          style={{ color: tTheme.sub, fontFamily: "Montserrat_400Regular" }}
        >
          {loading ? t("bookingDetails.loading") : t("bookingDetails.notFound")}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: tTheme.bg }]}>
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={tTheme.text} />
        </Pressable>

        <Text style={[styles.title, { color: tTheme.text }]}>
          {t("navigation.bookingDetails")}
        </Text>

        <Pressable onPress={load} hitSlop={10}>
          <Ionicons name="refresh-outline" size={20} color={tTheme.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: tTheme.card, borderColor: tTheme.border },
          ]}
        >
          <Text style={[styles.h2, { color: tTheme.text }]}>
            {t("bookingDetails.booking")}
          </Text>

          <Text style={[styles.rowText, { color: tTheme.text }]}>
            <Text style={[styles.labelInline, { color: tTheme.sub }]}>
              {t("bookingDetails.bookingId")}:{" "}
            </Text>
            {vm.bookingId || "—"}
          </Text>

          <Text style={[styles.rowText, { color: tTheme.text }]}>
            <Text style={[styles.labelInline, { color: tTheme.sub }]}>
              {t("bookingDetails.created")}:{" "}
            </Text>
            {vm.createdAt ? new Date(vm.createdAt).toLocaleString() : "—"}
          </Text>

          <Text style={[styles.rowText, { color: tTheme.text }]}>
            <Text style={[styles.labelInline, { color: tTheme.sub }]}>
              {t("bookingDetails.status")}:{" "}
            </Text>
            {isCancelled
              ? t("bookingDetails.cancelled")
              : isRefundRequested
              ? t("bookingDetails.refundRequested")
              : isPaid
              ? t("bookingDetails.paid")
              : t("bookingDetails.unpaid")}
          </Text>

          {showPaymentPending && (
            <View
              style={[
                styles.pendingPill,
                { borderColor: tTheme.border, backgroundColor: "#FEF3C7" },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={14} color="#92400E" />
              <Text style={[styles.pendingText, { color: "#92400E" }]}>
                {t("bookingDetails.paymentPending")}
              </Text>
            </View>
          )}

          {isRefundRequested && (
            <View
              style={[
                styles.pendingPill,
                { borderColor: tTheme.border, backgroundColor: tTheme.bg },
              ]}
            >
              <Ionicons name="repeat-outline" size={14} color={tTheme.sub} />
              <Text style={[styles.pendingText, { color: tTheme.sub }]}>
                {t("bookingDetails.refundRequested")}
              </Text>
            </View>
          )}
        </View>

        {isCancelled && (
          <Text style={[styles.rowText, { color: tTheme.text }]}>
            <Text style={[styles.labelInline, { color: tTheme.sub }]}>
              {t("bookingDetails.cancelledAt")}:{" "}
            </Text>
            {vm.cancelledAt ? new Date(vm.cancelledAt).toLocaleString() : "—"}
          </Text>
        )}

        <View
          style={[
            styles.card,
            {
              marginTop: 12,
              backgroundColor: tTheme.card,
              borderColor: tTheme.border,
            },
          ]}
        >
          <Text style={[styles.h2, { color: tTheme.text }]}>
            {t("bookingDetails.passenger")}
          </Text>

          <Text style={[styles.rowText, { color: tTheme.text }]}>
            <Text style={[styles.labelInline, { color: tTheme.sub }]}>
              {t("bookingDetails.name")}:{" "}
            </Text>
            {vm.passenger?.fullName || "—"}
          </Text>

          <Text style={[styles.rowText, { color: tTheme.text }]}>
            <Text style={[styles.labelInline, { color: tTheme.sub }]}>
              {t("bookingDetails.email")}:{" "}
            </Text>
            {vm.passenger?.email || "—"}
          </Text>

          <Text style={[styles.rowText, { color: tTheme.text }]}>
            <Text style={[styles.labelInline, { color: tTheme.sub }]}>
              {t("bookingDetails.phone")}:{" "}
            </Text>
            {vm.passenger?.phone || "—"}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              marginTop: 12,
              backgroundColor: tTheme.card,
              borderColor: tTheme.border,
            },
          ]}
        >
          <Text style={[styles.h2, { color: tTheme.text }]}>
            {t("bookingDetails.flightSummary")}
          </Text>

          <Text style={[styles.route, { color: tTheme.text }]}>
            {vm.from} → {vm.to}
          </Text>
          <Text style={[styles.sub, { color: tTheme.sub }]}>{vm.airline}</Text>

          <View style={styles.metaRow}>
            <View
              style={[
                styles.pill,
                { borderColor: tTheme.border, backgroundColor: tTheme.bg },
              ]}
            >
              <Ionicons name="calendar-outline" size={14} color={tTheme.sub} />
              <Text style={[styles.pillText, { color: tTheme.sub }]}>
                {fmtISODate(vm.depAt)} {fmtISOTime(vm.depAt)}
              </Text>
            </View>

            <View style={[styles.pill, { borderColor: tTheme.border }]}>
              <Ionicons name="time-outline" size={14} color={tTheme.sub} />
              <Text style={[styles.pillText, { color: tTheme.sub }]}>
                {fmtMin(vm.duration)}
              </Text>
            </View>

            <View style={[styles.pill, { borderColor: tTheme.border }]}>
              <Ionicons
                name="git-branch-outline"
                size={14}
                color={tTheme.sub}
              />
              <Text style={[styles.pillText, { color: tTheme.sub }]}>
                {stopsLabel}
              </Text>
            </View>
          </View>

          <View style={[styles.div, { borderTopColor: tTheme.border }]} />

          <View style={styles.priceRow}>
            <Text style={[styles.label, { color: tTheme.sub }]}>
              {t("bookingDetails.total")}
            </Text>
            <Text style={[styles.price, { color: tTheme.text }]}>
              {money(vm.price, vm.currency)}
            </Text>
          </View>
        </View>

        {isUnpaid && !isRefundRequested && (
          <Pressable
            onPress={onPayNow}
            style={({ pressed }) => [
              styles.payBtn,
              { backgroundColor: tTheme.brand, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="card-outline" size={18} color="#fff" />
            <Text style={styles.payText}>{t("bookingDetails.payNow")}</Text>
          </Pressable>
        )}

        {!isCancelled && isPaid && !isRefundRequested && (
          <Pressable
            onPress={onRefund}
            disabled={refundLoading}
            style={({ pressed }) => [
              styles.refundBtn,
              {
                backgroundColor: "#E67E22",
                opacity: refundLoading ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons name="return-down-back-outline" size={18} color="#fff" />
            <Text style={styles.refundText}>
              {refundLoading
                ? t("bookingDetails.requesting")
                : t("bookingDetails.requestRefund")}
            </Text>
          </Pressable>
        )}

        <View style={{ marginTop: 12 }}>
          <Text style={[styles.h2, { color: tTheme.text, marginBottom: 8 }]}>
            {t("bookingDetails.segments")}
          </Text>

          {vm.segs.map((seg, i) => {
            const prev = i > 0 ? vm.segs[i - 1] : null;
            const layMin = prev ? layoverMinutes(prev, seg) : NaN;

            return (
              <View
                key={`${seg?.carrierCode || "XX"}_${seg?.number || i}_${i}`}
              >
                {i > 0 && Number.isFinite(layMin) && (
                  <View
                    style={[
                      styles.layover,
                      {
                        backgroundColor: tTheme.card,
                        borderColor: tTheme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="pause-circle-outline"
                      size={16}
                      color={tTheme.sub}
                    />
                    <Text style={[styles.layoverText, { color: tTheme.sub }]}>
                      {t("bookingDetails.layover")}: {fmtMin(layMin)}{" "}
                      {t("bookingDetails.in")} {prev?.arrival?.iataCode || "—"}
                    </Text>
                  </View>
                )}

                <SegmentCard seg={seg} index={i} tTheme={tTheme} t={t} />
              </View>
            );
          })}

          {!vm.segs.length && (
            <Text
              style={{ color: tTheme.sub, fontFamily: "Montserrat_400Regular" }}
            >
              {t("bookingDetails.noSegmentData")}
            </Text>
          )}
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

  h2: { fontSize: 14, fontFamily: "Montserrat_400Regular" },
  label: { fontSize: 12, fontFamily: "Montserrat_400Regular" },
  rowText: { marginTop: 8, fontSize: 13, fontFamily: "Montserrat_400Regular" },
  labelInline: { fontSize: 13, fontFamily: "Montserrat_400Regular" },

  route: { marginTop: 8, fontSize: 16, fontFamily: "Montserrat_400Regular" },
  sub: { marginTop: 4, fontSize: 12, fontFamily: "Montserrat_400Regular" },

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

  div: { borderTopWidth: 1, marginTop: 12, paddingTop: 12 },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: { fontSize: 16, fontFamily: "Montserrat_400Regular" },

  segmentCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 10 },
  segmentTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  segTitle: { fontSize: 13, fontFamily: "Montserrat_400Regular" },

  flightNoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
  },
  flightNoText: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  segRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  big: { fontSize: 18, fontFamily: "Montserrat_400Regular" },

  layover: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  layoverText: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  pendingPill: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
  },
  pendingText: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  refundBtn: {
    marginTop: 14,
    height: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  refundText: { color: "#fff", fontFamily: "Montserrat_400Regular" },

  payBtn: {
    marginTop: 14,
    height: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  payText: { color: "#fff", fontFamily: "Montserrat_400Regular" },
});
