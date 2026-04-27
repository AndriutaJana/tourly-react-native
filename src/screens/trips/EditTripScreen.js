import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ScrollView,
  Keyboard,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { TextInput } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../theme/useAppTheme";
import { useTrips } from "../../context/TripsContext";
import { useTranslation } from "react-i18next";

export default function EditTripScreen({ route, navigation }) {
  const { tripId } = route.params;
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { trips, updateTrip } = useTrips();

  const trip = useMemo(
    () => trips.find((x) => x.id === tripId),
    [trips, tripId]
  );

  const [title, setTitle] = useState(trip?.title || "");
  const [city, setCity] = useState(trip?.city || "");
  const [currency, setCurrency] = useState(trip?.budget?.currency || "EUR");

  const [accommodationBudget, setAccommodationBudget] = useState(
    String(trip?.budget?.accommodation ?? "")
  );
  const [transportBudget, setTransportBudget] = useState(
    String(trip?.budget?.transport ?? "")
  );
  const [miscBudget, setMiscBudget] = useState(
    String(trip?.budget?.misc ?? "")
  );
  const [foodPerDay, setFoodPerDay] = useState(
    String(trip?.budget?.foodPerDay ?? "")
  );
  const [actualTotal, setActualTotal] = useState(
    String(trip?.budget?.actualTotal ?? "")
  );

  const [startDate, setStartDate] = useState(
    trip?.startDate ? new Date(`${trip.startDate}T12:00:00`) : new Date()
  );
  const [endDate, setEndDate] = useState(
    trip?.endDate
      ? new Date(`${trip.endDate}T12:00:00`)
      : new Date(Date.now() + 24 * 60 * 60 * 1000)
  );

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState("start");
  const [tempDate, setTempDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  if (!trip) {
    return (
      <View style={[styles.notFoundContainer, { backgroundColor: theme.bg }]}>
        <Text style={[styles.notFoundText, { color: theme.text }]}>
          {t("editTrip.tripNotFound")}
        </Text>
      </View>
    );
  }

  const formatDate = (date) => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const openPicker = (mode) => {
    Keyboard.dismiss();
    setPickerMode(mode);
    setTempDate(
      mode === "start"
        ? startDate || new Date()
        : endDate || startDate || new Date()
    );
    setPickerVisible(true);
  };

  const confirmPicker = () => {
    if (pickerMode === "start") {
      setStartDate(tempDate);
      if (endDate && tempDate > endDate) {
        setEndDate(tempDate);
      }
    } else {
      if (startDate && tempDate < startDate) {
        Alert.alert(
          t("editTrip.validationTitle"),
          t("editTrip.endDateAfterStart")
        );
        return;
      }
      setEndDate(tempDate);
    }
    setPickerVisible(false);
  };

  const normalizeNumber = (value) => {
    const cleaned = String(value ?? "")
      .replace(",", ".")
      .replace(/[^0-9.]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const inputTheme = {
    colors: {
      background: theme.card,
      outline: theme.border,
      primary: theme.brand,
      onSurfaceVariant: theme.sub,
    },
    roundness: 12,
  };

  const onSave = async () => {
    if (title.trim().length < 2) {
      return Alert.alert(
        t("editTrip.validationTitle"),
        t("editTrip.tripNameShort")
      );
    }

    if (city.trim().length < 2) {
      return Alert.alert(
        t("editTrip.validationTitle"),
        t("editTrip.cityShort")
      );
    }

    if (!startDate || !endDate) {
      return Alert.alert(
        t("editTrip.validationTitle"),
        t("editTrip.selectDates")
      );
    }

    if (endDate < startDate) {
      return Alert.alert(
        t("editTrip.validationTitle"),
        t("editTrip.endDateAfterStart")
      );
    }

    try {
      setLoading(true);

      await updateTrip(tripId, {
        title: title.trim(),
        city: city.trim(),
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        budget: {
          currency: (currency || "EUR").trim().toUpperCase(),
          accommodation: normalizeNumber(accommodationBudget),
          transport: normalizeNumber(transportBudget),
          misc: normalizeNumber(miscBudget),
          foodPerDay: normalizeNumber(foodPerDay),
          actualTotal: normalizeNumber(actualTotal),
        },
      });

      navigation.goBack();
    } catch (e) {
      Alert.alert(t("common.error"), e?.message || t("editTrip.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={{ flex: 1, backgroundColor: theme.bg }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: theme.text }]}>
            {t("editTrip.title")}
          </Text>

          <Text style={[styles.sub, { color: theme.sub }]}>
            {t("editTrip.subtitle")}
          </Text>

          <TextInput
            mode="outlined"
            label={t("editTrip.tripName")}
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            textColor={theme.text}
            outlineColor={theme.border}
            activeOutlineColor={theme.brand}
            theme={inputTheme}
          />

          <TextInput
            mode="outlined"
            label={t("editTrip.city")}
            value={city}
            onChangeText={setCity}
            style={styles.input}
            textColor={theme.text}
            outlineColor={theme.border}
            activeOutlineColor={theme.brand}
            theme={inputTheme}
          />

          <View style={styles.row}>
            <Pressable
              onPress={() => openPicker("start")}
              style={[
                styles.dateField,
                { borderColor: theme.border, backgroundColor: theme.card },
              ]}
            >
              <Ionicons name="calendar-outline" size={18} color={theme.sub} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[styles.dateLabel, { color: theme.sub }]}>
                  {t("editTrip.startDate")}
                </Text>
                <Text style={[styles.dateValue, { color: theme.text }]}>
                  {formatDate(startDate)}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => openPicker("end")}
              style={[
                styles.dateField,
                { borderColor: theme.border, backgroundColor: theme.card },
              ]}
            >
              <Ionicons name="calendar-outline" size={18} color={theme.sub} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[styles.dateLabel, { color: theme.sub }]}>
                  {t("editTrip.endDate")}
                </Text>
                <Text style={[styles.dateValue, { color: theme.text }]}>
                  {formatDate(endDate)}
                </Text>
              </View>
            </Pressable>
          </View>

          <TextInput
            mode="outlined"
            label={t("editTrip.currency")}
            value={currency}
            onChangeText={(text) => setCurrency(text.toUpperCase())}
            style={styles.input}
            autoCapitalize="characters"
            maxLength={6}
            textColor={theme.text}
            outlineColor={theme.border}
            activeOutlineColor={theme.brand}
            theme={inputTheme}
          />

          <TextInput
            mode="outlined"
            label={t("editTrip.accommodation")}
            value={accommodationBudget}
            onChangeText={setAccommodationBudget}
            style={styles.input}
            keyboardType="numeric"
            textColor={theme.text}
            outlineColor={theme.border}
            activeOutlineColor={theme.brand}
            theme={inputTheme}
          />

          <TextInput
            mode="outlined"
            label={t("editTrip.transport")}
            value={transportBudget}
            onChangeText={setTransportBudget}
            style={styles.input}
            keyboardType="numeric"
            textColor={theme.text}
            outlineColor={theme.border}
            activeOutlineColor={theme.brand}
            theme={inputTheme}
          />

          <TextInput
            mode="outlined"
            label={t("editTrip.misc")}
            value={miscBudget}
            onChangeText={setMiscBudget}
            style={styles.input}
            keyboardType="numeric"
            textColor={theme.text}
            outlineColor={theme.border}
            activeOutlineColor={theme.brand}
            theme={inputTheme}
          />

          <TextInput
            mode="outlined"
            label={t("editTrip.foodPerDay")}
            value={foodPerDay}
            onChangeText={setFoodPerDay}
            style={styles.input}
            keyboardType="numeric"
            textColor={theme.text}
            outlineColor={theme.border}
            activeOutlineColor={theme.brand}
            theme={inputTheme}
          />

          <TextInput
            mode="outlined"
            label={t("editTrip.actualTotal")}
            value={actualTotal}
            onChangeText={setActualTotal}
            style={styles.input}
            keyboardType="numeric"
            textColor={theme.text}
            outlineColor={theme.border}
            activeOutlineColor={theme.brand}
            theme={inputTheme}
          />

          <Pressable
            onPress={onSave}
            disabled={loading}
            style={[
              styles.btn,
              {
                backgroundColor: theme.brand,
                opacity: loading ? 0.7 : 1,
              },
            ]}
          >
            <Text style={styles.btnText}>
              {loading ? t("common.saving") : t("common.save")}
            </Text>
          </Pressable>

          <Pressable onPress={() => navigation.goBack()} style={styles.cancel}>
            <Text style={[styles.cancelText, { color: theme.text }]}>
              {t("common.cancel")}
            </Text>
          </Pressable>

          <Modal
            visible={pickerVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setPickerVisible(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setPickerVisible(false)}
            >
              <Pressable
                onPress={() => {}}
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: theme.bg,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {pickerMode === "start"
                    ? t("editTrip.startDate")
                    : t("editTrip.endDate")}
                </Text>

                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === "android") {
                      if (event.type === "set" && selectedDate) {
                        setTempDate(selectedDate);
                        if (pickerMode === "start") {
                          setStartDate(selectedDate);
                          if (endDate && selectedDate > endDate) {
                            setEndDate(selectedDate);
                          }
                        } else {
                          if (startDate && selectedDate < startDate) {
                            Alert.alert(
                              t("editTrip.validationTitle"),
                              t("editTrip.endDateAfterStart")
                            );
                            setPickerVisible(false);
                            return;
                          }
                          setEndDate(selectedDate);
                        }
                      }
                      setPickerVisible(false);
                      return;
                    }

                    if (selectedDate) {
                      setTempDate(selectedDate);
                    }
                  }}
                  minimumDate={pickerMode === "end" ? startDate : undefined}
                  textColor={Platform.OS === "ios" ? theme.text : undefined}
                />

                {Platform.OS === "ios" ? (
                  <View style={styles.modalActions}>
                    <Pressable
                      onPress={() => setPickerVisible(false)}
                      style={[
                        styles.modalBtnSecondary,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.card,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalBtnSecondaryText,
                          { color: theme.text },
                        ]}
                      >
                        {t("common.cancel")}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={confirmPicker}
                      style={[
                        styles.modalBtnPrimary,
                        { backgroundColor: theme.brand },
                      ]}
                    >
                      <Text style={styles.modalBtnPrimaryText}>
                        {t("common.done")}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </Pressable>
            </Pressable>
          </Modal>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 70,
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },
  title: {
    fontSize: 26,
    fontFamily: "Montserrat_400Regular",
  },
  sub: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },
  input: {
    marginTop: 14,
  },
  row: {
    marginTop: 14,
    gap: 12,
  },
  dateField: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  dateLabel: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },
  dateValue: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
  },
  btn: {
    marginTop: 22,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#fff",
    fontFamily: "Montserrat_400Regular",
    fontSize: 15,
  },
  cancel: {
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  cancelText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    marginBottom: 10,
    fontFamily: "Montserrat_400Regular",
  },
  modalActions: {
    flexDirection: "row",
    marginTop: 14,
    gap: 10,
  },
  modalBtnSecondary: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnSecondaryText: {
    fontFamily: "Montserrat_400Regular",
  },
  modalBtnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnPrimaryText: {
    color: "#fff",
    fontFamily: "Montserrat_400Regular",
  },
});
