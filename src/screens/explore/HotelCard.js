import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme/useAppTheme";
import { useWishlist } from "../../context/WishlistContext";

function Stars({ stars = 0, color }) {
  const n = Math.max(0, Math.min(5, Number(stars) || 0));
  return (
    <View style={styles.starsRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < n ? "star" : "star-outline"}
          size={13}
          color={color}
        />
      ))}
    </View>
  );
}

function amenityIcon(a) {
  const map = {
    wifi: "wifi-outline",
    breakfast: "cafe-outline",
    parking: "car-outline",
    pool: "water-outline",
    spa: "flower-outline",
    gym: "barbell-outline",
    restaurant: "restaurant-outline",
    bar: "wine-outline",
    airport_shuttle: "airplane-outline",
    pet_friendly: "paw-outline",
    family_rooms: "people-outline",
    room_service: "bed-outline",
    air_conditioning: "snow-outline",
    laundry: "shirt-outline",
    "24h_reception": "time-outline",
    accessible: "accessibility-outline",
  };
  return map[a] || "checkmark-circle-outline";
}

export default function HotelCard({ item, onPress, mode, onAddToTrip }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { add, remove, isSaved } = useWishlist();

  const xid = `hotel_${item?.id}`;
  const saved = isSaved(xid);

  const preview =
    item?.thumbnail ||
    item?.imageUrl ||
    item?.images?.[0] ||
    item?.media?.[0]?.url ||
    null;

  const toggleSave = async () => {
    try {
      if (saved) {
        await remove(xid);
        return;
      }

      const title = item?.name || t("hotelCard.hotel");

      const subtitleValue =
        item?.neighborhood ||
        (item?.distanceFromCenterKm != null
          ? `${item.distanceFromCenterKm} ${t("hotelCard.kmFromCenter")}`
          : null);

      await add({
        xid,
        kind: "hotel",
        title,
        subtitle: subtitleValue,
        preview,
        city: item?.city || null,
        rating: item?.rating ?? null,
        priceFrom: item?.priceFrom ?? null,
        payload: {
          hotelId: String(item?.id),
          name: title,
          imageUrl: preview,
          city: item?.city || null,
          neighborhood: item?.neighborhood || null,
          distanceFromCenterKm: item?.distanceFromCenterKm ?? null,
          stars: item?.stars ?? null,
          rating: item?.rating ?? null,
          reviewCount: item?.reviewCount ?? null,
          currency: item?.currency || "EUR",
          priceFrom: item?.priceFrom ?? null,
        },
      });
    } catch (e) {
      console.log("toggleSave hotel error:", e?.message);
    }
  };

  const subtitle = useMemo(() => {
    const parts = [];
    if (item?.neighborhood) parts.push(item.neighborhood);
    if (item?.distanceFromCenterKm != null) {
      parts.push(`${item.distanceFromCenterKm} ${t("hotelCard.kmFromCenter")}`);
    }
    return parts.join(" • ");
  }, [item?.neighborhood, item?.distanceFromCenterKm, t]);

  const priceText =
    item?.priceFrom != null
      ? `${t("hotelCard.from")} ${item.priceFrom} ${item.currency || "EUR"}`
      : t("hotelCard.noPrice");

  const amenities = Array.isArray(item?.amenities) ? item.amenities : [];
  const amenShort = amenities.slice(0, 4);

  return (
    <Pressable
      onPress={onPress}
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
          styles.thumbWrap,
          { backgroundColor: theme.isDark ? "#141414" : "#F3F3F3" },
        ]}
      >
        {preview ? (
          <Image
            source={{ uri: preview }}
            style={styles.thumb}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="image-outline" size={22} color={theme.sub} />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            allowFontScaling={false}
            style={[styles.name, { color: theme.text }]}
            numberOfLines={1}
          >
            {item?.name || t("hotelCard.hotel")}
          </Text>

          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              toggleSave();
            }}
            hitSlop={10}
            style={styles.heartBtn}
          >
            <Ionicons
              name={saved ? "heart" : "heart-outline"}
              size={20}
              color={saved ? "#E53935" : theme.sub}
            />
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <Stars stars={item?.stars} color={theme.sub} />

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={theme.sub} />
            <Text
              allowFontScaling={false}
              style={[styles.metaText, { color: theme.sub }]}
            >
              {item?.rating != null ? item.rating : "—"}
            </Text>
            {item?.reviewCount != null ? (
              <Text
                allowFontScaling={false}
                style={[styles.metaText, { color: theme.sub }]}
              >
                ({item.reviewCount})
              </Text>
            ) : null}
          </View>

          {mode === "available" ? (
            <View
              style={[
                styles.badge,
                { borderColor: theme.border, backgroundColor: theme.bg },
              ]}
            >
              <Text
                allowFontScaling={false}
                style={[styles.badgeText, { color: theme.sub }]}
                numberOfLines={1}
              >
                {t("hotelCard.available")}
              </Text>
            </View>
          ) : null}
        </View>

        {!!subtitle && (
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={14} color={theme.sub} />
            <Text
              allowFontScaling={false}
              style={[styles.locText, { color: theme.sub }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          </View>
        )}

        {!!onAddToTrip && (
          <View style={styles.actionsRow}>
            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.();
                onAddToTrip(item);
              }}
              style={[styles.tripBtn, { backgroundColor: theme.brand }]}
            >
              <Ionicons name="briefcase-outline" size={16} color="#fff" />
              <Text allowFontScaling={false} style={styles.tripBtnText}>
                {t("hotelCard.addToTrip")}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.bottomRow}>
          <View
            style={[
              styles.priceWrap,
              { backgroundColor: theme.isDark ? "#141414" : "#F3F3F3" },
            ]}
          >
            <Ionicons name="pricetag-outline" size={14} color={theme.text} />
            <Text
              allowFontScaling={false}
              style={[styles.priceText, { color: theme.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {priceText}
            </Text>
          </View>

          <View style={styles.footerRight}>
            <View style={styles.amenRow}>
              {amenShort.slice(0, 4).map((a, index) => (
                <View
                  key={`${a}-${index}`}
                  style={[
                    styles.amenChip,
                    {
                      backgroundColor: theme.isDark ? "#141414" : "#F3F3F3",
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Ionicons name={amenityIcon(a)} size={14} color={theme.sub} />
                </View>
              ))}
            </View>

            <View style={styles.chevronWrap}>
              <Ionicons name="chevron-forward" size={18} color={theme.sub} />
            </View>
          </View>
        </View>
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
    alignItems: "flex-start",
    minHeight: 134,
  },

  thumbWrap: {
    width: 68,
    height: 68,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },

  thumb: {
    width: "100%",
    height: "100%",
  },

  content: {
    flex: 1,
    minWidth: 0,
    justifyContent: "space-between",
  },
  titleRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  heartBtn: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  name: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
  },

  starsRow: {
    flexDirection: "row",
    gap: 2,
  },

  metaRow: {
    marginTop: 6,
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  metaText: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  badgeText: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
  },

  locRow: {
    marginTop: 8,
    minHeight: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  locText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
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

  bottomRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  priceWrap: {
    flex: 1,
    minWidth: 0,
    height: 32,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  priceText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  footerRight: {
    width: 158,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },

  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },

  amenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },

  amenChip: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronWrap: {
    width: 22,
    height: 28,
    marginLeft: 6,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
