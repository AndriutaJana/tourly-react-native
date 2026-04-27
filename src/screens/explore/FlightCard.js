import React, { useMemo, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme/useAppTheme";
import { useWishlist } from "../../context/WishlistContext";

function fmtMin(mins) {
  const n = Number(mins);
  if (!Number.isFinite(n)) return "—";
  const h = Math.floor(n / 60);
  const m = n % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

function fmtMoney(total, currency) {
  if (total == null || total === "") return "—";
  const n = Number(total);
  if (!Number.isFinite(n)) return `${total}${currency ? ` ${currency}` : ""}`;
  return `${Math.round(n)}${currency ? ` ${currency}` : ""}`;
}

function timeHM(iso) {
  if (!iso) return "—";
  return String(iso).slice(11, 16);
}

function getStopCity(segs) {
  if (!Array.isArray(segs) || segs.length < 2) return null;
  return segs[0]?.arrival?.iataCode || null;
}

function getMain(offer) {
  const itiner = offer?.itineraries?.[0];
  const segs = itiner?.segments || [];
  const first = segs[0];
  const last = segs[segs.length - 1];

  const stops = Number.isFinite(Number(offer?.stops))
    ? Number(offer?.stops)
    : Math.max(0, segs.length - 1);

  const stopCity = stops > 0 ? getStopCity(segs) : null;

  const airlineCode = offer?.validatingAirlineCodes?.[0] || "";
  const airlineName = offer?.airlineName || "";
  const carrier = airlineName ? airlineName : airlineCode ? airlineCode : "—";

  const depAt = first?.departure?.at || "";
  const arrAt = last?.arrival?.at || "";

  const from = first?.departure?.iataCode || "—";
  const to = last?.arrival?.iataCode || "—";

  const duration = Number(itiner?.durationMinutes);
  const priceTotal = offer?.price?.total;
  const currency = offer?.price?.currency;

  return {
    from,
    to,
    depAt,
    arrAt,
    duration,
    stops,
    stopCity,
    carrier,
    airlineCode,
    airlineName,
    priceTotal,
    currency,
    segCount: segs.length || 0,
  };
}

export default function FlightCard({
  offer,
  onPress,
  tag,
  isSaved: isSavedProp,
  onToggleSave: onToggleSaveProp,
  onAddToTrip,
}) {
  const t = useAppTheme();
  const { t: i18nT } = useTranslation();
  const { add, remove, isSaved: isSavedCtx } = useWishlist();

  const m = useMemo(() => getMain(offer), [offer]);

  const offerId = String(offer?.id || "");
  const xid = offerId ? `flight_${offerId}` : "";
  const canToggleSave = xid.length > 0;

  const saved =
    typeof isSavedProp === "boolean"
      ? isSavedProp
      : canToggleSave
      ? isSavedCtx(xid)
      : false;

  const direct = m.stops === 0;
  const stopsLabel =
    m.stops === 0
      ? i18nT("flightDetails.direct")
      : m.stops === 1
      ? i18nT("flightDetails.oneStop")
      : i18nT("flightDetails.multipleStops", { count: m.stops });

  const viaText =
    !direct && m.stopCity
      ? `${i18nT("flightDetails.via")} ${m.stopCity}`
      : !direct
      ? `${i18nT("flightDetails.via")} —`
      : "";

  const wishlistItem = useMemo(() => {
    if (!canToggleSave) return null;

    const title = `${m.from || "—"} → ${m.to || "—"}`;
    const subtitle = [
      `${timeHM(m.depAt)}–${timeHM(m.arrAt)}`,
      `${fmtMin(m.duration)}`,
      stopsLabel,
      !direct && m.stopCity
        ? `${i18nT("flightDetails.via")} ${m.stopCity}`
        : null,
      `${i18nT("flightDetails.price")}: ${fmtMoney(m.priceTotal, m.currency)}`,
    ]
      .filter(Boolean)
      .join(" • ");

    return {
      xid,
      kind: "flight",
      title,
      subtitle,
      preview: null,
      payload: offer,
    };
  }, [canToggleSave, xid, m, stopsLabel, direct, offer, i18nT]);

  const onSavePress = useCallback(
    async (e) => {
      e?.stopPropagation?.();

      if (!canToggleSave) return;

      if (typeof onToggleSaveProp === "function") {
        onToggleSaveProp();
        return;
      }

      if (!wishlistItem) return;

      try {
        if (saved) await remove(xid);
        else await add(wishlistItem);
      } catch (err) {
        console.log("wishlist toggle flight error:", err?.message);
      }
    },
    [canToggleSave, onToggleSaveProp, wishlistItem, saved, remove, add, xid]
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: t.card,
          borderColor: t.border,
          shadowColor: "#000",
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {tag ? (
            <View
              pointerEvents="none"
              style={[styles.tagPill, { backgroundColor: t.brand }]}
            >
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ) : null}

          {saved ? (
            <View
              pointerEvents="none"
              style={[
                styles.savedPill,
                { backgroundColor: t.bg, borderColor: t.border },
              ]}
            >
              <Ionicons name="bookmark" size={12} color={t.brand} />
              <Text style={[styles.savedText, { color: t.sub }]}>
                {i18nT("flightDetails.saved")}
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={onSavePress}
          disabled={!canToggleSave}
          hitSlop={10}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              borderColor: t.border,
              backgroundColor: t.bg,
              opacity: !canToggleSave ? 0.35 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={18}
            color={saved ? t.brand : t.sub}
          />
        </Pressable>
      </View>

      <View style={styles.topRow}>
        <View style={styles.leftCol}>
          <View style={styles.timesRow}>
            <Text style={[styles.timeBig, { color: t.text }]}>
              {timeHM(m.depAt)}
            </Text>

            <View style={styles.dotLine}>
              <View style={[styles.dot, { backgroundColor: t.sub }]} />
              <View style={[styles.line, { backgroundColor: t.border }]} />
              <View style={[styles.dot, { backgroundColor: t.sub }]} />
            </View>

            <Text style={[styles.timeBig, { color: t.text }]}>
              {timeHM(m.arrAt)}
            </Text>
          </View>

          <View style={styles.subRow}>
            <View style={styles.routeRow}>
              <Text
                style={[styles.routeSmall, { color: t.sub }]}
                numberOfLines={1}
              >
                {m.from || "—"} → {m.to || "—"}
              </Text>

              {!direct && (
                <View
                  style={[
                    styles.viaPill,
                    { borderColor: t.border, backgroundColor: t.bg },
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={13}
                    color={t.sub}
                    style={styles.viaIcon}
                  />
                  <Text
                    style={[styles.viaText, { color: t.sub }]}
                    numberOfLines={1}
                  >
                    {viaText}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.pillRow}>
              <View
                style={[
                  styles.pill,
                  { borderColor: t.border, backgroundColor: t.bg },
                ]}
              >
                <Ionicons
                  name={direct ? "flash-outline" : "git-branch-outline"}
                  size={13}
                  color={t.sub}
                  style={styles.pillIcon}
                />
                <Text style={[styles.pillText, { color: t.sub }]}>
                  {stopsLabel}
                </Text>
              </View>

              <View
                style={[
                  styles.pill,
                  { borderColor: t.border, backgroundColor: t.bg },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={13}
                  color={t.sub}
                  style={styles.pillIcon}
                />
                <Text style={[styles.pillText, { color: t.sub }]}>
                  {fmtMin(m.duration)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.priceCol}>
          <View
            style={[
              styles.pricePill,
              { backgroundColor: t.bg, borderColor: t.border },
            ]}
          >
            <Text
              style={[styles.priceBig, { color: t.text }]}
              numberOfLines={1}
            >
              {fmtMoney(m.priceTotal, m.currency)}
            </Text>
          </View>
          <Text style={[styles.priceSub, { color: t.sub }]}>
            {i18nT("flightDetails.total").toLowerCase()}
          </Text>
        </View>
      </View>

      {!!onAddToTrip && (
        <View style={styles.actionsRow}>
          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              onAddToTrip(offer);
            }}
            style={[styles.tripBtn, { backgroundColor: t.brand }]}
          >
            <Ionicons name="briefcase-outline" size={16} color="#fff" />
            <Text style={styles.tripBtnText}>
              {i18nT("flightDetails.addToTrip")}
            </Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.bottomRow, { borderTopColor: t.border }]}>
        <View style={styles.airlineRow}>
          <Ionicons
            name="airplane-outline"
            size={16}
            color={t.sub}
            style={styles.airlineIcon}
          />
          <Text
            style={[styles.airlineText, { color: t.sub }]}
            numberOfLines={1}
          >
            {m.carrier}
            {m.airlineCode ? ` • ${m.airlineCode}` : ""}
          </Text>
        </View>

        <Text style={[styles.segsText, { color: t.sub }]}>
          {m.segCount} {i18nT("flightDetails.seg")}
        </Text>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  tagPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  tagText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    letterSpacing: 0.2,
  },

  savedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
  },
  savedText: { fontSize: 11, fontFamily: "Montserrat_400Regular" },

  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  topRow: { flexDirection: "row", alignItems: "flex-start" },
  leftCol: { flex: 1, minWidth: 0, paddingRight: 12 },

  timesRow: { flexDirection: "row", alignItems: "center" },
  timeBig: {
    fontSize: 20,
    fontFamily: "Montserrat_400Regular",
    letterSpacing: 0.2,
  },

  dotLine: {
    width: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 10,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  line: { flex: 1, height: 2, borderRadius: 2, marginHorizontal: 6 },

  subRow: { marginTop: 8 },

  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  routeSmall: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    flex: 1,
    minWidth: 0,
  },

  viaPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: 10,
    maxWidth: "55%",
  },
  viaIcon: { marginRight: 6 },
  viaText: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 8,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  pillIcon: { marginRight: 6 },
  pillText: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  priceCol: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    paddingTop: 2,
    minWidth: 96,
  },
  pricePill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  priceBig: { fontSize: 18, fontFamily: "Montserrat_400Regular" },
  priceSub: { marginTop: 4, fontSize: 11, fontFamily: "Montserrat_400Regular" },

  bottomRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  airlineRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  airlineIcon: { marginRight: 8 },
  airlineText: { fontSize: 12, fontFamily: "Montserrat_400Regular", flex: 1 },

  segsText: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    marginLeft: 12,
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: "row",
  },
  tripBtn: {
    height: 38,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tripBtnText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },
});
