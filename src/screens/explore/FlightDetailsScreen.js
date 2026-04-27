import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Share,
  Platform,
} from "react-native";
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

function timeHHMM(iso) {
  if (!iso || typeof iso !== "string") return "—";
  return iso.slice(11, 16);
}

function dateYMD(iso) {
  if (!iso || typeof iso !== "string") return "—";
  return iso.slice(0, 10);
}

function money(total, currency) {
  if (total == null || total === "") return "—";
  const n = Number(total);
  if (!Number.isFinite(n)) return `${total}${currency ? ` ${currency}` : ""}`;
  return `${Math.round(n)}${currency ? ` ${currency}` : ""}`;
}

function pickStops(offer, segs) {
  const s = Number(offer?.stops);
  if (Number.isFinite(s)) return s;
  return Math.max(0, (segs?.length || 0) - 1);
}

function stopsLabel(stops, i18nT) {
  const n = Number(stops);
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return i18nT("flightDetails.direct");
  if (n === 1) return i18nT("flightDetails.oneStop");
  return i18nT("flightDetails.multipleStops", { count: n });
}

function layoverMinutes(prevSeg, nextSeg) {
  const a = prevSeg?.arrival?.at;
  const b = nextSeg?.departure?.at;
  if (!a || !b) return null;
  const da = new Date(a);
  const db = new Date(b);
  const diff = db.getTime() - da.getTime();
  if (!Number.isFinite(diff)) return null;
  const mins = Math.round(diff / 60000);
  return mins >= 0 ? mins : null;
}

function dayDiff(isoA, isoB) {
  if (!isoA || !isoB) return 0;
  const a = new Date(isoA);
  const b = new Date(isoB);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  const dA = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const dB = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((dB - dA) / (24 * 60 * 60 * 1000));
}

function stopCityFromSegments(segs) {
  if (!Array.isArray(segs) || segs.length < 2) return null;
  return segs[0]?.arrival?.iataCode || null;
}

function sumInAirMinutes(segs) {
  if (!Array.isArray(segs) || !segs.length) return 0;
  return segs.reduce((acc, s) => acc + (Number(s?.durationMinutes) || 0), 0);
}

function classifyConnection(mins, i18nT) {
  const n = Number(mins);
  if (!Number.isFinite(n)) return null;
  if (n < 60)
    return { label: i18nT("flightDetails.tightConnection"), key: "tight" };
  if (n <= 120)
    return { label: i18nT("flightDetails.okConnection"), key: "ok" };
  return { label: i18nT("flightDetails.longConnection"), key: "long" };
}

export default function FlightDetailsScreen({ navigation, route }) {
  const t = useAppTheme();
  const { t: i18nT } = useTranslation();
  const { add, remove, isSaved } = useWishlist();

  const offer = route?.params?.offer;

  const offerId = String(offer?.id || "");
  const xid = offerId ? `flight_${offerId}` : "";
  const canToggleSave = xid.length > 0;
  const saved = canToggleSave ? isSaved(xid) : false;

  const data = useMemo(() => {
    const itiner = offer?.itineraries?.[0];
    const segs = itiner?.segments || [];
    const first = segs[0];
    const last = segs[segs.length - 1];

    const duration = Number(itiner?.durationMinutes);
    const stops = pickStops(offer, segs);
    const stopCity = stopCityFromSegments(segs);

    const inAir = sumInAirMinutes(segs);
    const layovers = Number.isFinite(duration)
      ? Math.max(0, duration - inAir)
      : 0;

    const depISO = first?.departure?.at || "";
    const arrISO = last?.arrival?.at || "";

    const dayDeltaTrip = dayDiff(depISO, arrISO);

    const routeStr = `${first?.departure?.iataCode || "—"} → ${
      last?.arrival?.iataCode || "—"
    }`;

    const flightNums = segs
      .map((s) => `${s?.carrierCode || "—"}${s?.number ? ` ${s.number}` : ""}`)
      .filter(Boolean);

    return {
      routeStr,
      from: first?.departure?.iataCode || "—",
      to: last?.arrival?.iataCode || "—",
      depISO,
      arrISO,
      depDate: dateYMD(depISO),
      depTime: timeHHMM(depISO),
      arrDate: dateYMD(arrISO),
      arrTime: timeHHMM(arrISO),
      dayDeltaTrip,
      duration,
      stops,
      stopCity,
      inAir,
      layovers,
      price: offer?.price?.total,
      currency: offer?.price?.currency,
      airline: offer?.airlineName || "",
      airlineCode: offer?.validatingAirlineCodes?.[0] || "",
      segments: segs,
      flightNums,
    };
  }, [offer]);

  const wishlistItem = useMemo(() => {
    if (!canToggleSave) return null;

    const title = `${data.from} → ${data.to}`;
    const subtitle = [
      `${data.depDate} • ${data.depTime}–${data.arrTime}${
        data.dayDeltaTrip > 0 ? ` (+${data.dayDeltaTrip})` : ""
      }`,
      `${fmtMin(data.duration)} • ${stopsLabel(data.stops, i18nT)}${
        data.stops > 0 && data.stopCity
          ? ` • ${i18nT("flightDetails.via")} ${data.stopCity}`
          : ""
      }`,
      `${i18nT("flightDetails.price")}: ${money(data.price, data.currency)}`,
    ].join(" • ");

    return {
      xid,
      kind: "flight",
      title,
      subtitle,
      preview: null,
      payload: offer,
    };
  }, [canToggleSave, xid, data, offer, i18nT]);

  const onToggleSave = useCallback(async () => {
    if (!canToggleSave || !wishlistItem) {
      Alert.alert(i18nT("common.error"), i18nT("flights.cannotSaveMissingId"));
      return;
    }

    try {
      if (saved) {
        await remove(xid);
        Alert.alert(
          i18nT("flightDetails.removed"),
          i18nT("flightDetails.removedFromWishlist")
        );
      } else {
        await add(wishlistItem);
        Alert.alert(
          i18nT("common.success"),
          i18nT("flightDetails.savedToWishlist")
        );
      }
    } catch (e) {
      console.log("wishlist toggle error:", e?.message);
      Alert.alert(
        i18nT("navigation.wishlistHome"),
        i18nT("flights.failedToUpdateWishlist")
      );
    }
  }, [canToggleSave, wishlistItem, saved, add, remove, xid, i18nT]);

  const onShareFlight = useCallback(async () => {
    try {
      const text = [
        data.routeStr,
        `${data.depDate} • ${data.depTime} - ${data.arrTime}${
          data.dayDeltaTrip > 0 ? ` (+${data.dayDeltaTrip})` : ""
        }`,
        `${fmtMin(data.duration)} • ${stopsLabel(data.stops, i18nT)}${
          data.stops > 0 && data.stopCity
            ? ` • ${i18nT("flightDetails.via")} ${data.stopCity}`
            : ""
        }`,
        `${i18nT("flightDetails.price")}: ${money(data.price, data.currency)}`,
        data.airline
          ? `${i18nT("flightDetails.airline")}: ${
              data.airlineCode ? `${data.airlineCode} • ` : ""
            }${data.airline}`
          : data.airlineCode
          ? `${i18nT("flightDetails.airline")}: ${data.airlineCode}`
          : null,
        data.flightNums?.length
          ? `${i18nT("navigation.flights")}: ${data.flightNums.join(" • ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      await Share.share({ message: text });
    } catch (e) {
      console.log("share error:", e?.message);
    }
  }, [data, i18nT]);

  const onAddToTrip = useCallback(() => {
    if (!offer) return;

    const item = {
      type: "flight",
      id: offer?.id || null,
      offerId: offer?.id || null,
      title: `${data.from} → ${data.to}`,
      name: `${data.from} → ${data.to}`,
      preview: null,
      estimatedDurationMin: Number(data.duration) || 0,
      estimatedCost: Number(offer?.price?.total) || 0,
      currency: offer?.price?.currency || "EUR",
      startAt: data.depISO || null,
      endAt: data.arrISO || null,
      origin: data.from || null,
      destination: data.to || null,
      airline: data.airline || null,
      airlineCode: data.airlineCode || null,
      stops: data.stops || 0,
      payload: offer,
    };

    try {
      navigation.navigate("Trips", {
        screen: "SelectTrip",
        params: { item },
      });
    } catch (e) {
      Alert.alert(
        i18nT("navigation.tripsHome"),
        i18nT("flightDetails.selectTripRouteError")
      );
    }
  }, [navigation, offer, data, i18nT]);

  const onPrimaryAction = useCallback(() => {
    navigation.navigate("FlightBooking", { offer, data });
  }, [navigation, offer, data]);

  if (!offer) {
    return (
      <View style={[styles.container, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.text, fontFamily: "Montserrat_400Regular" }}>
          {i18nT("flightDetails.noFlightSelected")}
        </Text>
      </View>
    );
  }

  const listData = useMemo(() => {
    const segs = data.segments || [];
    const out = [];
    for (let i = 0; i < segs.length; i++) {
      out.push({ type: "seg", seg: segs[i], index: i });
      if (i < segs.length - 1)
        out.push({ type: "layover", prev: segs[i], next: segs[i + 1] });
    }
    return out;
  }, [data.segments]);

  const SegmentRow = ({ seg, index }) => {
    const dep = seg?.departure;
    const arr = seg?.arrival;

    const depISO = dep?.at;
    const arrISO = arr?.at;

    const depTime = timeHHMM(depISO);
    const arrTime = timeHHMM(arrISO);
    const depDate = dateYMD(depISO);
    const arrDate = dateYMD(arrISO);

    const dd = dayDiff(depISO, arrISO);

    return (
      <View
        style={[
          styles.timelineCard,
          { backgroundColor: t.card, borderColor: t.border },
        ]}
      >
        <View style={styles.timelineLeft}>
          <View style={[styles.tDot, { backgroundColor: t.brand }]} />
          <View style={[styles.tLine, { backgroundColor: t.border }]} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.segHeader}>
            <Text
              style={[styles.segTitle, { color: t.text }]}
              numberOfLines={1}
            >
              {seg?.carrierCode || "—"}
              {seg?.number ? ` ${seg.number}` : ""} •{" "}
              {i18nT("flightDetails.segment")} {index + 1}
            </Text>

            <View
              style={[
                styles.badge,
                { borderColor: t.border, backgroundColor: t.bg },
              ]}
            >
              <Text style={[styles.badgeText, { color: t.sub }]}>
                {dep?.iataCode || "—"} → {arr?.iataCode || "—"}
              </Text>
            </View>
          </View>

          <Text style={[styles.segMeta, { color: t.sub }]}>
            {fmtMin(seg?.durationMinutes)}
            {seg?.aircraft ? ` • ${seg.aircraft}` : ""}
            {dd > 0
              ? ` • ${i18nT("flightDetails.arrivesPlus", { count: dd })}`
              : ""}
          </Text>

          <View style={styles.segBody}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.iata, { color: t.text }]}>
                {dep?.iataCode || "—"}
              </Text>
              <Text style={[styles.timeBig, { color: t.text }]}>{depTime}</Text>
              <Text style={[styles.timeSmall, { color: t.sub }]}>
                {depDate}
              </Text>

              {!!dep?.terminal && (
                <View style={styles.metaRow}>
                  <Ionicons name="business-outline" size={14} color={t.sub} />
                  <Text style={[styles.metaText, { color: t.sub }]}>
                    {i18nT("flightDetails.terminal")} {String(dep.terminal)}
                  </Text>
                </View>
              )}

              {!!dep?.gate && (
                <View style={styles.metaRow}>
                  <Ionicons name="log-in-outline" size={14} color={t.sub} />
                  <Text style={[styles.metaText, { color: t.sub }]}>
                    {i18nT("flightDetails.gate")} {String(dep.gate)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.mid}>
              <Ionicons name="airplane-outline" size={18} color={t.sub} />
              <View style={[styles.vLine, { backgroundColor: t.border }]} />
              <Ionicons name="location-outline" size={16} color={t.sub} />
            </View>

            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={[styles.iata, { color: t.text }]}>
                {arr?.iataCode || "—"}
              </Text>
              <Text style={[styles.timeBig, { color: t.text }]}>{arrTime}</Text>
              <Text style={[styles.timeSmall, { color: t.sub }]}>
                {arrDate}
              </Text>

              {!!arr?.terminal && (
                <View style={styles.metaRow}>
                  <Ionicons name="business-outline" size={14} color={t.sub} />
                  <Text style={[styles.metaText, { color: t.sub }]}>
                    {i18nT("flightDetails.terminal")} {String(arr.terminal)}
                  </Text>
                </View>
              )}

              {!!arr?.gate && (
                <View style={styles.metaRow}>
                  <Ionicons name="log-out-outline" size={14} color={t.sub} />
                  <Text style={[styles.metaText, { color: t.sub }]}>
                    {i18nT("flightDetails.gate")} {String(arr.gate)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const LayoverRow = ({ prev, next }) => {
    const mins = layoverMinutes(prev, next);
    if (!Number.isFinite(mins)) return null;

    const city = prev?.arrival?.iataCode || "—";
    const fromTime = timeHHMM(prev?.arrival?.at);
    const toTime = timeHHMM(next?.departure?.at);
    const cls = classifyConnection(mins, i18nT);

    return (
      <View
        style={[
          styles.timelineCard,
          { backgroundColor: t.card, borderColor: t.border },
        ]}
      >
        <View style={styles.timelineLeft}>
          <View style={[styles.tDot2, { backgroundColor: t.border }]} />
          <View style={[styles.tLine, { backgroundColor: t.border }]} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.layoverTop}>
            <View style={styles.layoverTitleRow}>
              <Ionicons name="time-outline" size={16} color={t.sub} />
              <Text style={[styles.layoverTitle, { color: t.text }]}>
                {i18nT("flightDetails.layoverIn")} {city}
              </Text>
            </View>

            {!!cls && (
              <View
                style={[
                  styles.connPill,
                  { borderColor: t.border, backgroundColor: t.bg },
                ]}
              >
                <Text style={[styles.connText, { color: t.sub }]}>
                  {cls.label}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.layoverText, { color: t.sub }]}>
            {fmtMin(mins)}
            {fromTime !== "—" && toTime !== "—"
              ? ` • ${fromTime} → ${toTime}`
              : ""}
          </Text>
        </View>
      </View>
    );
  };

  const Header = () => (
    <View>
      <View
        style={[
          styles.summary,
          { backgroundColor: t.card, borderColor: t.border },
        ]}
      >
        <View style={styles.summaryTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.route, { color: t.text }]} numberOfLines={1}>
              {data.from} → {data.to}
            </Text>

            <Text style={[styles.sub, { color: t.sub }]} numberOfLines={1}>
              {data.airlineCode || "—"}
              {data.airline ? ` • ${data.airline}` : ""}
            </Text>

            {!!data.flightNums?.length && (
              <Text style={[styles.sub2, { color: t.sub }]} numberOfLines={2}>
                <Ionicons name="ticket-outline" size={14} color={t.sub} />{" "}
                {data.flightNums.join(" • ")}
              </Text>
            )}
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.price, { color: t.text }]}>
              {money(data.price, data.currency)}
            </Text>
            <Text style={[styles.sub, { color: t.sub }]}>
              {i18nT("flightDetails.total")}
            </Text>
          </View>
        </View>

        <View style={styles.summaryTimes}>
          <Text style={[styles.timeHuge, { color: t.text }]}>
            {data.depTime}
          </Text>

          <View style={styles.dotLine}>
            <View style={[styles.dot, { backgroundColor: t.sub }]} />
            <View style={[styles.line2, { backgroundColor: t.border }]} />
            <View style={[styles.dot, { backgroundColor: t.sub }]} />
          </View>

          <Text style={[styles.timeHuge, { color: t.text }]}>
            {data.arrTime}
            {data.dayDeltaTrip > 0 ? (
              <Text style={[styles.plusDay, { color: t.sub }]}>
                {" "}
                (+{data.dayDeltaTrip})
              </Text>
            ) : null}
          </Text>
        </View>

        <View style={styles.summaryMetaRow}>
          <View
            style={[
              styles.pill,
              { borderColor: t.border, backgroundColor: t.bg },
            ]}
          >
            <Ionicons name="calendar-outline" size={13} color={t.sub} />
            <Text style={[styles.pillText, { color: t.sub }]}>
              {data.depDate}
              {data.arrDate !== "—" && data.arrDate !== data.depDate
                ? ` → ${data.arrDate}`
                : ""}
            </Text>
          </View>

          <View
            style={[
              styles.pill,
              { borderColor: t.border, backgroundColor: t.card },
            ]}
          >
            <Ionicons name="time-outline" size={13} color={t.sub} />
            <Text style={[styles.pillText, { color: t.sub }]}>
              {fmtMin(data.duration)}
            </Text>
          </View>

          <View
            style={[
              styles.pill,
              { borderColor: t.border, backgroundColor: t.card },
            ]}
          >
            <Ionicons
              name={data.stops === 0 ? "flash-outline" : "git-branch-outline"}
              size={13}
              color={t.sub}
            />
            <Text style={[styles.pillText, { color: t.sub }]}>
              {stopsLabel(data.stops, i18nT)}
              {data.stops > 0 && data.stopCity
                ? ` • ${i18nT("flightDetails.via")} ${data.stopCity}`
                : ""}
            </Text>
          </View>
        </View>

        <View style={styles.quickRow}>
          <Pressable
            onPress={onToggleSave}
            disabled={!canToggleSave}
            style={({ pressed }) => [
              styles.quickBtn,
              {
                borderColor: t.border,
                backgroundColor: t.bg,
                opacity: !canToggleSave ? 0.4 : pressed ? 0.75 : 1,
              },
            ]}
          >
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={18}
              color={saved ? t.brand : t.sub}
            />
            <Text style={[styles.quickText, { color: t.sub }]}>
              {saved ? i18nT("flightDetails.saved") : i18nT("common.save")}
            </Text>
          </Pressable>

          <Pressable
            onPress={onShareFlight}
            style={({ pressed }) => [
              styles.quickBtn,
              {
                borderColor: t.border,
                backgroundColor: t.bg,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Ionicons name="share-outline" size={18} color={t.sub} />
            <Text style={[styles.quickText, { color: t.sub }]}>
              {i18nT("flightDetails.share")}
            </Text>
          </Pressable>
        </View>
      </View>

      <View
        style={[
          styles.breakdown,
          { backgroundColor: t.card, borderColor: t.border },
        ]}
      >
        <Text style={[styles.breakTitle, { color: t.text }]}>
          {i18nT("flightDetails.tripBreakdown")}
        </Text>

        <View style={styles.breakRow}>
          <View
            style={[
              styles.breakItem,
              { backgroundColor: t.bg, borderColor: t.border },
            ]}
          >
            <Ionicons name="time-outline" size={16} color={t.sub} />
            <Text style={[styles.breakLabel, { color: t.sub }]}>
              {i18nT("flightDetails.total")}
            </Text>
            <Text style={[styles.breakValue, { color: t.text }]}>
              {fmtMin(data.duration)}
            </Text>
          </View>

          <View
            style={[
              styles.breakItem,
              { backgroundColor: t.bg, borderColor: t.border },
            ]}
          >
            <Ionicons name="airplane-outline" size={16} color={t.sub} />
            <Text style={[styles.breakLabel, { color: t.sub }]}>
              {i18nT("flightDetails.inAir")}
            </Text>
            <Text style={[styles.breakValue, { color: t.text }]}>
              {fmtMin(data.inAir)}
            </Text>
          </View>

          <View
            style={[
              styles.breakItem,
              { backgroundColor: t.bg, borderColor: t.border },
            ]}
          >
            <Ionicons name="hourglass-outline" size={16} color={t.sub} />
            <Text style={[styles.breakLabel, { color: t.sub }]}>
              {i18nT("flightDetails.layovers")}
            </Text>
            <Text style={[styles.breakValue, { color: t.text }]}>
              {fmtMin(data.layovers)}
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: t.text }]}>
        {i18nT("flightDetails.itinerary")}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>

        <Text style={[styles.title, { color: t.text }]}>
          {i18nT("navigation.flightDetails")}
        </Text>

        <View style={{ flexDirection: "row", gap: 14 }}>
          <Pressable onPress={onShareFlight} hitSlop={10}>
            <Ionicons name="share-outline" size={22} color={t.text} />
          </Pressable>

          <Pressable
            onPress={canToggleSave ? onToggleSave : null}
            disabled={!canToggleSave}
            hitSlop={10}
            style={!canToggleSave ? { opacity: 0.4 } : null}
          >
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={22}
              color={saved ? t.brand : t.text}
            />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={listData}
        keyExtractor={(x, i) =>
          x.type === "seg"
            ? `seg_${x?.seg?.carrierCode || "X"}_${x?.seg?.number || i}_${i}`
            : `lay_${i}`
        }
        ListHeaderComponent={<Header />}
        renderItem={({ item }) => {
          if (item.type === "layover")
            return <LayoverRow prev={item.prev} next={item.next} />;
          return <SegmentRow seg={item.seg} index={item.index} />;
        }}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      />

      <View
        style={[
          styles.sticky,
          { backgroundColor: t.card, borderTopColor: t.border },
        ]}
      >
        <View style={styles.stickyInfo}>
          <Text style={[styles.stickyPrice, { color: t.text }]}>
            {money(data.price, data.currency)}
          </Text>
          <Text style={[styles.stickySub, { color: t.sub }]} numberOfLines={1}>
            {stopsLabel(data.stops, i18nT)}
            {data.stops > 0 && data.stopCity
              ? ` • ${i18nT("flightDetails.via")} ${data.stopCity}`
              : ""}{" "}
            • {fmtMin(data.duration)}
          </Text>
        </View>

        <Pressable
          onPress={onAddToTrip}
          style={({ pressed }) => [
            styles.tripBtn,
            {
              backgroundColor: t.bg,
              borderColor: t.border,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Ionicons name="briefcase-outline" size={18} color={t.text} />
          <Text style={[styles.tripBtnText, { color: t.text }]}>
            {i18nT("flightDetails.addToTrip")}
          </Text>
        </Pressable>

        <Pressable
          onPress={onPrimaryAction}
          style={({ pressed }) => [
            styles.ctaBtn,
            { backgroundColor: t.brand, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
          <Text style={styles.ctaText}>{i18nT("flightDetails.continue")}</Text>
        </Pressable>
      </View>
    </View>
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

  summary: { borderRadius: 16, borderWidth: 1, padding: 14 },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },

  route: { fontSize: 18, fontFamily: "Montserrat_400Regular" },
  price: { fontSize: 18, fontFamily: "Montserrat_400Regular" },
  sub: { marginTop: 4, fontSize: 12, fontFamily: "Montserrat_400Regular" },
  sub2: { marginTop: 6, fontSize: 12, fontFamily: "Montserrat_400Regular" },

  summaryTimes: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeHuge: {
    fontSize: 22,
    fontFamily: "Montserrat_400Regular",
    letterSpacing: 0.3,
  },
  plusDay: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  dotLine: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  line2: { flex: 1, height: 2, borderRadius: 2 },

  summaryMetaRow: {
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
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  quickRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  quickBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quickText: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  breakdown: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  breakTitle: { fontSize: 14, fontFamily: "Montserrat_400Regular" },
  breakRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  breakItem: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: "flex-start",
    gap: 6,
    borderWidth: 1,
  },
  breakLabel: { fontSize: 12, fontFamily: "Montserrat_400Regular" },
  breakValue: { fontSize: 14, fontFamily: "Montserrat_400Regular" },

  sectionTitle: {
    marginTop: 14,
    marginBottom: 10,
    fontFamily: "Montserrat_400Regular",
    fontSize: 15,
    letterSpacing: 0.2,
  },

  timelineCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    gap: 10,
  },

  timelineLeft: { width: 18, alignItems: "center" },
  tDot: { width: 10, height: 10, borderRadius: 6, marginTop: 6 },
  tDot2: { width: 10, height: 10, borderRadius: 6, marginTop: 6 },
  tLine: { width: 2, flexGrow: 1, marginTop: 6, borderRadius: 2 },

  segHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start",
  },
  segTitle: { fontSize: 14, fontFamily: "Montserrat_400Regular", flex: 1 },
  segMeta: { marginTop: 4, fontSize: 12, fontFamily: "Montserrat_400Regular" },

  badge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  segBody: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  iata: { fontSize: 14, fontFamily: "Montserrat_400Regular" },
  timeBig: { marginTop: 4, fontSize: 18, fontFamily: "Montserrat_400Regular" },
  timeSmall: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  mid: { alignItems: "center", justifyContent: "center", gap: 6 },
  vLine: { width: 2, height: 36, borderRadius: 2 },

  layoverTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  layoverTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  layoverTitle: { fontSize: 13, fontFamily: "Montserrat_400Regular" },
  layoverText: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  connPill: {
    borderWidth: 1,
    height: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  connText: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  sticky: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stickyPrice: { fontSize: 18, fontFamily: "Montserrat_400Regular" },
  stickySub: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },

  ctaBtn: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: { color: "#fff", fontFamily: "Montserrat_400Regular" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  metaText: { fontSize: 12, fontFamily: "Montserrat_400Regular" },

  stickyInfo: {
    flex: 1,
    minWidth: 0,
  },

  tripBtn: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  tripBtnText: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
  },
});
