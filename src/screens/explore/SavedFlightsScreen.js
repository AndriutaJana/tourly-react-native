import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme/useAppTheme";

import FlightCard from "./FlightCard";
import { useWishlist } from "../../context/WishlistContext";

function getOfferFromItem(item) {
  const p = item?.payload;
  return (
    item?.offer || p?.offer || p?.data?.offer || p?.data || p?.flightOffer || p
  );
}

function isValidFlightOffer(offer) {
  const segs = offer?.itineraries?.[0]?.segments;
  return Array.isArray(segs) && segs.length > 0;
}

export default function SavedFlightsScreen({ navigation }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { items, loading, refresh, remove, isSaved } = useWishlist();

  const savedFlights = useMemo(() => {
    return (items || [])
      .filter((x) => x?.kind === "flight")
      .map((x) => ({ ...x, _offer: getOfferFromItem(x) }))
      .filter((x) => x?._offer);
  }, [items]);

  const onToggleSave = useCallback(
    async (offer) => {
      const offerId = String(offer?.id || "");
      if (!offerId) return;

      const xid = `flight_${offerId}`;

      if (isSaved(xid)) {
        try {
          await remove(xid);
        } catch (e) {
          Alert.alert(
            t("savedFlights.title"),
            e?.message || t("savedFlights.removeFailed")
          );
        }
      }
    },
    [remove, isSaved, t]
  );

  const openDetails = useCallback(
    (offer) => {
      if (!offer) return;

      if (!isValidFlightOffer(offer)) {
        Alert.alert(t("savedFlights.title"), t("savedFlights.invalidOffer"));
        return;
      }

      try {
        navigation.navigate("FlightDetails", { offer });
        return;
      } catch (e) {}

      navigation.navigate("Explore", {
        screen: "FlightDetails",
        params: { offer },
      });
    },
    [navigation, t]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>

          <Text style={[styles.title, { color: theme.text }]}>
            {t("savedFlights.title")}
          </Text>

          <Pressable onPress={refresh} hitSlop={10}>
            <Ionicons name="refresh-outline" size={20} color={theme.text} />
          </Pressable>
        </View>

        <FlatList
          data={savedFlights}
          keyExtractor={(x, i) => String(x?.xid || i)}
          contentContainerStyle={{
            paddingVertical: 14,
            paddingBottom: 30,
            flexGrow: savedFlights.length ? 0 : 1,
          }}
          refreshing={loading}
          onRefresh={refresh}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const offer = item._offer;
            const id = String(offer?.id || "");
            const xid = id ? `flight_${id}` : "";

            return (
              <FlightCard
                offer={offer}
                isSaved={xid ? isSaved(xid) : false}
                onToggleSave={() => onToggleSave(offer)}
                onPress={() => openDetails(offer)}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="airplane-outline" size={24} color={theme.sub} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {t("savedFlights.emptyTitle")}
              </Text>
              <Text style={[styles.emptySub, { color: theme.sub }]}>
                {t("savedFlights.emptySubtitle")}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 70, paddingHorizontal: 22 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 18, fontFamily: "Montserrat_400Regular" },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Montserrat_400Regular" },
  emptySub: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
    maxWidth: 260,
  },
});
