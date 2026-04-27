import React, { useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Image,
  Linking,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme/useAppTheme";
import { useTrips } from "../../context/TripsContext";
import PlaceActionsSheet from "./PlaceActionsSheet";

function getTypeMeta(kind, t) {
  const k = String(kind || "").toLowerCase();

  if (k === "flight")
    return { icon: "airplane-outline", label: t("selectTrip.types.flight") };
  if (k === "hotel")
    return { icon: "bed-outline", label: t("selectTrip.types.hotel") };
  if (k === "restaurant")
    return {
      icon: "restaurant-outline",
      label: t("selectTrip.types.restaurant"),
    };
  if (k === "museum")
    return { icon: "business-outline", label: t("selectTrip.types.museum") };
  if (k === "park")
    return { icon: "leaf-outline", label: t("selectTrip.types.park") };
  if (k === "historic")
    return {
      icon: "library-outline",
      label: t("tripDetails.historicPlace"),
    };
  if (k === "attraction")
    return {
      icon: "location-outline",
      label: t("selectTrip.types.attraction"),
    };

  return { icon: "location-outline", label: t("selectTrip.types.location") };
}

function formatMoney(value, currency = "EUR") {
  const n = Number(value);
  if (!Number.isFinite(n)) return `0 ${currency}`;
  return `${Math.round(n)} ${currency}`;
}

function formatStatus(status, t) {
  const s = String(status || "").toLowerCase();

  if (s === "want_to_go") return t("trips.status.want");
  if (s === "planned") return t("trips.status.planned");
  if (s === "visited") return t("trips.status.visited");
  if (s === "skipped") return t("trips.status.skipped");

  return t("tripDetails.unknown");
}

function formatDateLabel(dateString, lang) {
  if (!dateString) return "";
  const d = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateString;

  return d.toLocaleDateString(lang || "en", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function buildGoogleMapsSearchUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

function buildGoogleMapsCoordsUrl(lat, lon, label) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}${
    label ? `(${encodeURIComponent(label)})` : ""
  }`;
}

function OverviewBox({ label, value, subValue, theme }) {
  return (
    <View
      style={[
        styles.overviewBox,
        { backgroundColor: theme.bg, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.overviewValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.overviewLabel, { color: theme.sub }]}>{label}</Text>
      {!!subValue && (
        <Text style={[styles.overviewSubValue, { color: theme.sub }]}>
          {subValue}
        </Text>
      )}
    </View>
  );
}

function QuickAction({ icon, label, onPress, theme, danger = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.quickAction,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={danger ? "#C43C35" : theme.brand}
      />
      <Text
        style={[
          styles.quickActionText,
          { color: danger ? "#C43C35" : theme.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function TripDetailsScreen({ route, navigation }) {
  const { tripId } = route.params;
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();

  const {
    getTripById,
    getTripOverview,
    getTripItemsByDay,
    toggleChecklistItem,
    deleteTrip,
    removePlaceFromTrip,
    generateTripSchedule,
    getShareTripText,
    moveTripItemToAnotherDay,
    moveTripItemUp,
    moveTripItemDown,
    changeTripItemStatus,
  } = useTrips();

  const [busy, setBusy] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const trip = useMemo(() => getTripById(tripId), [getTripById, tripId]);
  const overview = useMemo(
    () => getTripOverview(trip),
    [getTripOverview, trip]
  );
  const days = useMemo(
    () => getTripItemsByDay(trip),
    [getTripItemsByDay, trip]
  );

  const openActions = useCallback((item) => {
    setSelectedItem(item);
    setActionsVisible(true);
  }, []);

  const closeActions = useCallback(() => {
    setActionsVisible(false);
    setSelectedItem(null);
  }, []);

  const onDeleteTrip = useCallback(() => {
    Alert.alert(t("tripDetails.deleteTrip"), t("tripDetails.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.remove"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTrip(tripId);
            navigation.goBack();
          } catch (e) {
            Alert.alert(
              t("common.error"),
              e?.message || t("tripDetails.deleteFailed")
            );
          }
        },
      },
    ]);
  }, [deleteTrip, navigation, tripId, t]);

  const onGenerateSchedule = useCallback(async () => {
    if (!trip?.items?.length) {
      Alert.alert(t("tripDetails.noPlaces"), t("tripDetails.addPlacesFirst"));
      return;
    }

    try {
      setBusy(true);
      await generateTripSchedule(tripId);
    } catch (e) {
      Alert.alert(
        t("common.error"),
        e?.message || t("tripDetails.scheduleFailed")
      );
    } finally {
      setBusy(false);
    }
  }, [generateTripSchedule, trip?.items?.length, tripId, t]);

  const onShareTrip = useCallback(async () => {
    try {
      const message = getShareTripText(tripId);
      await Share.share({
        title: trip?.title || t("tripDetails.trip"),
        message,
      });
    } catch (e) {
      Alert.alert(
        t("common.error"),
        e?.message || t("tripDetails.shareFailed")
      );
    }
  }, [getShareTripText, trip?.title, tripId, t]);

  const onOpenTripMap = useCallback(async () => {
    try {
      const query = [trip?.title, trip?.city].filter(Boolean).join(" ");
      if (!query) {
        Alert.alert(t("tripDetails.noDestination"), t("tripDetails.noCity"));
        return;
      }
      await Linking.openURL(buildGoogleMapsSearchUrl(query));
    } catch (e) {
      Alert.alert(t("common.error"), t("tripDetails.openMapFailed"));
    }
  }, [trip?.title, trip?.city, t]);

  const onOpenItemMap = useCallback(
    async (item) => {
      try {
        if (typeof item?.lat === "number" && typeof item?.lon === "number") {
          await Linking.openURL(
            buildGoogleMapsCoordsUrl(item.lat, item.lon, item.name)
          );
          return;
        }

        const query = [item?.name, item?.address, item?.city]
          .filter(Boolean)
          .join(" ");
        if (!query) {
          Alert.alert(
            t("tripDetails.noLocation"),
            t("tripDetails.noLocationInfo")
          );
          return;
        }

        await Linking.openURL(buildGoogleMapsSearchUrl(query));
      } catch (e) {
        Alert.alert(t("common.error"), t("tripDetails.openMapFailed"));
      }
    },
    [t]
  );

  if (!trip) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bg }]}>
        <Ionicons name="briefcase-outline" size={28} color={theme.sub} />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          {t("tripDetails.tripNotFound")}
        </Text>
        <Text style={[styles.emptySub, { color: theme.sub }]}>
          {t("tripDetails.tripNotFoundMsg")}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text
              style={[styles.headerTitle, { color: theme.text }]}
              numberOfLines={1}
            >
              {trip.title || t("tripDetails.trip")}
            </Text>
            <Text
              style={[styles.headerSub, { color: theme.sub }]}
              numberOfLines={1}
            >
              {[
                trip.city,
                `${trip.items?.length || 0} ${t("tripDetails.places")}`,
                `${overview.hotels || 0} ${t("tripDetails.hotels")}`,
                `${overview.flights || 0} ${t("tripDetails.flights")}`,
              ]
                .filter(Boolean)
                .join(" • ")}
            </Text>
            {!!trip.startDate && !!trip.endDate && (
              <Text
                style={[styles.headerSub, { color: theme.sub }]}
                numberOfLines={1}
              >
                {trip.startDate} → {trip.endDate}
              </Text>
            )}
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => navigation.navigate("EditTrip", { tripId })}
              hitSlop={10}
            >
              <Ionicons name="create-outline" size={20} color={theme.text} />
            </Pressable>

            <Pressable onPress={onDeleteTrip} hitSlop={10}>
              <Ionicons name="trash-outline" size={20} color="#C43C35" />
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {t("tripDetails.overview")}
          </Text>
          <Text style={[styles.tripCityLine, { color: theme.sub }]}>
            {[
              trip.city,
              trip.startDate,
              trip.endDate ? `→ ${trip.endDate}` : null,
            ]
              .filter(Boolean)
              .join(" ")}
          </Text>

          <View style={styles.overviewGrid}>
            <OverviewBox
              label={t("tripDetails.days")}
              value={overview.days}
              theme={theme}
            />
            <OverviewBox
              label={t("tripDetails.places")}
              value={overview.places}
              theme={theme}
            />
            <OverviewBox
              label={t("tripDetails.planned")}
              value={overview.planned}
              theme={theme}
            />
            <OverviewBox
              label={t("tripDetails.unscheduled")}
              value={overview.unscheduled}
              theme={theme}
            />
            <OverviewBox
              label={t("tripDetails.hotels")}
              value={overview.hotels}
              theme={theme}
            />
            <OverviewBox
              label={t("tripDetails.flights")}
              value={overview.flights}
              theme={theme}
            />
          </View>

          <View
            style={[
              styles.costBox,
              { backgroundColor: theme.bg, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.costLabel, { color: theme.sub }]}>
              {t("tripDetails.estimated")}
            </Text>
            <Text style={[styles.costValue, { color: theme.text }]}>
              {formatMoney(overview.estimatedCost, overview.currency)}
            </Text>
          </View>

          <View
            style={[
              styles.costBox,
              { backgroundColor: theme.bg, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.costLabel, { color: theme.sub }]}>
              {t("tripDetails.actual")}
            </Text>
            <Text style={[styles.costValue, { color: theme.text }]}>
              {formatMoney(overview.actualCost, overview.currency)}
            </Text>
          </View>
        </View>

        <View style={styles.quickActionsWrap}>
          <QuickAction
            icon="add-circle-outline"
            label={t("tripDetails.addPlace")}
            theme={theme}
            onPress={() =>
              navigation.navigate("Explore", {
                screen: "ExploreHome",
                params: {
                  tripId,
                  fromTrip: true,
                  mode: "places",
                  initialCategory: "all",
                  focusRestaurants: false,
                },
              })
            }
          />

          <QuickAction
            icon="restaurant-outline"
            label={t("tripDetails.findRestaurants")}
            theme={theme}
            onPress={() =>
              navigation.navigate("Explore", {
                screen: "ExploreHome",
                params: {
                  tripId,
                  fromTrip: true,
                  mode: "restaurants",
                  initialCategory: "all",
                  focusRestaurants: true,
                },
              })
            }
          />

          <QuickAction
            icon="map-outline"
            label={t("tripDetails.openMap")}
            theme={theme}
            onPress={onOpenTripMap}
          />

          <QuickAction
            icon="share-social-outline"
            label={t("tripDetails.shareTrip")}
            theme={theme}
            onPress={onShareTrip}
          />
        </View>

        <Pressable
          onPress={onGenerateSchedule}
          style={[
            styles.scheduleBtn,
            { backgroundColor: theme.brand, opacity: busy ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="calendar-outline" size={16} color="#fff" />
          <Text style={styles.scheduleBtnText}>
            {busy
              ? t("tripDetails.generating")
              : t("tripDetails.generateSchedule")}
          </Text>
        </Pressable>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {t("tripDetails.checklist")}
          </Text>

          {!!trip.checklist?.length ? (
            trip.checklist.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => toggleChecklistItem(trip.id, entry.id)}
                style={styles.checkRow}
              >
                <Ionicons
                  name={entry.checked ? "checkbox-outline" : "square-outline"}
                  size={20}
                  color={entry.checked ? theme.brand : theme.sub}
                />
                <Text style={[styles.checkText, { color: theme.text }]}>
                  {entry.label}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text style={[styles.emptySub, { color: theme.sub }]}>
              {t("tripDetails.noChecklist")}
            </Text>
          )}
        </View>

        {days.map((day, idx) => {
          const dateLabel =
            trip?.startDate && idx < (trip.daysCount || 0)
              ? formatDateLabel(
                  new Date(
                    new Date(`${trip.startDate}T12:00:00`).getTime() +
                      idx * 24 * 60 * 60 * 1000
                  )
                    .toISOString()
                    .slice(0, 10),
                  i18n.language
                )
              : day.title;

          return (
            <View key={day.day} style={styles.daySection}>
              <Text style={[styles.dayHeading, { color: theme.text }]}>
                {dateLabel}
              </Text>

              {!day.items?.length ? (
                <View
                  style={[
                    styles.emptyDayCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.emptyDayText, { color: theme.sub }]}>
                    {t("tripDetails.noPlacesThisDay")}
                  </Text>
                </View>
              ) : (
                day.items.map((item) => {
                  const meta = getTypeMeta(item?.kind, t);
                  const statusLabel = formatStatus(item?.status, t);

                  return (
                    <View
                      key={String(item.id || item.xid)}
                      style={[
                        styles.placeCard,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <View style={styles.placeTop}>
                        {item?.preview ? (
                          <Image
                            source={{ uri: item.preview }}
                            style={styles.placeImage}
                          />
                        ) : (
                          <View
                            style={[
                              styles.placeImage,
                              styles.placeImageFallback,
                              {
                                backgroundColor: theme.isDark
                                  ? "#1F1F1F"
                                  : "#F4F5F6",
                              },
                            ]}
                          >
                            <Ionicons
                              name={meta.icon}
                              size={20}
                              color={theme.sub}
                            />
                          </View>
                        )}

                        <View style={styles.placeInfo}>
                          <Text
                            style={[styles.placeName, { color: theme.text }]}
                            numberOfLines={1}
                          >
                            {item?.name || t("tripDetails.unnamedPlace")}
                          </Text>

                          <Text
                            style={[styles.placeMeta, { color: theme.sub }]}
                            numberOfLines={2}
                          >
                            {[meta.label, item?.city, item?.address]
                              .filter(Boolean)
                              .join(" • ")}
                          </Text>

                          <View style={styles.tagRow}>
                            <View
                              style={[
                                styles.tag,
                                {
                                  backgroundColor: theme.isDark
                                    ? "#1F2A1F"
                                    : "#EEF7EE",
                                  borderColor: theme.border,
                                },
                              ]}
                            >
                              <Text
                                style={[styles.tagText, { color: theme.text }]}
                              >
                                {statusLabel}
                              </Text>
                            </View>

                            {!!item?.plannedStartTime && (
                              <View
                                style={[
                                  styles.tag,
                                  {
                                    backgroundColor: theme.isDark
                                      ? "#232427"
                                      : "#F4F5F7",
                                    borderColor: theme.border,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.tagText,
                                    { color: theme.text },
                                  ]}
                                >
                                  {item.plannedStartTime}
                                  {item?.plannedEndTime
                                    ? ` - ${item.plannedEndTime}`
                                    : ""}
                                </Text>
                              </View>
                            )}
                          </View>

                          {!!item?.note && (
                            <Text
                              style={[styles.placeNote, { color: theme.sub }]}
                              numberOfLines={2}
                            >
                              {item.note}
                            </Text>
                          )}
                        </View>
                      </View>

                      <View style={styles.placeActions}>
                        <Pressable
                          onPress={() => onOpenItemMap(item)}
                          style={[
                            styles.placeActionBtn,
                            {
                              backgroundColor: theme.bg,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <Ionicons
                            name="map-outline"
                            size={16}
                            color={theme.brand}
                          />
                          <Text
                            style={[
                              styles.placeActionText,
                              { color: theme.text },
                            ]}
                          >
                            {t("tripDetails.map")}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            navigation.navigate("TripPlaceDetails", {
                              tripId,
                              itemId: item.id || item.xid,
                            })
                          }
                          style={[
                            styles.placeActionBtn,
                            {
                              backgroundColor: theme.bg,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <Ionicons
                            name="create-outline"
                            size={16}
                            color={theme.brand}
                          />
                          <Text
                            style={[
                              styles.placeActionText,
                              { color: theme.text },
                            ]}
                          >
                            {t("tripDetails.edit")}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => openActions(item)}
                          style={[
                            styles.placeActionBtn,
                            {
                              backgroundColor: theme.bg,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <Ionicons
                            name="ellipsis-horizontal"
                            size={16}
                            color={theme.brand}
                          />
                          <Text
                            style={[
                              styles.placeActionText,
                              { color: theme.text },
                            ]}
                          >
                            {t("tripDetails.more")}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          );
        })}
      </ScrollView>

      <PlaceActionsSheet
        visible={actionsVisible}
        onClose={closeActions}
        item={selectedItem}
        trip={trip}
        onEdit={() => {
          if (!selectedItem) return;
          navigation.navigate("TripPlaceDetails", {
            tripId,
            itemId: selectedItem.id || selectedItem.xid,
          });
        }}
        onMoveToAnotherDay={async (day) => {
          if (!selectedItem) return;
          await moveTripItemToAnotherDay(
            tripId,
            selectedItem.id || selectedItem.xid,
            day
          );
        }}
        onMoveUp={async () => {
          if (!selectedItem) return;
          await moveTripItemUp(tripId, selectedItem.id || selectedItem.xid);
        }}
        onMoveDown={async () => {
          if (!selectedItem) return;
          await moveTripItemDown(tripId, selectedItem.id || selectedItem.xid);
        }}
        onChangeStatus={async (status) => {
          if (!selectedItem) return;
          await changeTripItemStatus(
            tripId,
            selectedItem.id || selectedItem.xid,
            status
          );
        }}
        onRemove={async () => {
          if (!selectedItem) return;
          await removePlaceFromTrip(
            tripId,
            selectedItem.id || selectedItem.xid
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  content: {
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  headerCenter: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_400Regular",
  },

  headerSub: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 2,
  },

  card: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },

  cardTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    marginBottom: 8,
  },

  tripCityLine: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    marginBottom: 12,
  },

  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  overviewBox: {
    width: "48%",
    minHeight: 84,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    justifyContent: "center",
  },

  overviewValue: {
    fontSize: 22,
    fontFamily: "Montserrat_400Regular",
  },

  overviewLabel: {
    marginTop: 4,
    fontSize: 12,
    textTransform: "lowercase",
    fontFamily: "Montserrat_400Regular",
  },

  overviewSubValue: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
  },

  costBox: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },

  costLabel: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  costValue: {
    marginTop: 4,
    fontSize: 20,
    fontFamily: "Montserrat_400Regular",
  },

  quickActionsWrap: {
    marginTop: 16,
    gap: 10,
  },

  quickAction: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 54,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  quickActionText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },

  scheduleBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  scheduleBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },

  checkText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },

  daySection: {
    marginTop: 18,
  },

  dayHeading: {
    fontSize: 18,
    marginBottom: 12,
    fontFamily: "Montserrat_400Regular",
  },

  emptyDayCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },

  emptyDayText: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },

  placeCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
  },

  placeTop: {
    flexDirection: "row",
    gap: 12,
  },

  placeImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
  },

  placeImageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },

  placeInfo: {
    flex: 1,
  },

  placeName: {
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
  },

  placeMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Montserrat_400Regular",
  },

  tagRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  tag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  tagText: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
  },

  placeNote: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Montserrat_400Regular",
  },

  placeActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  placeActionBtn: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  placeActionText: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    textAlign: "center",
    fontFamily: "Montserrat_400Regular",
  },

  emptySub: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: "Montserrat_400Regular",
  },
});
