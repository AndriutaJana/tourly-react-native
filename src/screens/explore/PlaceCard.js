import React, { useMemo, useState, useEffect, memo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../theme/useAppTheme";
import { useWishlist } from "../../context/WishlistContext";
import { useTranslation } from "react-i18next";

function getKindStyle(kind, t, tr) {
  switch (kind) {
    case "museum":
      return {
        label: tr("placeCard.kindMuseum"),
        bg: t.isDark ? "#2E3A59" : "#E3EDFF",
        text: t.isDark ? "#AFC8FF" : "#1A4ED8",
      };
    case "park":
      return {
        label: tr("placeCard.kindPark"),
        bg: t.isDark ? "#23402A" : "#E6F4EA",
        text: t.isDark ? "#7BE495" : "#1B7F3A",
      };
    case "historic":
      return {
        label: tr("placeCard.kindHistoric"),
        bg: t.isDark ? "#3A2F1E" : "#FFF3E0",
        text: t.isDark ? "#FFD59A" : "#8D5A00",
      };
    case "attraction":
      return {
        label: tr("placeCard.kindAttraction"),
        bg: t.isDark ? "#3D2F2F" : "#FDECEC",
        text: t.isDark ? "#FF9E9E" : "#C62828",
      };
    default:
      return null;
  }
}

function RatingPill({ rate, t }) {
  if (typeof rate !== "number") return null;

  return (
    <View style={[styles.pill, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
      <Ionicons name="star" size={13} color="#F4C430" />
      <Text style={styles.pillText}>{rate}</Text>
    </View>
  );
}

function PlaceCard({ item, onPress, showBadge = true, onAddToTrip }) {
  const t = useAppTheme();
  const { t: tr } = useTranslation();
  const kindStyle = getKindStyle(item?.kind, t, tr);
  const { add, remove, isSaved } = useWishlist();

  const saved = item?.xid ? isSaved(item.xid) : false;

  const initialUri = useMemo(() => item?.preview || null, [item?.preview]);
  const [uri, setUri] = useState(initialUri);

  useEffect(() => {
    setUri(initialUri);
  }, [initialUri]);

  const toggleSave = useCallback(
    (e) => {
      e?.stopPropagation?.();
      if (!item?.xid) return;

      if (saved) {
        remove(item.xid);
      } else {
        add({ ...item, kind: item.kind || "attraction" });
      }
    },
    [item, saved, add, remove]
  );

  const imgBg = t.isDark ? "#1E1E1E" : "#EAEAEA";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: t.card,
          borderColor: t.border,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
          onError={() => {
            if (item?.fallback && uri !== item.fallback) {
              setUri(item.fallback);
            }
          }}
        />
      ) : (
        <View style={[styles.image, { backgroundColor: imgBg }]} />
      )}

      <View style={styles.topOverlay}>
        {showBadge && kindStyle ? (
          <View style={[styles.badge, { backgroundColor: kindStyle.bg }]}>
            <Text style={[styles.badgeText, { color: kindStyle.text }]}>
              {kindStyle.label}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={toggleSave}
          hitSlop={12}
          style={({ pressed }) => [
            styles.heartBtnSimple,
            pressed && styles.heartBtnPressed,
          ]}
        >
          <Ionicons
            name={saved ? "heart" : "heart-outline"}
            size={22}
            color={saved ? (t.isDark ? "#FF6B6B" : "#E25555") : "#fff"}
          />
        </Pressable>
      </View>

      {!!onAddToTrip && (
        <View style={styles.cardFooter}>
          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              onAddToTrip(item);
            }}
            style={[styles.tripBtn, { backgroundColor: t.brand }]}
          >
            <Ionicons name="briefcase-outline" size={16} color="#fff" />
            <Text style={styles.tripBtnText}>{tr("placeCard.addToTrip")}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.bottomOverlay}>
        <View style={styles.bottomShade} />
        <View style={styles.bottomContent}>
          <Text style={styles.title} numberOfLines={1}>
            {item?.name || tr("placeCard.unknownPlace")}
          </Text>
          <RatingPill rate={item?.rate} t={t} />
        </View>
      </View>
    </Pressable>
  );
}

export default memo(PlaceCard);

const styles = StyleSheet.create({
  card: {
    width: 210,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    marginRight: 14,

    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.07,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 3 },
    }),
  },

  image: { width: "100%", height: 132 },

  topOverlay: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  heartBtnSimple: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 6,
    borderRadius: 999,
    backgroundColor: "transparent",
  },

  heartBtnPressed: {
    backgroundColor: "rgba(0,0,0,0.18)",
  },

  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 10,
  },
  badgeText: { fontSize: 10, fontFamily: "Montserrat_400Regular" },

  bottomOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    justifyContent: "flex-end",
  },

  bottomShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.30)",
  },

  bottomContent: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  title: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },
  cardFooter: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  tripBtn: {
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tripBtnText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },
});
