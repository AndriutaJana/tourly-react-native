import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme/useAppTheme";
import { getPlaceBookings } from "./placesApi";

function formatPrettyDate(date, time, language) {
  if (!date) return time || "—";

  const d = new Date(date);
  const localeMap = {
    en: "en-US",
    ro: "ro-RO",
    ru: "ru-RU",
  };

  const safeDate = Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString(localeMap[language] || "en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });

  return time ? `${safeDate} • ${time}` : safeDate;
}

function statusMeta(status, t) {
  const s = String(status || "").toLowerCase();

  if (s === "confirmed") {
    return {
      label: t("myPlaceBookings.status.confirmed"),
      color: "#16A34A",
      bg: "rgba(22,163,74,0.12)",
      icon: "checkmark-circle",
    };
  }

  if (s === "cancelled") {
    return {
      label: t("myPlaceBookings.status.cancelled"),
      color: "#DC2626",
      bg: "rgba(220,38,38,0.12)",
      icon: "close-circle",
    };
  }

  return {
    label: t("myPlaceBookings.status.pending"),
    color: "#2563EB",
    bg: "rgba(37,99,235,0.12)",
    icon: "time",
  };
}

export default function MyPlaceBookingsScreen({ navigation }) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");
        isRefresh ? setRefreshing(true) : setLoading(true);

        const data = await getPlaceBookings();
        setBookings(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e?.message || t("myPlaceBookings.errors.loadFailed"));
        setBookings([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const shownBookings = useMemo(() => {
    const q = String(query || "")
      .trim()
      .toLowerCase();

    let arr = Array.isArray(bookings) ? [...bookings] : [];

    arr.sort((a, b) =>
      String(b?.createdAt || "").localeCompare(String(a?.createdAt || ""))
    );

    if (filter !== "all") {
      arr = arr.filter(
        (x) => String(x?.status || "confirmed").toLowerCase() === filter
      );
    }

    if (q) {
      arr = arr.filter((x) => {
        const haystack = [
          x?.id,
          x?.placeName,
          x?.placeAddress,
          x?.fullName,
          x?.date,
          x?.time,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    return arr;
  }, [bookings, filter, query]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View
          style={[styles.container, { backgroundColor: theme.bg, flex: 1 }]}
        >
          <FlatList
            data={shownBookings}
            keyExtractor={(item) =>
              item?.id || `${item?.place_id}_${item?.createdAt}`
            }
            refreshing={refreshing}
            onRefresh={() => load(true)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            ListHeaderComponent={
              <View>
                <View style={styles.header}>
                  <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
                    <Ionicons
                      name="chevron-back"
                      size={22}
                      color={theme.text}
                    />
                  </Pressable>

                  <Text style={[styles.title, { color: theme.text }]}>
                    {t("navigation.myPlaceBookings")}
                  </Text>

                  <Pressable onPress={() => load(true)} hitSlop={10}>
                    <Ionicons name="refresh" size={20} color={theme.text} />
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.searchWrap,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Ionicons name="search-outline" size={18} color={theme.sub} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder={t("myPlaceBookings.searchPlaceholder")}
                    placeholderTextColor={theme.sub}
                    style={[styles.searchInput, { color: theme.text }]}
                    returnKeyType="search"
                    blurOnSubmit={false}
                  />
                </View>

                <View style={styles.filtersRow}>
                  {[
                    { id: "all", label: t("myPlaceBookings.filters.all") },
                    {
                      id: "confirmed",
                      label: t("myPlaceBookings.filters.confirmed"),
                    },
                    {
                      id: "cancelled",
                      label: t("myPlaceBookings.filters.cancelled"),
                    },
                  ].map((f) => {
                    const active = filter === f.id;

                    return (
                      <Pressable
                        key={f.id}
                        onPress={() => {
                          Keyboard.dismiss();
                          setFilter(f.id);
                        }}
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: active ? theme.brand : theme.card,
                            borderColor: active ? theme.brand : theme.border,
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

                {!!error && (
                  <Pressable
                    onPress={() => load(true)}
                    style={[styles.errorBox, { borderColor: "#FCA5A5" }]}
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={16}
                      color="#DC2626"
                    />
                    <Text style={styles.errorText}>{error}</Text>
                  </Pressable>
                )}
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View
                  style={[
                    styles.emptyIconWrap,
                    { backgroundColor: theme.isDark ? "#171717" : "#F3F4F6" },
                  ]}
                >
                  <Ionicons
                    name="calendar-clear-outline"
                    size={30}
                    color={theme.sub}
                  />
                </View>

                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  {t("myPlaceBookings.emptyTitle")}
                </Text>

                <Text style={[styles.emptyText, { color: theme.sub }]}>
                  {t("myPlaceBookings.emptyText")}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const meta = statusMeta(item?.status, t);
              const qty = Number(item?.qty || 1);

              return (
                <Pressable
                  onPress={() =>
                    navigation.navigate("PlaceBookingDetails", {
                      bookingId: item.id,
                    })
                  }
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      opacity:
                        String(item?.status || "").toLowerCase() === "cancelled"
                          ? 0.72
                          : 1,
                    },
                  ]}
                >
                  <View style={styles.cardRow}>
                    <View style={styles.previewWrap}>
                      {item?.preview ? (
                        <Image
                          source={{ uri: item.preview }}
                          style={styles.preview}
                        />
                      ) : (
                        <View
                          style={[
                            styles.preview,
                            {
                              backgroundColor: theme.isDark
                                ? "#1B1B1B"
                                : "#F3F4F6",
                              alignItems: "center",
                              justifyContent: "center",
                            },
                          ]}
                        >
                          <Ionicons
                            name="image-outline"
                            size={18}
                            color={theme.sub}
                          />
                        </View>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.cardTop}>
                        <Text
                          style={[styles.cardTitle, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {item?.placeName || t("myPlaceBookings.placeBooking")}
                        </Text>

                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: meta.bg },
                          ]}
                        >
                          <Ionicons
                            name={meta.icon}
                            size={12}
                            color={meta.color}
                          />
                          <Text
                            style={[styles.statusText, { color: meta.color }]}
                          >
                            {meta.label}
                          </Text>
                        </View>
                      </View>

                      {!!item?.placeAddress && (
                        <Text
                          style={[styles.cardAddress, { color: theme.sub }]}
                          numberOfLines={2}
                        >
                          {item.placeAddress}
                        </Text>
                      )}

                      <Text style={[styles.cardSub, { color: theme.sub }]}>
                        {formatPrettyDate(
                          item?.date,
                          item?.time,
                          i18n.language
                        )}
                      </Text>

                      <Text style={[styles.cardSub, { color: theme.sub }]}>
                        {qty}{" "}
                        {qty > 1
                          ? t("myPlaceBookings.tickets")
                          : t("myPlaceBookings.ticket")}
                      </Text>

                      <View style={styles.cardFooter}>
                        <Text
                          style={[styles.bookingId, { color: theme.brand }]}
                        >
                          {item?.id}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={theme.sub}
                        />
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
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
  title: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Montserrat_400Regular",
  },
  searchWrap: {
    height: 48,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  filterChip: {
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },
  errorBox: {
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(220,38,38,0.06)",
  },
  errorText: {
    color: "#B00020",
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    flex: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: "row",
    gap: 12,
  },
  previewWrap: {
    width: 78,
  },
  preview: {
    width: 78,
    height: 78,
    borderRadius: 16,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
  },
  cardAddress: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    lineHeight: 17,
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
  cardSub: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bookingId: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    marginBottom: 8,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Montserrat_400Regular",
  },
});
