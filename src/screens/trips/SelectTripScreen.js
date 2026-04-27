import React, { useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../../theme/useAppTheme";
import { useTrips } from "../../context/TripsContext";
import { useTranslation } from "react-i18next";

function getItemLabel(item) {
  if (!item) return "Item";
  return item?.name || item?.title || "Item";
}

function getItemType(item, t) {
  const type = String(item?.type || item?.kind || "place").toLowerCase();

  if (type.includes("flight")) return t("selectTrip.types.flight");
  if (type.includes("hotel")) return t("selectTrip.types.hotel");
  if (type.includes("restaurant")) return t("selectTrip.types.restaurant");
  if (type.includes("museum")) return t("selectTrip.types.museum");
  if (type.includes("park")) return t("selectTrip.types.park");
  if (type.includes("attraction")) return t("selectTrip.types.attraction");

  return t("selectTrip.types.location");
}

function formatTripDayLabel(trip, day, lang, t) {
  if (!trip?.startDate) return `${t("trips.day")} ${day}`;

  const base = new Date(`${trip.startDate}T12:00:00`);
  const target = new Date(base.getTime() + (day - 1) * 86400000);

  return `${t("trips.day")} ${day} • ${target.toLocaleDateString(lang, {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })}`;
}

export default function SelectTripScreen() {
  const theme = useAppTheme();
  const route = useRoute();
  const navigation = useNavigation();
  const { trips, addItemToTrip } = useTrips();
  const { t, i18n } = useTranslation();

  const [selectedTrip, setSelectedTrip] = useState(null);
  const [dayPickerVisible, setDayPickerVisible] = useState(false);

  const safeItem = useMemo(() => {
    return (
      route.params?.item ||
      route.params?.place ||
      route.params?.hotel ||
      route.params?.flight ||
      null
    );
  }, [route.params]);

  const label = useMemo(() => getItemLabel(safeItem), [safeItem]);
  const itemTypeLabel = useMemo(() => getItemType(safeItem, t), [safeItem, t]);

  const sortedTrips = useMemo(() => {
    return [...(trips || [])].sort(
      (a, b) =>
        (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
    );
  }, [trips]);

  const onPickTrip = useCallback(
    async (trip) => {
      if (!safeItem) {
        Alert.alert(t("common.error"), t("selectTrip.noItem"));
        return;
      }

      setSelectedTrip(trip);
      setDayPickerVisible(true);
    },
    [safeItem, t]
  );

  const onPickDay = useCallback(
    async (day) => {
      if (!safeItem || !selectedTrip) return;

      try {
        await addItemToTrip(selectedTrip.id, {
          ...safeItem,
          plannedDay: day,
        });

        setDayPickerVisible(false);
        setSelectedTrip(null);

        navigation.navigate("Trips", {
          screen: "TripDetails",
          params: { tripId: selectedTrip.id },
        });
      } catch (e) {
        Alert.alert(t("common.error"), e?.message || t("selectTrip.addFailed"));
      }
    },
    [safeItem, selectedTrip, addItemToTrip, navigation, t]
  );

  const renderTrip = ({ item }) => {
    const count = item?.items?.length || 0;

    return (
      <Pressable
        onPress={() => onPickTrip(item)}
        style={({ pressed }) => [
          styles.tripCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <View style={styles.tripCardLeft}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: theme.isDark ? "#1C1C1E" : "#F5F5F7" },
            ]}
          >
            <Ionicons name="briefcase-outline" size={18} color={theme.brand} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[styles.tripTitle, { color: theme.text }]}
              numberOfLines={1}
            >
              {item?.title || t("selectTrip.trip")}
            </Text>

            <Text
              style={[styles.tripMeta, { color: theme.sub }]}
              numberOfLines={1}
            >
              {[
                item?.city,
                count
                  ? `${count} ${t("selectTrip.items")}`
                  : t("selectTrip.empty"),
              ]
                .filter(Boolean)
                .join(" • ")}
            </Text>

            {!!item?.startDate && !!item?.endDate && (
              <Text style={[styles.tripDates, { color: theme.sub }]}>
                {item.startDate} → {item.endDate}
              </Text>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color={theme.sub} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>

        <Text style={[styles.title, { color: theme.text }]}>
          {t("selectTrip.chooseTrip")}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <View
        style={[
          styles.infoCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View
          style={[
            styles.infoIcon,
            { backgroundColor: theme.isDark ? "#1C1C1E" : "#F5F5F7" },
          ]}
        >
          <Ionicons name="add-circle-outline" size={20} color={theme.brand} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.infoType, { color: theme.sub }]}>
            {itemTypeLabel}
          </Text>
          <Text
            style={[styles.infoLabel, { color: theme.text }]}
            numberOfLines={2}
          >
            {label}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() =>
          navigation.navigate("CreateTrip", {
            pendingItem: safeItem,
          })
        }
        style={[styles.createBtn, { backgroundColor: theme.brand }]}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.createBtnText}>
          {t("selectTrip.createNewTrip")}
        </Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {t("selectTrip.yourTrips")}
      </Text>

      <FlatList
        data={sortedTrips}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderTrip}
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View
            style={[
              styles.emptyBox,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Ionicons name="briefcase-outline" size={20} color={theme.sub} />
            <Text style={[styles.emptyText, { color: theme.sub }]}>
              {t("selectTrip.noTrips")}
            </Text>
          </View>
        }
      />

      <Modal visible={dayPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t("selectTrip.selectDay")}
            </Text>

            <Text style={[styles.modalSub, { color: theme.sub }]}>
              {selectedTrip?.title || t("selectTrip.trip")}
            </Text>

            {Array.from({
              length: Math.max(1, selectedTrip?.daysCount || 1),
            }).map((_, index) => {
              const day = index + 1;

              return (
                <Pressable
                  key={day}
                  onPress={() => onPickDay(day)}
                  style={[
                    styles.dayBtn,
                    { backgroundColor: theme.bg, borderColor: theme.border },
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={theme.brand}
                  />
                  <Text style={[styles.dayBtnText, { color: theme.text }]}>
                    {formatTripDayLabel(selectedTrip, day, i18n.language, t)}
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => {
                setDayPickerVisible(false);
                setSelectedTrip(null);
              }}
              style={styles.cancel}
            >
              <Text style={[styles.cancelText, { color: theme.sub }]}>
                {t("common.cancel")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    fontSize: 18,
    fontFamily: "Montserrat_400Regular",
  },

  infoCard: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  infoType: {
    fontSize: 12,
    marginBottom: 3,
    fontFamily: "Montserrat_400Regular",
  },

  infoLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Montserrat_400Regular",
  },

  createBtn: {
    height: 50,
    borderRadius: 16,
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  createBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },

  sectionTitle: {
    marginTop: 22,
    marginBottom: 12,
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
  },

  tripCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  tripCardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  tripTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },

  tripMeta: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  tripDates: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
  },

  emptyBox: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    gap: 8,
  },

  emptyText: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
    padding: 16,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },
  modalSub: {
    marginTop: 6,
    marginBottom: 14,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },
  dayBtn: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dayBtnText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },
});
