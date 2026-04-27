import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TextInput } from "react-native-paper";
import { useTranslation } from "react-i18next";

import { useAppTheme } from "../../../theme/useAppTheme";
import { useExploreLocation } from "../../context/ExploreLocationContext";
import { placesNearby } from "./placesApi";
import PlaceCard from "./PlaceCard";

function normalizeName(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
}
function approxMeters(a, b) {
  const lat1 = a?.lat,
    lon1 = a?.lon;
  const lat2 = b?.lat,
    lon2 = b?.lon;
  if (![lat1, lon1, lat2, lon2].every((n) => typeof n === "number"))
    return Infinity;

  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function pickBetter(a, b) {
  const score = (p) =>
    (typeof p?.rate === "number" ? p.rate : 0) +
    (p?.preview ? 0.5 : 0) +
    (p?.xid ? 0.2 : 0);
  return score(b) > score(a) ? b : a;
}
function dedupePlaces(list = [], thresholdMeters = 80) {
  const groups = new Map();
  for (const item of list) {
    if (!item) continue;
    const nameKey = normalizeName(item.name) || "unknown";
    const clusters = groups.get(nameKey) || [];
    let merged = false;
    for (let i = 0; i < clusters.length; i++) {
      const rep = clusters[i];
      if (approxMeters(rep, item) <= thresholdMeters) {
        clusters[i] = pickBetter(rep, item);
        merged = true;
        break;
      }
    }
    if (!merged) clusters.push(item);
    groups.set(nameKey, clusters);
  }
  return Array.from(groups.values()).flat();
}

function isHistoricPlace(p) {
  const cats = p?.categories || p?.original?.categories || [];
  if (!Array.isArray(cats)) return false;

  return cats.some((c) => {
    const s = String(c || "").toLowerCase();
    return (
      s.includes("heritage") ||
      s.includes("historic") ||
      s.startsWith("building.historic") ||
      s.startsWith("tourism.sights")
    );
  });
}

export default function PlacesListScreen({ route, navigation }) {
  const t = useAppTheme();
  const { t: i18nT } = useTranslation();
  const { location } = useExploreLocation();

  const {
    title = i18nT("placesList.title"),
    kind = "attraction",
    kinds = null,
    radius = 8000,
    detailsRoute = "PlaceDetails",
  } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  const onAddPlaceToTrip = useCallback(
    (item) => {
      navigation.navigate("SelectTrip", {
        item: {
          type: item?.kind || "attraction",
          xid: item?.xid,
          name: item?.name || i18nT("placesList.place"),
          kind: item?.kind || "attraction",
          preview: item?.preview || item?.fallback || null,
          lat: item?.lat ?? null,
          lon: item?.lon ?? null,
          rating: item?.rate ?? null,
          address: item?.address || null,
          estimatedDurationMin:
            item?.kind === "museum" ? 120 : item?.kind === "park" ? 75 : 90,
          estimatedCost: item?.kind === "museum" ? 12 : 0,
          payload: item,
        },
      });
    },
    [navigation, i18nT]
  );

  const load = useCallback(
    async (isRefresh = false) => {
      try {
        setError(null);
        isRefresh ? setRefreshing(true) : setLoading(true);
        if (!location?.lat || !location?.lon) return;

        let list = [];

        if (Array.isArray(kinds) && kinds.length) {
          for (const k of kinds) {
            const arr = await placesNearby({
              lat: location.lat,
              lon: location.lon,
              kind: k,
              radius,
            });

            const withKind = (arr || []).map((x) => ({
              ...x,
              kind: k,
            }));

            list = list.concat(withKind);
          }
        } else {
          let fetchKind = kind;
          if (kind === "historic") fetchKind = "attraction";

          const arr = await placesNearby({
            lat: location.lat,
            lon: location.lon,
            kind: fetchKind,
            radius,
          });

          let mapped = (arr || []).map((x) => ({
            ...x,
            kind,
          }));

          if (kind === "historic") {
            mapped = mapped.filter(isHistoricPlace);
          }

          list = mapped;
        }

        const clean = dedupePlaces(list)
          .slice()
          .sort((a, b) => (b.rate || 0) - (a.rate || 0));

        setData(clean);
      } catch (e) {
        setError(e?.message || i18nT("placesList.failedToLoad"));
        setData([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [location, kind, kinds, radius, i18nT]
  );

  useEffect(() => {
    if (!location) {
      navigation.navigate("SelectCity");
      return;
    }
    load(false);
  }, [location, load, navigation]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((x) => (x.name || "").toLowerCase().includes(q));
  }, [data, query]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.text} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={[styles.container, { backgroundColor: t.bg, flex: 1 }]}>
          <FlatList
            data={filtered}
            keyExtractor={(x) => x.xid || `${x.name}_${x.lat}_${x.lon}`}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ paddingBottom: 26 }}
            refreshing={refreshing}
            onRefresh={() => load(true)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View>
                <View style={styles.header}>
                  <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
                    <Ionicons name="chevron-back" size={22} color={t.text} />
                  </Pressable>

                  <Text
                    style={[styles.title, { color: t.text }]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>

                  <Pressable onPress={() => load(true)} hitSlop={10}>
                    <Ionicons name="refresh" size={20} color={t.text} />
                  </Pressable>
                </View>

                <TextInput
                  mode="outlined"
                  placeholder={i18nT("placesList.search", { title })}
                  value={query}
                  onChangeText={setQuery}
                  style={[styles.search, { backgroundColor: t.card }]}
                  outlineStyle={{ borderRadius: 14, borderColor: t.border }}
                  contentStyle={{ fontFamily: "Montserrat_400Regular" }}
                  theme={{ colors: { primary: t.brand } }}
                  left={<TextInput.Icon icon="magnify" />}
                />

                {!!error && (
                  <Pressable
                    onPress={() => load(true)}
                    style={{ marginBottom: 10 }}
                  >
                    <Text
                      style={{
                        color: "#B00020",
                        fontFamily: "Montserrat_400Regular",
                      }}
                    >
                      {error} ({i18nT("common.tapToRetry")})
                    </Text>
                  </Pressable>
                )}
              </View>
            }
            renderItem={({ item }) => {
              const detailsKind =
                kind === "historic" ? "historic" : item.kind || kind;

              return (
                <Pressable
                  onPress={() =>
                    navigation.navigate(detailsRoute, {
                      xid: item.xid,
                      kind: detailsKind,
                    })
                  }
                  style={[
                    styles.gridCard,
                    { backgroundColor: t.card, borderColor: t.border },
                  ]}
                >
                  <View style={styles.gridImgWrap}>
                    {item.preview ? (
                      <Image
                        source={{ uri: item.preview }}
                        style={styles.gridImg}
                      />
                    ) : (
                      <View
                        style={[
                          styles.gridImg,
                          { backgroundColor: t.isDark ? "#222" : "#ddd" },
                        ]}
                      />
                    )}

                    {typeof item.rate === "number" && (
                      <View style={styles.gridPill}>
                        <Ionicons name="star" size={12} color="#F4C430" />
                        <Text style={styles.gridPillText}>{item.rate}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.gridFooter}>
                    <Text
                      style={[styles.gridTitle, { color: t.text }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>

                    {!!item.address && (
                      <Text
                        style={[styles.gridSub, { color: t.sub }]}
                        numberOfLines={1}
                      >
                        {item.address}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text
                style={{ color: t.sub, fontFamily: "Montserrat_400Regular" }}
              >
                {i18nT("placesList.noResults")}
              </Text>
            }
          />
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 58, paddingHorizontal: 18 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  title: { flex: 1, fontSize: 18, fontFamily: "Montserrat_400Regular" },

  search: { marginBottom: 10 },

  gridCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,

    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 2 },
    }),
  },
  gridImgWrap: {
    width: "100%",
    height: 126,
  },
  gridPill: {
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
  gridPillText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  gridFooter: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },

  gridTitle: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },

  gridSub: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },
  gridImg: { width: "100%", height: 110 },
  gridTitle: {
    paddingHorizontal: 10,
    paddingTop: 10,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },
  gridSub: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },
});
