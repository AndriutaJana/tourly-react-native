import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useWishlist } from "../../context/WishlistContext";
import { useAppTheme } from "../../../theme/useAppTheme";

const KINDS = [
  "all",
  "hotel",
  "flight",
  "restaurant",
  "attraction",
  "museum",
  "park",
  "historic",
];

export default function WishlistScreen({ navigation }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { items, loading, refresh, remove, clear } = useWishlist();
  const [filter, setFilter] = useState("all");

  const kindLabel = (k) => {
    return t(`wishlist.filters.${k}`);
  };

  const filtered = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    if (filter === "all") return list;
    return list.filter((x) => x?.kind === filter);
  }, [items, filter]);

  const onRemove = useCallback(
    async (xid) => {
      try {
        await remove(xid);
      } catch (e) {
        Alert.alert(
          t("wishlist.title"),
          e?.message || t("wishlist.removeFailed")
        );
      }
    },
    [remove]
  );

  const onClearAll = useCallback(() => {
    Alert.alert(t("wishlist.clearTitle"), t("wishlist.clearMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("wishlist.clear"),
        style: "destructive",
        onPress: async () => {
          try {
            await clear();
          } catch (e) {
            Alert.alert(
              t("wishlist.title"),
              e?.message || t("wishlist.clearFailed")
            );
          }
        },
      },
    ]);
  }, [clear]);

  const openItem = useCallback(
    (item) => {
      const kind = item?.kind;

      if (kind === "hotel") {
        const hotelId =
          item?.hotelId ||
          item?.payload?.hotelId ||
          item?.payload?.id ||
          item?.payload?.hotel_id;

        if (!hotelId) {
          Alert.alert(t("wishlist.title"), t("wishlist.missingHotelId"));
          return;
        }

        navigation.navigate("HotelDetails", {
          hotelId: String(hotelId),
        });
        return;
      }

      if (kind === "flight") {
        const offer = item?.offer;

        if (!offer) {
          Alert.alert(t("wishlist.title"), t("wishlist.invalidFlight"));
          return;
        }

        navigation.navigate("FlightDetails", { offer });
        return;
      }

      if (
        kind === "attraction" ||
        kind === "museum" ||
        kind === "park" ||
        kind === "historic" ||
        kind === "restaurant"
      ) {
        if (!item?.xid) {
          Alert.alert(t("wishlist.title"), t("wishlist.missingPlaceId"));
          return;
        }

        navigation.getParent()?.navigate("Explore", {
          screen: "PlaceDetails",
          params: {
            xid: item.xid,
            kind: kind,
          },
        });

        return;
      }
    },
    [navigation]
  );

  const renderRow = ({ item }) => {
    const kind = item?.kind || "unknown";
    const img = item?.preview || null;

    const badgeConfig = {
      flight: { icon: "airplane-outline", text: t("wishlist.badges.flight") },
      hotel: { icon: "bed-outline", text: t("wishlist.badges.hotel") },
      restaurant: {
        icon: "restaurant-outline",
        text: t("wishlist.badges.restaurant"),
      },
      attraction: {
        icon: "sparkles-outline",
        text: t("wishlist.badges.attraction"),
      },
      museum: { icon: "business-outline", text: t("wishlist.badges.museum") },
      park: { icon: "leaf-outline", text: t("wishlist.badges.park") },
      historic: {
        icon: "library-outline",
        text: t("wishlist.badges.historic"),
      },
    };

    const badge = badgeConfig[kind] || {
      icon: "bookmark-outline",
      text: t("wishlist.badges.saved"),
    };

    return (
      <Pressable
        onPress={() => openItem(item)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.thumb,
            { backgroundColor: theme.bg, borderColor: theme.border },
          ]}
        >
          {img ? (
            <Image source={{ uri: img }} style={styles.thumbImg} />
          ) : (
            <Ionicons name={badge.icon} size={20} color={theme.sub} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {item?.title || item?.name || "—"}
          </Text>

          <View style={styles.bottomRow}>
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.bg, borderColor: theme.border },
              ]}
            >
              <Ionicons name={badge.icon} size={12} color={theme.sub} />
              <Text style={[styles.badgeText, { color: theme.sub }]}>
                {badge.text}
              </Text>
            </View>

            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.();
                onRemove(item?.xid);
              }}
            >
              <Ionicons name="trash-outline" size={20} color={theme.sub} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t("wishlist.title")} ({filtered.length})
        </Text>

        <Pressable onPress={onClearAll}>
          <Ionicons name="trash-outline" size={22} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.filtersRow}>
        {KINDS.map((k) => {
          const active = filter === k;
          return (
            <Pressable
              key={k}
              onPress={() => setFilter(k)}
              style={[
                styles.filterBtn,
                {
                  backgroundColor: active ? theme.brand : theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: active ? "#fff" : theme.sub },
                ]}
              >
                {kindLabel(k)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(x, i) => String(x?.xid || i)}
        renderItem={renderRow}
        refreshing={loading}
        onRefresh={refresh}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="bookmark-outline" size={26} color={theme.sub} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {t("wishlist.empty")}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 70, paddingHorizontal: 22 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  headerTitle: { fontSize: 18, fontFamily: "Montserrat_400Regular" },

  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },

  filterBtn: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  filterText: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },

  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  thumbImg: { width: "100%", height: "100%" },

  title: { fontSize: 14, fontFamily: "Montserrat_400Regular" },

  bottomRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  badge: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: { fontSize: 11, fontFamily: "Montserrat_400Regular" },

  emptyWrap: {
    alignItems: "center",
    marginTop: 80,
    gap: 8,
  },

  emptyTitle: { fontSize: 16, fontFamily: "Montserrat_400Regular" },
});
