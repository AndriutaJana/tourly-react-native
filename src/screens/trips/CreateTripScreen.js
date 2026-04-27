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
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Feather from "@expo/vector-icons/Feather";
import { useTranslation } from "react-i18next";
import { useTrips } from "../../context/TripsContext";
import { colors } from "../../../theme/colors";

export default function CreateTripScreen({ navigation, route }) {
  const { addTrip, addItemToTrip } = useTrips();
  const { t, i18n } = useTranslation();

  const pendingItem = route?.params?.pendingItem || null;

  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState("start");
  const [tempDate, setTempDate] = useState(new Date());

  const isIOS = Platform.OS === "ios";

  const formatDateForStorage = (date) => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const formatDateForDisplay = (date) => {
    if (!date) return "";
    return date.toLocaleDateString(i18n.language || "en", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const displayStartDate = useMemo(
    () => formatDateForDisplay(startDate),
    [startDate, i18n.language]
  );

  const displayEndDate = useMemo(
    () => formatDateForDisplay(endDate),
    [endDate, i18n.language]
  );

  const isFormValid =
    title.trim().length >= 2 &&
    city.trim().length >= 2 &&
    !!startDate &&
    !!endDate &&
    endDate >= startDate;

  const openPicker = (mode) => {
    setPickerMode(mode);

    if (mode === "start") {
      setTempDate(startDate || new Date());
    } else {
      setTempDate(endDate || startDate || new Date());
    }

    setPickerVisible(true);
  };

  const closePicker = () => {
    setPickerVisible(false);
  };

  const applyPickedDate = (selectedDate) => {
    if (!selectedDate) return;

    if (pickerMode === "start") {
      setStartDate(selectedDate);

      if (endDate && selectedDate > endDate) {
        setEndDate(selectedDate);
      }
    } else {
      if (startDate && selectedDate < startDate) {
        Alert.alert(
          t("createTrip.validationTitle"),
          t("createTrip.endDateAfterStart")
        );
        return;
      }

      setEndDate(selectedDate);
    }
  };

  const onChangeDate = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setPickerVisible(false);

      if (event?.type === "dismissed") return;
      if (selectedDate) applyPickedDate(selectedDate);
      return;
    }

    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const confirmPicker = () => {
    applyPickedDate(tempDate);
    closePicker();
  };

  const onCreate = async () => {
    if (title.trim().length < 2) {
      return Alert.alert(
        t("createTrip.validationTitle"),
        t("createTrip.tripNameShort")
      );
    }

    if (city.trim().length < 2) {
      return Alert.alert(
        t("createTrip.validationTitle"),
        t("createTrip.cityShort")
      );
    }

    if (!startDate) {
      return Alert.alert(
        t("createTrip.validationTitle"),
        t("createTrip.selectStartDate")
      );
    }

    if (!endDate) {
      return Alert.alert(
        t("createTrip.validationTitle"),
        t("createTrip.selectEndDate")
      );
    }

    if (endDate < startDate) {
      return Alert.alert(
        t("createTrip.validationTitle"),
        t("createTrip.endDateAfterStart")
      );
    }

    try {
      setLoading(true);

      const tripId = await addTrip({
        title: title.trim(),
        city: city.trim(),
        startDate: formatDateForStorage(startDate),
        endDate: formatDateForStorage(endDate),
      });

      if (pendingItem) {
        await addItemToTrip(tripId, pendingItem);
      }

      navigation.replace("TripDetails", { tripId });
    } catch (e) {
      Alert.alert(
        t("common.error"),
        e?.message || t("createTrip.createFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  const pickerMinimumDate =
    pickerMode === "end" ? startDate || new Date() : new Date();

  return (
    <>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topBar}>
              <Pressable
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                hitSlop={12}
              >
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.heroCard}>
              <View style={styles.heroIconWrap}>
                <Ionicons
                  name="airplane-outline"
                  size={20}
                  color={colors.brand}
                />
              </View>

              <Text style={styles.heroTitle}>{t("createTrip.title")}</Text>

              <Text style={styles.heroSub}>{t("createTrip.subtitle")}</Text>
            </View>

            <View style={styles.formCard}>
              <View style={styles.inputWrap}>
                <TextInput
                  mode="outlined"
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t("createTrip.tripName")}
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  contentStyle={styles.inputContent}
                  left={
                    <TextInput.Icon
                      icon={() => (
                        <Feather
                          name="briefcase"
                          size={18}
                          color={colors.textSecondary}
                        />
                      )}
                    />
                  }
                  theme={{
                    colors: {
                      primary: colors.brand,
                      outline: "#E7E7E7",
                      onSurfaceVariant: colors.textSecondary,
                      background: colors.white,
                    },
                  }}
                />
              </View>

              <View style={styles.inputWrap}>
                <TextInput
                  mode="outlined"
                  value={city}
                  onChangeText={setCity}
                  placeholder={t("createTrip.city")}
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  contentStyle={styles.inputContent}
                  left={
                    <TextInput.Icon
                      icon={() => (
                        <Ionicons
                          name="location-outline"
                          size={18}
                          color={colors.textSecondary}
                        />
                      )}
                    />
                  }
                  theme={{
                    colors: {
                      primary: colors.brand,
                      outline: "#E7E7E7",
                      onSurfaceVariant: colors.textSecondary,
                      background: colors.white,
                    },
                  }}
                />
              </View>

              <Text style={styles.sectionLabel}>
                {t("createTrip.travelDates")}
              </Text>

              <Pressable
                onPress={() => openPicker("start")}
                style={styles.dateCard}
              >
                <View style={styles.dateLeft}>
                  <View style={styles.dateIconWrap}>
                    <MaterialCommunityIcons
                      name="calendar-month-outline"
                      size={18}
                      color={colors.brand}
                    />
                  </View>

                  <View style={styles.dateTexts}>
                    <Text style={styles.dateSmallLabel}>
                      {t("createTrip.startDate")}
                    </Text>
                    <Text style={styles.dateMainValue}>
                      {displayStartDate || t("createTrip.selectStartDateShort")}
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>

              <Pressable
                onPress={() => openPicker("end")}
                style={styles.dateCard}
              >
                <View style={styles.dateLeft}>
                  <View style={styles.dateIconWrap}>
                    <MaterialCommunityIcons
                      name="calendar-month-outline"
                      size={18}
                      color={colors.brand}
                    />
                  </View>

                  <View style={styles.dateTexts}>
                    <Text style={styles.dateSmallLabel}>
                      {t("createTrip.endDate")}
                    </Text>
                    <Text style={styles.dateMainValue}>
                      {displayEndDate || t("createTrip.selectEndDateShort")}
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>

              <Pressable
                onPress={onCreate}
                disabled={!isFormValid || loading}
                style={[
                  styles.createButton,
                  {
                    backgroundColor: "#5E936C",
                  },
                ]}
              >
                <Text style={styles.createButtonText}>
                  {loading ? t("createTrip.creating") : t("createTrip.create")}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => navigation.goBack()}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>{t("common.cancel")}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {pickerVisible && Platform.OS === "android" && (
        <DateTimePicker
          value={
            pickerMode === "start"
              ? startDate || new Date()
              : endDate || startDate || new Date()
          }
          mode="date"
          display="calendar"
          onChange={onChangeDate}
          minimumDate={pickerMinimumDate}
        />
      )}

      <Modal
        visible={pickerVisible && isIOS}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {pickerMode === "start"
                ? t("createTrip.selectStartDateShort")
                : t("createTrip.selectEndDateShort")}
            </Text>

            <Text style={styles.modalPreview}>
              {formatDateForDisplay(tempDate)}
            </Text>

            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              onChange={onChangeDate}
              minimumDate={pickerMinimumDate}
              style={styles.iosPicker}
              textColor={colors.text}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={closePicker} style={styles.modalActionBtn}>
                <Text style={styles.modalActionText}>{t("common.cancel")}</Text>
              </Pressable>

              <Pressable onPress={confirmPicker} style={styles.modalConfirmBtn}>
                <Text style={styles.modalConfirmText}>
                  {t("common.confirm")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.white,
  },

  container: {
    flex: 1,
    backgroundColor: colors.white,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
  },

  topBar: {
    height: 34,
    justifyContent: "center",
    marginBottom: 10,
  },

  backButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
  },

  heroCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#ECECEC",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    marginBottom: 16,
  },

  heroIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.lightGray,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  heroTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 4,
  },

  heroSub: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  formCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#ECECEC",
    borderRadius: 18,
    padding: 14,
  },

  inputWrap: {
    marginBottom: 14,
  },

  input: {
    height: 64,
    backgroundColor: colors.white,
    fontSize: 16,
  },

  inputOutline: {
    borderWidth: 1,
    borderRadius: 16,
    borderColor: "#E7E7E7",
  },

  inputContent: {
    fontSize: 16,
    color: colors.text,
    paddingTop: 0,
    paddingBottom: 0,
  },

  sectionLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 12,
    marginTop: 2,
  },

  dateCard: {
    minHeight: 72,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E7E7E7",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  dateLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  dateIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.lightGray,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  dateTexts: {
    flex: 1,
  },

  dateSmallLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 3,
  },

  dateMainValue: {
    fontSize: 17,
    fontWeight: "500",
    color: colors.text,
  },

  createButton: {
    marginTop: 16,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  createButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "500",
  },

  cancelBtn: {
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: colors.darkOverlay,
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  modalCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#ECECEC",
    borderRadius: 18,
    padding: 16,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },

  modalPreview: {
    fontSize: 18,
    textAlign: "center",
    color: colors.text,
    marginBottom: 8,
  },

  iosPicker: {
    alignSelf: "center",
    width: 280,
    height: 180,
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },

  modalActionBtn: {
    height: 40,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  modalActionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  modalConfirmBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
  },

  modalConfirmText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
});
