import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useAppTheme } from "../../../theme/useAppTheme";
import { useExploreLocation } from "../../context/ExploreLocationContext";
import { searchHotels } from "../../api/hotelsApi";
import HotelCard from "./HotelCard";

function toYMDLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMD(ymd) {
  const [y, m, d] = String(ymd || "")
    .split("-")
    .map((x) => parseInt(x, 10));
  if (!y || !m || !d) {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    return now;
  }
  const dt = new Date(y, m - 1, d);
  dt.setHours(12, 0, 0, 0);
  return dt;
}

function addDays(ymd, days) {
  const d = parseYMD(ymd);
  d.setDate(d.getDate() + days);
  return toYMDLocal(d);
}

function defaultDatePlus(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return toYMDLocal(d);
}

function validRange(ci, co) {
  const x = parseYMD(ci);
  const y = parseYMD(co);
  return !Number.isNaN(x.getTime()) && !Number.isNaN(y.getTime()) && y > x;
}

function safeNum(v, fallback = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function ratingTo10(raw) {
  const r = safeNum(raw, null);
  if (r == null) return 0;
  if (r > 0 && r <= 5) return r * 2;
  return r;
}

function canonicalAmenity(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");

  if (!s) return null;

  if (
    s.includes("wifi") ||
    s.includes("wi_fi") ||
    s.includes("wireless") ||
    s.includes("internet")
  )
    return "wifi";

  if (s.includes("breakfast") || s.includes("brunch")) return "breakfast";

  if (s.includes("parking") || s.includes("car_park") || s.includes("carpark"))
    return "parking";

  if (s.includes("pool") || s.includes("swimming")) return "pool";

  if (s.includes("spa") || s.includes("wellness") || s.includes("sauna"))
    return "spa";

  if (
    s.includes("gym") ||
    s.includes("fitness") ||
    s.includes("workout") ||
    s.includes("barbell")
  )
    return "gym";

  if (
    s.includes("pet") ||
    s.includes("pets") ||
    s.includes("pet_friendly") ||
    s.includes("animals_allowed")
  )
    return "pet";

  if (
    s.includes("shuttle") ||
    s.includes("airport_shuttle") ||
    s.includes("airport_transfer") ||
    s.includes("transfer")
  )
    return "shuttle";

  if (s.includes("air_conditioning") || s === "ac" || s.includes("aircon"))
    return "ac";

  if (s.includes("accessible") || s.includes("wheelchair")) return "accessible";

  if (
    s.includes("24h_reception") ||
    s.includes("24_hour_reception") ||
    s.includes("reception") ||
    s.includes("front_desk")
  )
    return "reception";

  if (
    [
      "wifi",
      "breakfast",
      "parking",
      "pool",
      "spa",
      "gym",
      "pet",
      "shuttle",
      "ac",
      "accessible",
      "reception",
    ].includes(s)
  )
    return s;

  return null;
}

function hotelAmenitiesSet(hotel) {
  const arr =
    (Array.isArray(hotel?.amenities) && hotel.amenities) ||
    (Array.isArray(hotel?.amenityList) && hotel.amenityList) ||
    (Array.isArray(hotel?.facilities) && hotel.facilities) ||
    [];

  const set = new Set();
  for (const a of arr) {
    const key = canonicalAmenity(a);
    if (key) set.add(key);
  }
  return set;
}

function DatePickerModal({
  visible,
  onClose,
  value,
  onChange,
  minDate,
  title,
  theme,
  t,
}) {
  const [temp, setTemp] = useState(value);

  useEffect(() => {
    setTemp(value);
  }, [value, visible]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.modalCard,
            { backgroundColor: theme.bg, borderColor: theme.border },
          ]}
          onPress={() => {}}
        >
          <View style={styles.modalTopRow}>
            <Text
              allowFontScaling={false}
              style={[styles.modalTitle, { color: theme.text }]}
            >
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color={theme.sub} />
            </Pressable>
          </View>

          <DateTimePicker
            value={temp}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={minDate}
            textColor={Platform.OS === "ios" ? theme.text : undefined}
            onChange={(e, d) => {
              if (Platform.OS !== "ios") {
                if (e.type === "set" && d) onChange(d);
                onClose();
                return;
              }
              if (d) setTemp(d);
            }}
          />

          {Platform.OS === "ios" ? (
            <Pressable
              style={[styles.modalBtn, { backgroundColor: theme.brand }]}
              onPress={() => {
                onChange(temp);
                onClose();
              }}
            >
              <Text allowFontScaling={false} style={styles.modalBtnText}>
                {t("common.done")}
              </Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SortModal({ visible, onClose, value, onChange, theme, t }) {
  if (!visible) return null;

  const options = [
    { key: "relevance", label: t("hotels.sortOptions.relevance") },
    { key: "price_asc", label: t("hotels.sortOptions.priceAsc") },
    { key: "price_desc", label: t("hotels.sortOptions.priceDesc") },
    { key: "rating_desc", label: t("hotels.sortOptions.ratingDesc") },
    { key: "reviews_desc", label: t("hotels.sortOptions.reviewsDesc") },
  ];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdropCenter} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={[
            styles.modalPanel,
            { backgroundColor: theme.bg, borderColor: theme.border },
          ]}
        >
          <View style={styles.modalTopRow}>
            <Text
              allowFontScaling={false}
              style={[styles.modalTitle, { color: theme.text }]}
            >
              {t("hotels.sort")}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color={theme.sub} />
            </Pressable>
          </View>

          {options.map((o) => {
            const selected = o.key === value;
            return (
              <Pressable
                key={o.key}
                onPress={() => {
                  onChange(o.key);
                  onClose();
                }}
                style={[
                  styles.sheetRow,
                  {
                    borderColor: selected ? theme.brand : theme.border,
                    backgroundColor: theme.card,
                  },
                ]}
              >
                <Text
                  allowFontScaling={false}
                  style={[styles.sheetRowText, { color: theme.text }]}
                >
                  {o.label}
                </Text>
                <Ionicons
                  name={selected ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={selected ? theme.brand : theme.sub}
                />
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FiltersModal({
  visible,
  onClose,
  draft,
  setDraft,
  onApply,
  onReset,
  theme,
  t,
}) {
  if (!visible) return null;

  const amenityOptions = [
    { key: "wifi", label: t("amenities.wifi"), icon: "wifi-outline" },
    {
      key: "breakfast",
      label: t("amenities.breakfast"),
      icon: "restaurant-outline",
    },
    { key: "parking", label: t("amenities.parking"), icon: "car-outline" },
    { key: "pool", label: t("amenities.pool"), icon: "water-outline" },
    { key: "spa", label: t("amenities.spa"), icon: "flower-outline" },
    { key: "gym", label: t("amenities.gym"), icon: "barbell-outline" },
    { key: "pet", label: t("amenities.pet"), icon: "paw-outline" },
    {
      key: "shuttle",
      label: t("amenities.shuttle"),
      icon: "airplane-outline",
    },
    { key: "ac", label: t("amenities.ac"), icon: "snow-outline" },
    {
      key: "accessible",
      label: t("amenities.accessible"),
      icon: "accessibility-outline",
    },
    {
      key: "reception",
      label: t("amenities.reception"),
      icon: "time-outline",
    },
  ];

  const ratingOptions = [0, 7, 8, 9];

  const toggleAmenity = (key) => {
    setDraft((prev) => {
      const current = Array.isArray(prev?.amenities) ? prev.amenities : [];
      const set = new Set(current);
      set.has(key) ? set.delete(key) : set.add(key);
      return { ...prev, amenities: Array.from(set) };
    });
  };

  const toggleStar = (n) => {
    setDraft((prev) => {
      const current = Array.isArray(prev?.stars) ? prev.stars : [];
      const set = new Set(current);
      set.has(n) ? set.delete(n) : set.add(n);
      return { ...prev, stars: Array.from(set).sort((a, b) => a - b) };
    });
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdropCenter} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={[
            styles.modalPanel,
            styles.filtersPanel,
            { backgroundColor: theme.bg, borderColor: theme.border },
          ]}
        >
          <View style={styles.modalTopRow}>
            <Text
              allowFontScaling={false}
              style={[styles.modalTitle, { color: theme.text }]}
            >
              {t("hotels.filters")}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color={theme.sub} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 10 }}
          >
            <Text
              allowFontScaling={false}
              style={[styles.fLabel, { color: theme.sub }]}
            >
              {t("hotels.maxPrice")}
            </Text>

            <View style={[styles.rowWrap, { alignItems: "center" }]}>
              {[50, 80, 120, 180, 250].map((p) => {
                const selected = draft?.maxPrice === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() =>
                      setDraft((prev) => ({
                        ...prev,
                        maxPrice: selected ? null : p,
                      }))
                    }
                    style={[
                      styles.fPill,
                      {
                        borderColor: selected ? theme.brand : theme.border,
                        backgroundColor: selected ? theme.brand : theme.card,
                      },
                    ]}
                  >
                    <Text
                      allowFontScaling={false}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[
                        styles.fPillText,
                        { color: selected ? "#fff" : theme.text },
                      ]}
                    >
                      ≤ {p}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text
              allowFontScaling={false}
              style={[styles.fLabel, { color: theme.sub, marginTop: 12 }]}
            >
              {t("hotels.minRating")}
            </Text>

            <View style={[styles.rowWrap, { alignItems: "center" }]}>
              {ratingOptions.map((r) => {
                const selected = (draft?.minRating ?? 0) === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() =>
                      setDraft((prev) => ({
                        ...prev,
                        minRating: selected ? 0 : r,
                      }))
                    }
                    style={[
                      styles.fPill,
                      {
                        borderColor: selected ? theme.brand : theme.border,
                        backgroundColor: selected ? theme.brand : theme.card,
                      },
                    ]}
                  >
                    <Text
                      allowFontScaling={false}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[
                        styles.fPillText,
                        { color: selected ? "#fff" : theme.text },
                      ]}
                    >
                      {r === 0 ? t("hotels.any") : `${r}+`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text
              allowFontScaling={false}
              style={[styles.fLabel, { color: theme.sub, marginTop: 12 }]}
            >
              {t("hotels.stars")}
            </Text>

            <View style={[styles.rowWrap, { alignItems: "center" }]}>
              {[3, 4, 5].map((s) => {
                const selected = (draft?.stars || []).includes(s);
                return (
                  <Pressable
                    key={s}
                    onPress={() => toggleStar(s)}
                    style={[
                      styles.fPill,
                      {
                        borderColor: selected ? theme.brand : theme.border,
                        backgroundColor: selected ? theme.brand : theme.card,
                      },
                    ]}
                  >
                    <Text
                      allowFontScaling={false}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[
                        styles.fPillText,
                        { color: selected ? "#fff" : theme.text },
                      ]}
                    >
                      {s}★
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text
              allowFontScaling={false}
              style={[styles.fLabel, { color: theme.sub, marginTop: 12 }]}
            >
              {t("hotels.amenities")}
            </Text>

            <View style={{ marginTop: 8 }}>
              {amenityOptions.map((a) => {
                const selected = (draft?.amenities || []).includes(a.key);
                return (
                  <Pressable
                    key={a.key}
                    onPress={() => toggleAmenity(a.key)}
                    style={[
                      styles.amenityRow,
                      {
                        borderColor: selected ? theme.brand : theme.border,
                        backgroundColor: theme.card,
                      },
                    ]}
                  >
                    <View style={styles.amenityLeft}>
                      <Ionicons
                        name={a.icon}
                        size={18}
                        color={selected ? theme.brand : theme.sub}
                      />
                      <Text
                        allowFontScaling={false}
                        style={[styles.amenityText, { color: theme.text }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {a.label}
                      </Text>
                    </View>

                    <Ionicons
                      name={selected ? "checkbox" : "square-outline"}
                      size={18}
                      color={selected ? theme.brand : theme.sub}
                    />
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.modalBtnRow}>
            <Pressable
              onPress={onReset}
              style={[
                styles.sheetBtn,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                allowFontScaling={false}
                style={[styles.sheetBtnTextAlt, { color: theme.text }]}
              >
                {t("common.reset")}
              </Text>
            </Pressable>

            <Pressable
              onPress={onApply}
              style={[
                styles.sheetBtn,
                { backgroundColor: theme.brand, marginRight: 0 },
              ]}
            >
              <Text allowFontScaling={false} style={styles.sheetBtnText}>
                {t("common.apply")}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Chip({ label, onRemove, theme }) {
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <Text
        allowFontScaling={false}
        style={[styles.chipText, { color: theme.text }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>

      <Pressable onPress={onRemove} hitSlop={8} style={styles.chipX}>
        <Ionicons name="close" size={14} color={theme.sub} />
      </Pressable>
    </View>
  );
}

export default function HotelsScreen({ navigation }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { location } = useExploreLocation();

  const [checkIn, setCheckIn] = useState(() => defaultDatePlus(7));
  const [checkOut, setCheckOut] = useState(() => defaultDatePlus(10));

  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);

  const [mode, setMode] = useState("all");
  const [didSearch, setDidSearch] = useState(false);

  const [pickTarget, setPickTarget] = useState(null);

  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("relevance");

  const defaultFilters = useMemo(
    () => ({
      maxPrice: null,
      minRating: 0,
      stars: [],
      amenities: [],
    }),
    []
  );

  const [filters, setFilters] = useState(defaultFilters);

  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersDraft, setFiltersDraft] = useState(defaultFilters);

  const title = useMemo(() => {
    const city = location?.city || t("hotels.destination");
    const country = location?.country ? `, ${location.country}` : "";
    return `${city}${country}`;
  }, [location, t]);

  const applyCheckIn = (dateObj) => {
    const next = toYMDLocal(dateObj);
    setCheckIn(next);
    if (parseYMD(checkOut).getTime() <= parseYMD(next).getTime()) {
      setCheckOut(addDays(next, 1));
    }
  };

  const applyCheckOut = (dateObj) => {
    const next = toYMDLocal(dateObj);
    if (parseYMD(next).getTime() <= parseYMD(checkIn).getTime()) {
      setCheckOut(addDays(checkIn, 1));
      return;
    }
    setCheckOut(next);
  };

  const load = useCallback(
    async (nextMode = "all", ci = checkIn, co = checkOut) => {
      try {
        if (!location?.cityCode) {
          Alert.alert(
            t("hotels.title"),
            t("hotels.errors.selectDestinationFirst")
          );
          navigation.navigate("SelectCity");
          return;
        }

        if (nextMode === "available" && !validRange(ci, co)) {
          Alert.alert(
            t("hotels.datesTitle"),
            t("hotels.errors.invalidDateRange")
          );
          return;
        }

        setLoading(true);
        setDidSearch(true);

        const data = await searchHotels({
          cityId: location.cityCode,
          limit: 30,
          checkIn: ci,
          checkOut: co,
          onlyAvailable: nextMode === "available",
        });

        const list = Array.isArray(data) ? data : [];

        if (nextMode === "available") {
          const onlyWithOffers = list.filter((x) => x?.priceFrom != null);
          setAvailableItems(onlyWithOffers);
        } else {
          setAllItems(list);
        }

        setMode(nextMode);
      } catch (e) {
        Alert.alert(
          t("hotels.title"),
          e?.message || t("hotels.errors.loadFailed")
        );
        if (nextMode === "available") setAvailableItems([]);
        else setAllItems([]);
      } finally {
        setLoading(false);
      }
    },
    [location?.cityCode, navigation, checkIn, checkOut, t]
  );

  useEffect(() => {
    if (!location?.cityCode) return;
    load("all");
  }, [location?.cityCode, load]);

  const filteredItems = useMemo(() => {
    const query = q.trim().toLowerCase();
    const maxPrice = filters.maxPrice;
    const minRating = filters.minRating || 0;
    const stars = Array.isArray(filters.stars) ? filters.stars : [];
    const wantedAmenities = Array.isArray(filters.amenities)
      ? filters.amenities
      : [];

    const baseItems = mode === "available" ? availableItems : allItems;

    const out = (baseItems || []).filter((h) => {
      if (query) {
        const name = String(h?.name || "").toLowerCase();
        if (!name.includes(query)) return false;
      }

      const price = safeNum(h?.priceFrom, null);
      if (maxPrice != null) {
        if (price == null) return false;
        if (price > maxPrice) return false;
      }

      const rating10 = ratingTo10(h?.rating ?? h?.score);
      if (minRating && rating10 < minRating) return false;

      const st = safeNum(h?.stars, safeNum(h?.starRating, null));
      if (stars.length && (st == null || !stars.includes(st))) return false;

      if (wantedAmenities.length) {
        const set = hotelAmenitiesSet(h);
        if (!wantedAmenities.every((k) => set.has(k))) return false;
      }

      return true;
    });

    const sorted = [...out];
    sorted.sort((a, b) => {
      if (sortKey === "price_asc") {
        const pa = safeNum(a?.priceFrom, Number.POSITIVE_INFINITY);
        const pb = safeNum(b?.priceFrom, Number.POSITIVE_INFINITY);
        return pa - pb;
      }
      if (sortKey === "price_desc") {
        const pa = safeNum(a?.priceFrom, Number.NEGATIVE_INFINITY);
        const pb = safeNum(b?.priceFrom, Number.NEGATIVE_INFINITY);
        return pb - pa;
      }
      if (sortKey === "rating_desc") {
        const ra = ratingTo10(a?.rating ?? a?.score);
        const rb = ratingTo10(b?.rating ?? b?.score);
        return rb - ra;
      }
      if (sortKey === "reviews_desc") {
        const ca = safeNum(a?.reviewCount, safeNum(a?.reviews, 0)) || 0;
        const cb = safeNum(b?.reviewCount, safeNum(b?.reviews, 0)) || 0;
        return cb - ca;
      }
      return 0;
    });

    return sorted;
  }, [allItems, availableItems, mode, q, filters, sortKey]);

  const appliedChips = useMemo(() => {
    const chips = [];

    if (q.trim()) {
      chips.push({ key: "q", label: `${t("hotels.searchChip")}: ${q.trim()}` });
    }

    if (filters.maxPrice != null) {
      chips.push({ key: "maxPrice", label: `≤ ${filters.maxPrice}` });
    }

    if (filters.minRating) {
      chips.push({
        key: "minRating",
        label: `${filters.minRating}+ ${t("hotels.rating")}`,
      });
    }

    if (filters.stars?.length) {
      chips.push({ key: "stars", label: `${filters.stars.join(", ")}★` });
    }

    if (filters.amenities?.length) {
      chips.push({
        key: "amenities",
        label: `${t("hotels.amenities")}: ${filters.amenities.length}`,
      });
    }

    if (sortKey !== "relevance") {
      const label =
        sortKey === "price_asc"
          ? t("hotels.sortChips.priceAsc")
          : sortKey === "price_desc"
          ? t("hotels.sortChips.priceDesc")
          : sortKey === "rating_desc"
          ? t("hotels.sortChips.ratingDesc")
          : t("hotels.sortChips.reviewsDesc");

      chips.push({ key: "sort", label });
    }

    return chips;
  }, [q, filters, sortKey, t]);

  const removeChip = (key) => {
    if (key === "q") setQ("");
    else if (key === "maxPrice") setFilters((p) => ({ ...p, maxPrice: null }));
    else if (key === "minRating") setFilters((p) => ({ ...p, minRating: 0 }));
    else if (key === "stars") setFilters((p) => ({ ...p, stars: [] }));
    else if (key === "amenities") setFilters((p) => ({ ...p, amenities: [] }));
    else if (key === "sort") setSortKey("relevance");
  };

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
          <View style={styles.topRow}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={theme.text} />
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text
                allowFontScaling={false}
                style={[styles.title, { color: theme.text }]}
                numberOfLines={1}
              >
                {t("navigation.hotels")}
              </Text>
              <Text
                allowFontScaling={false}
                style={[styles.dest, { color: theme.sub }]}
                numberOfLines={1}
              >
                {title}
              </Text>
            </View>

            <View
              style={{ flexDirection: "row", gap: 14, alignItems: "center" }}
            >
              <Pressable
                onPress={() => navigation.navigate("MyHotelBookings")}
                hitSlop={10}
              >
                <Ionicons name="receipt-outline" size={22} color={theme.text} />
              </Pressable>

              <Pressable
                onPress={() => navigation.navigate("SelectCity")}
                hitSlop={10}
              >
                <Ionicons name="swap-horizontal" size={20} color={theme.text} />
              </Pressable>
            </View>
          </View>

          <FlatList
            data={loading ? [] : filteredItems}
            keyExtractor={(x) => String(x.id)}
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
                <Text
                  allowFontScaling={false}
                  style={[styles.modeText, { color: theme.sub }]}
                >
                  {t("hotels.showing")}:{" "}
                  {mode === "available"
                    ? t("hotels.available")
                    : t("hotels.all")}{" "}
                  • {filteredItems.length} {t("hotels.results")}
                </Text>

                <View style={styles.searchRow}>
                  <View
                    style={[
                      styles.searchBox,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="search-outline"
                      size={18}
                      color={theme.sub}
                    />
                    <TextInput
                      value={q}
                      onChangeText={setQ}
                      placeholder={t("hotels.searchPlaceholder")}
                      placeholderTextColor={theme.sub}
                      style={[styles.searchInput, { color: theme.text }]}
                      returnKeyType="search"
                      blurOnSubmit={false}
                    />
                    {q?.length ? (
                      <Pressable onPress={() => setQ("")} hitSlop={10}>
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color={theme.sub}
                        />
                      </Pressable>
                    ) : null}
                  </View>

                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setSortOpen(true);
                    }}
                    style={[
                      styles.iconBtn,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="swap-vertical-outline"
                      size={18}
                      color={theme.text}
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setFiltersDraft(filters);
                      setFiltersOpen(true);
                    }}
                    style={[
                      styles.iconBtn,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="options-outline"
                      size={18}
                      color={theme.text}
                    />
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.chipsArea,
                    !appliedChips.length && styles.chipsAreaEmpty,
                  ]}
                >
                  {appliedChips.length ? (
                    <FlatList
                      data={appliedChips}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyExtractor={(c) => c.key}
                      style={styles.chipsList}
                      contentContainerStyle={styles.chipsListContent}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item, index }) => (
                        <View
                          style={{
                            marginRight:
                              index === appliedChips.length - 1 ? 0 : 8,
                          }}
                        >
                          <Chip
                            label={item.label}
                            theme={theme}
                            onRemove={() => removeChip(item.key)}
                          />
                        </View>
                      )}
                    />
                  ) : null}
                </View>

                <View style={styles.inputsRow}>
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setPickTarget("in");
                    }}
                    style={[
                      styles.dateBtn,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.card,
                      },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={theme.sub}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        allowFontScaling={false}
                        style={[styles.dateLabel, { color: theme.sub }]}
                      >
                        {t("hotels.checkIn")}
                      </Text>
                      <Text
                        allowFontScaling={false}
                        style={[styles.dateValue, { color: theme.text }]}
                      >
                        {checkIn}
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setPickTarget("out");
                    }}
                    style={[
                      styles.dateBtn,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.card,
                      },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={theme.sub}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        allowFontScaling={false}
                        style={[styles.dateLabel, { color: theme.sub }]}
                      >
                        {t("hotels.checkOut")}
                      </Text>
                      <Text
                        allowFontScaling={false}
                        style={[styles.dateValue, { color: theme.text }]}
                      >
                        {checkOut}
                      </Text>
                    </View>
                  </Pressable>
                </View>

                <View style={styles.btnRow}>
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setQ("");
                      setSortKey("relevance");
                      setFilters(defaultFilters);
                      load("all");
                    }}
                    style={[
                      styles.btn,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Text
                      allowFontScaling={false}
                      style={[styles.btnTextAlt, { color: theme.text }]}
                    >
                      {t("hotels.showAll")}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      load("available", checkIn, checkOut);
                    }}
                    style={[styles.btn, { backgroundColor: theme.brand }]}
                  >
                    <Text allowFontScaling={false} style={styles.btnText}>
                      {t("hotels.checkAvailability")}
                    </Text>
                  </Pressable>
                </View>

                {loading ? (
                  <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.text} />
                  </View>
                ) : null}
              </View>
            }
            renderItem={({ item }) => (
              <HotelCard
                item={item}
                mode={mode}
                onPress={() =>
                  navigation.navigate("HotelDetails", {
                    hotelId: item.id,
                    hotelName: item.name,
                    checkIn,
                    checkOut,
                  })
                }
              />
            )}
            ListEmptyComponent={
              !loading ? (
                <View style={{ paddingTop: 10 }}>
                  <Text
                    allowFontScaling={false}
                    style={{
                      color: theme.sub,
                      fontFamily: "Montserrat_400Regular",
                    }}
                  >
                    {didSearch ? t("hotels.noHotels") : t("hotels.pickCity")}
                  </Text>
                </View>
              ) : null
            }
          />

          <DatePickerModal
            visible={pickTarget === "in"}
            onClose={() => setPickTarget(null)}
            value={parseYMD(checkIn)}
            minDate={new Date()}
            title={t("hotels.selectCheckIn")}
            theme={theme}
            t={t}
            onChange={(d) => applyCheckIn(d)}
          />
          <DatePickerModal
            visible={pickTarget === "out"}
            onClose={() => setPickTarget(null)}
            value={parseYMD(checkOut)}
            minDate={parseYMD(addDays(checkIn, 1))}
            title={t("hotels.selectCheckOut")}
            theme={theme}
            t={t}
            onChange={(d) => applyCheckOut(d)}
          />

          <SortModal
            visible={sortOpen}
            onClose={() => setSortOpen(false)}
            value={sortKey}
            onChange={setSortKey}
            theme={theme}
            t={t}
          />

          <FiltersModal
            visible={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            draft={filtersDraft}
            setDraft={setFiltersDraft}
            theme={theme}
            t={t}
            onReset={() => setFiltersDraft(defaultFilters)}
            onApply={() => {
              setFilters(filtersDraft);
              setFiltersOpen(false);
            }}
          />
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 22,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    minHeight: 32,
  },

  title: {
    fontSize: 18,
    fontFamily: "Montserrat_400Regular",
  },

  dest: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  modeText: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    marginBottom: 10,
  },

  searchRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  searchBox: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    padding: 0,
    margin: 0,
    height: 40,
  },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  chipsArea: {
    minHeight: 38,
    marginTop: 8,
    justifyContent: "center",
  },

  chipsAreaEmpty: {
    minHeight: 0,
    marginTop: 0,
  },

  chipsList: {
    maxHeight: 34,
    marginTop: 4,
  },

  chipsListContent: {
    alignItems: "center",
    paddingHorizontal: 2,
  },

  chip: {
    borderWidth: 1,
    borderRadius: 999,
    height: 30,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    maxWidth: 200,
  },

  chipText: {
    fontSize: 11,
    lineHeight: 12,
    includeFontPadding: false,
    textAlignVertical: "center",
    fontFamily: "Montserrat_400Regular",
    flexShrink: 1,
    marginRight: 6,
  },

  chipX: {
    height: 24,
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  inputsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },

  dateBtn: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  dateLabel: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
  },

  dateValue: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },

  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    marginBottom: 14,
  },

  btn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  btnText: {
    color: "#fff",
    fontFamily: "Montserrat_400Regular",
  },

  btnTextAlt: {
    fontFamily: "Montserrat_400Regular",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  modalBackdropCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  modalPanel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    alignSelf: "stretch",
  },

  filtersPanel: {
    maxHeight: "80%",
  },

  modalCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },

  modalTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  modalTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
  },

  modalBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  modalBtnText: {
    color: "#fff",
    fontFamily: "Montserrat_400Regular",
  },

  sheetRow: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sheetRowText: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },

  sheetBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  sheetBtnText: {
    color: "#fff",
    fontFamily: "Montserrat_400Regular",
  },

  sheetBtnTextAlt: {
    fontFamily: "Montserrat_400Regular",
  },

  fLabel: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
  },

  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 6,
  },

  fPill: {
    borderWidth: 1,
    borderRadius: 999,
    height: 32,
    minWidth: 72,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 8,
    alignSelf: "flex-start",
  },

  fPillText: {
    fontSize: 11,
    lineHeight: 12,
    includeFontPadding: false,
    textAlignVertical: "center",
    fontFamily: "Montserrat_400Regular",
    flexShrink: 1,
  },

  amenityRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  amenityLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  amenityText: {
    marginLeft: 10,
    fontSize: 12,
    lineHeight: 14,
    includeFontPadding: false,
    fontFamily: "Montserrat_400Regular",
    maxWidth: "84%",
    flexShrink: 1,
  },

  modalBtnRow: {
    flexDirection: "row",
    marginTop: 10,
    justifyContent: "space-between",
  },
});
