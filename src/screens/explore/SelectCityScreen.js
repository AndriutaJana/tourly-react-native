import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { TextInput } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";

import { useExploreLocation } from "../../context/ExploreLocationContext";
import { useAppTheme } from "../../../theme/useAppTheme";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { searchCities } from "../../api/citiesApi";

function flagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return "🌍";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((c) => 127397 + c.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

const POPULAR_CITIES = [
  {
    id: "p_paris",
    city: "Paris",
    country: "France",
    countryCode: "FR",
    lat: 48.8566,
    lon: 2.3522,
    cityCode: "PAR",
  },
  {
    id: "p_london",
    city: "London",
    country: "United Kingdom",
    countryCode: "GB",
    lat: 51.5072,
    lon: -0.1276,
    cityCode: "LON",
  },
  {
    id: "p_rome",
    city: "Rome",
    country: "Italy",
    countryCode: "IT",
    lat: 41.9028,
    lon: 12.4964,
    cityCode: "ROM",
  },
  {
    id: "p_istanbul",
    city: "Istanbul",
    country: "Turkey",
    countryCode: "TR",
    lat: 41.0082,
    lon: 28.9784,
    cityCode: "IST",
  },
  {
    id: "p_berlin",
    city: "Berlin",
    country: "Germany",
    countryCode: "DE",
    lat: 52.52,
    lon: 13.405,
    cityCode: "BER",
  },
  {
    id: "p_barcelona",
    city: "Barcelona",
    country: "Spain",
    countryCode: "ES",
    lat: 41.3851,
    lon: 2.1734,
    cityCode: "BCN",
  },
];

export default function SelectCityScreen({ navigation }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { setLocation } = useExploreLocation();

  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 650);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const [err, setErr] = useState(null);
  const [locLoading, setLocLoading] = useState(false);

  const hint = useMemo(() => {
    const s = q.trim();
    if (s.length === 0) return t("selectCity.hints.default");
    if (s.length === 1) return t("selectCity.hints.minChars");
    return null;
  }, [q, t]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setErr(null);
      const text = (dq || "").trim();

      if (text.length < 2) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);
        const cities = await searchCities(text, { limit: 5 });
        if (!cancelled) setResults(cities);
      } catch (e) {
        if (!cancelled) {
          setResults([]);
          setErr(e?.message || t("selectCity.errors.searchFailed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dq, t]);

  const onPick = async (item) => {
    try {
      const city = item.city;

      await setLocation({
        city,
        country: item.country,
        countryCode: item.countryCode,
        lat: item.lat,
        lon: item.lon,
        cityCode: item.cityCode || (city || "").slice(0, 3).toUpperCase(),
      });

      navigation.replace("ExploreHome");
    } catch (e) {
      console.log("Pick city error:", e);
      setErr(t("selectCity.errors.saveSelectedCity"));
    }
  };

  const onUseMyLocation = async () => {
    try {
      setErr(null);
      setLocLoading(true);

      const serviceEnabled = await Location.hasServicesEnabledAsync();
      if (!serviceEnabled) {
        setErr(t("selectCity.errors.locationServicesDisabled"));
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErr(t("selectCity.errors.locationPermissionDenied"));
        return;
      }

      const loc = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(t("selectCity.errors.locationTimeout"))),
            12000
          )
        ),
      ]);

      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;

      const rev = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lon,
      });

      const first = rev?.[0];
      const city =
        first?.city || first?.subregion || t("selectCity.currentArea");
      const country = first?.country || t("selectCity.unknownCountry");
      const countryCode = first?.isoCountryCode || null;

      const computedCityCode =
        countryCode === "MD" ? "CHI" : (city || "").slice(0, 3).toUpperCase();

      await setLocation({
        city,
        country,
        countryCode,
        lat,
        lon,
        cityCode: computedCityCode,
        isCurrent: true,
      });

      navigation.replace("ExploreHome");
    } catch (e) {
      console.log("Location error:", e);
      setErr(e?.message || t("selectCity.errors.currentLocationFailed"));
    } finally {
      setLocLoading(false);
    }
  };

  const Row = ({ item }) => (
    <Pressable
      onPress={() => onPick(item)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.leftIcon,
          { backgroundColor: theme.isDark ? "#141414" : "#F0F0F0" },
        ]}
      >
        <Text style={styles.flag}>{flagEmoji(item.countryCode)}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.city, { color: theme.text }]} numberOfLines={1}>
          {item.city}
        </Text>
        <Text style={[styles.country, { color: theme.sub }]} numberOfLines={1}>
          {item.country} {item.countryCode ? `• ${item.countryCode}` : ""}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={theme.sub} />
    </Pressable>
  );

  const showPopular = q.trim().length === 0;
  const data = showPopular ? POPULAR_CITIES : results;

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
            data={data}
            keyExtractor={(x) => x.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
            ListHeaderComponent={
              <View>
                <View style={styles.header}>
                  <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
                    <Ionicons
                      name="chevron-back"
                      size={24}
                      color={theme.text}
                    />
                  </Pressable>

                  <Text style={[styles.title, { color: theme.text }]}>
                    {t("selectCity.title")}
                  </Text>

                  <View style={{ width: 24 }} />
                </View>

                <Text style={[styles.subtitle, { color: theme.sub }]}>
                  {t("selectCity.subtitle")}
                </Text>

                <Pressable
                  onPress={locLoading ? undefined : onUseMyLocation}
                  style={({ pressed }) => [
                    styles.locationBtn,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      opacity: pressed || locLoading ? 0.8 : 1,
                    },
                  ]}
                >
                  {locLoading ? (
                    <ActivityIndicator size="small" color={theme.text} />
                  ) : (
                    <Ionicons
                      name="locate-outline"
                      size={18}
                      color={theme.text}
                    />
                  )}

                  <Text style={[styles.locationText, { color: theme.text }]}>
                    {locLoading
                      ? t("selectCity.gettingLocation")
                      : t("selectCity.useCurrentLocation")}
                  </Text>
                </Pressable>

                <TextInput
                  mode="outlined"
                  placeholder={t("selectCity.searchPlaceholder")}
                  value={q}
                  onChangeText={setQ}
                  style={[styles.search, { backgroundColor: theme.card }]}
                  outlineStyle={{ borderRadius: 14, borderColor: theme.border }}
                  contentStyle={{ fontFamily: "Montserrat_400Regular" }}
                  theme={{ colors: { primary: theme.brand } }}
                  left={<TextInput.Icon icon="magnify" />}
                  right={
                    q.length > 0 ? (
                      <TextInput.Icon icon="close" onPress={() => setQ("")} />
                    ) : null
                  }
                />

                {!!err && (
                  <View style={[styles.errorBox, { borderColor: "#B00020" }]}>
                    <Text style={styles.errorText}>
                      {String(err)
                        .toLowerCase()
                        .includes("too many requests") ||
                      String(err).toLowerCase().includes("rate limit")
                        ? t("selectCity.errors.rateLimit")
                        : err}
                    </Text>
                  </View>
                )}

                <View style={styles.sectionRow}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    {showPopular
                      ? t("selectCity.popularDestinations")
                      : t("selectCity.searchResults")}
                  </Text>
                  {loading ? (
                    <Text style={[styles.sectionHint, { color: theme.sub }]}>
                      {t("selectCity.searching")}
                    </Text>
                  ) : null}
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={{ paddingTop: 14 }}>
                <Text
                  style={{
                    color: theme.sub,
                    fontFamily: "Montserrat_400Regular",
                  }}
                >
                  {hint || t("selectCity.noResults")}
                </Text>
              </View>
            }
            renderItem={({ item }) => <Row item={item} />}
          />
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 70, paddingHorizontal: 22 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  title: { flex: 1, fontSize: 20, fontFamily: "Montserrat_400Regular" },
  subtitle: {
    marginBottom: 12,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Montserrat_400Regular",
  },

  locationBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  locationText: { fontFamily: "Montserrat_400Regular", fontSize: 13 },

  search: { marginBottom: 10 },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontFamily: "Montserrat_400Regular" },
  sectionHint: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  row: {
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  leftIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  flag: { fontSize: 22 },

  city: { fontSize: 15, fontFamily: "Montserrat_400Regular" },
  country: { marginTop: 3, fontSize: 12, fontFamily: "Montserrat_400Regular" },

  errorBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  errorText: {
    color: "#B00020",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Montserrat_400Regular",
  },
});
