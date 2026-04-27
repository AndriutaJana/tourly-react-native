import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
  FlatList,
  Dimensions,
  Animated,
  Modal,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useAppTheme } from "../../../theme/useAppTheme";
import { getHotelDetails } from "../../api/hotelsApi";
import { useWishlist } from "../../context/WishlistContext";

const W = Dimensions.get("window").width;
const PHOTO_W = W - 44;
const PHOTO_GAP = 12;
const TRIPS_ENTRY_ROUTE = "Trips";

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

function titleCase(s) {
  return String(s || "")
    .replace(/_/g, " ")
    .trim()
    .replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1));
}

function clampNights(n) {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(30, n));
}

function diffNights(checkIn, checkOut) {
  const a = parseYMD(checkIn);
  const b = parseYMD(checkOut);
  const ms = b.getTime() - a.getTime();
  const nights = Math.floor(ms / (1000 * 60 * 60 * 24));
  return clampNights(nights <= 0 ? 1 : nights);
}

function SectionTitle({ children, theme }) {
  return (
    <Text style={[styles.sectionTitle, { color: theme.text }]}>{children}</Text>
  );
}

function InfoPill({ icon, text, theme }) {
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: theme.isDark ? "#141414" : "#F6F6F6",
          borderColor: theme.border,
        },
      ]}
    >
      <Ionicons name={icon} size={14} color={theme.sub} />
      <Text style={[styles.pillText, { color: theme.text }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function StarRow({ stars = 0, theme }) {
  const n = Math.max(0, Math.min(5, Number(stars) || 0));
  return (
    <View style={{ flexDirection: "row", gap: 2, alignItems: "center" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < n ? "star" : "star-outline"}
          size={14}
          color={theme.sub}
        />
      ))}
    </View>
  );
}

function AmenityChip({ label, theme }) {
  const lower = String(label || "").toLowerCase();
  const icon = lower.includes("wifi")
    ? "wifi"
    : lower.includes("breakfast")
    ? "restaurant"
    : lower.includes("parking")
    ? "car"
    : lower.includes("pool")
    ? "water"
    : lower.includes("spa")
    ? "flower"
    : lower.includes("gym")
    ? "barbell"
    : lower.includes("pet")
    ? "paw"
    : lower.includes("shuttle")
    ? "airplane"
    : "checkmark-circle";

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: theme.isDark ? "#1C1C1C" : "#F2F2F2",
          borderColor: theme.border,
        },
      ]}
    >
      <Ionicons name={icon} size={14} color={theme.sub} />
      <Text style={[styles.chipText, { color: theme.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function RoomCard({
  room,
  theme,
  selected,
  onPress,
  currencyFallback = "EUR",
  t,
}) {
  const price = room?.pricePerNight;
  const currency = room?.currency || currencyFallback;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.roomCard,
        {
          backgroundColor: theme.card,
          borderColor: selected ? theme.brand : theme.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={[styles.roomTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {room?.roomKey
              ? t(`generateHotels.rooms.${room.roomKey}`)
              : room?.name || t("hotelDetails.room")}
          </Text>

          {selected ? (
            <View
              style={[styles.selectedBadge, { backgroundColor: theme.brand }]}
            >
              <Text style={styles.selectedBadgeText}>
                {t("hotelDetails.selected")}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.roomPillsRow}>
          <InfoPill
            icon="bed-outline"
            text={
              room?.bedKey
                ? t(`generateHotels.beds.${room.bedKey}`)
                : room?.beds || t("hotelDetails.bedsFallback")
            }
            theme={theme}
          />
          <InfoPill
            icon="people-outline"
            text={
              room?.capacity
                ? `${t("hotelDetails.capacity")} ${room.capacity}`
                : `${t("hotelDetails.capacity")} —`
            }
            theme={theme}
          />
        </View>

        <View style={styles.roomBadgesRow}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: theme.isDark ? "#141414" : "#F6F6F6",
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons
              name={room?.refundable ? "refresh" : "close-circle-outline"}
              size={14}
              color={theme.sub}
            />
            <Text style={[styles.badgeText, { color: theme.text }]}>
              {room?.refundable
                ? t("hotelDetails.refundable")
                : t("hotelDetails.nonRefundable")}
            </Text>
          </View>

          <View
            style={[
              styles.badge,
              {
                backgroundColor: theme.isDark ? "#141414" : "#F6F6F6",
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons
              name={
                room?.breakfastIncluded ? "restaurant" : "remove-circle-outline"
              }
              size={14}
              color={theme.sub}
            />
            <Text style={[styles.badgeText, { color: theme.text }]}>
              {room?.breakfastIncluded
                ? t("amenities.breakfast")
                : t("hotelDetails.noBreakfast")}
            </Text>
          </View>

          {room?.lastRooms ? (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: theme.isDark ? "#141414" : "#F6F6F6",
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons name="flame-outline" size={14} color={theme.sub} />
              <Text style={[styles.badgeText, { color: theme.text }]}>
                {t("hotelDetails.last")} {room.lastRooms}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <Text style={[styles.roomPrice, { color: theme.text }]}>
          {price != null ? `${price} ${currency}` : `— ${currency}`}
        </Text>
        <Text style={[styles.roomMeta2, { color: theme.sub }]}>
          {t("hotelDetails.perNight")}
        </Text>

        <View
          style={[
            styles.selectDot,
            {
              borderColor: selected ? theme.brand : theme.border,
              backgroundColor: selected ? theme.brand : "transparent",
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

function DatePickerModalIOS({
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
        <TouchableWithoutFeedback>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.bg, borderColor: theme.border },
            ]}
          >
            <View style={styles.modalTopRow}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {title}
              </Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={20} color={theme.sub} />
              </Pressable>
            </View>

            <View
              style={{
                backgroundColor: theme.isDark ? "#0F0F0F" : "#FFFFFF",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                paddingVertical: 6,
              }}
            >
              <DateTimePicker
                value={temp}
                mode="date"
                display="spinner"
                minimumDate={minDate}
                themeVariant={theme.isDark ? "dark" : "light"}
                textColor={theme.isDark ? "#FFFFFF" : "#000000"}
                onChange={(_, d) => {
                  if (d) setTemp(d);
                }}
              />
            </View>

            <Pressable
              style={[styles.modalBtn, { backgroundColor: theme.brand }]}
              onPress={() => {
                onChange(temp);
                onClose();
              }}
            >
              <Text style={styles.modalBtnText}>{t("common.done")}</Text>
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </Pressable>
    </Modal>
  );
}

function RowKV({ icon, label, value, theme, t }) {
  return (
    <View style={styles.kvRow}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={icon} size={16} color={theme.sub} />
        <Text style={[styles.kvLabel, { color: theme.sub }]}>{label}</Text>
      </View>
      <Text style={[styles.kvValue, { color: theme.text }]} numberOfLines={3}>
        {value || "—"}
      </Text>
    </View>
  );
}

export default function HotelDetailsScreen({ route, navigation }) {
  const {
    hotelId,
    hotelName,
    checkIn: passedIn,
    checkOut: passedOut,
  } = route.params;

  const theme = useAppTheme();
  const { t } = useTranslation();
  const { add, remove, isSaved } = useWishlist();

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);

  const [checkIn, setCheckIn] = useState(
    () => passedIn || addDays(toYMDLocal(new Date()), 7)
  );
  const [checkOut, setCheckOut] = useState(
    () => passedOut || addDays(toYMDLocal(new Date()), 10)
  );

  const [selectedRoomCode, setSelectedRoomCode] = useState(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [pickTarget, setPickTarget] = useState(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const xid = `hotel_${hotelId}`;
  const saved = isSaved(xid);

  const headerTitle = hotelName || details?.name || t("hotelDetails.hotel");

  const photos = useMemo(() => {
    const p = [details?.thumbnail, ...(details?.photos || [])].filter(Boolean);
    return Array.from(new Set(p));
  }, [details]);

  const amenities = details?.amenities || [];
  const rooms = details?.rooms || [];
  const currency = details?.currency || "EUR";

  const nights = useMemo(
    () => diffNights(checkIn, checkOut),
    [checkIn, checkOut]
  );

  const selectedRoom = useMemo(() => {
    if (!rooms.length) return null;
    return (
      rooms.find((r) => (r.code || r.name) === selectedRoomCode) || rooms[0]
    );
  }, [rooms, selectedRoomCode]);

  const pricePerNight =
    selectedRoom?.pricePerNight ?? details?.priceFrom ?? null;

  const total = useMemo(() => {
    if (pricePerNight == null) return null;
    return Math.round(pricePerNight * nights);
  }, [pricePerNight, nights]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const d = await getHotelDetails(hotelId);
      setDetails(d);

      const roomList = d?.rooms || [];
      if (roomList.length) {
        const cheapest = [...roomList].sort(
          (x, y) => (x?.pricePerNight || 0) - (y?.pricePerNight || 0)
        )[0];

        setSelectedRoomCode(
          cheapest?.code ||
            cheapest?.name ||
            roomList[0]?.code ||
            roomList[0]?.name ||
            null
        );
      } else {
        setSelectedRoomCode(null);
      }
    } catch (e) {
      Alert.alert(
        t("hotelDetails.title"),
        e?.message || t("hotelDetails.errors.loadFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [hotelId]);

  const toggleSave = async () => {
    try {
      if (saved) {
        await remove(xid);
        return;
      }

      const preview = details?.thumbnail || details?.photos?.[0] || null;
      const title = details?.name || hotelName || t("hotelDetails.hotel");
      const subtitleValue = details?.city || details?.neighborhood || null;

      await add({
        xid,
        kind: "hotel",
        hotelId: String(hotelId),
        title,
        subtitle: subtitleValue,
        preview,
        city: details?.city || null,
        rating: details?.rating ?? null,
        priceFrom: details?.priceFrom ?? null,
        payload: {
          hotelId: String(hotelId),
          name: title,
          imageUrl: preview,
          address: details?.address || null,
          city: details?.city || null,
          neighborhood: details?.neighborhood || null,
          distanceFromCenterKm: details?.distanceFromCenterKm ?? null,
          stars: details?.stars ?? null,
          rating: details?.rating ?? null,
          reviewCount: details?.reviewCount ?? null,
          currency: details?.currency || "EUR",
          priceFrom: details?.priceFrom ?? null,
          checkIn,
          checkOut,
        },
      });
    } catch (e) {
      console.log("toggleSave details error:", e?.message);
    }
  };

  const onAddHotelToTrip = useCallback(() => {
    if (!details) return;

    const item = {
      type: "hotel",
      id: details?.id || hotelId,
      hotelId: details?.id || hotelId,
      name: details?.name || hotelName || t("hotelDetails.hotel"),
      preview:
        details?.thumbnail || details?.imageUrl || details?.photos?.[0] || null,
      city: details?.city || null,
      address: details?.address || null,
      lat: details?.lat ?? null,
      lon: details?.lon ?? null,
      priceFrom: selectedRoom?.pricePerNight ?? details?.priceFrom ?? null,
      currency: details?.currency || "EUR",
      stars: details?.stars ?? null,
      rating: details?.rating ?? null,
      estimatedDurationMin: nights * 24 * 60,
      estimatedCost: total ?? details?.priceFrom ?? 0,
      amenities: details?.amenities ?? [],
      payload: {
        ...details,
        selectedRoom: selectedRoom
          ? {
              code: selectedRoom?.code || null,
              name: selectedRoom?.name || t("hotelDetails.room"),
              pricePerNight: selectedRoom?.pricePerNight ?? null,
              refundable: !!selectedRoom?.refundable,
              breakfastIncluded: !!selectedRoom?.breakfastIncluded,
            }
          : null,
        checkIn,
        checkOut,
        nights,
      },
    };

    try {
      navigation.navigate(TRIPS_ENTRY_ROUTE, {
        screen: "SelectTrip",
        params: { item },
      });
    } catch (e) {
      Alert.alert(
        t("hotelDetails.tripTitle"),
        t("hotelDetails.errors.selectTripOpenFailed")
      );
    }
  }, [
    navigation,
    details,
    hotelId,
    hotelName,
    selectedRoom,
    checkIn,
    checkOut,
    nights,
    total,
    t,
  ]);

  const onReserve = useCallback(() => {
    if (!details) return;

    if (!selectedRoom) {
      Alert.alert(
        t("hotelDetails.reserveTitle"),
        t("hotelDetails.errors.selectRoomFirst")
      );
      return;
    }

    navigation.navigate("HotelBooking", {
      hotel: {
        hotelId: String(hotelId),
        name: details?.name || hotelName || t("hotelDetails.hotel"),
        thumbnail: details?.thumbnail || null,
        address: details?.address || null,
        city: details?.city || null,
        currency: currency || "EUR",
        priceFrom: details?.priceFrom ?? null,
      },
      room: {
        code: selectedRoom?.code || null,
        name: selectedRoom?.name || t("hotelDetails.room"),
        refundable: !!selectedRoom?.refundable,
        breakfastIncluded: !!selectedRoom?.breakfastIncluded,
        pricePerNight: selectedRoom?.pricePerNight ?? null,
        currency: currency || "EUR",
      },
      dates: { checkIn, checkOut, nights },
    });
  }, [
    details,
    selectedRoom,
    hotelId,
    hotelName,
    currency,
    checkIn,
    checkOut,
    nights,
    navigation,
    t,
  ]);

  const applyCheckIn = useCallback(
    (dateObj) => {
      const next = toYMDLocal(dateObj);
      setCheckIn(next);

      if (parseYMD(checkOut).getTime() <= parseYMD(next).getTime()) {
        setCheckOut(addDays(next, 1));
      }
    },
    [checkOut]
  );

  const applyCheckOut = useCallback(
    (dateObj) => {
      const next = toYMDLocal(dateObj);

      if (parseYMD(next).getTime() <= parseYMD(checkIn).getTime()) {
        setCheckOut(addDays(checkIn, 1));
        return;
      }

      setCheckOut(next);
    },
    [checkIn]
  );

  const openAndroidPicker = useCallback(
    (target) => {
      const isIn = target === "in";
      const value = isIn ? parseYMD(checkIn) : parseYMD(checkOut);
      const minDate = isIn ? new Date() : parseYMD(addDays(checkIn, 1));

      DateTimePickerAndroid.open({
        value,
        mode: "date",
        is24Hour: true,
        minimumDate: minDate,
        onChange: (event, date) => {
          if (event.type !== "set" || !date) return;
          if (isIn) applyCheckIn(date);
          else applyCheckOut(date);
        },
      });
    },
    [checkIn, checkOut, applyCheckIn, applyCheckOut]
  );

  const openPicker = useCallback(
    (target) => {
      if (Platform.OS === "android") openAndroidPicker(target);
      else setPickTarget(target);
    },
    [openAndroidPicker]
  );

  const stickyOpacity = scrollY.interpolate({
    inputRange: [140, 200],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const stickyTranslate = scrollY.interpolate({
    inputRange: [140, 200],
    outputRange: [-8, 0],
    extrapolate: "clamp",
  });

  const renderPhoto = ({ item }) => (
    <Image
      source={{ uri: item }}
      style={[
        styles.heroPhoto,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      resizeMode="cover"
    />
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.stickyWrap,
          {
            opacity: stickyOpacity,
            transform: [{ translateY: stickyTranslate }],
          },
        ]}
      >
        <View
          style={[
            styles.stickyInner,
            { backgroundColor: theme.bg, borderColor: theme.border },
          ]}
        >
          <Text
            style={[styles.stickyTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {headerTitle}
          </Text>
          <Text
            style={[styles.stickySub, { color: theme.sub }]}
            numberOfLines={1}
          >
            {pricePerNight != null
              ? `${pricePerNight} ${currency} / ${t("hotelDetails.night")}`
              : t("hotelDetails.selectRoom")}
          </Text>
        </View>
      </Animated.View>

      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>

        <Text
          style={[styles.topTitle, { color: theme.text }]}
          numberOfLines={1}
        >
          {headerTitle}
        </Text>

        <Pressable onPress={toggleSave} hitSlop={10}>
          <Ionicons
            name={saved ? "heart" : "heart-outline"}
            size={22}
            color={theme.text}
          />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      ) : (
        <>
          <Animated.ScrollView
            contentContainerStyle={{ paddingBottom: 150 }}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            {photos?.length ? (
              <View style={{ marginTop: 10 }}>
                <FlatList
                  data={photos.slice(0, 10)}
                  keyExtractor={(x, i) => `${x}_${i}`}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  renderItem={renderPhoto}
                  onMomentumScrollEnd={(e) => {
                    const x = e.nativeEvent.contentOffset.x;
                    const idx = Math.round(x / (PHOTO_W + PHOTO_GAP));
                    setActivePhoto(
                      Math.max(0, Math.min(idx, photos.slice(0, 10).length - 1))
                    );
                  }}
                  snapToInterval={PHOTO_W + PHOTO_GAP}
                  decelerationRate="fast"
                  contentContainerStyle={{
                    paddingHorizontal: 22,
                    gap: PHOTO_GAP,
                  }}
                />

                <View style={styles.dotsRow}>
                  {photos.slice(0, 10).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            i === activePhoto ? theme.text : theme.border,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 22, marginTop: 12 }}>
                <View
                  style={[
                    styles.noPhoto,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Ionicons name="image-outline" size={22} color={theme.sub} />
                  <Text style={[styles.muted, { color: theme.sub }]}>
                    {t("hotelDetails.noPhotos")}
                  </Text>
                </View>
              </View>
            )}

            <View style={{ paddingHorizontal: 22, marginTop: 14 }}>
              <Text
                style={[styles.hName, { color: theme.text }]}
                numberOfLines={2}
              >
                {details?.name || headerTitle}
              </Text>

              <View style={styles.summaryWrap}>
                <View
                  style={[
                    styles.summaryCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Ionicons name="star" size={16} color={theme.sub} />
                  <StarRow stars={details?.stars} theme={theme} />
                </View>

                <View
                  style={[
                    styles.summaryCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Ionicons
                    name="sparkles-outline"
                    size={16}
                    color={theme.sub}
                  />
                  <Text style={[styles.small, { color: theme.text }]}>
                    {details?.rating ? `${details.rating}` : "—"}
                  </Text>
                  <Text style={[styles.small, { color: theme.sub }]}>
                    {details?.reviewCount ? `(${details.reviewCount})` : ""}
                  </Text>
                </View>

                {details?.distanceFromCenterKm != null ? (
                  <View
                    style={[
                      styles.summaryCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="navigate-outline"
                      size={16}
                      color={theme.sub}
                    />
                    <Text style={[styles.small, { color: theme.text }]}>
                      {details.distanceFromCenterKm} km
                    </Text>
                    <Text style={[styles.small, { color: theme.sub }]}>
                      {t("hotelDetails.toCenter")}
                    </Text>
                  </View>
                ) : null}
              </View>

              {!!details?.neighborhood && (
                <Text
                  style={[styles.muted, { color: theme.sub, marginTop: 10 }]}
                  numberOfLines={2}
                >
                  {details?.neighborhoodKey
                    ? t(
                        `generateHotels.neighborhoods.${details.neighborhoodKey}`
                      )
                    : details?.neighborhood}
                </Text>
              )}

              {!!details?.address && (
                <View
                  style={[
                    styles.infoBox,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={theme.sub}
                  />
                  <Text
                    style={[styles.infoText, { color: theme.text }]}
                    numberOfLines={3}
                  >
                    {details.address}
                  </Text>
                </View>
              )}

              <SectionTitle theme={theme}>
                {t("hotelDetails.dates")}
              </SectionTitle>

              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable
                    onPress={() => openPicker("in")}
                    style={[
                      styles.dateBtn,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.isDark ? "#141414" : "#F6F6F6",
                      },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={theme.sub}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dateLabel, { color: theme.sub }]}>
                        {t("hotelDetails.checkIn")}
                      </Text>
                      <Text style={[styles.dateValue, { color: theme.text }]}>
                        {checkIn}
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => openPicker("out")}
                    style={[
                      styles.dateBtn,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.isDark ? "#141414" : "#F6F6F6",
                      },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={theme.sub}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dateLabel, { color: theme.sub }]}>
                        {t("hotelDetails.checkOut")}
                      </Text>
                      <Text style={[styles.dateValue, { color: theme.text }]}>
                        {checkOut}
                      </Text>
                    </View>
                  </Pressable>
                </View>

                <View style={styles.dateBottomRow}>
                  <Text style={[styles.muted, { color: theme.sub }]}>
                    {nights} {t("hotelDetails.nights")}
                  </Text>
                  <Text style={[styles.muted, { color: theme.sub }]}>
                    {pricePerNight != null
                      ? `${pricePerNight} ${currency}/${t(
                          "hotelDetails.night"
                        )}`
                      : "—"}
                  </Text>
                </View>
              </View>

              <SectionTitle theme={theme}>
                {t("hotelDetails.about")}
              </SectionTitle>
              <Text style={[styles.text, { color: theme.text }]}>
                {details?.description
                  ? t("generateHotels.description", {
                      stars: details.description.stars,
                      neighborhood: details?.description?.neighborhoodKey
                        ? t(
                            `generateHotels.neighborhoods.${details.description.neighborhoodKey}`
                          )
                        : details?.neighborhood || "",
                      city: details.description.city,
                    })
                  : t("hotelDetails.noDescription")}
              </Text>

              <SectionTitle theme={theme}>
                {t("hotelDetails.amenities")}
              </SectionTitle>
              {amenities.length ? (
                <View style={styles.chipsWrap}>
                  {amenities.slice(0, 24).map((a) => (
                    <AmenityChip key={a} label={titleCase(a)} theme={theme} />
                  ))}
                </View>
              ) : (
                <Text style={[styles.muted, { color: theme.sub }]}>
                  {t("hotelDetails.noAmenities")}
                </Text>
              )}

              <SectionTitle theme={theme}>
                {t("hotelDetails.selectRoomTitle")}
              </SectionTitle>
              {rooms.length ? (
                <View style={{ gap: 12 }}>
                  {rooms.map((r) => (
                    <RoomCard
                      key={r.code || r.name}
                      room={r}
                      theme={theme}
                      currencyFallback={currency}
                      t={t}
                      selected={(r.code || r.name) === selectedRoomCode}
                      onPress={() => setSelectedRoomCode(r.code || r.name)}
                    />
                  ))}
                </View>
              ) : (
                <Text style={[styles.muted, { color: theme.sub }]}>
                  {t("hotelDetails.noRooms")}
                </Text>
              )}

              {details?.policies ? (
                <>
                  <SectionTitle theme={theme}>
                    {t("hotelDetails.policies")}
                  </SectionTitle>
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <RowKV
                      icon="time-outline"
                      label={t("hotelDetails.checkIn")}
                      value={details.policies.checkInFrom}
                      theme={theme}
                      t={t}
                    />
                    <RowKV
                      icon="log-out-outline"
                      label={t("hotelDetails.checkOut")}
                      value={details.policies.checkOutUntil}
                      theme={theme}
                      t={t}
                    />
                    <RowKV
                      icon="refresh-outline"
                      label={t("hotelDetails.cancellation")}
                      value={
                        details?.policies?.cancellationKey
                          ? t(
                              `generateHotels.policies.${details.policies.cancellationKey}`
                            )
                          : details?.policies?.cancellation
                      }
                      theme={theme}
                      t={t}
                    />
                    <RowKV
                      icon="paw-outline"
                      label={t("hotelDetails.pets")}
                      value={
                        details?.policies?.petsKey
                          ? t(
                              `generateHotels.policies.${details.policies.petsKey}`
                            )
                          : details?.policies?.pets
                      }
                      theme={theme}
                      t={t}
                    />
                    <RowKV
                      icon="ban-outline"
                      label={t("hotelDetails.smoking")}
                      value={
                        details?.policies?.smokingKey
                          ? t(
                              `generateHotels.policies.${details.policies.smokingKey}`
                            )
                          : details?.policies?.smoking
                      }
                      theme={theme}
                      t={t}
                    />
                  </View>
                </>
              ) : null}
            </View>
          </Animated.ScrollView>

          <View
            style={[
              styles.bottomBar,
              { backgroundColor: theme.bg, borderColor: theme.border },
            ]}
          >
            <View style={styles.bottomInfo}>
              <Text
                style={[styles.bottomPrice, { color: theme.text }]}
                numberOfLines={1}
              >
                {total != null ? `${total} ${currency}` : `— ${currency}`}
              </Text>
              <Text
                style={[styles.bottomSub, { color: theme.sub }]}
                numberOfLines={1}
              >
                {pricePerNight != null
                  ? `${pricePerNight} ${currency} / ${t("hotelDetails.night")}`
                  : t("hotelDetails.selectRoom")}
              </Text>
            </View>

            <Pressable
              onPress={onAddHotelToTrip}
              style={({ pressed }) => [
                styles.tripBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Ionicons name="briefcase-outline" size={18} color={theme.text} />
              <Text style={[styles.tripBtnText, { color: theme.text }]}>
                {t("hotelDetails.addToTrip")}
              </Text>
            </Pressable>

            <Pressable
              onPress={onReserve}
              style={({ pressed }) => [
                styles.reserveBtn,
                { backgroundColor: theme.brand, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Ionicons name="card-outline" size={18} color="#fff" />
              <Text style={styles.reserveText}>
                {t("hotelDetails.reserve")}
              </Text>
            </Pressable>
          </View>

          {Platform.OS === "ios" ? (
            <>
              <DatePickerModalIOS
                visible={pickTarget === "in"}
                onClose={() => setPickTarget(null)}
                value={parseYMD(checkIn)}
                minDate={new Date()}
                title={t("hotelDetails.selectCheckIn")}
                theme={theme}
                t={t}
                onChange={(d) => applyCheckIn(d)}
              />
              <DatePickerModalIOS
                visible={pickTarget === "out"}
                onClose={() => setPickTarget(null)}
                value={parseYMD(checkOut)}
                minDate={parseYMD(addDays(checkIn, 1))}
                title={t("hotelDetails.selectCheckOut")}
                theme={theme}
                t={t}
                onChange={(d) => applyCheckOut(d)}
              />
            </>
          ) : null}
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },

  stickyWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 96,
    zIndex: 20,
    paddingHorizontal: 22,
  },
  stickyInner: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stickyTitle: { fontSize: 13, fontFamily: "Montserrat_400Regular" },
  stickySub: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
  },

  topBar: {
    paddingTop: 62,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 8,
    zIndex: 30,
  },
  topTitle: { flex: 1, fontSize: 16, fontFamily: "Montserrat_400Regular" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  heroPhoto: {
    width: PHOTO_W,
    height: 230,
    borderRadius: 18,
    borderWidth: 1,
  },

  noPhoto: {
    height: 120,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  dotsRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 999 },

  hName: { fontSize: 22, lineHeight: 28, fontFamily: "Montserrat_400Regular" },
  small: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  summaryWrap: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  summaryCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  infoBox: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Montserrat_400Regular",
  },

  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },

  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },

  muted: { fontSize: 12, fontFamily: "Montserrat_400Regular" },
  text: { fontSize: 14, lineHeight: 20, fontFamily: "Montserrat_400Regular" },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chipText: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pillText: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  roomCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  roomTitle: { fontSize: 14, fontFamily: "Montserrat_400Regular" },
  roomMeta2: { fontSize: 11, fontFamily: "Montserrat_400Regular" },
  roomPrice: { fontSize: 15, fontFamily: "Montserrat_400Regular" },

  selectedBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  selectedBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
  },

  roomPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },

  roomBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeText: { fontSize: 11, fontFamily: "Montserrat_400Regular" },

  selectDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
    marginTop: 6,
  },

  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  kvLabel: { fontSize: 12, fontFamily: "Montserrat_400Regular" },
  kvValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  bottomInfo: {
    flex: 1,
    minWidth: 0,
  },

  bottomPrice: { fontSize: 18, fontFamily: "Montserrat_400Regular" },
  bottomSub: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  tripBtn: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  tripBtnText: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },

  reserveBtn: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  reserveText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },

  dateBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  dateLabel: { fontSize: 11, fontFamily: "Montserrat_400Regular" },
  dateValue: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },

  dateBottomRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 18,
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
  modalTitle: { fontSize: 14, fontFamily: "Montserrat_400Regular" },
  modalBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: { color: "#fff", fontFamily: "Montserrat_400Regular" },
});
