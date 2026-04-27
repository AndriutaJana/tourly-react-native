import React, { useCallback, useEffect, useMemo, useState, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { TextInput } from "react-native-paper";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useAppTheme } from "../../../theme/useAppTheme";
import { useExploreLocation } from "../../context/ExploreLocationContext";
import RestaurantCard from "./RestaurantCard";
import { placesNearby } from "./placesApi";

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const FILTERS = [
  {
    key: "restaurants",
    label: "Restaurants",
    kind: "restaurant",
    radius: 5000,
  },
  { key: "cafes", label: "Cafes", kind: "restaurant", radius: 5000 },
  { key: "fast", label: "Fast food", kind: "restaurant", radius: 5000 },
  { key: "bars", label: "Bars", kind: "restaurant", radius: 5000 },
  { key: "all", label: "All food", kind: "restaurant", radius: 6000 },
];

const SORTS = [
  { key: "distance", label: "Distance" },
  { key: "rating", label: "Rating" },
  { key: "name", label: "Name" },
];

function hasCategoryPrefix(item, prefixes = []) {
  const cats = item?.original?.categories || item?.categories || [];
  if (!Array.isArray(cats)) return false;
  return prefixes.some((p) =>
    cats.some((c) => typeof c === "string" && c.startsWith(p))
  );
}

function applyFoodFilter(list, filterKey) {
  if (!filterKey || filterKey === "all") return list;

  if (filterKey === "restaurants") {
    return list.filter(
      (x) =>
        hasCategoryPrefix(x, ["catering.restaurant"]) &&
        !hasCategoryPrefix(x, [
          "catering.cafe",
          "catering.fast_food",
          "catering.bar",
          "catering.pub",
        ])
    );
  }

  if (filterKey === "cafes") {
    return list.filter((x) => hasCategoryPrefix(x, ["catering.cafe"]));
  }

  if (filterKey === "fast") {
    return list.filter((x) => hasCategoryPrefix(x, ["catering.fast_food"]));
  }

  if (filterKey === "bars") {
    return list.filter((x) =>
      hasCategoryPrefix(x, ["catering.bar", "catering.pub"])
    );
  }

  return list;
}

function mergeUniqueByXid(prev, next) {
  const map = new Map();
  for (const x of prev) map.set(x.xid, x);
  for (const x of next) map.set(x.xid, x);
  return Array.from(map.values());
}

const FilterChip = memo(function FilterChip({
  item,
  active,
  onPress,
  theme,
  t,
}) {
  const labelMap = {
    restaurants: t("restaurants.filters.restaurants"),
    cafes: t("restaurants.filters.cafes"),
    fast: t("restaurants.filters.fast"),
    bars: t("restaurants.filters.bars"),
    all: t("restaurants.filters.all"),
  };

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.brand : theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <Text
        style={[styles.chipText, { color: active ? "#fff" : theme.text }]}
        numberOfLines={1}
      >
        {labelMap[item.key] || item.label}
      </Text>
    </Pressable>
  );
});

const SortPill = memo(function SortPill({ item, active, onPress, theme, t }) {
  const sortMap = {
    distance: t("restaurants.sort.distance"),
    rating: t("restaurants.sort.rating"),
    name: t("restaurants.sort.name"),
  };

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.sortPill,
        {
          backgroundColor: active ? theme.brand : "transparent",
          borderColor: theme.border,
        },
      ]}
    >
      <Text
        style={[styles.sortText, { color: active ? "#fff" : theme.text }]}
        numberOfLines={1}
      >
        {sortMap[item.key] || item.label}
      </Text>
    </Pressable>
  );
});

const RestaurantsHeader = memo(function RestaurantsHeader({
  theme,
  t,
  navigation,
  subtitle,
  query,
  setQuery,
  filterKey,
  setFilterKey,
  sortKey,
  setSortKey,
  resultsLabel,
  error,
  onRefresh,
}) {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>

        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {t("restaurants.title")}
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.sub }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>

        <Pressable
          onPress={() => navigation.navigate("SelectCity")}
          hitSlop={10}
          style={styles.iconBtn}
        >
          <Ionicons name="location-outline" size={20} color={theme.text} />
        </Pressable>

        <Pressable
          onPress={onRefresh}
          hitSlop={10}
          style={[styles.iconBtn, { marginLeft: 6 }]}
        >
          <Ionicons name="refresh" size={20} color={theme.text} />
        </Pressable>
      </View>

      <TextInput
        mode="outlined"
        placeholder={t("restaurants.searchPlaceholder")}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
        blurOnSubmit={false}
        style={[styles.search, { backgroundColor: theme.card }]}
        outlineStyle={{ borderRadius: 14, borderColor: theme.border }}
        contentStyle={{ fontFamily: "Montserrat_400Regular" }}
        theme={{ colors: { primary: theme.brand } }}
        left={<TextInput.Icon icon="magnify" />}
        right={
          query?.length ? (
            <TextInput.Icon icon="close" onPress={() => setQuery("")} />
          ) : null
        }
      />

      <FlatList
        data={FILTERS}
        keyExtractor={(x) => x.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.chipsRow}
        renderItem={({ item }) => (
          <FilterChip
            item={item}
            active={item.key === filterKey}
            onPress={() => setFilterKey(item.key)}
            theme={theme}
            t={t}
          />
        )}
      />

      <View style={styles.sortRow}>
        <View style={styles.sortLeft}>
          <Text style={[styles.sortLabel, { color: theme.sub }]}>
            {t("restaurants.sort.title")}
          </Text>

          <FlatList
            data={SORTS}
            keyExtractor={(x) => x.key}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            contentContainerStyle={{ paddingLeft: 6 }}
            renderItem={({ item }) => (
              <SortPill
                item={item}
                active={item.key === sortKey}
                onPress={() => setSortKey(item.key)}
                theme={theme}
                t={t}
              />
            )}
          />
        </View>

        <View
          style={[
            styles.resultsBadge,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.resultsText, { color: theme.sub }]}>
            {resultsLabel}
          </Text>
        </View>
      </View>

      {!!error && (
        <Pressable
          onPress={onRefresh}
          style={[
            styles.errorBox,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <Ionicons name="alert-circle-outline" size={18} color="#B00020" />
          <Text
            style={[styles.errorText, { color: "#B00020" }]}
            numberOfLines={2}
          >
            {error} ({t("common.tapToRetry")})
          </Text>
        </Pressable>
      )}

      <View style={[styles.divider, { backgroundColor: theme.border }]} />
    </View>
  );
});

export default function RestaurantsScreen({ navigation }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { location } = useExploreLocation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [baseLoc, setBaseLoc] = useState(null);
  const [raw, setRaw] = useState([]);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterKey, setFilterKey] = useState("restaurants");
  const [sortKey, setSortKey] = useState("distance");
  const [error, setError] = useState(null);
  const [radiusStep, setRadiusStep] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(id);
  }, [query]);

  const resolveBaseLocation = useCallback(async () => {
    const lat = location?.lat;
    const lon = location?.lon;

    if (typeof lat === "number" && typeof lon === "number") {
      return { lat, lon, source: "city" };
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return { lat: null, lon: null, source: "denied" };
    }

    const loc = await Location.getCurrentPositionAsync({});
    return {
      lat: loc.coords.latitude,
      lon: loc.coords.longitude,
      source: "gps",
    };
  }, [location?.lat, location?.lon]);

  const normalizeList = useCallback(
    (list, baseLat, baseLon) => {
      return (list || [])
        .map((x) => {
          const distKm =
            typeof x.lat === "number" && typeof x.lon === "number"
              ? haversineKm(baseLat, baseLon, x.lat, x.lon)
              : null;

          return {
            xid: x.xid,
            name: x.name || t("restaurants.placeFallback"),
            rate: typeof x.rate === "number" ? x.rate : null,
            preview: typeof x.preview === "string" ? x.preview : null,
            fallback: typeof x.fallback === "string" ? x.fallback : null,
            distKm,
            original: x,
          };
        })
        .filter((x) => !!x.xid);
    },
    [t]
  );

  const fetchData = useCallback(
    async (isRefresh = false) => {
      try {
        setError(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setRadiusStep(0);

        const base = await resolveBaseLocation();
        if (typeof base.lat !== "number" || typeof base.lon !== "number") {
          setBaseLoc(null);
          setRaw([]);
          setError(t("restaurants.errors.locationDenied"));
          return;
        }

        const lat = base.lat;
        const lon = base.lon;

        setBaseLoc({ lat, lon });

        const active = FILTERS.find((f) => f.key === filterKey) || FILTERS[0];

        const list = await placesNearby({
          lat,
          lon,
          kind: active.kind,
          radius: active.radius,
        });

        setRaw(normalizeList(list, lat, lon));
      } catch (e) {
        console.log("Restaurants error:", e);
        setError(e?.message || t("restaurants.errors.loadFailed"));
        setRaw([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filterKey, resolveBaseLocation, normalizeList, t]
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || refreshing) return;
    if (!baseLoc?.lat || !baseLoc?.lon) return;

    setLoadingMore(true);

    try {
      const active = FILTERS.find((f) => f.key === filterKey) || FILTERS[0];

      const nextStep = radiusStep + 1;
      const extra =
        nextStep === 1
          ? 2000
          : nextStep === 2
          ? 4000
          : nextStep === 3
          ? 7000
          : 10000;

      const newRadius = Math.min(active.radius + extra, 20000);

      const list = await placesNearby({
        lat: baseLoc.lat,
        lon: baseLoc.lon,
        kind: active.kind,
        radius: newRadius,
      });

      const normalized = normalizeList(list, baseLoc.lat, baseLoc.lon);
      setRaw((prev) => mergeUniqueByXid(prev, normalized));
      setRadiusStep(nextStep);
    } catch (e) {
      console.log("Load more error:", e);
    } finally {
      setLoadingMore(false);
    }
  }, [
    loadingMore,
    loading,
    refreshing,
    baseLoc,
    filterKey,
    radiusStep,
    normalizeList,
  ]);

  const subtitle = useMemo(() => {
    if (location?.city && location?.country) {
      return `${location.city}, ${location.country}`;
    }
    if (baseLoc) {
      return t("restaurants.nearCurrentLocation");
    }
    return "";
  }, [location?.city, location?.country, baseLoc, t]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    let list = applyFoodFilter(raw, filterKey);

    if (q) {
      list = list.filter((x) => (x.name || "").toLowerCase().includes(q));
    }

    if (sortKey === "distance") {
      list = [...list].sort(
        (a, b) => (a.distKm ?? 999999) - (b.distKm ?? 999999)
      );
    } else if (sortKey === "rating") {
      list = [...list].sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
    } else {
      list = [...list].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );
    }

    return list;
  }, [raw, debouncedQuery, sortKey, filterKey]);

  const resultsLabel = useMemo(() => {
    return t("restaurants.results", { count: filtered.length });
  }, [filtered.length, t]);

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
      <View style={[styles.container, { backgroundColor: theme.bg, flex: 1 }]}>
        <RestaurantsHeader
          theme={theme}
          t={t}
          navigation={navigation}
          subtitle={subtitle}
          query={query}
          setQuery={setQuery}
          filterKey={filterKey}
          setFilterKey={setFilterKey}
          sortKey={sortKey}
          setSortKey={setSortKey}
          resultsLabel={resultsLabel}
          error={error}
          onRefresh={() => fetchData(true)}
        />

        <FlatList
          data={filtered}
          keyExtractor={(x) => x.xid}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshing={refreshing}
          onRefresh={() => fetchData(true)}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.35}
          onEndReached={loadMore}
          renderItem={({ item }) => (
            <RestaurantCard
              item={{
                xid: item.xid,
                name: item.name,
                rate: item.rate,
                preview: item.preview || null,
                fallback: item.fallback || null,
                distKm: item.distKm,
                kind: "restaurant",
                ...item.original,
                original: item.original,
              }}
              onPress={() =>
                navigation.navigate("PlaceDetails", {
                  xid: item.xid,
                  kind: "restaurant",
                })
              }
            />
          )}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 12 }}>
                <ActivityIndicator size="small" color={theme.text} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={28} color={theme.sub} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {t("restaurants.emptyTitle")}
              </Text>
              <Text style={[styles.emptySub, { color: theme.sub }]}>
                {t("restaurants.emptySubtitle")}
              </Text>
            </View>
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 58, paddingHorizontal: 18 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  headerWrap: { paddingTop: 8 },

  topRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  titleBlock: { flex: 1, paddingHorizontal: 10 },
  title: { fontSize: 18, fontFamily: "Montserrat_400Regular" },
  subtitle: { marginTop: 2, fontSize: 12, fontFamily: "Montserrat_400Regular" },
  iconBtn: { padding: 6, borderRadius: 10 },

  search: { marginBottom: 10 },

  chipsRow: { paddingVertical: 6, paddingBottom: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 10,
    maxWidth: 140,
  },
  chipText: { fontFamily: "Montserrat_400Regular", fontSize: 12 },

  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  sortLeft: { flex: 1, flexDirection: "row", alignItems: "center" },
  sortLabel: { fontFamily: "Montserrat_400Regular", fontSize: 12 },
  sortPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  sortText: { fontFamily: "Montserrat_400Regular", fontSize: 12 },

  resultsBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resultsText: { fontFamily: "Montserrat_400Regular", fontSize: 12 },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 10,
  },
  errorText: { flex: 1, fontFamily: "Montserrat_400Regular", fontSize: 12 },

  divider: { height: 1, opacity: 0.8, marginBottom: 10 },

  emptyWrap: { marginTop: 28, alignItems: "center", paddingHorizontal: 12 },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    lineHeight: 18,
    textAlign: "center",
  },
});
