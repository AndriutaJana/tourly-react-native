import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  ScrollView,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import { useAppTheme } from "../../../theme/useAppTheme";
import { getPlaceBooking, cancelPlaceBooking } from "./placesApi";
import i18n from "../../i18n";
import { useTranslation } from "react-i18next";

function formatPrettyDate(date, time, lang) {
  if (!date) return time || "—";

  const localeMap = {
    en: "en-US",
    ro: "ro-RO",
    ru: "ru-RU",
  };

  const d = new Date(date);
  const safeDate = Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString(localeMap[lang] || "en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  return time ? `${safeDate} • ${time}` : safeDate;
}

function formatCreatedAt(date, lang) {
  if (!date) return "—";

  const localeMap = {
    en: "en-US",
    ro: "ro-RO",
    ru: "ru-RU",
  };

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;

  return d.toLocaleDateString(localeMap[lang] || "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusMeta(status, tr) {
  const s = String(status || "").toLowerCase();

  if (s === "confirmed") {
    return {
      label: tr("placeBookingDetails.confirmed"),
      color: "#16A34A",
      bg: "rgba(22,163,74,0.12)",
      icon: "checkmark-circle",
    };
  }

  if (s === "cancelled") {
    return {
      label: tr("placeBookingDetails.cancelled"),
      color: "#DC2626",
      bg: "rgba(220,38,38,0.12)",
      icon: "close-circle",
    };
  }

  return {
    label: tr("placeBookingDetails.pending"),
    color: "#2563EB",
    bg: "rgba(37,99,235,0.12)",
    icon: "time",
  };
}

function isPastDate(dateStr) {
  if (!dateStr) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;

  d.setHours(0, 0, 0, 0);
  return d < today;
}

export default function PlaceBookingDetailsScreen({ navigation }) {
  const t = useAppTheme();
  const { t: tr } = useTranslation();
  const currentLanguage = i18n.language || "en";
  const route = useRoute();
  const { bookingId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const data = await getPlaceBooking(bookingId);
      setBooking(data);
    } catch (e) {
      setError(e?.message || tr("placeBookingDetails.failedToLoad"));
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId, tr]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const meta = useMemo(
    () => statusMeta(booking?.status, tr),
    [booking?.status, tr]
  );

  const canCancel = useMemo(() => {
    if (!booking) return false;
    if (String(booking?.status || "").toLowerCase() === "cancelled") {
      return false;
    }
    if (isPastDate(booking?.date)) {
      return false;
    }
    return true;
  }, [booking]);

  const openInMaps = async () => {
    try {
      const lat = booking?.lat;
      const lon = booking?.lon;
      if (typeof lat !== "number" || typeof lon !== "number") return;

      const label = encodeURIComponent(
        booking?.placeName || tr("placeBookingDetails.destination")
      );

      const url =
        Platform.OS === "ios"
          ? `http://maps.apple.com/?ll=${lat},${lon}&q=${label}`
          : `geo:${lat},${lon}?q=${lat},${lon}(${label})`;

      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
        return;
      }

      const fallback = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
      await Linking.openURL(fallback);
    } catch (e) {
      Alert.alert(
        tr("placeBookingDetails.maps"),
        e?.message || tr("placeBookingDetails.failedToOpenMaps")
      );
    }
  };

  const handleCancel = () => {
    Alert.alert(
      tr("placeBookingDetails.cancelBooking"),
      tr("placeBookingDetails.cancelBookingConfirm"),
      [
        { text: tr("placeBookingDetails.no"), style: "cancel" },
        {
          text: tr("placeBookingDetails.yesCancel"),
          style: "destructive",
          onPress: async () => {
            try {
              setCancelling(true);
              const updated = await cancelPlaceBooking(booking.id);
              setBooking(updated);
            } catch (e) {
              Alert.alert(
                tr("placeBookingDetails.cancelBooking"),
                e?.message || tr("placeBookingDetails.failedToCancelBooking")
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.text} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg, padding: 24 }]}>
        <Text style={[styles.emptyTitle, { color: t.text }]}>
          {tr("placeBookingDetails.couldNotLoadBookingDetails")}
        </Text>

        {!!error && (
          <Text style={[styles.emptySub, { color: t.sub }]}>{error}</Text>
        )}

        <Pressable
          onPress={load}
          style={[
            styles.retryBtn,
            { backgroundColor: t.card, borderColor: t.border },
          ]}
        >
          <Text style={[styles.retryBtnText, { color: t.text }]}>
            {tr("placeBookingDetails.retry")}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 34 }}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={t.text} />
          </Pressable>

          <Text style={[styles.headerTitle, { color: t.text }]}>
            {tr("placeBookingDetails.bookingDetails")}
          </Text>

          <Pressable onPress={load} hitSlop={10}>
            <Ionicons name="refresh" size={20} color={t.text} />
          </Pressable>
        </View>

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: t.card,
              borderColor: t.border,
            },
          ]}
        >
          {booking?.preview ? (
            <Image source={{ uri: booking.preview }} style={styles.heroImage} />
          ) : (
            <View
              style={[
                styles.heroImage,
                {
                  backgroundColor: t.isDark ? "#1B1B1B" : "#F3F4F6",
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <Ionicons name="image-outline" size={26} color={t.sub} />
            </View>
          )}

          <View style={styles.heroBody}>
            <View style={styles.heroTopRow}>
              <Text
                style={[styles.placeName, { color: t.text }]}
                numberOfLines={2}
              >
                {booking?.placeName || tr("placeBookingDetails.placeBooking")}
              </Text>

              <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon} size={12} color={meta.color} />
                <Text style={[styles.statusText, { color: meta.color }]}>
                  {meta.label}
                </Text>
              </View>
            </View>

            {!!booking?.placeAddress && (
              <View style={styles.inlineRow}>
                <Ionicons name="location-outline" size={15} color={t.sub} />
                <Text
                  style={[styles.heroSub, { color: t.sub }]}
                  numberOfLines={3}
                >
                  {booking.placeAddress}
                </Text>
              </View>
            )}

            <View style={styles.inlineRow}>
              <Ionicons name="calendar-outline" size={15} color={t.sub} />
              <Text style={[styles.heroSub, { color: t.sub }]}>
                {formatPrettyDate(
                  booking?.date,
                  booking?.time,
                  currentLanguage
                )}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: t.card,
              borderColor: t.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: t.text }]}>
            {tr("placeBookingDetails.bookingSummary")}
          </Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: t.sub }]}>
              {tr("placeBookingDetails.bookingId")}
            </Text>
            <Text style={[styles.infoValue, { color: t.text }]}>
              {booking?.id || "—"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: t.sub }]}>
              {tr("placeBookingDetails.date")}
            </Text>
            <Text style={[styles.infoValue, { color: t.text }]}>
              {formatPrettyDate(booking?.date, booking?.time, currentLanguage)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: t.sub }]}>
              {tr("placeBookingDetails.tickets")}
            </Text>
            <Text style={[styles.infoValue, { color: t.text }]}>
              {booking?.qty || 1}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: t.sub }]}>
              {tr("placeBookingDetails.created")}
            </Text>
            <Text style={[styles.infoValue, { color: t.text }]}>
              {formatCreatedAt(booking?.createdAt, currentLanguage)}
            </Text>
          </View>

          {booking?.cancelledAt ? (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: t.sub }]}>
                {tr("placeBookingDetails.cancelledAt")}
              </Text>
              <Text style={[styles.infoValue, { color: t.text }]}>
                {formatCreatedAt(booking?.cancelledAt, currentLanguage)}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: t.card,
              borderColor: t.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: t.text }]}>
            {tr("placeBookingDetails.contact")}
          </Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: t.sub }]}>
              {tr("placeBookingDetails.fullName")}
            </Text>
            <Text style={[styles.infoValue, { color: t.text }]}>
              {booking?.fullName || "—"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: t.sub }]}>
              {tr("placeBookingDetails.email")}
            </Text>
            <Text style={[styles.infoValue, { color: t.text }]}>
              {booking?.email || "—"}
            </Text>
          </View>
        </View>

        <View style={styles.actionsWrap}>
          {!!booking?.place_id && (
            <Pressable
              style={[
                styles.secondaryBtn,
                {
                  backgroundColor: t.card,
                  borderColor: t.border,
                },
              ]}
              onPress={() =>
                navigation.navigate("PlaceDetails", {
                  xid: booking.place_id,
                })
              }
            >
              <Ionicons name="repeat-outline" size={18} color={t.text} />
              <Text style={[styles.secondaryBtnText, { color: t.text }]}>
                {tr("placeBookingDetails.bookAgain")}
              </Text>
            </Pressable>
          )}

          {typeof booking?.lat === "number" &&
          typeof booking?.lon === "number" ? (
            <Pressable
              style={[
                styles.secondaryBtn,
                {
                  backgroundColor: t.card,
                  borderColor: t.border,
                },
              ]}
              onPress={openInMaps}
            >
              <Ionicons name="map-outline" size={18} color={t.text} />
              <Text style={[styles.secondaryBtnText, { color: t.text }]}>
                {tr("placeBookingDetails.openInMaps")}
              </Text>
            </Pressable>
          ) : null}

          {canCancel ? (
            <Pressable
              style={[styles.dangerBtn, cancelling && { opacity: 0.7 }]}
              onPress={handleCancel}
              disabled={cancelling}
            >
              <Ionicons name="close-circle-outline" size={18} color="#fff" />
              <Text style={styles.dangerBtnText}>
                {cancelling
                  ? tr("placeBookingDetails.cancelling")
                  : tr("placeBookingDetails.cancelBooking")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 58,
    paddingHorizontal: 18,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Montserrat_400Regular",
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 14,
  },
  heroImage: {
    width: "100%",
    height: 210,
  },
  heroBody: {
    padding: 16,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  placeName: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
  },
  inlineRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  heroSub: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Montserrat_400Regular",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
  },
  infoRow: {
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(120,120,120,0.18)",
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },
  infoValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },
  actionsWrap: {
    gap: 10,
    paddingBottom: 10,
  },
  secondaryBtn: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  dangerBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  dangerBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySub: {
    marginTop: 8,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    fontFamily: "Montserrat_400Regular",
  },
  retryBtn: {
    marginTop: 16,
    height: 46,
    minWidth: 120,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
