import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme/useAppTheme";
import { useTrips } from "../../context/TripsContext";

export default function TripsScreen({ navigation }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { trips, loading, getTripOverview } = useTrips();

  const safeTrips = useMemo(() => {
    return [...(trips || [])].sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
    );
  }, [trips]);

  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return t("tripsHome.datesNotSet");
    return `${startDate} → ${endDate}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          {t("navigation.tripsHome")}
        </Text>

        <Pressable
          onPress={() => navigation.navigate("CreateTrip")}
          hitSlop={10}
        >
          <Ionicons name="add-circle" size={26} color={theme.brand} />
        </Pressable>
      </View>

      <Text style={[styles.sub, { color: theme.sub }]}>
        {t("tripsHome.subtitle")}
      </Text>

      <FlatList
        data={safeTrips}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ paddingBottom: 30, paddingTop: 16 }}
        renderItem={({ item }) => {
          const overview = getTripOverview(item);

          return (
            <Pressable
              onPress={() =>
                navigation.navigate("TripDetails", { tripId: item.id })
              }
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={styles.cardTop}>
                <Text
                  style={[styles.cardTitle, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>

                <Ionicons name="chevron-forward" size={18} color={theme.sub} />
              </View>

              <Text
                style={[styles.cardCity, { color: theme.sub }]}
                numberOfLines={1}
              >
                {item.city}
              </Text>

              <Text
                style={[styles.cardSub, { color: theme.text }]}
                numberOfLines={1}
              >
                {overview.days} {t("tripDetails.days")} • {overview.places}{" "}
                {t("tripDetails.places")} • {overview.currency}{" "}
                {Number(overview.estimatedCost || 0).toFixed(0)}{" "}
                {t("tripDetails.estimated").toLowerCase()}
              </Text>

              <Text
                style={[styles.cardDates, { color: theme.sub }]}
                numberOfLines={1}
              >
                {formatDateRange(item.startDate, item.endDate)}
              </Text>

              {!!item.schedule?.length && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: theme.isDark ? "#1F2A1F" : "#EEF7EE",
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: theme.text }]}>
                    {t("tripsHome.autoScheduleReady")} • {item.schedule.length}{" "}
                    {t("tripsHome.daysPlanned")}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <Text
              style={{
                color: theme.sub,
                marginTop: 16,
                fontFamily: "Montserrat_400Regular",
              }}
            >
              {t("tripsHome.empty")}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 70, paddingHorizontal: 22 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: { fontSize: 26, fontFamily: "Montserrat_400Regular" },
  sub: { marginTop: 6, fontSize: 13, fontFamily: "Montserrat_400Regular" },

  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
  },

  cardCity: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  cardSub: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },

  cardDates: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  badge: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  badgeText: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
  },
});
