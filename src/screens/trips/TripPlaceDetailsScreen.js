import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
} from "react-native";
import { TextInput } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme/useAppTheme";
import { useTrips } from "../../context/TripsContext";

function normalizeTimeInput(value) {
  const clean = String(value || "").replace(/[^\d:]/g, "");

  if (!clean) return "";

  const match = clean.match(/^(\d{1,2})(?::?(\d{0,2}))?$/);
  if (!match) return value;

  const hh = Math.min(23, Number(match[1] || 0));
  const mmRaw = match[2] ?? "";
  const mm = mmRaw === "" ? "" : String(Math.min(59, Number(mmRaw)));

  if (mm === "") return String(hh).padStart(2, "0");
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function isValidTime(value) {
  if (!value) return true;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export default function TripPlaceDetailsScreen({ route, navigation }) {
  const { tripId, itemId } = route.params;
  const theme = useAppTheme();
  const { t } = useTranslation();

  const { getTripById, updateTripItem } = useTrips();

  const trip = useMemo(() => getTripById(tripId), [getTripById, tripId]);

  const item = useMemo(() => {
    return trip?.items?.find(
      (x) => String(x.id) === String(itemId) || String(x.xid) === String(itemId)
    );
  }, [trip, itemId]);

  const [note, setNote] = useState(item?.note || "");
  const [plannedDay, setPlannedDay] = useState(
    item?.plannedDay ? String(item.plannedDay) : "1"
  );
  const [plannedStartTime, setPlannedStartTime] = useState(
    item?.plannedStartTime || ""
  );
  const [plannedEndTime, setPlannedEndTime] = useState(
    item?.plannedEndTime || ""
  );
  const [status, setStatus] = useState(item?.status || "want_to_go");
  const [category, setCategory] = useState(item?.category || "general");
  const [estimatedCost, setEstimatedCost] = useState(
    item?.estimatedCost != null ? String(item.estimatedCost) : ""
  );
  const [actualCost, setActualCost] = useState(
    item?.actualCost != null ? String(item.actualCost) : ""
  );
  const [loading, setLoading] = useState(false);

  const STATUS_OPTIONS = [
    {
      value: "want_to_go",
      label: t("tripPlaceDetails.statusOptions.want_to_go"),
    },
    {
      value: "planned",
      label: t("tripPlaceDetails.statusOptions.planned"),
    },
    {
      value: "visited",
      label: t("tripPlaceDetails.statusOptions.visited"),
    },
    {
      value: "skipped",
      label: t("tripPlaceDetails.statusOptions.skipped"),
    },
  ];

  const CATEGORY_OPTIONS = [
    {
      value: "general",
      label: t("tripPlaceDetails.categoryOptions.general"),
    },
    {
      value: "museum",
      label: t("tripPlaceDetails.categoryOptions.museum"),
    },
    {
      value: "restaurant",
      label: t("tripPlaceDetails.categoryOptions.restaurant"),
    },
    {
      value: "hotel",
      label: t("tripPlaceDetails.categoryOptions.hotel"),
    },
    {
      value: "attraction",
      label: t("tripPlaceDetails.categoryOptions.attraction"),
    },
    {
      value: "park",
      label: t("tripPlaceDetails.categoryOptions.park"),
    },
    {
      value: "historic",
      label: t("tripPlaceDetails.categoryOptions.historic"),
    },
    {
      value: "shopping",
      label: t("tripPlaceDetails.categoryOptions.shopping"),
    },
    {
      value: "transport",
      label: t("tripPlaceDetails.categoryOptions.transport"),
    },
    {
      value: "stay",
      label: t("tripPlaceDetails.categoryOptions.stay"),
    },
  ];

  const safeEstimated =
    estimatedCost.trim() === "" || isNaN(Number(estimatedCost))
      ? null
      : Number(estimatedCost);

  const safeActual =
    actualCost.trim() === "" || isNaN(Number(actualCost))
      ? null
      : Number(actualCost);

  if (!trip || !item) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bg }]}>
        <Ionicons name="location-outline" size={28} color={theme.sub} />
        <Text style={[styles.missingTitle, { color: theme.text }]}>
          {t("tripPlaceDetails.notFoundTitle")}
        </Text>
        <Text style={[styles.missingSub, { color: theme.sub }]}>
          {t("tripPlaceDetails.notFoundSubtitle")}
        </Text>
      </View>
    );
  }

  const onSave = async () => {
    const dayNumber = Number(plannedDay || 1);

    if (!Number.isInteger(dayNumber) || dayNumber < 1) {
      return Alert.alert(
        t("createTrip.validationTitle"),
        t("tripPlaceDetails.validationDay")
      );
    }

    if (!isValidTime(plannedStartTime)) {
      return Alert.alert(
        t("createTrip.validationTitle"),
        t("tripPlaceDetails.validationStartTime")
      );
    }

    if (!isValidTime(plannedEndTime)) {
      return Alert.alert(
        t("createTrip.validationTitle"),
        t("tripPlaceDetails.validationEndTime")
      );
    }

    if (plannedStartTime && plannedEndTime) {
      const [sh, sm] = plannedStartTime.split(":").map(Number);
      const [eh, em] = plannedEndTime.split(":").map(Number);

      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;

      if (endMinutes <= startMinutes) {
        return Alert.alert(
          t("createTrip.validationTitle"),
          t("tripPlaceDetails.validationEndAfterStart")
        );
      }
    }

    try {
      setLoading(true);

      await updateTripItem(tripId, item.id || item.xid, {
        note: note.trim(),
        plannedDay: dayNumber,
        plannedStartTime: plannedStartTime.trim(),
        plannedEndTime: plannedEndTime.trim(),
        status,
        category,
        estimatedCost: safeEstimated,
        actualCost: safeActual,
      });

      navigation.goBack();
    } catch (e) {
      Alert.alert(
        t("common.error"),
        e?.message || t("tripPlaceDetails.saveFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={{ flex: 1, backgroundColor: theme.bg }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={theme.text} />
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text
                style={[styles.title, { color: theme.text }]}
                numberOfLines={1}
              >
                {t("tripPlaceDetails.editPlace")}
              </Text>
              <Text
                style={[styles.sub, { color: theme.sub }]}
                numberOfLines={1}
              >
                {item.name || t("tripPlaceDetails.placeFallback")}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t("tripPlaceDetails.planningDetails")}
            </Text>

            <TextInput
              mode="outlined"
              label={t("tripPlaceDetails.plannedDay")}
              value={plannedDay}
              onChangeText={(text) => setPlannedDay(text.replace(/[^\d]/g, ""))}
              keyboardType="number-pad"
              style={[styles.input, { backgroundColor: theme.card }]}
              outlineStyle={{ borderRadius: 12, borderColor: theme.border }}
              theme={{ colors: { primary: theme.brand } }}
              contentStyle={{ fontFamily: "Montserrat_400Regular" }}
              textColor={theme.text}
            />

            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label={t("tripPlaceDetails.startTime")}
                value={plannedStartTime}
                onChangeText={(text) =>
                  setPlannedStartTime(normalizeTimeInput(text))
                }
                placeholder="09:00"
                style={[styles.halfInput, { backgroundColor: theme.card }]}
                outlineStyle={{ borderRadius: 12, borderColor: theme.border }}
                theme={{ colors: { primary: theme.brand } }}
                contentStyle={{ fontFamily: "Montserrat_400Regular" }}
                textColor={theme.text}
              />

              <TextInput
                mode="outlined"
                label={t("tripPlaceDetails.endTime")}
                value={plannedEndTime}
                onChangeText={(text) =>
                  setPlannedEndTime(normalizeTimeInput(text))
                }
                placeholder="10:30"
                style={[styles.halfInput, { backgroundColor: theme.card }]}
                outlineStyle={{ borderRadius: 12, borderColor: theme.border }}
                theme={{ colors: { primary: theme.brand } }}
                contentStyle={{ fontFamily: "Montserrat_400Regular" }}
                textColor={theme.text}
              />
            </View>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t("tripPlaceDetails.status")}
            </Text>

            <View style={styles.chipsWrap}>
              {STATUS_OPTIONS.map((option) => {
                const active = status === option.value;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setStatus(option.value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? theme.brand : theme.bg,
                        borderColor: active ? theme.brand : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? "#fff" : theme.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t("tripPlaceDetails.category")}
            </Text>

            <View style={styles.chipsWrap}>
              {CATEGORY_OPTIONS.map((option) => {
                const active = category === option.value;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setCategory(option.value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? theme.brand : theme.bg,
                        borderColor: active ? theme.brand : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? "#fff" : theme.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t("tripPlaceDetails.costs")}
            </Text>

            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label={t("tripPlaceDetails.estimatedCost")}
                value={estimatedCost}
                onChangeText={setEstimatedCost}
                keyboardType="decimal-pad"
                style={[styles.halfInput, { backgroundColor: theme.card }]}
                outlineStyle={{ borderRadius: 12, borderColor: theme.border }}
                theme={{ colors: { primary: theme.brand } }}
                contentStyle={{ fontFamily: "Montserrat_400Regular" }}
                textColor={theme.text}
              />

              <TextInput
                mode="outlined"
                label={t("tripPlaceDetails.actualCost")}
                value={actualCost}
                onChangeText={setActualCost}
                keyboardType="decimal-pad"
                style={[styles.halfInput, { backgroundColor: theme.card }]}
                outlineStyle={{ borderRadius: 12, borderColor: theme.border }}
                theme={{ colors: { primary: theme.brand } }}
                contentStyle={{ fontFamily: "Montserrat_400Regular" }}
                textColor={theme.text}
              />
            </View>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t("tripPlaceDetails.note")}
            </Text>

            <TextInput
              mode="outlined"
              label={t("tripPlaceDetails.placeNote")}
              value={note}
              onChangeText={setNote}
              multiline
              style={[
                styles.input,
                { backgroundColor: theme.card, minHeight: 120 },
              ]}
              outlineStyle={{ borderRadius: 12, borderColor: theme.border }}
              theme={{ colors: { primary: theme.brand } }}
              contentStyle={{ fontFamily: "Montserrat_400Regular" }}
              textColor={theme.text}
            />
          </View>

          <Pressable
            onPress={onSave}
            disabled={loading}
            style={[
              styles.saveBtn,
              { backgroundColor: theme.brand, opacity: loading ? 0.7 : 1 },
            ]}
          >
            <Text style={styles.saveBtnText}>
              {loading ? t("common.saving") : t("tripPlaceDetails.saveChanges")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.cancelBtn}
          >
            <Text style={[styles.cancelText, { color: theme.sub }]}>
              {t("common.cancel")}
            </Text>
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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

  missingTitle: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },

  missingSub: {
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
    fontFamily: "Montserrat_400Regular",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },

  title: {
    fontSize: 24,
    fontFamily: "Montserrat_400Regular",
  },

  sub: {
    marginTop: 3,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },

  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 16,
    marginBottom: 12,
    fontFamily: "Montserrat_400Regular",
  },

  input: {
    marginTop: 2,
  },

  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },

  halfInput: {
    flex: 1,
  },

  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },

  chipText: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },

  saveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
  },

  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingVertical: 8,
  },

  cancelText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },
});
