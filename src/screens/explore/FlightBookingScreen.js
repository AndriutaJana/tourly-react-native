import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme/useAppTheme";
import { TextInput } from "react-native-paper";
import { createBooking } from "../../api/bookingsBackendApi";

function fmtMin(mins) {
  const n = Number(mins);
  if (!Number.isFinite(n)) return "—";
  const h = Math.floor(n / 60);
  const m = n % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

function money(total, currency) {
  if (total == null || total === "") return "—";
  const n = Number(total);
  if (!Number.isFinite(n)) return `${total}${currency ? ` ${currency}` : ""}`;
  return `${Math.round(n)}${currency ? ` ${currency}` : ""}`;
}

function isEmailLike(s) {
  const x = String(s || "").trim();
  return x.includes("@") && x.includes(".");
}

export default function FlightBookingScreen({ navigation, route }) {
  const t = useAppTheme();
  const { t: i18nT } = useTranslation();

  const offer = route?.params?.offer;
  const data = route?.params?.data;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const summary = useMemo(() => {
    const from =
      data?.from ||
      offer?.itineraries?.[0]?.segments?.[0]?.departure?.iataCode ||
      "—";
    const to =
      data?.to ||
      offer?.itineraries?.[0]?.segments?.slice(-1)?.[0]?.arrival?.iataCode ||
      "—";

    const price = data?.price ?? offer?.price?.total;
    const currency = data?.currency ?? offer?.price?.currency;

    const duration = data?.duration ?? offer?.itineraries?.[0]?.durationMinutes;
    const stops = data?.stops ?? offer?.stops;

    const airline =
      data?.airline ||
      offer?.airlineName ||
      offer?.validatingAirlineCodes?.[0] ||
      "—";

    const depDate = data?.depDate || "—";
    const depTime = data?.depTime || "—";
    const arrDate = data?.arrDate || "—";
    const arrTime = data?.arrTime || "—";

    return {
      from,
      to,
      price,
      currency,
      duration,
      stops,
      airline,
      depDate,
      depTime,
      arrDate,
      arrTime,
    };
  }, [offer, data]);

  const canSubmit =
    !!offer &&
    fullName.trim().length >= 2 &&
    isEmailLike(email) &&
    phone.trim().length >= 5;

  const stopsLabel =
    Number(summary.stops) === 0
      ? i18nT("flightDetails.direct")
      : Number(summary.stops) === 1
      ? i18nT("flightDetails.oneStop")
      : i18nT("flightDetails.multipleStops", { count: summary.stops ?? "—" });

  const onConfirmBooking = useCallback(async () => {
    try {
      if (!offer) {
        Alert.alert(
          i18nT("navigation.flightBooking"),
          i18nT("flightBooking.missingFlightOffer")
        );
        return;
      }

      if (fullName.trim().length < 2) {
        Alert.alert(
          i18nT("navigation.flightBooking"),
          i18nT("flightBooking.enterFullName")
        );
        return;
      }
      if (!isEmailLike(email)) {
        Alert.alert(
          i18nT("navigation.flightBooking"),
          i18nT("flightBooking.enterValidEmail")
        );
        return;
      }
      if (phone.trim().length < 5) {
        Alert.alert(
          i18nT("navigation.flightBooking"),
          i18nT("flightBooking.enterPhoneNumber")
        );
        return;
      }

      const passenger = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };

      const res = await createBooking({ offer, passenger });

      navigation.navigate("Payment", {
        bookingId: res?.bookingId,
        booking: res?.booking,
        data,
      });
    } catch (e) {
      Alert.alert(
        i18nT("navigation.flightBooking"),
        e?.message || i18nT("flightBooking.failedToContinue")
      );
    }
  }, [offer, fullName, email, phone, navigation, data, i18nT]);

  if (!offer) {
    return (
      <View style={[styles.container, { backgroundColor: t.bg }]}>
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={t.text} />
          </Pressable>
          <Text style={[styles.title, { color: t.text }]}>
            {i18nT("navigation.flightBooking")}
          </Text>
          <View style={{ width: 22 }} />
        </View>

        <Text style={{ color: t.sub, fontFamily: "Montserrat_400Regular" }}>
          {i18nT("flightDetails.noFlightSelected")}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <View style={styles.topRow}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={t.text} />
            </Pressable>

            <Text style={[styles.title, { color: t.text }]}>
              {i18nT("navigation.flightBooking")}
            </Text>

            <View style={{ width: 22 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 140 }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.card,
                { backgroundColor: t.card, borderColor: t.border },
              ]}
            >
              <Text style={[styles.route, { color: t.text }]}>
                {summary.from} → {summary.to}
              </Text>

              <Text style={[styles.sub, { color: t.sub }]}>
                {summary.airline}
              </Text>

              <View style={styles.row}>
                <View
                  style={[
                    styles.pill,
                    { borderColor: t.border, backgroundColor: t.bg },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={14} color={t.sub} />
                  <Text style={[styles.pillText, { color: t.sub }]}>
                    {summary.depDate}
                    {summary.arrDate !== "—" &&
                    summary.arrDate !== summary.depDate
                      ? ` → ${summary.arrDate}`
                      : ""}
                  </Text>
                </View>

                <View
                  style={[
                    styles.pill,
                    { borderColor: t.border, backgroundColor: t.card },
                  ]}
                >
                  <Ionicons name="time-outline" size={14} color={t.sub} />
                  <Text style={[styles.pillText, { color: t.sub }]}>
                    {fmtMin(summary.duration)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.pill,
                    { borderColor: t.border, backgroundColor: t.card },
                  ]}
                >
                  <Ionicons name="git-branch-outline" size={14} color={t.sub} />
                  <Text style={[styles.pillText, { color: t.sub }]}>
                    {stopsLabel}
                  </Text>
                </View>
              </View>

              <View style={[styles.timeRow, { borderTopColor: t.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.timeBig, { color: t.text }]}>
                    {summary.depTime}
                  </Text>
                  <Text style={[styles.sub, { color: t.sub }]}>
                    {summary.depDate}
                  </Text>
                </View>

                <Ionicons name="airplane-outline" size={18} color={t.sub} />

                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={[styles.timeBig, { color: t.text }]}>
                    {summary.arrTime}
                  </Text>
                  <Text style={[styles.sub, { color: t.sub }]}>
                    {summary.arrDate}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: t.card,
                  borderColor: t.border,
                  marginTop: 12,
                },
              ]}
            >
              <Text style={[styles.route, { color: t.text }]}>
                {i18nT("flightBooking.passengerDetails")}
              </Text>

              <TextInput
                mode="outlined"
                label={i18nT("flightBooking.fullName")}
                value={fullName}
                onChangeText={setFullName}
                style={{ marginTop: 10, backgroundColor: t.card }}
                outlineStyle={{ borderRadius: 12, borderColor: t.border }}
                theme={{ colors: { primary: t.brand } }}
              />

              <TextInput
                mode="outlined"
                label={i18nT("flightBooking.email")}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ marginTop: 10, backgroundColor: t.card }}
                outlineStyle={{ borderRadius: 12, borderColor: t.border }}
                theme={{ colors: { primary: t.brand } }}
              />

              <TextInput
                mode="outlined"
                label={i18nT("flightBooking.phone")}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={{ marginTop: 10, backgroundColor: t.card }}
                outlineStyle={{ borderRadius: 12, borderColor: t.border }}
                theme={{ colors: { primary: t.brand } }}
              />
            </View>
          </ScrollView>

          <View
            style={[
              styles.sticky,
              { backgroundColor: t.card, borderTopColor: t.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.price, { color: t.text }]}>
                {money(summary.price, summary.currency)}
              </Text>
              <Text style={[styles.sub, { color: t.sub }]}>
                {i18nT("flightDetails.total")}
              </Text>
            </View>

            <Pressable
              onPress={canSubmit ? onConfirmBooking : null}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: t.brand,
                  opacity: !canSubmit ? 0.45 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons name="card-outline" size={18} color="#fff" />
              <Text style={styles.ctaText}>
                {i18nT("flightBooking.continueToPayment")}
              </Text>
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
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

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },

  route: { fontSize: 18, fontFamily: "Montserrat_400Regular" },
  sub: { marginTop: 4, fontSize: 12, fontFamily: "Montserrat_400Regular" },

  row: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  timeRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  timeBig: { fontSize: 20, fontFamily: "Montserrat_400Regular" },

  note: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Montserrat_400Regular",
  },

  sticky: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 26,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  price: { fontSize: 18, fontFamily: "Montserrat_400Regular" },

  cta: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: { color: "#fff", fontFamily: "Montserrat_400Regular" },
});
