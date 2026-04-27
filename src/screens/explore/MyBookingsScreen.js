import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme/useAppTheme";
import { getBookings } from "../../api/bookingsBackendApi";

function money(total, currency) {
  if (total == null || total === "") return "—";
  const n = Number(total);
  if (!Number.isFinite(n)) return `${total}${currency ? ` ${currency}` : ""}`;
  return `${Math.round(n)}${currency ? ` ${currency}` : ""}`;
}

export default function MyBookingsScreen({ navigation }) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getBookings();
      const list = Array.isArray(res) ? res : res?.bookings ?? [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      Alert.alert(
        t("myBookings.title"),
        e?.message || t("myBookings.errors.loadFailed")
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const shownItems = useMemo(() => {
    const arr = Array.isArray(items) ? [...items] : [];

    arr.sort((a, b) => {
      const aStatus = String(a?.status || "pending_payment").toLowerCase();
      const bStatus = String(b?.status || "pending_payment").toLowerCase();

      const aCancelled = aStatus === "cancelled";
      const bCancelled = bStatus === "cancelled";

      const aPaid = !!a?.paidAt;
      const bPaid = !!b?.paidAt;

      if (aCancelled !== bCancelled) return aCancelled ? 1 : -1;
      if (aPaid !== bPaid) return aPaid ? -1 : 1;

      return String(b?.createdAt || "").localeCompare(
        String(a?.createdAt || "")
      );
    });

    if (filter === "all") return arr;

    return arr.filter((x) => {
      const st = String(x?.status || "pending_payment").toLowerCase();
      const cancelled = st === "cancelled";
      const paid = !!x?.paidAt;
      const isRefundRequested =
        x?.refund?.status === "requested" || !!x?.refund?.requestedAt;

      const unpaid = !cancelled && !paid;

      if (filter === "cancelled") return cancelled;
      if (filter === "refund") return !cancelled && isRefundRequested;
      if (filter === "paid") return !cancelled && paid && !isRefundRequested;
      if (filter === "unpaid") return unpaid;

      return true;
    });
  }, [items, filter]);

  const renderItem = useCallback(
    ({ item }) => {
      const offer = item?.offer;
      const segs = offer?.itineraries?.[0]?.segments || [];
      const from = segs?.[0]?.departure?.iataCode || "—";
      const to = segs?.[segs.length - 1]?.arrival?.iataCode || "—";
      const price = offer?.price?.total;
      const currency = offer?.price?.currency;

      const status = String(item?.status || "pending_payment").toLowerCase();

      const isCancelled = status === "cancelled";
      const isPaid = !!item?.paidAt;
      const isRefundRequested =
        item?.refund?.status === "requested" || !!item?.refund?.requestedAt;

      let statusLabel = t("myBookings.status.unpaid");
      let statusBg = "#FEF3C7";
      let statusColor = "#92400E";

      if (isCancelled) {
        statusLabel = t("myBookings.status.cancelled");
        statusBg = "#FDECEA";
        statusColor = "#C0392B";
      } else if (isRefundRequested) {
        statusLabel = t("myBookings.status.refund");
        statusBg = "#E8F0FE";
        statusColor = "#1D4ED8";
      } else if (isPaid) {
        statusLabel = t("myBookings.status.paid");
        statusBg = "#E8F8F1";
        statusColor = "#1E8449";
      }

      return (
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              opacity: isCancelled ? 0.65 : 1,
            },
          ]}
        >
          <View style={styles.cardTopRow}>
            <Text style={[styles.h1, { color: theme.text }]} numberOfLines={1}>
              {from} → {to}
            </Text>

            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: statusBg,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          <Text style={[styles.sub, { color: theme.sub }]}>
            {t("myBookings.bookingId")}: {item?.bookingId || "—"}
          </Text>

          <Text style={[styles.sub, { color: theme.sub }]}>
            {t("myBookings.passenger")}: {item?.passenger?.fullName || "—"}
          </Text>

          <View style={styles.row}>
            <Text style={[styles.price, { color: theme.text }]}>
              {money(price, currency)}
            </Text>

            <Pressable
              onPress={() =>
                navigation.navigate("BookingDetails", {
                  bookingId: item?.bookingId,
                  booking: item,
                })
              }
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              hitSlop={10}
            >
              <Text
                style={{
                  color: theme.brand,
                  fontFamily: "Montserrat_400Regular",
                }}
              >
                {t("common.show")}
              </Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [navigation, theme, t]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>

        <Text style={[styles.title, { color: theme.text }]}>
          {t("navigation.myBookings")}
        </Text>

        <Pressable onPress={load} hitSlop={10}>
          <Ionicons name="refresh-outline" size={20} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.filtersWrap}>
        {[
          { id: "all", label: t("myBookings.filters.all") },
          { id: "paid", label: t("myBookings.filters.paid") },
          { id: "unpaid", label: t("myBookings.filters.unpaid") },
          { id: "refund", label: t("myBookings.filters.refund") },
          { id: "cancelled", label: t("myBookings.filters.cancelled") },
        ].map((f) => {
          const active = filter === f.id;

          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: active ? theme.brand : theme.card,
                  borderColor: active ? theme.brand : theme.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: active ? "#fff" : theme.text },
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading && !items.length ? (
        <Text style={{ color: theme.sub, fontFamily: "Montserrat_400Regular" }}>
          {t("common.loading")}
        </Text>
      ) : !items.length ? (
        <Text style={{ color: theme.sub, fontFamily: "Montserrat_400Regular" }}>
          {t("myBookings.empty")}
        </Text>
      ) : (
        <FlatList
          data={shownItems}
          keyExtractor={(x, i) => String(x?.bookingId ?? i)}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: 20 }}
          refreshing={loading}
          onRefresh={load}
          renderItem={renderItem}
        />
      )}
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

  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  h1: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },

  sub: { marginTop: 6, fontSize: 12, fontFamily: "Montserrat_400Regular" },

  row: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  price: { fontSize: 14, fontFamily: "Montserrat_400Regular" },

  statusPill: {
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  filtersWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },

  filterChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  filterChipText: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },
});
