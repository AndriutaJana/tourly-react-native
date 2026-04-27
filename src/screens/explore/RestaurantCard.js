import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../theme/useAppTheme";
import { useWishlist } from "../../context/WishlistContext";
import { useTranslation } from "react-i18next";

function formatDistance(distKm) {
  if (typeof distKm !== "number" || !Number.isFinite(distKm)) return null;
  if (distKm < 1) return `${Math.round(distKm * 1000)} m`;
  return `${distKm.toFixed(distKm < 10 ? 1 : 0)} km`;
}

function extractOpenNow(item) {
  const raw = item?.datasource?.raw || item?.original?.datasource?.raw || {};
  const openNow = item?.open_now ?? raw?.open_now ?? raw?.openNow ?? null;
  return typeof openNow === "boolean" ? openNow : null;
}

function extractPriceLevel(item) {
  const raw = item?.datasource?.raw || item?.original?.datasource?.raw || {};
  const p = item?.price_level ?? raw?.price_level ?? raw?.priceLevel ?? null;
  if (typeof p === "number") return "$".repeat(Math.max(1, Math.min(4, p)));
  if (typeof p === "string" && p.trim()) return p.trim();
  return null;
}

export default function RestaurantCard({ item, onPress, onAddToTrip }) {
  if (!item) return null;

  const { t: i18nT } = useTranslation();
  const t = useAppTheme();
  const { add, remove, isSaved } = useWishlist();

  const initialUri = useMemo(() => item?.preview || null, [item?.preview]);
  const [uri, setUri] = useState(initialUri);

  useEffect(() => setUri(initialUri), [initialUri]);

  const xid = item.xid;
  const saved = xid ? isSaved(xid) : false;

  const dist = useMemo(() => formatDistance(item?.distKm), [item?.distKm]);
  const openNow = useMemo(() => extractOpenNow(item), [item]);
  const price = useMemo(() => extractPriceLevel(item), [item]);

  const toggleSave = () => {
    if (!xid) return;
    if (saved) remove(xid);
    else add({ ...item, kind: "restaurant" });
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: t.card,
          borderColor: t.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.thumbWrap,
          { backgroundColor: t.isDark ? "#141414" : "#F3F3F3" },
        ]}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <Ionicons name="restaurant-outline" size={22} color={t.sub} />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
            {item?.name || i18nT("explore.restaurantCard.defaultTitle")}
          </Text>

          <Pressable onPress={toggleSave} hitSlop={10}>
            <Ionicons
              name={saved ? "heart" : "heart-outline"}
              size={20}
              color={saved ? "#E53935" : t.sub}
            />
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          {typeof item?.rate === "number" && (
            <View style={styles.metaItem}>
              <Ionicons name="star" size={14} color={t.sub} />
              <Text style={[styles.metaText, { color: t.sub }]}>
                {item.rate}
              </Text>
            </View>
          )}

          {!!dist && (
            <View style={styles.metaItem}>
              <Ionicons name="navigate-outline" size={14} color={t.sub} />
              <Text style={[styles.metaText, { color: t.sub }]}>{dist}</Text>
            </View>
          )}

          {!!price && (
            <View style={styles.metaItem}>
              <Ionicons name="pricetag-outline" size={14} color={t.sub} />
              <Text style={[styles.metaText, { color: t.sub }]}>{price}</Text>
            </View>
          )}

          {openNow === true && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={t.sub} />
              <Text style={[styles.metaText, { color: t.sub }]}>
                {i18nT("explore.restaurantCard.open")}
              </Text>
            </View>
          )}

          {openNow === false && (
            <View style={styles.metaItem}>
              <Ionicons name="close-circle-outline" size={14} color={t.sub} />
              <Text style={[styles.metaText, { color: t.sub }]}>
                {i18nT("explore.restaurantCard.closed")}
              </Text>
            </View>
          )}
        </View>

        {!!onAddToTrip && (
          <View style={styles.actionsRow}>
            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.();
                onAddToTrip(item);
              }}
              style={[styles.tripBtn, { backgroundColor: t.brand }]}
            >
              <Ionicons name="briefcase-outline" size={16} color="#fff" />
              <Text style={styles.tripBtnText}>
                {i18nT("explore.restaurantCard.addToTrip")}
              </Text>
            </Pressable>
          </View>
        )}

        {!!item?.address && (
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={14} color={t.sub} />
            <Text style={[styles.locText, { color: t.sub }]} numberOfLines={1}>
              {item.address}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  thumbWrap: {
    width: 62,
    height: 62,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumb: { width: "100%", height: "100%" },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  name: { fontSize: 15, fontFamily: "Montserrat_400Regular", flex: 1 },

  metaRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  locRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locText: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    flex: 1,
  },
  actionsRow: {
    marginTop: 10,
    flexDirection: "row",
  },
  tripBtn: {
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tripBtnText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },
});
