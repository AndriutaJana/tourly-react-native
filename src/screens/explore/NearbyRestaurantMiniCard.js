import React, { memo, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../theme/useAppTheme";
import { useTranslation } from "react-i18next";

function NearbyRestaurantMiniCard({ item, onPress }) {
  const t = useAppTheme();
  const { t: tr } = useTranslation();

  const uri = useMemo(() => item?.preview || null, [item?.preview]);
  const hasRate = typeof item?.rate === "number";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: t.card,
          borderColor: t.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.imgWrap}>
        {uri ? (
          <Image source={{ uri }} style={styles.img} resizeMode="cover" />
        ) : (
          <View
            style={[
              styles.imgFallback,
              { backgroundColor: t.isDark ? "#222" : "#EAEAEA" },
            ]}
          >
            <Ionicons name="restaurant-outline" size={22} color={t.sub} />
          </View>
        )}

        {hasRate && (
          <View style={styles.pill}>
            <Ionicons name="star" size={12} color="#F4C430" />
            <Text style={styles.pillText}>{item.rate}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
          {item?.name || tr("nearby.restaurant")}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={t.sub} />
          <Text style={[styles.metaText, { color: t.sub }]} numberOfLines={1}>
            {item?.address || tr("nearby.nearby")}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default memo(NearbyRestaurantMiniCard);

const styles = StyleSheet.create({
  card: {
    width: 168,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginRight: 12,

    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.07,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 2 },
    }),
  },

  imgWrap: {
    width: "100%",
    height: 104,
  },

  img: {
    width: "100%",
    height: "100%",
  },

  imgFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  pill: {
    position: "absolute",
    right: 10,
    top: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  pillText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  body: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },

  title: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },

  metaRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  metaText: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },
});
