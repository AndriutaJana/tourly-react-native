import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Modal,
  TextInput,
  Platform,
  Linking,
  Share,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import * as Location from "expo-location";
import { useAppTheme } from "../../../theme/useAppTheme";
import { placeDetails, bookPlace } from "./placesApi";
import { useWishlist } from "../../context/WishlistContext";
import { useTrips } from "../../context/TripsContext";
import i18n from "../../i18n";
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");

const PLACE_REVIEWS_STORAGE_KEY = "@app/place_reviews";

function buildReviewId() {
  return `review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeReviewList(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(Boolean);
}

function computeReviewsSummary(reviews = []) {
  const safeReviews = normalizeReviewList(reviews);
  const count = safeReviews.length;

  if (!count) {
    return {
      rating: 0,
      reviewsCount: 0,
    };
  }

  const total = safeReviews.reduce(
    (sum, item) => sum + Math.max(0, Math.min(5, Number(item?.rating) || 0)),
    0
  );

  return {
    rating: Number((total / count).toFixed(1)),
    reviewsCount: count,
  };
}

function haversineKm(aLat, aLon, bLat, bLon) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const q = s1 * s1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * (s2 * s2);
  return 2 * R * Math.asin(Math.sqrt(q));
}

function formatPrice(p, tr) {
  if (p === null || p === undefined) return null;
  if (p === 0) return tr("placeDetails.freeEntry");
  return `${tr("placeDetails.from")} $${p}`;
}

function looksLikeMapImage(url = "") {
  const s = String(url).toLowerCase();

  return (
    s.includes("map") ||
    s.includes("staticmap") ||
    s.includes("maps.googleapis") ||
    s.includes("mapbox") ||
    s.includes("openstreetmap") ||
    s.includes("googleapis.com/maps") ||
    s.includes("marker=") ||
    s.includes("center=") ||
    s.includes("zoom=")
  );
}

function uniqueStrings(list = []) {
  return Array.from(new Set(list.filter(Boolean).map((x) => String(x).trim())));
}

function inferNearbyType(item, tr) {
  const raw = String(
    item?.kind || item?.type || item?.category || item?.tag || ""
  )
    .toLowerCase()
    .trim();

  const name = String(item?.name || "").toLowerCase();

  if (
    raw.includes("restaurant") ||
    raw.includes("cafe") ||
    raw.includes("food") ||
    name.includes("restaurant") ||
    name.includes("cafe")
  ) {
    return {
      label: tr("placeDetails.nearbyTypeRestaurant"),
      icon: "restaurant-outline",
      bg: "#FFF4E5",
      iconColor: "#C46A00",
    };
  }

  if (
    raw.includes("hotel") ||
    raw.includes("resort") ||
    raw.includes("stay") ||
    name.includes("hotel")
  ) {
    return {
      label: tr("placeDetails.nearbyTypeHotel"),
      icon: "bed-outline",
      bg: "#EAF2FF",
      iconColor: "#2F6BDE",
    };
  }

  if (raw.includes("museum") || name.includes("museum")) {
    return {
      label: tr("placeDetails.nearbyTypeMuseum"),
      icon: "business-outline",
      bg: "#F3E8FF",
      iconColor: "#7C3AED",
    };
  }

  if (raw.includes("park") || raw.includes("nature") || name.includes("park")) {
    return {
      label: tr("placeDetails.nearbyTypePark"),
      icon: "leaf-outline",
      bg: "#E8F7EC",
      iconColor: "#1F8A4D",
    };
  }

  return {
    label: tr("placeDetails.place"),
    icon: "location-outline",
    bg: "#F3F4F6",
    iconColor: "#4B5563",
  };
}

function formatDayLabel(dayOffset, i18nLanguage) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);

  const localeMap = {
    en: "en-US",
    ro: "ro-RO",
    ru: "ru-RU",
  };

  return d.toLocaleDateString(localeMap[i18nLanguage] || "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function estimateVisitDuration(place, tr) {
  const kind = String(place?.kind || "").toLowerCase();
  const rating = Number(place?.rating || 0);
  const reviews = Number(place?.reviewsCount || 0);

  if (kind === "museum") return tr("placeDetails.durationMuseum");
  if (kind === "park") return tr("placeDetails.durationPark");
  if (kind === "restaurant") return tr("placeDetails.durationRestaurant");
  if (kind === "hotel") return tr("placeDetails.durationFlexible");
  if (kind === "attraction") {
    if (reviews > 2000 || rating >= 4.7) {
      return tr("placeDetails.durationLongAttraction");
    }
    return tr("placeDetails.durationShortAttraction");
  }

  return tr("placeDetails.durationDefault");
}

function estimateBestTimeToGo(place, tr) {
  const kind = String(place?.kind || "").toLowerCase();

  if (kind === "park") return tr("placeDetails.bestTimePark");
  if (kind === "museum") return tr("placeDetails.bestTimeMuseum");
  if (kind === "restaurant") return tr("placeDetails.bestTimeRestaurant");
  if (kind === "attraction") return tr("placeDetails.bestTimeAttraction");

  return tr("placeDetails.bestTimeDefault");
}

function isValidEmail(email) {
  const s = String(email || "").trim();
  if (!s) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function formatReviewDate(date, i18nLanguage, tr) {
  if (!date) return tr("placeDetails.recently");

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return tr("placeDetails.recently");

  const localeMap = {
    en: "en-US",
    ro: "ro-RO",
    ru: "ru-RU",
  };

  return d.toLocaleDateString(localeMap[i18nLanguage] || "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function renderStars(value = 0) {
  const safe = Math.max(0, Math.min(5, Number(value) || 0));
  return Array.from({ length: 5 }).map((_, i) =>
    i < safe ? "star" : "star-outline"
  );
}

function formatTripDayLabel(trip, day, i18nLanguage, tr) {
  if (!trip?.startDate) return `${tr("placeDetails.day")} ${day}`;

  const base = new Date(`${trip.startDate}T12:00:00`);
  const target = new Date(base.getTime() + (day - 1) * 24 * 60 * 60 * 1000);

  const localeMap = {
    en: "en-US",
    ro: "ro-RO",
    ru: "ru-RU",
  };

  return `${tr("placeDetails.day")} ${day} • ${target.toLocaleDateString(
    localeMap[i18nLanguage] || "en-US",
    {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  )}`;
}

export default function PlaceDetailsScreen({ navigation }) {
  const t = useAppTheme();
  const { t: tr } = useTranslation();
  const currentLanguage = i18n.language || "en";
  const route = useRoute();
  const { xid, tripId } = route.params || {};
  const { add, remove, isSaved } = useWishlist();
  const { addItemToTrip, getTripById } = useTrips();

  const saved = xid ? isSaved(xid) : false;

  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState(null);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [distanceKm, setDistanceKm] = useState(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);
  const [slotTime, setSlotTime] = useState(null);
  const [qty, setQty] = useState(2);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [dayPickerVisible, setDayPickerVisible] = useState(false);
  const [storedReviews, setStoredReviews] = useState([]);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState("");
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSaving, setReviewSaving] = useState(false);

  const reviewsScrollRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const trip = useMemo(() => {
    return tripId ? getTripById(tripId) : null;
  }, [tripId, getTripById]);

  const tripItem = useMemo(() => {
    if (!place) return null;

    return {
      type: place?.kind || "place",
      xid: place?.xid,
      name: place?.name || tr("placeDetails.place"),
      kind: place?.kind || "place",
      preview: place?.preview || null,
      lat: typeof place?.lat === "number" ? place.lat : null,
      lon: typeof place?.lon === "number" ? place.lon : null,
      rating: place?.rating ?? null,
      address: place?.address || null,
      city: place?.city || null,
      openingHours: place?.openingHours || null,
      estimatedDurationMin:
        place?.kind === "restaurant"
          ? 90
          : place?.kind === "museum"
          ? 120
          : place?.kind === "park"
          ? 120
          : 90,
      estimatedCost:
        place?.ticketPrice ?? place?.price ?? place?.estimatedCost ?? 0,
      payload: place,
    };
  }, [place, tr]);

  const onAddToTrip = async () => {
    if (!tripItem) return;

    try {
      if (tripId) {
        setDayPickerVisible(true);
        return;
      }

      navigation.navigate("Trips", {
        screen: "SelectTrip",
        params: { item: tripItem },
      });
    } catch (e) {
      console.log("add to trip error:", e);
    }
  };

  const handleAddToTripDay = async (day) => {
    try {
      if (!tripItem || !tripId) return;

      await addItemToTrip(tripId, {
        ...tripItem,
        plannedDay: day,
      });

      setDayPickerVisible(false);

      navigation.navigate("Trips", {
        screen: "TripDetails",
        params: { tripId },
      });
    } catch (e) {
      Alert.alert(
        tr("common.error"),
        e?.message || tr("placeDetails.couldNotAddToTrip")
      );
    }
  };

  const nearbyPlaces = useMemo(() => {
    return Array.isArray(place?.luxuries) ? place.luxuries : [];
  }, [place?.luxuries]);

  const slotsForDay = useMemo(() => {
    const row = place?.bookingSlots?.find((x) => x.dayOffset === dayOffset);
    return row?.slots || [];
  }, [place?.bookingSlots, dayOffset]);

  const apiReviews = useMemo(() => {
    return Array.isArray(place?.reviews) ? place.reviews : [];
  }, [place?.reviews]);

  const reviews = useMemo(() => {
    const merged = [...storedReviews, ...apiReviews];

    return merged.sort((a, b) => {
      return (
        new Date(b?.createdAt || 0).getTime() -
        new Date(a?.createdAt || 0).getTime()
      );
    });
  }, [storedReviews, apiReviews]);

  const featuredReviews = useMemo(() => {
    return reviews.slice(0, 3);
  }, [reviews]);

  const reviewsSummary = useMemo(() => {
    return computeReviewsSummary(reviews);
  }, [reviews]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!xid) {
          if (mounted) setStoredReviews([]);
          return;
        }

        const raw = await AsyncStorage.getItem(
          `${PLACE_REVIEWS_STORAGE_KEY}:${xid}`
        );
        const parsed = raw ? JSON.parse(raw) : [];

        if (mounted) {
          setStoredReviews(Array.isArray(parsed) ? parsed : []);
        }
      } catch (e) {
        if (mounted) setStoredReviews([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [xid]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const data = await placeDetails(xid);
        if (!mounted) return;
        setPlace(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [xid]);

  useEffect(() => {
    (async () => {
      try {
        if (!place?.lat || !place?.lon) return;

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const loc = await Location.getCurrentPositionAsync({});
        const km = haversineKm(
          loc.coords.latitude,
          loc.coords.longitude,
          place.lat,
          place.lon
        );

        setDistanceKm(Math.round(km * 10) / 10);
      } catch {}
    })();
  }, [place?.lat, place?.lon]);

  const gallery = useMemo(() => {
    const rawGallery = Array.isArray(place?.gallery) ? place.gallery : [];
    const preview = place?.preview ? [place.preview] : [];
    const merged = uniqueStrings([...rawGallery, ...preview]);

    const cleanPhotos = merged.filter((img) => {
      if (!img) return false;
      if (img === place?.mapImage) return false;
      if (looksLikeMapImage(img)) return false;
      return true;
    });

    return cleanPhotos;
  }, [place?.gallery, place?.preview, place?.mapImage]);

  useEffect(() => {
    setSlotTime(null);
    setConfirmation(null);
    setBookingError("");
    setBookingSuccess(false);
  }, [dayOffset]);

  const estimatedDuration = useMemo(
    () => estimateVisitDuration(place, tr),
    [place, tr]
  );

  const bestTimeToGo = useMemo(
    () => estimateBestTimeToGo(place, tr),
    [place, tr]
  );

  const quickInfo = useMemo(() => {
    const chips = [];

    if (typeof place?.rating === "number") {
      chips.push({
        key: "rating",
        icon: "star",
        label: `${place.rating}`,
      });
    }

    if (distanceKm !== null && distanceKm !== undefined) {
      chips.push({
        key: "distance",
        icon: "navigate-outline",
        label: `${distanceKm} km`,
      });
    }

    if (place?.ticketPrice !== null && place?.ticketPrice !== undefined) {
      chips.push({
        key: "price",
        icon: "ticket-outline",
        label: formatPrice(place.ticketPrice, tr),
      });
    }

    if (estimatedDuration) {
      chips.push({
        key: "duration",
        icon: "time-outline",
        label: estimatedDuration,
      });
    }

    return chips;
  }, [place, distanceKm, estimatedDuration, tr]);

  const planCards = useMemo(() => {
    return [
      {
        key: "hours",
        title: tr("placeDetails.openingHours"),
        value: place?.openingHours || tr("placeDetails.checkLocally"),
        icon: "time-outline",
      },
      {
        key: "price",
        title: tr("placeDetails.ticketPrice"),
        value:
          formatPrice(place?.ticketPrice, tr) ||
          tr("placeDetails.notSpecified"),
        icon: "ticket-outline",
      },
      {
        key: "best-time",
        title: tr("placeDetails.bestTimeToGo"),
        value: bestTimeToGo,
        icon: "sunny-outline",
      },
    ];
  }, [place, bestTimeToGo, tr]);

  const selectedDateLabel = useMemo(() => {
    return formatDayLabel(dayOffset, currentLanguage);
  }, [dayOffset, currentLanguage]);

  const estimatedTotal = useMemo(() => {
    if (place?.ticketPrice === null || place?.ticketPrice === undefined) {
      return null;
    }

    const price = Number(place.ticketPrice || 0);
    const count = Math.max(1, Number(qty) || 1);
    return price * count;
  }, [place?.ticketPrice, qty]);

  const onScrollGallery = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / width);
    if (!Number.isNaN(idx)) setActiveIndex(idx);
  };

  const closeBookingModal = () => {
    setBookOpen(false);
    setBookingError("");
    setBookingSuccess(false);
    setConfirmation(null);
    setSlotTime(null);
    setQty(2);
    setFullName("");
    setEmail("");
    setDayOffset(0);
  };

  const doBook = async () => {
    try {
      setBookingError("");
      setConfirmation(null);
      setBookingSuccess(false);

      const safeQty = Math.max(1, Math.min(10, Number(qty) || 1));

      if (!slotTime) {
        setBookingError(tr("placeDetails.selectTimeSlot"));
        return;
      }

      if (!fullName.trim()) {
        setBookingError(tr("placeDetails.enterFullNameValidation"));
        return;
      }

      if (!isValidEmail(email)) {
        setBookingError(tr("placeDetails.enterValidEmail"));
        return;
      }

      setBookingLoading(true);

      const d = new Date();
      d.setDate(d.getDate() + dayOffset);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const resp = await bookPlace({
        place_id: place.xid,
        placeName: place.name || null,
        placeAddress: place.address || null,
        preview: place.preview || null,
        lat: typeof place?.lat === "number" ? place.lat : null,
        lon: typeof place?.lon === "number" ? place.lon : null,
        date: dateStr,
        time: slotTime,
        qty: safeQty,
        fullName: fullName.trim(),
        email: email?.trim() || null,
      });

      const bookingId = resp?.booking?.id;

      setQty(safeQty);
      setConfirmation(bookingId || "");
      setBookingSuccess(true);
      setBookingError("");

      if (bookingId) {
        setTimeout(() => {
          closeBookingModal();
          navigation.navigate("PlaceBookingDetails", { bookingId });
        }, 900);
      }
    } catch (e) {
      setBookingError(e?.message || tr("placeDetails.bookingFailed"));
      setBookingSuccess(false);
    } finally {
      setBookingLoading(false);
    }
  };

  const toggleWishlist = async () => {
    try {
      if (!place?.xid) return;

      if (saved) {
        await remove(place.xid);
        return;
      }

      await add({
        xid: place.xid,
        kind: place.kind || "attraction",
        title: place.name,
        subtitle: place.address,
        preview: place.preview,
        payload: place,
      });
    } catch (e) {
      console.log("wishlist toggle error:", e);
    }
  };

  const openInMaps = async () => {
    try {
      if (!place?.lat || !place?.lon) return;

      const label = encodeURIComponent(
        place?.name || tr("placeDetails.destination")
      );
      const lat = place.lat;
      const lon = place.lon;

      const url =
        Platform.OS === "ios"
          ? `http://maps.apple.com/?ll=${lat},${lon}&q=${label}`
          : `geo:${lat},${lon}?q=${lat},${lon}(${label})`;

      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
        return;
      }

      const fallback = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
      await Linking.openURL(fallback);
    } catch (e) {
      console.log("open maps error:", e);
    }
  };

  const sharePlace = async () => {
    try {
      const name = place?.name || tr("placeDetails.place");
      const address = place?.address || "";
      const lat = place?.lat;
      const lon = place?.lon;

      const mapsLink =
        lat && lon
          ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
          : "";

      const message = [name, address, mapsLink].filter(Boolean).join("\n");

      await Share.share({
        title: name,
        message,
      });
    } catch (e) {
      console.log("share place error:", e);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!place) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.text }}>
          {tr("placeDetails.couldNotLoadDetails")}
        </Text>
      </View>
    );
  }

  const closeReviewForm = () => {
    setReviewFormOpen(false);
    setReviewAuthor("");
    setReviewTitle("");
    setReviewText("");
    setReviewRating(5);
  };

  const onSubmitReview = async () => {
    const author = String(reviewAuthor || "").trim();
    const title = String(reviewTitle || "").trim();
    const text = String(reviewText || "").trim();
    const rating = Math.max(1, Math.min(5, Number(reviewRating) || 0));

    if (!author) {
      Alert.alert(
        tr("placeDetails.validation"),
        tr("placeDetails.enterYourName")
      );
      return;
    }

    if (!title) {
      Alert.alert(
        tr("placeDetails.validation"),
        tr("placeDetails.enterReviewTitle")
      );
      return;
    }

    if (!text) {
      Alert.alert(
        tr("placeDetails.validation"),
        tr("placeDetails.enterYourReview")
      );
      return;
    }

    if (!xid) {
      Alert.alert(
        tr("common.error"),
        tr("placeDetails.placeCannotReceiveReviews")
      );
      return;
    }

    try {
      setReviewSaving(true);

      const nextReview = {
        id: buildReviewId(),
        author,
        title,
        text,
        rating,
        createdAt: new Date().toISOString(),
        isLocal: true,
      };

      const nextStoredReviews = [nextReview, ...storedReviews];

      await AsyncStorage.setItem(
        `${PLACE_REVIEWS_STORAGE_KEY}:${xid}`,
        JSON.stringify(nextStoredReviews)
      );

      setStoredReviews(nextStoredReviews);

      setPlace((prev) => {
        if (!prev) return prev;

        const mergedNext = [
          ...nextStoredReviews,
          ...(Array.isArray(prev.reviews) ? prev.reviews : []),
        ];
        const summary = computeReviewsSummary(mergedNext);

        return {
          ...prev,
          rating: summary.rating,
          reviewsCount: summary.reviewsCount,
        };
      });

      closeReviewForm();
      Alert.alert(tr("common.success"), tr("placeDetails.reviewAdded"));
    } catch (e) {
      Alert.alert(tr("common.error"), tr("placeDetails.couldNotSaveReview"));
    } finally {
      setReviewSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>
          {gallery.length ? (
            <FlatList
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              data={gallery}
              keyExtractor={(item, i) => `${item}_${i}`}
              onScroll={onScrollGallery}
              scrollEventThrottle={16}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.heroImage} />
              )}
            />
          ) : (
            <View
              style={[
                styles.heroImage,
                {
                  backgroundColor: t.isDark ? "#1E1E1E" : "#EAEAEA",
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <Ionicons
                name="image-outline"
                size={34}
                color={t.isDark ? "#777" : "#999"}
              />
              <Text style={{ color: t.sub, marginTop: 8 }}>
                {tr("placeDetails.noPhotosAvailable")}
              </Text>
            </View>
          )}

          {gallery.length > 1 && (
            <View style={styles.dotsRow}>
              {gallery.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === activeIndex ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          )}

          <Pressable
            style={styles.ratingBadge}
            onPress={() => setReviewsOpen(true)}
          >
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>
              {reviewsSummary.rating || place?.rating || 0}{" "}
              <Text style={styles.ratingSub}>
                ({reviewsSummary.reviewsCount || place?.reviewsCount || 0})
              </Text>
            </Text>
          </Pressable>
        </View>

        <View style={styles.topActions}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.topActionBtn}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>

          <View style={styles.topActionsRight}>
            <Pressable onPress={sharePlace} style={styles.topActionBtn}>
              <Ionicons name="share-social-outline" size={20} color="#fff" />
            </Pressable>

            <Pressable onPress={toggleWishlist} style={styles.topActionBtn}>
              <Ionicons
                name={saved ? "heart" : "heart-outline"}
                size={20}
                color={saved ? "#FF6B6B" : "#fff"}
              />
            </Pressable>
          </View>
        </View>

        <View style={[styles.contentCard, { backgroundColor: t.card }]}>
          <Text style={[styles.title, { color: t.text }]}>{place.name}</Text>

          {!!place.address && (
            <View style={styles.row}>
              <Ionicons name="location-outline" size={16} color={t.sub} />
              <Text
                style={[styles.address, { color: t.sub }]}
                numberOfLines={2}
              >
                {place.address}
              </Text>
            </View>
          )}

          {!!distanceKm && (
            <View style={styles.row}>
              <Ionicons name="navigate-outline" size={16} color={t.sub} />
              <Text style={[styles.metaText, { color: t.sub }]}>
                {tr("placeDetails.kmFromYou", { value: distanceKm })}
              </Text>
            </View>
          )}

          {!!quickInfo.length && (
            <View style={styles.chipsWrap}>
              {quickInfo.map((chip) => (
                <View
                  key={chip.key}
                  style={[
                    styles.infoChip,
                    {
                      backgroundColor: t.isDark ? "#151515" : "#F6F7F9",
                      borderColor: t.border,
                    },
                  ]}
                >
                  <Ionicons name={chip.icon} size={14} color={t.brand} />
                  <Text style={[styles.infoChipText, { color: t.text }]}>
                    {chip.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {place.ticketPrice !== null && (
            <View style={styles.pricePill}>
              <Ionicons name="ticket-outline" size={16} color="#111" />
              <Text style={styles.priceText}>
                {formatPrice(place.ticketPrice, tr)}
              </Text>
            </View>
          )}

          {!!place.openingHours && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: t.text }]}>
                {tr("placeDetails.openingHours")}
              </Text>
              <Text style={{ color: t.sub }}>{place.openingHours}</Text>
            </View>
          )}

          {!!place.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: t.text }]}>
                {tr("placeDetails.about")}
              </Text>
              <Text style={{ color: t.text, lineHeight: 20 }}>
                {place.description}
              </Text>
            </View>
          )}

          <View
            style={[
              styles.durationCard,
              {
                backgroundColor: t.isDark ? "#141414" : "#F8FAFC",
                borderColor: t.border,
              },
            ]}
          >
            <View
              style={[
                styles.durationIconWrap,
                { backgroundColor: t.isDark ? "#1D1D1D" : "#EEF2FF" },
              ]}
            >
              <Ionicons name="time-outline" size={18} color={t.brand} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.durationTitle, { color: t.text }]}>
                {tr("placeDetails.estimatedVisitDuration")}
              </Text>
              <Text style={[styles.durationValue, { color: t.sub }]}>
                {estimatedDuration}
              </Text>
            </View>
          </View>

          {!!reviews.length && (
            <View style={styles.section}>
              <View style={styles.reviewsHeaderRow}>
                <View>
                  <Text style={[styles.sectionTitle, { color: t.text }]}>
                    {tr("placeDetails.reviews")}
                  </Text>
                  <Text style={[styles.reviewsSummaryText, { color: t.sub }]}>
                    {tr("placeDetails.ratedOutOf5", {
                      rating: reviewsSummary.rating || place?.rating || 0,
                    })}{" "}
                    •{" "}
                    {tr("placeDetails.reviewsCountLabel", {
                      count:
                        reviewsSummary.reviewsCount ||
                        place?.reviewsCount ||
                        reviews.length,
                    })}
                  </Text>
                </View>

                <Pressable onPress={() => setReviewsOpen(true)} hitSlop={10}>
                  <Text style={[styles.reviewsSeeAllText, { color: t.brand }]}>
                    {tr("placeDetails.seeAll")}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.reviewsList}>
                {featuredReviews.map((review) => (
                  <View
                    key={review.id}
                    style={[
                      styles.reviewCard,
                      {
                        backgroundColor: t.isDark ? "#141414" : "#F8FAFC",
                        borderColor: t.border,
                      },
                    ]}
                  >
                    <View style={styles.reviewTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.reviewAuthor, { color: t.text }]}>
                          {review.author || tr("placeDetails.guest")}
                        </Text>
                        <Text style={[styles.reviewDate, { color: t.sub }]}>
                          {formatReviewDate(
                            review.createdAt,
                            currentLanguage,
                            tr
                          )}
                        </Text>
                      </View>

                      <View style={styles.reviewStarsRow}>
                        {renderStars(review.rating).map((iconName, idx) => (
                          <Ionicons
                            key={idx}
                            name={iconName}
                            size={14}
                            color="#F59E0B"
                          />
                        ))}
                      </View>
                    </View>

                    {!!review.title && (
                      <Text style={[styles.reviewTitle, { color: t.text }]}>
                        {review.title}
                      </Text>
                    )}

                    {!!review.text && (
                      <Text style={[styles.reviewText, { color: t.sub }]}>
                        {review.text}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {!!place.mapImage && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: t.text }]}>
                {tr("placeDetails.location")}
              </Text>
              <Image source={{ uri: place.mapImage }} style={styles.mapImage} />
            </View>
          )}

          <Pressable
            onPress={openInMaps}
            style={[
              styles.mapsBtn,
              {
                backgroundColor: t.card,
                borderColor: t.border,
              },
            ]}
          >
            <Ionicons name="map-outline" size={16} color={t.brand} />
            <Text style={[styles.mapsBtnText, { color: t.text }]}>
              {tr("placeDetails.openInMaps")}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={t.brand} />
          </Pressable>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: t.text }]}>
              {tr("placeDetails.planYourVisit")}
            </Text>

            <View style={styles.planGrid}>
              {planCards.map((card) => (
                <View
                  key={card.key}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: t.isDark ? "#141414" : "#F8FAFC",
                      borderColor: t.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.planIconWrap,
                      { backgroundColor: t.isDark ? "#1D1D1D" : "#EEF2FF" },
                    ]}
                  >
                    <Ionicons name={card.icon} size={18} color={t.brand} />
                  </View>

                  <Text style={[styles.planTitle, { color: t.text }]}>
                    {card.title}
                  </Text>

                  <Text
                    style={[styles.planValue, { color: t.sub }]}
                    numberOfLines={3}
                  >
                    {card.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {!!nearbyPlaces.length && (
            <View style={styles.section}>
              <View style={styles.nearbyHeaderRow}>
                <Text style={[styles.sectionTitle, { color: t.text }]}>
                  {tr("placeDetails.whatsNearby")}
                </Text>
                <Text style={[styles.nearbyHeaderHint, { color: t.sub }]}>
                  {tr("placeDetails.tapToExplore")}
                </Text>
              </View>

              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={nearbyPlaces}
                keyExtractor={(item, i) =>
                  `${item?.xid || item?.id || item?.name || "nearby"}_${i}`
                }
                contentContainerStyle={{ paddingRight: 8 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const meta = inferNearbyType(item, tr);

                  return (
                    <Pressable
                      onPress={() => {
                        if (!item?.xid) return;
                        navigation.push("PlaceDetails", {
                          xid: item.xid,
                          kind: item.kind || "place",
                          tripId,
                        });
                      }}
                      style={({ pressed }) => [
                        styles.nearbyCard,
                        {
                          backgroundColor: t.card,
                          borderColor: t.border,
                          opacity: pressed ? 0.9 : 1,
                          transform: [{ scale: pressed ? 0.985 : 1 }],
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.nearbyImageWrap,
                          {
                            backgroundColor: t.isDark ? "#1B1B1B" : "#F3F4F6",
                          },
                        ]}
                      >
                        {item?.preview ? (
                          <Image
                            source={{ uri: item.preview }}
                            style={styles.nearbyImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={[
                              styles.nearbyImage,
                              {
                                backgroundColor: t.isDark ? "#222" : "#E5E7EB",
                                alignItems: "center",
                                justifyContent: "center",
                              },
                            ]}
                          >
                            <Ionicons
                              name={meta.icon}
                              size={20}
                              color={meta.iconColor}
                            />
                          </View>
                        )}

                        <View
                          style={[
                            styles.nearbyTypeBadge,
                            { backgroundColor: meta.bg },
                          ]}
                        >
                          <Ionicons
                            name={meta.icon}
                            size={12}
                            color={meta.iconColor}
                          />
                          <Text
                            style={[
                              styles.nearbyTypeBadgeText,
                              { color: meta.iconColor },
                            ]}
                          >
                            {meta.label}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.nearbyBody}>
                        <Text
                          numberOfLines={1}
                          style={[styles.nearbyTitle, { color: t.text }]}
                        >
                          {item?.name || tr("placeDetails.nearbyPlace")}
                        </Text>

                        <Text
                          numberOfLines={2}
                          style={[styles.nearbySubtitle, { color: t.sub }]}
                        >
                          {item?.address || tr("placeDetails.nearThisPlace")}
                        </Text>

                        <View style={styles.nearbyFooter}>
                          <Text
                            style={[
                              styles.nearbyActionText,
                              { color: t.brand },
                            ]}
                          >
                            {tr("placeDetails.viewDetails")}
                          </Text>
                          <Ionicons
                            name="arrow-forward"
                            size={16}
                            color={t.brand}
                          />
                        </View>
                      </View>
                    </Pressable>
                  );
                }}
              />
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: t.bg,
            borderTopColor: t.border,
          },
        ]}
      >
        <Pressable
          style={[
            styles.bookingsLink,
            {
              backgroundColor: t.card,
              borderColor: t.border,
            },
          ]}
          onPress={() => navigation.navigate("MyPlaceBookings")}
        >
          <Text style={[styles.bookingsLinkText, { color: t.text }]}>
            {tr("placeDetails.myBookings")}
          </Text>
        </Pressable>

        <View style={styles.bottomActionsRow}>
          <Pressable
            style={[
              styles.tripBtn,
              {
                backgroundColor: t.card,
                borderColor: t.border,
              },
            ]}
            onPress={onAddToTrip}
          >
            <Ionicons name="briefcase-outline" size={18} color={t.text} />
            <Text style={[styles.tripBtnText, { color: t.text }]}>
              {tr("placeDetails.addToTrip")}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.bookBtn, { backgroundColor: t.brand }]}
            onPress={() => {
              Keyboard.dismiss();
              setBookOpen(true);
            }}
          >
            <Text style={styles.bookText}>{tr("placeDetails.book")}</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={dayPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDayPickerVisible(false)}
      >
        <View style={styles.modalWrap}>
          <View style={[styles.modalCard, { backgroundColor: t.card }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: t.text }]}>
                  {tr("placeDetails.selectTripDay")}
                </Text>
                <Text style={[styles.reviewsModalSub, { color: t.sub }]}>
                  {trip?.title || tr("placeDetails.trip")}
                </Text>
              </View>

              <Pressable onPress={() => setDayPickerVisible(false)}>
                <Ionicons name="close" size={24} color={t.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: 8 }}
            >
              {Array.from({ length: Math.max(1, trip?.daysCount || 1) }).map(
                (_, index) => {
                  const day = index + 1;

                  return (
                    <Pressable
                      key={day}
                      onPress={() => handleAddToTripDay(day)}
                      style={[
                        styles.daySelectBtn,
                        {
                          backgroundColor: t.isDark ? "#141414" : "#F8FAFC",
                          borderColor: t.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={t.brand}
                      />
                      <Text
                        style={[styles.daySelectBtnText, { color: t.text }]}
                      >
                        {formatTripDayLabel(trip, day, currentLanguage, tr)}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={bookOpen}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={closeBookingModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
          <View style={styles.modalWrap}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={closeBookingModal}
            />

            <View
              style={[
                styles.bookingModalSheet,
                {
                  backgroundColor: t.card,
                  borderTopColor: t.border,
                },
              ]}
            >
              <View style={styles.bookingModalHandleWrap}>
                <View
                  style={[
                    styles.bookingModalHandle,
                    { backgroundColor: t.isDark ? "#3A3A3C" : "#D1D5DB" },
                  ]}
                />
              </View>

              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: t.text }]}>
                  {tr("placeDetails.ticketBooking")}
                </Text>

                <Pressable onPress={closeBookingModal} hitSlop={10}>
                  <Ionicons name="close" size={24} color={t.text} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={
                  Platform.OS === "ios" ? "interactive" : "on-drag"
                }
                contentContainerStyle={styles.bookingModalScrollContent}
              >
                <View
                  style={[
                    styles.bookingSummaryCard,
                    {
                      backgroundColor: t.isDark ? "#141414" : "#F8FAFC",
                      borderColor: t.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.bookingPlaceName, { color: t.text }]}
                    numberOfLines={1}
                  >
                    {place?.name}
                  </Text>

                  <Text style={[styles.bookingSummaryText, { color: t.sub }]}>
                    {selectedDateLabel}
                    {slotTime ? ` • ${slotTime}` : ""}
                    {estimatedTotal !== null
                      ? ` • ${
                          estimatedTotal === 0
                            ? tr("placeDetails.freeEntry")
                            : `$${estimatedTotal}`
                        }`
                      : ""}
                  </Text>
                </View>

                <Text style={[styles.modalLabel, { color: t.sub }]}>
                  {tr("placeDetails.selectDay")}
                </Text>

                <View style={styles.chipsRow}>
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                    <Pressable
                      key={d}
                      onPress={() => setDayOffset(d)}
                      style={[
                        styles.chip,
                        d === dayOffset
                          ? styles.chipActive
                          : styles.chipInactive,
                      ]}
                    >
                      <Text
                        style={
                          d === dayOffset
                            ? styles.chipTextActive
                            : styles.chipText
                        }
                      >
                        {formatDayLabel(d, currentLanguage)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text
                  style={[styles.modalLabel, { color: t.sub, marginTop: 12 }]}
                >
                  {tr("placeDetails.timeSlots")}
                </Text>

                <View style={styles.slotsGrid}>
                  {slotsForDay.map((s) => (
                    <Pressable
                      key={s.time}
                      onPress={() => setSlotTime(s.time)}
                      style={[
                        styles.slot,
                        slotTime === s.time
                          ? styles.slotActive
                          : styles.slotInactive,
                      ]}
                    >
                      <Text
                        style={
                          slotTime === s.time
                            ? styles.slotTextActive
                            : styles.slotText
                        }
                      >
                        {s.time}
                      </Text>

                      <Text
                        style={[
                          styles.slotSub,
                          {
                            color:
                              slotTime === s.time
                                ? "rgba(255,255,255,0.78)"
                                : "#6B7280",
                          },
                        ]}
                      >
                        {tr("placeDetails.leftCount", { count: s.remaining })}
                      </Text>
                    </Pressable>
                  ))}

                  {!slotsForDay.length && (
                    <Text style={{ color: t.sub }}>
                      {tr("placeDetails.noSlotsAvailable")}
                    </Text>
                  )}
                </View>

                <Text
                  style={[styles.modalLabel, { color: t.sub, marginTop: 12 }]}
                >
                  {tr("placeDetails.quantity")}
                </Text>

                <View
                  style={[
                    styles.qtyRow,
                    {
                      backgroundColor: t.isDark ? "#141414" : "#F8FAFC",
                      borderColor: t.border,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() =>
                      setQty((prev) => Math.max(1, Number(prev || 1) - 1))
                    }
                    style={styles.qtyBtn}
                    hitSlop={8}
                  >
                    <Ionicons name="remove" size={18} color={t.text} />
                  </Pressable>

                  <Text style={[styles.qtyValue, { color: t.text }]}>
                    {Math.max(1, Number(qty) || 1)}
                  </Text>

                  <Pressable
                    onPress={() =>
                      setQty((prev) => Math.min(10, Number(prev || 1) + 1))
                    }
                    style={styles.qtyBtn}
                    hitSlop={8}
                  >
                    <Ionicons name="add" size={18} color={t.text} />
                  </Pressable>
                </View>

                <Text
                  style={[styles.modalLabel, { color: t.sub, marginTop: 12 }]}
                >
                  {tr("placeDetails.fullName")}
                </Text>

                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  placeholder={tr("placeDetails.enterFullName")}
                  placeholderTextColor={t.sub}
                  style={[
                    styles.input,
                    {
                      color: t.text,
                      borderColor: t.border,
                      backgroundColor: t.isDark ? "#141414" : "#FFFFFF",
                    },
                  ]}
                />

                <Text
                  style={[styles.modalLabel, { color: t.sub, marginTop: 12 }]}
                >
                  {tr("placeDetails.email")}
                </Text>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  placeholder={tr("placeDetails.enterEmail")}
                  placeholderTextColor={t.sub}
                  style={[
                    styles.input,
                    {
                      color: t.text,
                      borderColor: t.border,
                      backgroundColor: t.isDark ? "#141414" : "#FFFFFF",
                    },
                  ]}
                />

                <Pressable
                  style={[
                    styles.confirmBtn,
                    (!slotTime || bookingLoading) && { opacity: 0.65 },
                  ]}
                  onPress={doBook}
                  disabled={!slotTime || bookingLoading}
                >
                  {bookingLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmText}>
                      {tr("placeDetails.confirmBooking")}
                    </Text>
                  )}
                </Pressable>

                {!!bookingError && (
                  <View
                    style={[
                      styles.messageBox,
                      {
                        backgroundColor: "rgba(220,38,38,0.10)",
                        borderColor: "rgba(220,38,38,0.25)",
                      },
                    ]}
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={18}
                      color="#DC2626"
                    />
                    <Text style={[styles.messageText, { color: t.text }]}>
                      {bookingError}
                    </Text>
                  </View>
                )}

                {!!confirmation && bookingSuccess && (
                  <View
                    style={[
                      styles.messageBox,
                      {
                        backgroundColor: "rgba(34,197,94,0.10)",
                        borderColor: "rgba(34,197,94,0.25)",
                      },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#22C55E"
                    />
                    <Text style={[styles.messageText, { color: t.text }]}>
                      {tr("placeDetails.bookingConfirmed", {
                        code: confirmation,
                      })}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={reviewsOpen}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => {
          setReviewsOpen(false);
          closeReviewForm();
          Keyboard.dismiss();
        }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
          <View style={styles.modalWrap}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => {
                Keyboard.dismiss();
                setReviewsOpen(false);
                closeReviewForm();
              }}
            />

            <View
              style={[
                styles.reviewsSheet,
                {
                  backgroundColor: t.card,
                  borderTopColor: t.border,
                },
              ]}
            >
              <View style={styles.bookingModalHandleWrap}>
                <View
                  style={[
                    styles.bookingModalHandle,
                    { backgroundColor: t.isDark ? "#3A3A3C" : "#D1D5DB" },
                  ]}
                />
              </View>

              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: t.text }]}>
                    {tr("placeDetails.reviews")}
                  </Text>
                  <Text style={[styles.reviewsModalSub, { color: t.sub }]}>
                    {`${reviewsSummary.rating || place?.rating || 0} / 5 • ${tr(
                      "placeDetails.reviewsCountLabel",
                      {
                        count:
                          reviewsSummary.reviewsCount ||
                          place?.reviewsCount ||
                          reviews.length,
                      }
                    )}`}
                  </Text>
                </View>

                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    setReviewsOpen(false);
                    closeReviewForm();
                  }}
                  hitSlop={10}
                >
                  <Ionicons name="close" size={24} color={t.text} />
                </Pressable>
              </View>

              <ScrollView
                ref={reviewsScrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={[
                  styles.reviewsSheetScrollContent,
                  { paddingBottom: keyboardHeight + 24 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={
                  Platform.OS === "ios" ? "interactive" : "on-drag"
                }
              >
                <View style={styles.reviewsTopActions}>
                  <Pressable
                    onPress={() => setReviewFormOpen((prev) => !prev)}
                    style={[
                      styles.writeReviewBtn,
                      { backgroundColor: t.brand },
                    ]}
                  >
                    <Ionicons name="create-outline" size={16} color="#fff" />
                    <Text style={styles.writeReviewBtnText}>
                      {reviewFormOpen
                        ? tr("placeDetails.hideForm")
                        : tr("placeDetails.writeReview")}
                    </Text>
                  </Pressable>
                </View>

                {reviewFormOpen && (
                  <View
                    style={[
                      styles.reviewFormCard,
                      {
                        backgroundColor: t.isDark ? "#141414" : "#F8FAFC",
                        borderColor: t.border,
                      },
                    ]}
                  >
                    <Text style={[styles.modalLabel, { color: t.sub }]}>
                      {tr("placeDetails.yourRating")}
                    </Text>

                    <View style={styles.ratingPickerRow}>
                      {[1, 2, 3, 4, 5].map((value) => {
                        const active = value <= reviewRating;

                        return (
                          <Pressable
                            key={value}
                            onPress={() => setReviewRating(value)}
                            hitSlop={8}
                          >
                            <Ionicons
                              name={active ? "star" : "star-outline"}
                              size={24}
                              color="#F59E0B"
                            />
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text
                      style={[
                        styles.modalLabel,
                        { color: t.sub, marginTop: 12 },
                      ]}
                    >
                      {tr("placeDetails.name")}
                    </Text>
                    <TextInput
                      value={reviewAuthor}
                      onChangeText={setReviewAuthor}
                      placeholder={tr("placeDetails.yourName")}
                      placeholderTextColor={t.sub}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      style={[
                        styles.input,
                        {
                          color: t.text,
                          borderColor: t.border,
                          backgroundColor: t.isDark ? "#101010" : "#FFFFFF",
                        },
                      ]}
                    />

                    <Text
                      style={[
                        styles.modalLabel,
                        { color: t.sub, marginTop: 12 },
                      ]}
                    >
                      {tr("placeDetails.title")}
                    </Text>
                    <TextInput
                      value={reviewTitle}
                      onChangeText={setReviewTitle}
                      placeholder={tr("placeDetails.shortReviewTitle")}
                      placeholderTextColor={t.sub}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      style={[
                        styles.input,
                        {
                          color: t.text,
                          borderColor: t.border,
                          backgroundColor: t.isDark ? "#101010" : "#FFFFFF",
                        },
                      ]}
                    />

                    <Text
                      style={[
                        styles.modalLabel,
                        { color: t.sub, marginTop: 12 },
                      ]}
                    >
                      {tr("placeDetails.review")}
                    </Text>
                    <TextInput
                      value={reviewText}
                      onChangeText={setReviewText}
                      placeholder={tr("placeDetails.tellOthersWhatYouLiked")}
                      placeholderTextColor={t.sub}
                      multiline
                      textAlignVertical="top"
                      returnKeyType="default"
                      onFocus={() => {
                        setTimeout(() => {
                          reviewsScrollRef.current?.scrollToEnd({
                            animated: true,
                          });
                        }, 150);
                      }}
                      style={[
                        styles.reviewTextarea,
                        {
                          color: t.text,
                          borderColor: t.border,
                          backgroundColor: t.isDark ? "#101010" : "#FFFFFF",
                        },
                      ]}
                    />

                    <Pressable
                      onPress={onSubmitReview}
                      disabled={reviewSaving}
                      style={[
                        styles.submitReviewBtn,
                        { backgroundColor: t.brand },
                        reviewSaving && { opacity: 0.7 },
                      ]}
                    >
                      {reviewSaving ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.submitReviewBtnText}>
                          {tr("placeDetails.submitReview")}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                )}

                <View style={styles.reviewsListLarge}>
                  {reviews.map((review) => (
                    <View
                      key={review.id}
                      style={[
                        styles.reviewCardLarge,
                        {
                          backgroundColor: t.isDark ? "#141414" : "#F8FAFC",
                          borderColor: t.border,
                        },
                      ]}
                    >
                      <View style={styles.reviewTopRow}>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.reviewAuthor, { color: t.text }]}
                          >
                            {review.author || tr("placeDetails.guest")}
                          </Text>
                          <Text style={[styles.reviewDate, { color: t.sub }]}>
                            {formatReviewDate(
                              review.createdAt,
                              currentLanguage,
                              tr
                            )}
                          </Text>
                        </View>

                        <View style={styles.reviewStarsRow}>
                          {renderStars(review.rating).map((iconName, idx) => (
                            <Ionicons
                              key={idx}
                              name={iconName}
                              size={14}
                              color="#F59E0B"
                            />
                          ))}
                        </View>
                      </View>

                      {!!review.title && (
                        <Text style={[styles.reviewTitle, { color: t.text }]}>
                          {review.title}
                        </Text>
                      )}

                      {!!review.text && (
                        <Text style={[styles.reviewText, { color: t.sub }]}>
                          {review.text}
                        </Text>
                      )}
                    </View>
                  ))}

                  {!reviews.length && (
                    <Text style={{ color: t.sub, marginTop: 16 }}>
                      {tr("placeDetails.noReviewsYet")}
                    </Text>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  heroImage: { width, height: 340 },

  dotsRow: {
    position: "absolute",
    bottom: 14,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 999 },
  dotActive: { backgroundColor: "#fff" },
  dotInactive: { backgroundColor: "rgba(255,255,255,0.45)" },

  ratingBadge: {
    position: "absolute",
    top: 98,
    right: 18,
    backgroundColor: "rgba(0,0,0,0.62)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 12,
  },
  ratingText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  ratingSub: { color: "rgba(255,255,255,0.8)", fontWeight: "600" },

  contentCard: {
    marginTop: -28,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
  },

  title: { fontSize: 22, fontWeight: "800" },

  row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  address: { fontSize: 13, flex: 1 },
  metaText: { fontSize: 13 },

  pricePill: {
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priceText: { fontSize: 15, fontWeight: "800", color: "#111" },

  section: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "900", marginBottom: 8 },

  mapImage: { width: "100%", height: 170, borderRadius: 14 },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 16,
  },
  bookBtn: {
    backgroundColor: "#000",
    height: 56,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  bookText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
  },
  bookingModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 16 : 10,
    maxHeight: "86%",
    minHeight: "58%",
  },

  bookingModalHandleWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
  },

  bookingModalHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
  },
  bookingModalScrollContent: {
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
  },
  modalOverlayTouch: {
    flex: 1,
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 10,
    maxHeight: "88%",
    borderTopWidth: 1,
  },
  modalScrollContent: {
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: { fontSize: 18, fontWeight: "900" },
  modalLabel: { marginTop: 8, fontSize: 12, fontWeight: "800" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  chipActive: { backgroundColor: "#000" },
  chipInactive: { backgroundColor: "#E5E7EB" },
  chipTextActive: { color: "#fff", fontWeight: "900" },
  chipText: { color: "#111", fontWeight: "900" },

  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  slot: { width: "31%", padding: 10, borderRadius: 14 },
  slotActive: { backgroundColor: "#000" },
  slotInactive: { backgroundColor: "#F3F4F6" },
  slotTextActive: { color: "#fff", fontWeight: "900", textAlign: "center" },
  slotText: { color: "#111", fontWeight: "900", textAlign: "center" },
  slotSub: {
    textAlign: "center",
    marginTop: 4,
    fontSize: 11,
    color: "#6B7280",
  },

  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
    fontSize: 14,
  },

  confirmBtn: {
    marginTop: 16,
    backgroundColor: "#000",
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  confirmText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  nearbyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  nearbyHeaderHint: {
    fontSize: 12,
    fontWeight: "600",
  },

  nearbyCard: {
    width: 250,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    marginRight: 14,

    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 3,
      },
    }),
  },

  nearbyImageWrap: {
    width: "100%",
    height: 124,
    position: "relative",
  },

  nearbyImage: {
    width: "100%",
    height: "100%",
  },

  nearbyTypeBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  nearbyTypeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  nearbyBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },

  nearbyTitle: {
    fontSize: 15,
    fontWeight: "800",
  },

  nearbySubtitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    minHeight: 34,
  },

  nearbyFooter: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  nearbyActionText: {
    fontSize: 13,
    fontWeight: "700",
  },

  topActions: {
    position: "absolute",
    top: 48,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 30,
  },

  topActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  topActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.38)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },

  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },

  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  infoChipText: {
    fontSize: 12,
    fontWeight: "700",
  },

  durationCard: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  durationIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  durationTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  durationValue: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },

  mapsBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  mapsBtnText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "700",
  },

  planGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },

  planCard: {
    width: "48%",
    minHeight: 150,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
  },

  planIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  planTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  planValue: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
  },

  bookingSummaryCard: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },

  bookingPlaceName: {
    fontSize: 14,
    fontWeight: "800",
  },

  bookingSummaryText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
  },

  qtyRow: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 16,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },

  qtyBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  qtyValue: {
    fontSize: 18,
    fontWeight: "800",
  },

  messageBox: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  messageText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  reviewsHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },

  reviewsSummaryText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Montserrat_400Regular",
  },

  reviewsSeeAllText: {
    fontSize: 13,
    fontWeight: "700",
  },

  reviewsList: {
    gap: 12,
  },

  reviewCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },

  reviewTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  reviewAuthor: {
    fontSize: 14,
    fontWeight: "800",
  },

  reviewDate: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
  },

  reviewStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  reviewTitle: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "800",
  },

  reviewText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Montserrat_400Regular",
  },

  reviewsModalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: "82%",
  },

  reviewsModalSub: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 14,
    borderTopWidth: 1,
  },

  bookingsLink: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  bookingsLinkText: {
    fontSize: 14,
    fontWeight: "700",
  },

  bottomActionsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  tripBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  tripBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },

  bookBtn: {
    flex: 1.15,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  bookText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  daySelectBtn: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  daySelectBtnText: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  reviewsSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 14 : 10,
    height: "88%",
  },
  reviewsSheetScrollContent: {
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    flexGrow: 1,
  },

  reviewsTopActions: {
    marginTop: 10,
    marginBottom: 12,
  },

  writeReviewBtn: {
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  writeReviewBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  reviewFormCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },

  ratingPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },

  reviewTextarea: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
    fontSize: 14,
    minHeight: 110,
  },

  submitReviewBtn: {
    marginTop: 14,
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  submitReviewBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  reviewsFormScrollContent: {
    paddingBottom: 24,
  },

  reviewsListLarge: {
    gap: 12,
    paddingBottom: 16,
  },

  reviewCardLarge: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
});
