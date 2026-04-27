import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import NearbyRestaurantMiniCard from "./NearbyRestaurantMiniCard";
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
function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function approxMeters(a, b) {
  const lat1 = a?.lat;
  const lon1 = a?.lon;
  const lat2 = b?.lat;
  const lon2 = b?.lon;

  if (![lat1, lon1, lat2, lon2].every((n) => typeof n === "number")) {
    return Infinity;
  }

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

const CategoryChip = React.memo(function CategoryChip({
  item,
  active,
  onPress,
  t,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? t.brand : t.card,
          borderColor: t.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={[styles.chipText, { color: active ? "#fff" : t.text }]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </Pressable>
  );
});

export default function ExploreScreen({ navigation, route }) {
  const t = useAppTheme();
  const { t: i18nT } = useTranslation();
  const insets = useSafeAreaInsets();
  const { location, locationReady } = useExploreLocation();

  const CATEGORIES = useMemo(
    () => [
      {
        key: "tourism",
        label: i18nT("explore.attractions"),
        kind: "attraction",
      },
      { key: "museums", label: i18nT("explore.museums"), kind: "museum" },
      { key: "nature", label: i18nT("explore.parks"), kind: "park" },
      { key: "historic", label: i18nT("explore.historic"), kind: "historic" },
      { key: "all", label: i18nT("explore.all"), kind: "all" },
    ],
    [i18nT]
  );

  const tripId = route?.params?.tripId || null;
  const fromTrip = route?.params?.fromTrip || false;
  const initialCategory = route?.params?.initialCategory || "tourism";
  const focusRestaurants = route?.params?.focusRestaurants || false;
  const mode = route?.params?.mode || "places";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryKey, setCategoryKey] = useState(
    initialCategory === "restaurant" ? "all" : initialCategory
  );
  const [topPlaces, setTopPlaces] = useState([]);
  const [popularPlaces, setPopularPlaces] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    setQuery("");

    if (mode === "restaurants" || focusRestaurants) {
      setCategoryKey("all");
    } else {
      setCategoryKey(initialCategory || "tourism");
    }
  }, [mode, focusRestaurants, initialCategory]);

  const activeCategory = useMemo(() => {
    return CATEGORIES.find((c) => c.key === categoryKey) || CATEGORIES[0];
  }, [categoryKey, CATEGORIES]);

  const loadAll = useCallback(
    async (isRefresh = false) => {
      try {
        setError(null);
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        if (!location?.lat || !location?.lon) {
          setTopPlaces([]);
          setPopularPlaces([]);
          setRestaurants([]);
          return;
        }

        const lat = location.lat;
        const lon = location.lon;

        const active =
          CATEGORIES.find((c) => c.key === categoryKey) || CATEGORIES[0];

        const kindsToFetch =
          active.key === "all"
            ? [{ kind: "attraction" }, { kind: "museum" }, { kind: "park" }]
            : active.key === "historic"
            ? [{ kind: "attraction" }]
            : [{ kind: active.kind }];

        let places = [];

        for (const k of kindsToFetch) {
          const arr = await placesNearby({
            lat,
            lon,
            kind: k.kind,
            radius: 8000,
          });
          places = places.concat(arr || []);
        }

        places = dedupePlaces(places);

        if (active.key === "historic") {
          places = places.filter(isHistoricPlace);
        }

        const sorted = dedupePlaces(
          places.slice().sort((a, b) => (b.rate || 0) - (a.rate || 0))
        );

        const top = sorted.slice(0, 10);
        const rest = sorted.slice(10);

        const isSamePlace = (a, b) =>
          (a?.xid && b?.xid && a.xid === b.xid) ||
          (normalizeName(a?.name) === normalizeName(b?.name) &&
            approxMeters(a, b) <= 80);

        const popularOnly = rest.filter(
          (p) => !top.some((tt) => isSamePlace(tt, p))
        );

        setTopPlaces(top);
        setPopularPlaces(popularOnly);

        let food = await placesNearby({
          lat,
          lon,
          kind: "restaurant",
          radius: 5000,
        });

        food = dedupePlaces(food);
        setRestaurants(food.slice(0, 12));
      } catch (e) {
        console.log("Explore error:", e);
        setError(e?.message || i18nT("explore.exploreFailed"));
        setTopPlaces([]);
        setPopularPlaces([]);
        setRestaurants([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [categoryKey, location, CATEGORIES, i18nT]
  );

  useEffect(() => {
    if (!locationReady) return;
    if (!location) return;

    loadAll(false);
  }, [locationReady, location, loadAll]);

  const filteredTopPlaces = useMemo(() => {
    const q = normalizeText(query);
    const base = dedupePlaces(topPlaces);
    if (!q) return base;

    return base.filter((x) => {
      const name = normalizeText(x.name);
      const address = normalizeText(x.address);
      return name.includes(q) || address.includes(q);
    });
  }, [topPlaces, query]);

  const filteredPopular = useMemo(() => {
    const q = normalizeText(query);
    const base = dedupePlaces(popularPlaces);
    if (!q) return base;

    return base.filter((x) => {
      const name = normalizeText(x.name);
      const address = normalizeText(x.address);
      return name.includes(q) || address.includes(q);
    });
  }, [popularPlaces, query]);

  const filteredRestaurants = useMemo(() => {
    const q = normalizeText(query);
    const base = dedupePlaces(restaurants);
    if (!q) return base;

    return base.filter((x) => {
      const name = normalizeText(x.name);
      const address = normalizeText(x.address);
      return name.includes(q) || address.includes(q);
    });
  }, [restaurants, query]);

  const Header = useMemo(() => {
    return (
      <View style={{ paddingTop: Math.max(insets.top + 8, 18) }}>
        <View style={styles.titleRow}>
          <Text style={[styles.h1, { color: t.text }]}>
            {i18nT("tabs.explore")}
          </Text>
        </View>

        <Pressable
          onPress={() => navigation.navigate("SelectCity")}
          style={({ pressed }) => [
            styles.cityPill,
            {
              backgroundColor: t.card,
              borderColor: t.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="location-outline" size={16} color={t.sub} />
          <Text style={[styles.cityText, { color: t.text }]} numberOfLines={1}>
            {location?.city
              ? `${location.city}, ${location.country}`
              : i18nT("explore.chooseCity")}
          </Text>
          <Text style={[styles.changeText, { color: t.brand }]}>
            {i18nT("common.change")}
          </Text>
        </Pressable>

        <TextInput
          mode="outlined"
          placeholder={i18nT("explore.searchInCategory", {
            category: activeCategory.label.toLowerCase(),
          })}
          value={query}
          onChangeText={setQuery}
          style={[styles.search, { backgroundColor: t.card }]}
          outlineStyle={{ borderRadius: 14, borderColor: t.border }}
          contentStyle={{ fontFamily: "Montserrat_400Regular" }}
          theme={{ colors: { primary: t.brand } }}
          left={<TextInput.Icon icon="magnify" />}
          right={
            <TextInput.Icon icon="refresh" onPress={() => loadAll(true)} />
          }
        />

        <FlatList
          data={CATEGORIES}
          keyExtractor={(x) => x.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          renderItem={({ item }) => (
            <CategoryChip
              item={item}
              t={t}
              active={item.key === categoryKey}
              onPress={() => setCategoryKey(item.key)}
            />
          )}
        />

        <View style={styles.quickRow}>
          <QuickAction
            t={t}
            label={i18nT("navigation.restaurants")}
            icon="restaurant-outline"
            onPress={() => navigation.navigate("Restaurants")}
          />
          <QuickAction
            t={t}
            label={i18nT("navigation.hotels")}
            icon="bed-outline"
            onPress={() =>
              navigation.navigate("Hotels", { cityCode: location?.cityCode })
            }
          />
          <QuickAction
            t={t}
            label={i18nT("navigation.flights")}
            icon="airplane-outline"
            onPress={() =>
              navigation.navigate("Flights", {
                destination: location?.cityCode,
              })
            }
          />
        </View>

        {!!error && (
          <Pressable onPress={() => loadAll(true)} style={{ marginTop: 10 }}>
            <Text
              style={{ color: "#B00020", fontFamily: "Montserrat_400Regular" }}
            >
              {error} ({i18nT("common.tapToRetry")})
            </Text>
          </Pressable>
        )}

        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>
            {activeCategory.key === "all"
              ? i18nT("explore.topPlaces")
              : i18nT("explore.topCategory", {
                  category: activeCategory.label.toLowerCase(),
                })}
          </Text>

          <Pressable
            onPress={() => {
              if (activeCategory.key === "all") {
                navigation.navigate("PlacesList", {
                  title: i18nT("explore.allPlaces"),
                  kinds: ["attraction", "museum", "park"],
                  radius: 8000,
                  detailsRoute: "PlaceDetails",
                });
                return;
              }

              if (activeCategory.key === "historic") {
                navigation.navigate("PlacesList", {
                  title: i18nT("explore.historic"),
                  kind: "historic",
                  radius: 8000,
                  detailsRoute: "PlaceDetails",
                });
                return;
              }

              navigation.navigate("PlacesList", {
                title: activeCategory.label,
                kind: activeCategory.kind,
                radius: 8000,
                detailsRoute: "PlaceDetails",
              });
            }}
            hitSlop={10}
          >
            <Text style={[styles.seeAll, { color: t.brand }]}>
              {i18nT("common.seeAll")}
            </Text>
          </Pressable>
        </View>

        <FlatList
          horizontal
          data={filteredTopPlaces}
          keyExtractor={(x) => x.xid || `${x.name}_${x.lat}_${x.lon}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 6 }}
          renderItem={({ item }) => {
            const detailsKind =
              activeCategory.key === "all"
                ? item.kind || "attraction"
                : activeCategory.key === "historic"
                ? "historic"
                : activeCategory.kind;

            return (
              <PlaceCard
                item={{ ...item, kind: detailsKind }}
                showBadge={false}
                onPress={() =>
                  navigation.navigate("PlaceDetails", {
                    xid: item.xid,
                    kind: detailsKind,
                    tripId,
                  })
                }
              />
            );
          }}
          ListEmptyComponent={
            <Text style={{ color: t.sub, fontFamily: "Montserrat_400Regular" }}>
              {i18nT("explore.noPlacesFound")}
            </Text>
          }
        />

        <View style={[styles.sectionRow, { marginTop: 18, marginBottom: 10 }]}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>
            {i18nT("explore.nearbyRestaurants")}
          </Text>

          <Pressable
            onPress={() => navigation.navigate("Restaurants")}
            hitSlop={10}
          >
            <Text style={[styles.seeAll, { color: t.brand }]}>
              {i18nT("common.seeAll")}
            </Text>
          </Pressable>
        </View>

        <FlatList
          horizontal
          data={filteredRestaurants}
          keyExtractor={(x) => x.xid || `${x.name}_${x.lat}_${x.lon}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 6, paddingBottom: 4 }}
          renderItem={({ item }) => (
            <NearbyRestaurantMiniCard
              item={item}
              onPress={() =>
                navigation.navigate("PlaceDetails", {
                  xid: item.xid,
                  kind: "restaurant",
                  tripId,
                })
              }
            />
          )}
          ListEmptyComponent={
            <Text style={{ color: t.sub, fontFamily: "Montserrat_400Regular" }}>
              {i18nT("explore.noRestaurantsFound")}
            </Text>
          }
        />

        <Text
          style={[styles.sectionTitle, { marginTop: 18, marginBottom: 10 }]}
        >
          {i18nT("explore.popularCategory", {
            category: activeCategory.label.toLowerCase(),
          })}
        </Text>
      </View>
    );
  }, [
    insets.top,
    t,
    navigation,
    location,
    activeCategory,
    categoryKey,
    topPlaces,
    restaurants,
    error,
    query,
    loadAll,
    CATEGORIES,
    i18nT,
    tripId,
  ]);

  if (!locationReady) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.text} />
        <Text
          style={{
            color: t.text,
            fontFamily: "Montserrat_400Regular",
            marginTop: 10,
          }}
        >
          {i18nT("explore.loadingLocation")}
        </Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.text, fontFamily: "Montserrat_400Regular" }}>
          {i18nT("explore.noCitySelected")}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.text} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <FlatList
            data={filteredPopular}
            keyExtractor={(x) => x.xid || `${x.name}_${x.lat}_${x.lon}`}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ paddingBottom: 30 }}
            keyboardShouldPersistTaps="handled"
            refreshing={refreshing}
            onRefresh={() => loadAll(true)}
            ListHeaderComponent={Header}
            renderItem={({ item }) => {
              const detailsKind =
                activeCategory.key === "all"
                  ? item.kind || "attraction"
                  : activeCategory.kind;

              return (
                <Pressable
                  onPress={() =>
                    navigation.navigate("PlaceDetails", {
                      xid: item.xid,
                      kind: detailsKind,
                      tripId,
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
                {i18nT("explore.noResults")}
              </Text>
            }
          />
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function QuickAction({ t, icon, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickBtn,
        {
          backgroundColor: t.card,
          borderColor: t.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={t.text} />
      <Text style={[styles.quickText, { color: t.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  h1: {
    fontSize: 28,
    fontFamily: "Montserrat_400Regular",
    letterSpacing: 0.2,
  },
  iconCircle: {
    padding: 8,
    borderRadius: 12,
  },

  cityPill: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  cityText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },
  changeText: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  search: {
    marginTop: 12,
  },

  chipsRow: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 10,
  },
  chipText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
  },

  quickRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  quickBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  quickText: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },
  seeAll: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

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
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 2 },
    }),
  },
  gridImgWrap: {
    width: "100%",
    height: 128,
  },
  gridImg: {
    width: "100%",
    height: "100%",
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
});
