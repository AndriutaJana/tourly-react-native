import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Switch,
  TouchableWithoutFeedback,
} from "react-native";
import { TextInput } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";

import { useAppTheme } from "../../../theme/useAppTheme";
import FlightCard from "./FlightCard";
import { searchFlights } from "../../api/flightsBackendApi";
import { getCities } from "../../api/citiesBackendApi";
import { useWishlist } from "../../context/WishlistContext";

const LAST_SEARCH_KEY = "last_flights_search_v1";
const DEMO_START_DATE_YMD = "2026-02-10";

function fmtCity(c) {
  if (!c) return "";
  const city = String(c.city || "");
  const country = String(c.country || "");
  const id = String(c.id || "");
  return `${city}, ${country} (${id})`;
}

function normalizeIATA(s) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .slice(0, 3);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function dateToYMD(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function ymdToDateAtNoon(ymd) {
  const d = new Date(`${ymd}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isValidYMD(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}

function flightTitle(offer) {
  const segs = offer?.itineraries?.[0]?.segments || [];
  const first = segs[0];
  const last = segs[segs.length - 1];
  const from = first?.departure?.iataCode || "—";
  const to = last?.arrival?.iataCode || "—";
  return `${from} → ${to}`;
}

function flightSubtitle(offer) {
  const segs = offer?.itineraries?.[0]?.segments || [];
  const first = segs[0];
  const depAt = first?.departure?.at || "";
  const date = depAt ? String(depAt).slice(0, 10) : "";
  const airline =
    offer?.airlineName || offer?.validatingAirlineCodes?.[0] || "";
  const price = offer?.price?.total;
  const cur = offer?.price?.currency;
  const p =
    price != null
      ? `${Math.round(Number(price) || 0)}${cur ? ` ${cur}` : ""}`
      : "";
  const left = [date, airline].filter(Boolean).join(" • ");
  return [left, p].filter(Boolean).join(" • ");
}

export default function FlightsScreen({ navigation, route }) {
  const t = useAppTheme();
  const { t: i18nT } = useTranslation();

  const { items: wishlistItems, add, remove, isSaved } = useWishlist();

  const initialDest = normalizeIATA(route?.params?.destination || "IST");

  const demoBase = ymdToDateAtNoon(DEMO_START_DATE_YMD);
  const today = demoBase || new Date();
  if (!demoBase) {
    today.setHours(12, 0, 0, 0);
    today.setDate(today.getDate() + 1);
  }

  const initialDate = today;

  const [origin, setOrigin] = useState("KIV");
  const [dest, setDest] = useState(initialDest);

  const [dateObj, setDateObj] = useState(initialDate);
  const [date, setDate] = useState(dateToYMD(initialDate));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [roundTrip, setRoundTrip] = useState(false);
  const [returnDateObj, setReturnDateObj] = useState(() => {
    const d = new Date(initialDate);
    d.setDate(d.getDate() + 3);
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [returnDate, setReturnDate] = useState(() => {
    const d = new Date(initialDate);
    d.setDate(d.getDate() + 3);
    d.setHours(12, 0, 0, 0);
    return dateToYMD(d);
  });
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);

  const [originQ, setOriginQ] = useState("KIV");
  const [destQ, setDestQ] = useState(initialDest);

  const [showOriginList, setShowOriginList] = useState(false);
  const [showDestList, setShowDestList] = useState(false);

  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState([]);
  const [returnItems, setReturnItems] = useState([]);

  const [sortKey, setSortKey] = useState("cheap");
  const [directOnly, setDirectOnly] = useState(false);

  const [statusMsg, setStatusMsg] = useState("");
  const [statusMsgReturn, setStatusMsgReturn] = useState("");

  const savedCount = useMemo(() => {
    return (wishlistItems || []).filter((x) => x?.kind === "flight").length;
  }, [wishlistItems]);

  const anyPopupOpen =
    showOriginList || showDestList || showDatePicker || showReturnDatePicker;

  const closeAllPopups = useCallback(() => {
    setShowOriginList(false);
    setShowDestList(false);
    setShowDatePicker(false);
    setShowReturnDatePicker(false);
    Keyboard.dismiss();
  }, []);

  useEffect(() => {
    const payload = { origin, dest, date, returnDate, roundTrip, directOnly };
    const tmr = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(payload));
      } catch (e) {
        console.log("save last search error:", e?.message);
      }
    }, 300);
    return () => clearTimeout(tmr);
  }, [origin, dest, date, returnDate, roundTrip, directOnly]);

  const onToggleSave = useCallback(
    async (offer) => {
      const offerId = String(offer?.id || "");
      if (!offerId) {
        Alert.alert(
          i18nT("navigation.flights"),
          i18nT("flights.cannotSaveMissingId")
        );
        return;
      }

      const xid = `flight_${offerId}`;
      const already = isSaved(xid);

      try {
        if (already) {
          await remove(xid);
        } else {
          await add({
            xid,
            kind: "flight",
            title: flightTitle(offer),
            subtitle: flightSubtitle(offer),
            payload: offer,
          });
        }
      } catch (e) {
        console.log("wishlist toggle flight error:", e?.message);
        Alert.alert(
          i18nT("common.error"),
          e?.message || i18nT("flights.failedToUpdateWishlist")
        );
      }
    },
    [add, remove, isSaved, i18nT]
  );

  const onAddFlightToTrip = useCallback(
    (offer) => {
      navigation.navigate("SelectTrip", {
        item: {
          type: "flight",
          ...offer,
        },
      });
    },
    [navigation]
  );

  useEffect(() => {
    (async () => {
      try {
        const data = await getCities();
        setCities(Array.isArray(data) ? data : []);
      } catch (e) {
        console.log("cities load error:", e?.message);
        setCities([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LAST_SEARCH_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);

        if (saved?.origin) {
          setOrigin(String(saved.origin));
          setOriginQ(String(saved.origin));
        }
        if (saved?.dest) {
          setDest(String(saved.dest));
          setDestQ(String(saved.dest));
        }
        if (saved?.date && isValidYMD(saved.date)) {
          const d = ymdToDateAtNoon(saved.date);
          if (d) {
            setDateObj(d);
            setDate(saved.date);
          }
        }
        if (saved?.returnDate && isValidYMD(saved.returnDate)) {
          const rd = ymdToDateAtNoon(saved.returnDate);
          if (rd) {
            setReturnDateObj(rd);
            setReturnDate(saved.returnDate);
          }
        }
        if (typeof saved?.roundTrip === "boolean")
          setRoundTrip(saved.roundTrip);
        if (typeof saved?.directOnly === "boolean")
          setDirectOnly(saved.directOnly);
      } catch (e) {
        console.log("load last search error:", e?.message);
      }
    })();
  }, []);

  const onSwap = useCallback(() => {
    closeAllPopups();
    setStatusMsg("");
    setStatusMsgReturn("");
    setItems([]);
    setReturnItems([]);

    const o = origin;
    const d = dest;

    setOrigin(d);
    setDest(o);
    setOriginQ(d);
    setDestQ(o);
  }, [closeAllPopups, origin, dest]);

  const originSuggestions = useMemo(() => {
    const q = originQ.trim().toLowerCase();
    if (!q) return [];
    return cities
      .filter((c) => {
        const id = String(c.id || "").toLowerCase();
        const city = String(c.city || "").toLowerCase();
        const country = String(c.country || "").toLowerCase();
        return id.includes(q) || city.includes(q) || country.includes(q);
      })
      .slice(0, 8);
  }, [cities, originQ]);

  const destSuggestions = useMemo(() => {
    const q = destQ.trim().toLowerCase();
    if (!q) return [];
    return cities
      .filter((c) => {
        const id = String(c.id || "").toLowerCase();
        const city = String(c.city || "").toLowerCase();
        const country = String(c.country || "").toLowerCase();
        return id.includes(q) || city.includes(q) || country.includes(q);
      })
      .slice(0, 8);
  }, [cities, destQ]);

  const onPickOrigin = useCallback((c) => {
    const code = String(c.id || "").toUpperCase();
    setOrigin(code);
    setOriginQ(code);
    setShowOriginList(false);
    Keyboard.dismiss();
  }, []);

  const onPickDest = useCallback((c) => {
    const code = String(c.id || "").toUpperCase();
    setDest(code);
    setDestQ(code);
    setShowDestList(false);
    Keyboard.dismiss();
  }, []);

  const onOriginChange = useCallback((txt) => {
    setOriginQ(txt);
    setShowOriginList(true);
    setStatusMsg("");
    setStatusMsgReturn("");
    setItems([]);
    setReturnItems([]);

    const maybe = normalizeIATA(txt);
    setOrigin(maybe.length === 3 ? maybe : "");
  }, []);

  const onDestChange = useCallback((txt) => {
    setDestQ(txt);
    setShowDestList(true);
    setStatusMsg("");
    setStatusMsgReturn("");
    setItems([]);
    setReturnItems([]);

    const maybe = normalizeIATA(txt);
    setDest(maybe.length === 3 ? maybe : "");
  }, []);

  const getPrice = (x) => Number(x?.price?.total ?? 999999);
  const getDur = (x) => Number(x?.itineraries?.[0]?.durationMinutes ?? 999999);
  const getStops = (x) => Number(x?.stops ?? 99);

  const sortOffers = useCallback(
    (arr) => {
      const list = Array.isArray(arr) ? [...arr] : [];
      if (!list.length) return list;

      const byCheap = (a, b) =>
        getPrice(a) - getPrice(b) ||
        getDur(a) - getDur(b) ||
        getStops(a) - getStops(b);

      const byFast = (a, b) =>
        getDur(a) - getDur(b) ||
        getStops(a) - getStops(b) ||
        getPrice(a) - getPrice(b);

      if (sortKey === "cheap") return list.sort(byCheap);
      if (sortKey === "fast") return list.sort(byFast);

      const prices = list.map(getPrice);
      const durs = list.map(getDur);

      const pMin = Math.min(...prices);
      const pMax = Math.max(...prices, pMin + 1);
      const dMin = Math.min(...durs);
      const dMax = Math.max(...durs, dMin + 1);

      const score = (x) => {
        const p = (getPrice(x) - pMin) / (pMax - pMin);
        const d = (getDur(x) - dMin) / (dMax - dMin);
        const s = getStops(x);
        return p * 0.55 + d * 0.35 + s * 0.1;
      };

      return list.sort((a, b) => score(a) - score(b) || byCheap(a, b));
    },
    [sortKey]
  );

  const sortedItems = useMemo(() => sortOffers(items), [items, sortOffers]);
  const sortedReturnItems = useMemo(
    () => sortOffers(returnItems),
    [returnItems, sortOffers]
  );

  const isReturnAfterOrEqual = useMemo(() => {
    if (!roundTrip) return true;
    if (!isValidYMD(date) || !isValidYMD(returnDate)) return false;
    return returnDate >= date;
  }, [roundTrip, date, returnDate]);

  const canSearchInputs =
    origin.length === 3 &&
    dest.length === 3 &&
    isValidYMD(date) &&
    (!roundTrip ? true : isValidYMD(returnDate) && isReturnAfterOrEqual);

  const canSearch = canSearchInputs && !loading;

  const didAutoSearch = useRef(false);
  const debounceRef = useRef(null);
  const lastKeyRef = useRef("");
  const abortRef = useRef(null);

  const onSearch = useCallback(
    async ({ closePopups = true } = {}) => {
      try {
        if (closePopups) closeAllPopups();
        setStatusMsg("");
        setStatusMsgReturn("");

        const o = normalizeIATA(origin);
        const d = normalizeIATA(dest);

        if (o.length !== 3 || d.length !== 3) {
          Alert.alert(
            i18nT("navigation.flights"),
            i18nT("flights.invalidIata")
          );
          return;
        }
        if (!isValidYMD(date)) {
          Alert.alert(
            i18nT("navigation.flights"),
            i18nT("flights.invalidOutboundDate")
          );
          return;
        }
        if (roundTrip) {
          if (!isValidYMD(returnDate)) {
            Alert.alert(
              i18nT("navigation.flights"),
              i18nT("flights.invalidReturnDate")
            );
            return;
          }
          if (!isReturnAfterOrEqual) {
            Alert.alert(
              i18nT("navigation.flights"),
              i18nT("flights.returnAfterOutbound")
            );
            return;
          }
        }

        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setLoading(true);

        const outbound = await searchFlights({
          origin: o,
          destination: d,
          date: date.trim(),
          adults: 1,
          max: 50,
          direct: directOnly,
          signal: abortRef.current.signal,
        });

        const outboundArr = Array.isArray(outbound) ? outbound : [];
        setItems(outboundArr);

        if (!outboundArr.length) {
          setStatusMsg(i18nT("flights.noOutboundFlights"));
        }

        if (roundTrip) {
          const inbound = await searchFlights({
            origin: d,
            destination: o,
            date: returnDate.trim(),
            adults: 1,
            max: 50,
            direct: directOnly,
            signal: abortRef.current.signal,
          });

          const inboundArr = Array.isArray(inbound) ? inbound : [];
          setReturnItems(inboundArr);

          if (!inboundArr.length) {
            setStatusMsgReturn(i18nT("flights.noReturnFlights"));
          }

          if (!outboundArr.length && !inboundArr.length) {
            setStatusMsg(i18nT("flights.noFlightsForCriteria"));
          }
        } else {
          setReturnItems([]);
        }
      } catch (e) {
        const msg =
          e?.name === "AbortError"
            ? i18nT("flights.searchCancelled")
            : e?.message || i18nT("flights.searchFailed");

        if (e?.name !== "AbortError") {
          Alert.alert(i18nT("navigation.flights"), msg);
        }

        setItems([]);
        setReturnItems([]);
        setStatusMsg(msg);
        setStatusMsgReturn("");
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [
      closeAllPopups,
      origin,
      dest,
      date,
      returnDate,
      roundTrip,
      directOnly,
      isReturnAfterOrEqual,
      i18nT,
    ]
  );

  useEffect(() => {
    if (anyPopupOpen) return;
    if (!canSearchInputs) return;
    if (loading) return;

    const key = JSON.stringify({
      origin,
      dest,
      date,
      returnDate: roundTrip ? returnDate : "",
      roundTrip,
      directOnly,
    });

    if (key === lastKeyRef.current) return;

    if (!didAutoSearch.current) {
      didAutoSearch.current = true;
      lastKeyRef.current = key;
      onSearch({ closePopups: false });
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      lastKeyRef.current = key;
      onSearch({ closePopups: false });
    }, 450);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    anyPopupOpen,
    canSearchInputs,
    loading,
    origin,
    dest,
    date,
    returnDate,
    roundTrip,
    directOnly,
    onSearch,
  ]);

  const sections = useMemo(() => {
    if (!roundTrip) {
      return [
        {
          title: i18nT("flights.results"),
          kind: "single",
          data: sortedItems,
        },
      ];
    }
    return [
      { title: i18nT("flights.outbound"), kind: "out", data: sortedItems },
      { title: i18nT("flights.return"), kind: "ret", data: sortedReturnItems },
    ];
  }, [roundTrip, sortedItems, sortedReturnItems, i18nT]);

  const sortLabel =
    sortKey === "cheap"
      ? i18nT("flights.cheapest")
      : sortKey === "fast"
      ? i18nT("flights.fastest")
      : i18nT("flights.best");

  const SuggestionList = ({ data, onPick }) => {
    if (!data?.length) return null;
    return (
      <View
        style={[
          styles.suggestBox,
          { backgroundColor: t.card, borderColor: t.border },
        ]}
      >
        {data.map((c, idx) => (
          <Pressable
            key={`${c.id}_${idx}`}
            onPress={() => onPick(c)}
            style={({ pressed }) => [
              styles.suggestRow,
              {
                opacity: pressed ? 0.7 : 1,
                borderBottomColor: t.border,
                borderBottomWidth: idx === data.length - 1 ? 0 : 1,
              },
            ]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[styles.suggestTitle, { color: t.text }]}
                numberOfLines={1}
              >
                {fmtCity(c)}
              </Text>
              <Text
                style={[styles.suggestSub, { color: t.sub }]}
                numberOfLines={1}
              >
                {i18nT("flights.tapToSelect")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.sub} />
          </Pressable>
        ))}
      </View>
    );
  };

  const SectionHeader = ({ title, emptyText }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: t.text }]}>{title}</Text>
      {!!emptyText && (
        <Text style={[styles.sectionHint, { color: t.sub }]}>{emptyText}</Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={[styles.container, { backgroundColor: t.bg, flex: 1 }]}>
          <View style={styles.topRow}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={t.text} />
            </Pressable>

            <Text style={[styles.title, { color: t.text }]}>
              {i18nT("navigation.flights")}
            </Text>

            <View
              style={{ flexDirection: "row", gap: 14, alignItems: "center" }}
            >
              <Pressable
                onPress={() => navigation.navigate("MyBookings")}
                hitSlop={10}
              >
                <Ionicons name="receipt-outline" size={22} color={t.text} />
              </Pressable>

              <Pressable
                onPress={() => navigation.navigate("Wishlist")}
                hitSlop={10}
                style={{ position: "relative" }}
              >
                <Ionicons name="bookmark-outline" size={22} color={t.text} />
                {savedCount > 0 && (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: t.brand, borderColor: t.bg },
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {savedCount > 99 ? "99+" : String(savedCount)}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {anyPopupOpen && (
            <Pressable onPress={closeAllPopups} style={styles.overlay} />
          )}

          <SectionList
            sections={sections}
            stickySectionHeadersEnabled={false}
            SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
            keyExtractor={(item, i) => String(item?.id ?? i)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 6,
              paddingBottom: 120,
            }}
            ListHeaderComponent={
              <View>
                <View style={{ zIndex: 30, position: "relative" }}>
                  <TextInput
                    mode="outlined"
                    label={i18nT("flights.originInput")}
                    value={originQ}
                    onFocus={() => {
                      setShowOriginList(true);
                      setShowDestList(false);
                    }}
                    onChangeText={onOriginChange}
                    style={[styles.input, { backgroundColor: t.card }]}
                    outlineStyle={{ borderRadius: 12, borderColor: t.border }}
                    theme={{ colors: { primary: t.brand } }}
                    right={
                      originQ ? (
                        <TextInput.Icon
                          icon="close"
                          onPress={() => {
                            setOriginQ("");
                            setOrigin("");
                            setShowOriginList(false);
                            setItems([]);
                            setReturnItems([]);
                            setStatusMsg("");
                            setStatusMsgReturn("");
                          }}
                        />
                      ) : null
                    }
                  />
                  {showOriginList && (
                    <SuggestionList
                      data={originSuggestions}
                      onPick={onPickOrigin}
                    />
                  )}
                </View>

                <View style={{ zIndex: 20, position: "relative" }}>
                  <TextInput
                    mode="outlined"
                    label={i18nT("flights.destinationInput")}
                    value={destQ}
                    onFocus={() => {
                      setShowDestList(true);
                      setShowOriginList(false);
                    }}
                    onChangeText={onDestChange}
                    style={[styles.input, { backgroundColor: t.card }]}
                    outlineStyle={{ borderRadius: 12, borderColor: t.border }}
                    theme={{ colors: { primary: t.brand } }}
                    right={
                      destQ ? (
                        <TextInput.Icon
                          icon="close"
                          onPress={() => {
                            setDestQ("");
                            setDest("");
                            setShowDestList(false);
                            setItems([]);
                            setReturnItems([]);
                            setStatusMsg("");
                            setStatusMsgReturn("");
                          }}
                        />
                      ) : null
                    }
                  />
                  {showDestList && (
                    <SuggestionList
                      data={destSuggestions}
                      onPick={onPickDest}
                    />
                  )}
                </View>

                <View style={styles.controlsRow}>
                  <View
                    style={[
                      styles.tripSegment,
                      {
                        backgroundColor: t.card,
                        borderColor: t.border,
                        marginRight: 10,
                      },
                    ]}
                  >
                    <Pressable
                      onPress={() => {
                        closeAllPopups();
                        setRoundTrip(false);
                        setStatusMsg("");
                        setStatusMsgReturn("");
                        setReturnItems([]);
                      }}
                      style={({ pressed }) => [
                        styles.tripOption,
                        !roundTrip && { backgroundColor: t.brand },
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      <Text
                        style={{
                          color: !roundTrip ? "#fff" : t.text,
                          fontFamily: "Montserrat_400Regular",
                        }}
                      >
                        {i18nT("flights.oneWay")}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        closeAllPopups();
                        setRoundTrip(true);
                        setStatusMsg("");
                        setStatusMsgReturn("");
                        if (returnDate < date) {
                          const base = ymdToDateAtNoon(date) || dateObj;
                          const r = new Date(base);
                          r.setDate(r.getDate() + 3);
                          r.setHours(12, 0, 0, 0);
                          setReturnDateObj(r);
                          setReturnDate(dateToYMD(r));
                        }
                      }}
                      style={({ pressed }) => [
                        styles.tripOption,
                        roundTrip && { backgroundColor: t.brand },
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      <Text
                        style={{
                          color: roundTrip ? "#fff" : t.text,
                          fontFamily: "Montserrat_400Regular",
                        }}
                      >
                        {i18nT("flights.roundTrip")}
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={onSwap}
                    style={[
                      styles.swapMini,
                      {
                        backgroundColor: t.card,
                        borderColor: t.border,
                        marginRight: 10,
                      },
                    ]}
                  >
                    <Ionicons
                      name="swap-vertical-outline"
                      size={18}
                      color={t.text}
                    />
                  </Pressable>

                  <View
                    style={[
                      styles.directBox,
                      { backgroundColor: t.card, borderColor: t.border },
                    ]}
                  >
                    <View style={styles.directBoxInner}>
                      <Text style={[styles.directText, { color: t.text }]}>
                        {i18nT("flights.direct")}
                      </Text>

                      <Switch
                        value={directOnly}
                        onValueChange={(v) => {
                          setDirectOnly(v);
                          setStatusMsg("");
                        }}
                        trackColor={{ false: t.border, true: t.brand }}
                        ios_backgroundColor={t.border}
                        style={styles.directSwitch}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.datesRow}>
                  <Pressable
                    onPress={() => {
                      closeAllPopups();
                      Keyboard.dismiss();
                      setShowDatePicker(true);
                    }}
                    style={[
                      styles.dateBox,
                      { backgroundColor: t.card, borderColor: t.border },
                    ]}
                  >
                    <Ionicons name="calendar-outline" size={18} color={t.sub} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.dateLabel, { color: t.sub }]}>
                        {i18nT("flights.outbound")}
                      </Text>
                      <Text
                        style={[styles.dateValue, { color: t.text }]}
                        numberOfLines={1}
                      >
                        {date}
                      </Text>
                    </View>
                  </Pressable>

                  {roundTrip && (
                    <Pressable
                      onPress={() => {
                        closeAllPopups();
                        Keyboard.dismiss();
                        setShowReturnDatePicker(true);
                      }}
                      style={[
                        styles.dateBox,
                        { backgroundColor: t.card, borderColor: t.border },
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={t.sub}
                      />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.dateLabel, { color: t.sub }]}>
                          {i18nT("flights.return")}
                        </Text>
                        <Text
                          style={[styles.dateValue, { color: t.text }]}
                          numberOfLines={1}
                        >
                          {returnDate}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                </View>

                {showDatePicker && (
                  <View style={{ zIndex: 40, marginTop: 8 }}>
                    <DateTimePicker
                      value={dateObj}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      minimumDate={today}
                      onChange={(event, selectedDate) => {
                        if (Platform.OS === "android") setShowDatePicker(false);
                        if (!selectedDate) return;

                        const safe = new Date(selectedDate);
                        safe.setHours(12, 0, 0, 0);

                        setDateObj(safe);
                        const ymd = dateToYMD(safe);
                        if (ymd) setDate(ymd);

                        setStatusMsg("");
                        setStatusMsgReturn("");

                        if (roundTrip && returnDate < ymd) {
                          const r = new Date(safe);
                          r.setDate(r.getDate() + 3);
                          r.setHours(12, 0, 0, 0);
                          setReturnDateObj(r);
                          setReturnDate(dateToYMD(r));
                        }
                      }}
                    />
                    {Platform.OS === "ios" && (
                      <Pressable
                        onPress={() => setShowDatePicker(false)}
                        style={[styles.doneBtn, { backgroundColor: t.brand }]}
                      >
                        <Text style={styles.doneText}>
                          {i18nT("common.done")}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {showReturnDatePicker && roundTrip && (
                  <View style={{ zIndex: 40, marginTop: 8 }}>
                    <DateTimePicker
                      value={returnDateObj}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      minimumDate={ymdToDateAtNoon(date) || dateObj}
                      onChange={(event, selectedDate) => {
                        if (Platform.OS === "android") {
                          setShowReturnDatePicker(false);
                        }
                        if (!selectedDate) return;

                        const safe = new Date(selectedDate);
                        safe.setHours(12, 0, 0, 0);

                        setReturnDateObj(safe);
                        const ymd = dateToYMD(safe);
                        if (ymd) setReturnDate(ymd);

                        setStatusMsg("");
                        setStatusMsgReturn("");
                      }}
                    />
                    {Platform.OS === "ios" && (
                      <Pressable
                        onPress={() => setShowReturnDatePicker(false)}
                        style={[styles.doneBtn, { backgroundColor: t.brand }]}
                      >
                        <Text style={styles.doneText}>
                          {i18nT("common.done")}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {!isReturnAfterOrEqual && roundTrip && (
                  <Text style={[styles.helper, { color: t.sub }]}>
                    {i18nT("flights.returnAfterOutbound")}
                  </Text>
                )}

                <Pressable
                  onPress={
                    canSearch
                      ? () => {
                          Keyboard.dismiss();
                          onSearch({ closePopups: true });
                        }
                      : null
                  }
                  disabled={!canSearch}
                  style={[
                    styles.btn,
                    { backgroundColor: t.brand },
                    (!canSearch || loading) && { opacity: 0.45 },
                  ]}
                >
                  <Text style={styles.btnText}>
                    {loading
                      ? i18nT("flights.searching")
                      : i18nT("flights.searchFlights")}
                  </Text>
                </Pressable>

                {!canSearch && (
                  <Text style={[styles.helper, { color: t.sub }]}>
                    {i18nT("flights.selectCityAndDates")}
                  </Text>
                )}

                <View style={styles.sortRow}>
                  {[
                    { k: "cheap", label: i18nT("flights.cheapest") },
                    { k: "fast", label: i18nT("flights.fastest") },
                    { k: "best", label: i18nT("flights.best") },
                  ].map((x) => (
                    <Pressable
                      key={x.k}
                      onPress={() => setSortKey(x.k)}
                      style={[
                        styles.sortBtn,
                        {
                          backgroundColor: sortKey === x.k ? t.brand : t.card,
                          borderColor: t.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: sortKey === x.k ? "#fff" : t.text,
                          fontFamily: "Montserrat_400Regular",
                        }}
                      >
                        {x.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            }
            renderSectionHeader={({ section }) => {
              if (!roundTrip) return null;

              const emptyText =
                section.kind === "out"
                  ? statusMsg && !sortedItems.length
                    ? statusMsg
                    : ""
                  : statusMsgReturn && !sortedReturnItems.length
                  ? statusMsgReturn
                  : "";

              return (
                <SectionHeader title={section.title} emptyText={emptyText} />
              );
            }}
            renderItem={({ item, index, section }) => {
              const showTag = index === 0 && section?.data?.length > 0;
              const tag = showTag ? sortLabel : null;

              const xid = `flight_${String(item?.id || "")}`;
              const saved = xid.endsWith("_") ? false : isSaved(xid);

              return (
                <FlightCard
                  offer={item}
                  tag={tag}
                  isSaved={saved}
                  onToggleSave={() => onToggleSave(item)}
                  onPress={() =>
                    navigation.navigate("FlightDetails", { offer: item })
                  }
                />
              );
            }}
            ListEmptyComponent={
              !loading ? (
                <Text
                  style={{
                    color: t.sub,
                    fontFamily: "Montserrat_400Regular",
                    paddingTop: 12,
                  }}
                >
                  {statusMsg || i18nT("flights.searchToSeeResults")}
                </Text>
              ) : null
            }
          />
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 70, paddingHorizontal: 22 },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1000,
  },
  title: { fontSize: 18, fontFamily: "Montserrat_400Regular" },

  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1 },

  input: { marginTop: 12, zIndex: 10 },

  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  tripSegment: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    padding: 3,
  },
  tripOption: {
    flex: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  swapMini: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  directBox: {
    width: 128,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 8,
    justifyContent: "center",
  },
  directBoxInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  directText: { fontSize: 12, fontFamily: "Montserrat_400Regular" },
  directSwitch: {
    transform: [{ scale: 0.9 }],
    marginRight: -2,
  },

  datesRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  dateBox: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateLabel: { fontSize: 12, fontFamily: "Montserrat_400Regular" },
  dateValue: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },

  btn: {
    marginTop: 14,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontFamily: "Montserrat_400Regular" },

  helper: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  doneBtn: {
    marginTop: 10,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: { color: "#fff", fontFamily: "Montserrat_400Regular" },

  sortRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  sortBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeader: { marginTop: 12, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontFamily: "Montserrat_400Regular" },
  sectionHint: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  suggestBox: {
    position: "absolute",
    top: 62,
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 999,
  },
  suggestRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
  },
  suggestTitle: { fontSize: 13, fontFamily: "Montserrat_400Regular" },
  suggestSub: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  badge: {
    position: "absolute",
    right: -8,
    top: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Montserrat_400Regular",
  },
});
