import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  getWishlist,
  upsertWishlistItem,
  deleteWishlistItem,
  clearWishlist as clearWishlistReq,
} from "../api/wishlistBackendApi";

import { useAuth } from "./AuthContext";

const WishlistContext = createContext(null);

function safeTrimString(v) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}
function safeStr(v) {
  return v === undefined || v === null ? null : String(v);
}

function pickPreview(input) {
  return (
    safeTrimString(input?.preview) ||
    safeTrimString(input?.payload?.imageUrl) ||
    safeTrimString(input?.payload?.image) ||
    safeTrimString(input?.payload?.thumbnail) ||
    safeTrimString(input?.payload?.images?.[0]) ||
    safeTrimString(input?.payload?.media?.[0]?.url) ||
    null
  );
}

function formatMoney(amount, currency) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  const rounded = Math.round(n);
  return currency ? `${rounded} ${currency}` : String(rounded);
}

function timeHHMM(iso) {
  if (!iso || typeof iso !== "string") return "";
  return iso.slice(11, 16);
}
function dateYMD(iso) {
  if (!iso || typeof iso !== "string") return "";
  return iso.slice(0, 10);
}

function getOfferFromAny(raw) {
  const p = raw?.payload ?? null;
  return (
    raw?.offer || p?.offer || p?.data?.offer || p?.data || p?.flightOffer || p
  );
}

function flightMetaFromOffer(offer) {
  const segs = offer?.itineraries?.[0]?.segments || [];
  const first = segs[0];
  const last = segs[segs.length - 1];

  const from = first?.departure?.iataCode || "—";
  const to = last?.arrival?.iataCode || "—";

  const depISO = first?.departure?.at || "";
  const arrISO = last?.arrival?.at || "";

  const date = dateYMD(depISO) || "—";
  const dep = timeHHMM(depISO) || "—";
  const arr = timeHHMM(arrISO) || "—";

  const airline =
    offer?.airlineName || offer?.validatingAirlineCodes?.[0] || "";

  const stops = Math.max(0, segs.length - 1);
  const stopsLabel =
    stops === 0 ? "Direct" : stops === 1 ? "1 stop" : `${stops} stops`;

  const dur = offer?.itineraries?.[0]?.durationMinutes;
  const durationText = Number.isFinite(Number(dur))
    ? `${Math.floor(dur / 60)}h ${String(dur % 60).padStart(2, "0")}m`
    : "";

  const priceText = formatMoney(offer?.price?.total, offer?.price?.currency);

  return {
    route: `${from} → ${to}`,
    date,
    timeRange: `${dep}–${arr}`,
    airline,
    stopsLabel,
    durationText,
    priceText,
  };
}

export function WishlistProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, ready } = useAuth();

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const idsSet = useMemo(
    () => new Set((items || []).map((x) => String(x?.xid ?? ""))),
    [items]
  );

  const isSaved = useCallback(
    (xid) => (xid ? idsSet.has(String(xid)) : false),
    [idsSet]
  );

  const normalizeItem = useCallback((input) => {
    const raw = input && typeof input === "object" ? input : {};

    // detect kind
    let kind = safeTrimString(raw?.kind);
    if (!kind) {
      const offer = getOfferFromAny(raw);
      const hasFlight = !!offer?.itineraries?.[0]?.segments?.length;
      const hasHotel =
        raw?.hotelId ||
        raw?.payload?.hotelId ||
        raw?.payload?.hotel_id ||
        raw?.payload?.id;

      if (hasFlight) kind = "flight";
      else if (hasHotel) kind = "hotel";
      else kind = "unknown";
    }

    const payload = raw?.payload ?? null;

    let xid = safeTrimString(raw?.xid) || "";
    if (!xid) {
      if (kind === "hotel") {
        const hid =
          raw?.hotelId || payload?.hotelId || payload?.id || payload?.hotel_id;
        if (hid != null) xid = `hotel_${String(hid)}`;
      } else if (kind === "flight") {
        const offer = getOfferFromAny(raw);
        const fid = offer?.id || payload?.id;
        if (fid) xid = `flight_${String(fid)}`;
      }
    }

    if (kind === "flight") {
      const offer = getOfferFromAny(raw);
      const meta = offer ? flightMetaFromOffer(offer) : null;

      const title = safeTrimString(raw?.title) || meta?.route || "Saved flight";

      const subtitle =
        safeTrimString(raw?.subtitle) ||
        [
          meta?.date,
          meta?.timeRange,
          meta?.airline,
          meta?.stopsLabel,
          meta?.durationText,
        ]
          .filter(Boolean)
          .join(" • ");

      const offerFinal = offer || payload;

      return {
        xid,
        kind,
        title,
        subtitle,
        preview: null,
        hotelId: null,
        payload: offerFinal,
        rating: null,
        priceFrom: null,
        currency: null,
        createdAt: raw?.createdAt || raw?.created_at || null,
      };
    }

    // hotel / rest
    const hotelId =
      safeStr(raw?.hotelId) ||
      safeStr(payload?.hotelId) ||
      safeStr(payload?.id) ||
      safeStr(payload?.hotel_id) ||
      null;

    const rating = raw?.rating ?? payload?.rating ?? payload?.stars ?? null;
    const priceFrom =
      raw?.priceFrom ??
      payload?.priceFrom ??
      payload?.price_from ??
      payload?.minPrice ??
      payload?.min_price ??
      null;
    const currency =
      raw?.currency ?? payload?.currency ?? payload?.priceCurrency ?? null;

    const preview = kind === "flight" ? null : pickPreview(raw);

    let title =
      safeTrimString(raw?.title) ||
      safeTrimString(raw?.name) ||
      safeTrimString(payload?.name) ||
      safeTrimString(payload?.hotelName) ||
      null;

    let subtitle =
      safeTrimString(raw?.subtitle) ||
      safeTrimString(raw?.city) ||
      safeTrimString(payload?.city) ||
      null;

    if (kind === "hotel") {
      if (!title) title = "Hotel";
      if (!subtitle) {
        const city = safeTrimString(payload?.city) || safeTrimString(raw?.city);
        const country =
          safeTrimString(payload?.country) || safeTrimString(raw?.country);
        subtitle = [city, country].filter(Boolean).join(", ") || null;
      }
    }

    if (!title) title = "Saved item";

    return {
      xid,
      kind,
      title,
      subtitle,
      preview,
      hotelId,
      payload,
      rating,
      priceFrom,
      currency,
      createdAt: raw?.createdAt || raw?.created_at || null,
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getWishlist();
      const list = Array.isArray(res?.items) ? res.items : [];
      const normalized = list.map(normalizeItem).filter((x) => x?.xid);

      normalized.sort((a, b) => {
        const da = Date.parse(a?.createdAt || "") || 0;
        const db = Date.parse(b?.createdAt || "") || 0;
        return db - da;
      });

      setItems(normalized);
    } catch (e) {
      console.log("wishlist refresh error:", e?.message);
    } finally {
      setLoading(false);
    }
  }, [normalizeItem]);

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    refresh();
  }, [ready, user, refresh]);

  const add = useCallback(
    async (item) => {
      const normalized = normalizeItem(item);
      if (!normalized.xid) throw new Error("xid missing");

      setItems((prev) => {
        const p = Array.isArray(prev) ? prev : [];
        const exists = p.some((x) => String(x?.xid) === String(normalized.xid));
        if (exists) return p;
        return [{ ...normalized, createdAt: new Date().toISOString() }, ...p];
      });

      try {
        const res = await upsertWishlistItem({
          xid: normalized.xid,
          kind: normalized.kind,
          title: normalized.title,
          subtitle: normalized.subtitle,
          preview: normalized.preview,
          hotelId: normalized.hotelId,
          rating: normalized.rating,
          priceFrom: normalized.priceFrom,
          currency: normalized.currency,
          payload: normalized.payload, // flight payload = offer direct
        });

        const savedItemRaw = res?.item;
        if (savedItemRaw?.xid) {
          const savedItem = normalizeItem(savedItemRaw);
          setItems((prev) => {
            const p = Array.isArray(prev) ? prev : [];
            const next = p.filter(
              (x) => String(x?.xid) !== String(savedItem.xid)
            );
            return [savedItem, ...next];
          });
        } else {
          await refresh();
        }
      } catch (e) {
        setItems((prev) =>
          (Array.isArray(prev) ? prev : []).filter(
            (x) => String(x?.xid) !== String(normalized.xid)
          )
        );
        throw e;
      }
    },
    [normalizeItem, refresh]
  );

  const remove = useCallback(async (xid) => {
    const key = safeTrimString(xid);
    if (!key) return;

    const snapshot = itemsRef.current;

    setItems((prev) =>
      (Array.isArray(prev) ? prev : []).filter(
        (x) => String(x?.xid) !== String(key)
      )
    );

    try {
      await deleteWishlistItem(String(key));
    } catch (e) {
      setItems(snapshot);
      throw e;
    }
  }, []);

  const clear = useCallback(async () => {
    const snapshot = itemsRef.current;
    setItems([]);
    try {
      await clearWishlistReq();
    } catch (e) {
      setItems(snapshot);
      throw e;
    }
  }, []);

  const value = useMemo(
    () => ({ items, loading, refresh, add, remove, clear, isSaved }),
    [items, loading, refresh, add, remove, clear, isSaved]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
