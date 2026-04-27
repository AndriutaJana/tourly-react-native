import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TripsContext = createContext(null);
const TRIPS_STORAGE_KEY = "@app/trips";

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeDateOnly(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function diffDaysInclusive(startDate, endDate) {
  if (!startDate || !endDate) return 0;

  const a = normalizeDateOnly(startDate);
  const b = normalizeDateOnly(endDate);

  if (!a || !b) return 0;

  const ms = b.getTime() - a.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(0, days);
}

function buildDefaultChecklist() {
  return [
    { id: uid("check"), label: "Passport", checked: false },
    { id: uid("check"), label: "Charger", checked: false },
    { id: uid("check"), label: "Tickets", checked: false },
    { id: uid("check"), label: "Reservations", checked: false },
    { id: uid("check"), label: "Clothes", checked: false },
    { id: uid("check"), label: "Medicines", checked: false },
  ];
}

function normalizeStatus(status) {
  const s = String(status || "").toLowerCase();
  if (["want_to_go", "planned", "visited", "skipped"].includes(s)) return s;
  return "want_to_go";
}

function normalizeCategory(raw) {
  const c = String(raw || "")
    .trim()
    .toLowerCase();
  return c || "general";
}

function normalizeTimeString(value) {
  const v = String(value || "").trim();
  if (!v) return "";

  const match = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "";

  const hh = Math.min(23, Math.max(0, Number(match[1])));
  const mm = Math.min(59, Math.max(0, Number(match[2])));

  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function parseTimeToMinutes(value) {
  const time = normalizeTimeString(value);
  if (!time) return null;
  const [hh, mm] = time.split(":").map(Number);
  return hh * 60 + mm;
}

function sortTripItems(items = []) {
  return [...items].sort((a, b) => {
    const dayA = safeNum(a?.plannedDay, 9999);
    const dayB = safeNum(b?.plannedDay, 9999);
    if (dayA !== dayB) return dayA - dayB;

    const orderA = safeNum(a?.sortOrder, 0);
    const orderB = safeNum(b?.sortOrder, 0);
    if (orderA !== orderB) return orderA - orderB;

    const timeA = parseTimeToMinutes(a?.plannedStartTime);
    const timeB = parseTimeToMinutes(b?.plannedStartTime);
    if (timeA != null && timeB != null && timeA !== timeB) return timeA - timeB;
    if (timeA != null && timeB == null) return -1;
    if (timeA == null && timeB != null) return 1;

    const createdA = safeNum(a?.createdAt, 0);
    const createdB = safeNum(b?.createdAt, 0);
    return createdA - createdB;
  });
}

function resequenceItems(items = []) {
  const grouped = new Map();

  items.forEach((item) => {
    const day = safeNum(item?.plannedDay, 1);
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day).push(item);
  });

  const next = [];
  [...grouped.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([, dayItems]) => {
      const sorted = [...dayItems].sort((a, b) => {
        const orderA = safeNum(a?.sortOrder, 0);
        const orderB = safeNum(b?.sortOrder, 0);
        if (orderA !== orderB) return orderA - orderB;

        const timeA = parseTimeToMinutes(a?.plannedStartTime);
        const timeB = parseTimeToMinutes(b?.plannedStartTime);
        if (timeA != null && timeB != null && timeA !== timeB)
          return timeA - timeB;
        if (timeA != null && timeB == null) return -1;
        if (timeA == null && timeB != null) return 1;

        return safeNum(a?.createdAt, 0) - safeNum(b?.createdAt, 0);
      });

      sorted.forEach((item, index) => {
        next.push({
          ...item,
          sortOrder: index + 1,
        });
      });
    });

  return sortTripItems(next);
}

function clampDay(day, daysCount = 1) {
  const n = safeNum(day, 1);
  return Math.max(1, Math.min(Math.max(1, daysCount || 1), n));
}

function createEmptyDays(daysCount) {
  return Array.from({ length: Math.max(1, daysCount || 1) }).map(
    (_, index) => ({
      day: index + 1,
      title: `Day ${index + 1}`,
      items: [],
      estimatedCost: 0,
      actualCost: 0,
    })
  );
}

function normalizeTripItem(raw, tripDaysCount = 1, existingCountForDay = 0) {
  if (!raw) return null;

  const type = String(raw.type || raw.kind || "").toLowerCase();
  const now = Date.now();

  if (type === "flight" || raw?.itineraries || raw?.price?.total != null) {
    const segs = raw?.itineraries?.[0]?.segments || [];
    const first = segs[0];
    const last = segs[segs.length - 1];
    const offerId = String(raw?.id || raw?.offerId || uid("flight"));

    return {
      id: `flight_${offerId}`,
      xid: `flight_${offerId}`,
      type: "flight",
      kind: "flight",
      name:
        raw?.title ||
        `${first?.departure?.iataCode || "—"} → ${
          last?.arrival?.iataCode || "—"
        }`,
      preview: null,
      lat: null,
      lon: null,
      address: null,
      city: raw?.city || null,

      status: normalizeStatus(raw?.status || "planned"),
      category: normalizeCategory(raw?.category || "transport"),
      note: String(raw?.note || "").trim(),

      plannedDay: clampDay(raw?.plannedDay || 1, tripDaysCount),
      plannedStartTime: normalizeTimeString(raw?.plannedStartTime || ""),
      plannedEndTime: normalizeTimeString(raw?.plannedEndTime || ""),

      estimatedDurationMin: safeNum(
        raw?.itineraries?.[0]?.durationMinutes,
        180
      ),
      estimatedCost: safeNum(raw?.price?.total, 0),
      actualCost: safeNum(raw?.actualCost, 0),
      currency: raw?.price?.currency || raw?.currency || "EUR",

      rating: null,
      openingHours: null,

      startAt: first?.departure?.at || null,
      endAt: last?.arrival?.at || null,
      origin: first?.departure?.iataCode || null,
      destination: last?.arrival?.iataCode || null,

      sortOrder: existingCountForDay + 1,
      payload: raw,
      createdAt: now,
      updatedAt: now,
    };
  }

  if (
    type === "hotel" ||
    raw?.priceFrom != null ||
    raw?.hotelId ||
    raw?.stars != null
  ) {
    const hotelId = String(raw?.hotelId || raw?.id || uid("hotel"));

    return {
      id: `hotel_${hotelId}`,
      xid: `hotel_${hotelId}`,
      type: "hotel",
      kind: "hotel",
      name: raw?.name || raw?.title || "Hotel",
      preview:
        raw?.preview ||
        raw?.thumbnail ||
        raw?.imageUrl ||
        raw?.images?.[0] ||
        raw?.media?.[0]?.url ||
        null,
      lat: raw?.lat ?? null,
      lon: raw?.lon ?? null,
      address: raw?.address || null,
      city: raw?.city || null,

      status: normalizeStatus(raw?.status || "planned"),
      category: normalizeCategory(raw?.category || "stay"),
      note: String(raw?.note || "").trim(),

      plannedDay: clampDay(raw?.plannedDay || 1, tripDaysCount),
      plannedStartTime: normalizeTimeString(raw?.plannedStartTime || ""),
      plannedEndTime: normalizeTimeString(raw?.plannedEndTime || ""),

      estimatedDurationMin: safeNum(raw?.estimatedDurationMin, 30),
      estimatedCost: safeNum(
        raw?.estimatedCost ?? raw?.priceFrom ?? raw?.price,
        0
      ),
      actualCost: safeNum(raw?.actualCost, 0),
      currency: raw?.currency || "EUR",

      rating: raw?.rating ?? null,
      stars: raw?.stars ?? null,
      openingHours: null,

      sortOrder: existingCountForDay + 1,
      payload: raw,
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    id: String(raw?.xid || raw?.id || uid("place")),
    xid: String(raw?.xid || raw?.id || uid("place")),
    type: type || "place",
    kind: raw?.kind || type || "place",
    name: raw?.name || raw?.title || "Place",
    preview:
      typeof raw?.preview === "string"
        ? raw.preview
        : raw?.preview?.source || raw?.fallback || null,
    lat: raw?.lat ?? null,
    lon: raw?.lon ?? null,
    address: raw?.address || null,
    city: raw?.city || null,

    status: normalizeStatus(raw?.status || "want_to_go"),
    category: normalizeCategory(raw?.category || raw?.kind || "general"),
    note: String(raw?.note || "").trim(),

    plannedDay: clampDay(raw?.plannedDay || 1, tripDaysCount),
    plannedStartTime: normalizeTimeString(raw?.plannedStartTime || ""),
    plannedEndTime: normalizeTimeString(raw?.plannedEndTime || ""),

    estimatedDurationMin: safeNum(raw?.estimatedDurationMin, 90),
    estimatedCost: safeNum(
      raw?.ticketPrice ?? raw?.price ?? raw?.estimatedCost,
      0
    ),
    actualCost: safeNum(raw?.actualCost, 0),
    currency: raw?.currency || "EUR",

    openingHours: raw?.openingHours ?? null,
    rating: raw?.rating ?? raw?.rate ?? null,

    sortOrder: existingCountForDay + 1,
    payload: raw,
    createdAt: now,
    updatedAt: now,
  };
}

function buildScheduleFromItems(trip) {
  const daysCount = Math.max(1, trip?.daysCount || 1);
  const days = createEmptyDays(daysCount);
  const items = sortTripItems(trip?.items || []);

  items.forEach((item) => {
    const dayIndex = clampDay(item?.plannedDay || 1, daysCount) - 1;
    const targetDay = days[dayIndex];

    targetDay.items.push({
      ...item,
      startTime: item?.plannedStartTime || "",
      endTime: item?.plannedEndTime || "",
    });

    targetDay.estimatedCost += safeNum(item?.estimatedCost, 0);
    targetDay.actualCost += safeNum(item?.actualCost, 0);
  });

  return days;
}

function buildTripOverview(trip) {
  if (!trip) {
    return {
      days: 0,
      places: 0,
      planned: 0,
      unscheduled: 0,
      hotels: 0,
      flights: 0,
      restaurants: 0,
      estimatedCost: 0,
      actualCost: 0,
      currency: "EUR",
    };
  }

  const items = trip.items || [];

  const planned = items.filter((x) => safeNum(x?.plannedDay, 0) > 0).length;
  const unscheduled = items.filter((x) => !safeNum(x?.plannedDay, 0)).length;

  const hotels = items.filter(
    (x) => String(x?.kind).toLowerCase() === "hotel"
  ).length;
  const flights = items.filter(
    (x) => String(x?.kind).toLowerCase() === "flight"
  ).length;
  const restaurants = items.filter(
    (x) => String(x?.kind).toLowerCase() === "restaurant"
  ).length;

  const estimatedItems = items.reduce(
    (sum, item) => sum + safeNum(item?.estimatedCost, 0),
    0
  );

  const daysCount = Math.max(1, trip?.daysCount || 1);

  const estimatedTripBudget =
    safeNum(trip?.budget?.accommodation, 0) +
    safeNum(trip?.budget?.transport, 0) +
    safeNum(trip?.budget?.misc, 0) +
    safeNum(trip?.budget?.foodPerDay, 0) * daysCount;

  const estimatedCost = estimatedItems + estimatedTripBudget;
  const actualCost = safeNum(trip?.budget?.actualTotal, 0);
  return {
    days: safeNum(trip?.daysCount, 0),
    places: items.length,
    planned,
    unscheduled,
    hotels,
    flights,
    restaurants,
    estimatedCost,
    actualCost,
    currency: trip?.budget?.currency || "EUR",
  };
}

export function TripsProvider({ children }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadTrips = async () => {
      try {
        const raw = await AsyncStorage.getItem(TRIPS_STORAGE_KEY);

        if (!mounted) return;

        if (!raw) {
          setTrips([]);
          return;
        }

        const parsed = JSON.parse(raw);
        setTrips(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.log("Failed to load trips:", e);
        setTrips([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadTrips();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips)).catch(
      (e) => {
        console.log("Failed to save trips:", e);
      }
    );
  }, [trips, loading]);

  const addTrip = useCallback(async (data) => {
    const tripId = uid("trip");
    const startDate = data?.startDate || null;
    const endDate = data?.endDate || null;
    const daysCount = diffDaysInclusive(startDate, endDate);

    const nextTrip = {
      id: tripId,
      title: String(data?.title || "").trim(),
      city: String(data?.city || "").trim(),
      startDate,
      endDate,
      daysCount,

      checklist:
        Array.isArray(data?.checklist) && data.checklist.length
          ? data.checklist
          : buildDefaultChecklist(),

      items: [],
      schedule: createEmptyDays(daysCount || 1),

      budget: {
        currency: data?.budget?.currency || data?.currency || "EUR",
        accommodation: safeNum(data?.budget?.accommodation, 0),
        transport: safeNum(data?.budget?.transport, 0),
        misc: safeNum(data?.budget?.misc, 0),
        foodPerDay: safeNum(data?.budget?.foodPerDay, 0),
        actualTotal: safeNum(data?.budget?.actualTotal, 0),
      },

      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setTrips((prev) => [nextTrip, ...prev]);
    return tripId;
  }, []);

  const updateTrip = useCallback(async (tripId, updates) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;

        const next = {
          ...trip,
          ...updates,
          budget: {
            ...trip.budget,
            ...(updates?.budget || {}),
          },
          updatedAt: Date.now(),
        };

        next.daysCount = diffDaysInclusive(next.startDate, next.endDate);

        next.items = (next.items || []).map((item) => ({
          ...item,
          plannedDay: clampDay(item?.plannedDay || 1, next.daysCount || 1),
        }));

        next.items = resequenceItems(next.items);
        next.schedule = buildScheduleFromItems(next);

        return next;
      })
    );
  }, []);

  const deleteTrip = useCallback(async (tripId) => {
    setTrips((prev) => prev.filter((trip) => trip.id !== tripId));
  }, []);

  const getTripById = useCallback(
    (tripId) => trips.find((trip) => trip.id === tripId) || null,
    [trips]
  );

  const addItemToTrip = useCallback(async (tripId, rawItem) => {
    let insertedItem = null;

    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;

        const tripDaysCount = Math.max(1, trip.daysCount || 1);
        const plannedDay = clampDay(rawItem?.plannedDay || 1, tripDaysCount);

        const exists = (trip.items || []).some(
          (x) =>
            String(x.xid) === String(rawItem?.xid || rawItem?.id) ||
            String(x.id) === String(rawItem?.xid || rawItem?.id)
        );

        if (exists) return trip;

        const existingCountForDay = (trip.items || []).filter(
          (x) => clampDay(x?.plannedDay || 1, tripDaysCount) === plannedDay
        ).length;

        const item = normalizeTripItem(
          { ...rawItem, plannedDay },
          tripDaysCount,
          existingCountForDay
        );

        insertedItem = item;

        const nextItems = resequenceItems([...(trip.items || []), item]);

        const nextTrip = {
          ...trip,
          items: nextItems,
          updatedAt: Date.now(),
        };

        nextTrip.schedule = buildScheduleFromItems(nextTrip);
        return nextTrip;
      })
    );

    return insertedItem;
  }, []);

  const updateTripItem = useCallback(async (tripId, itemId, updates) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;

        const tripDaysCount = Math.max(1, trip.daysCount || 1);

        const nextItems = (trip.items || []).map((item) => {
          const isTarget =
            String(item.id) === String(itemId) ||
            String(item.xid) === String(itemId);

          if (!isTarget) return item;

          return {
            ...item,
            ...updates,
            status:
              updates?.status != null
                ? normalizeStatus(updates.status)
                : item.status,
            category:
              updates?.category != null
                ? normalizeCategory(updates.category)
                : item.category,
            plannedStartTime:
              updates?.plannedStartTime != null
                ? normalizeTimeString(updates.plannedStartTime)
                : item.plannedStartTime,
            plannedEndTime:
              updates?.plannedEndTime != null
                ? normalizeTimeString(updates.plannedEndTime)
                : item.plannedEndTime,
            plannedDay:
              updates?.plannedDay != null
                ? clampDay(updates.plannedDay, tripDaysCount)
                : clampDay(item?.plannedDay || 1, tripDaysCount),
            estimatedCost:
              updates?.estimatedCost != null
                ? safeNum(updates.estimatedCost, 0)
                : safeNum(item?.estimatedCost, 0),
            actualCost:
              updates?.actualCost != null
                ? safeNum(updates.actualCost, 0)
                : safeNum(item?.actualCost, 0),
            estimatedDurationMin:
              updates?.estimatedDurationMin != null
                ? safeNum(updates.estimatedDurationMin, 0)
                : safeNum(item?.estimatedDurationMin, 0),
            note:
              updates?.note != null
                ? String(updates.note).trim()
                : String(item?.note || "").trim(),
            updatedAt: Date.now(),
          };
        });

        const resequenced = resequenceItems(nextItems);

        const nextTrip = {
          ...trip,
          items: resequenced,
          updatedAt: Date.now(),
        };

        nextTrip.schedule = buildScheduleFromItems(nextTrip);
        return nextTrip;
      })
    );
  }, []);

  const removePlaceFromTrip = useCallback(async (tripId, itemId) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;

        const nextItems = resequenceItems(
          (trip.items || []).filter(
            (item) =>
              String(item.id) !== String(itemId) &&
              String(item.xid) !== String(itemId)
          )
        );

        const nextTrip = {
          ...trip,
          items: nextItems,
          updatedAt: Date.now(),
        };

        nextTrip.schedule = buildScheduleFromItems(nextTrip);
        return nextTrip;
      })
    );
  }, []);

  const moveTripItemToAnotherDay = useCallback(
    async (tripId, itemId, targetDay) => {
      await updateTripItem(tripId, itemId, {
        plannedDay: targetDay,
      });
    },
    [updateTripItem]
  );

  const changeTripItemStatus = useCallback(
    async (tripId, itemId, status) => {
      await updateTripItem(tripId, itemId, { status });
    },
    [updateTripItem]
  );

  const moveTripItemUp = useCallback(async (tripId, itemId) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;

        const items = sortTripItems(trip.items || []);
        const idx = items.findIndex(
          (x) =>
            String(x.id) === String(itemId) || String(x.xid) === String(itemId)
        );

        if (idx <= 0) return trip;

        const current = items[idx];
        const prevItem = items[idx - 1];

        if (
          safeNum(current?.plannedDay, 1) !== safeNum(prevItem?.plannedDay, 1)
        ) {
          return trip;
        }

        const swapped = items.map((item) => {
          const isCurrent =
            String(item.id) === String(current.id) ||
            String(item.xid) === String(current.xid);

          const isPrev =
            String(item.id) === String(prevItem.id) ||
            String(item.xid) === String(prevItem.xid);

          if (isCurrent) {
            return {
              ...item,
              sortOrder: safeNum(prevItem.sortOrder, 0),
              updatedAt: Date.now(),
            };
          }

          if (isPrev) {
            return {
              ...item,
              sortOrder: safeNum(current.sortOrder, 0),
              updatedAt: Date.now(),
            };
          }

          return item;
        });

        const nextItems = resequenceItems(swapped);

        const nextTrip = {
          ...trip,
          items: nextItems,
          updatedAt: Date.now(),
        };

        nextTrip.schedule = buildScheduleFromItems(nextTrip);
        return nextTrip;
      })
    );
  }, []);

  const moveTripItemDown = useCallback(async (tripId, itemId) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;

        const items = sortTripItems(trip.items || []);
        const idx = items.findIndex(
          (x) =>
            String(x.id) === String(itemId) || String(x.xid) === String(itemId)
        );

        if (idx < 0 || idx >= items.length - 1) return trip;

        const current = items[idx];
        const nextItemRef = items[idx + 1];

        if (
          safeNum(current?.plannedDay, 1) !==
          safeNum(nextItemRef?.plannedDay, 1)
        ) {
          return trip;
        }

        const swapped = items.map((item) => {
          const isCurrent =
            String(item.id) === String(current.id) ||
            String(item.xid) === String(current.xid);

          const isNext =
            String(item.id) === String(nextItemRef.id) ||
            String(item.xid) === String(nextItemRef.xid);

          if (isCurrent) {
            return {
              ...item,
              sortOrder: safeNum(nextItemRef.sortOrder, 0),
              updatedAt: Date.now(),
            };
          }

          if (isNext) {
            return {
              ...item,
              sortOrder: safeNum(current.sortOrder, 0),
              updatedAt: Date.now(),
            };
          }

          return item;
        });

        const nextItems = resequenceItems(swapped);

        const nextTrip = {
          ...trip,
          items: nextItems,
          updatedAt: Date.now(),
        };

        nextTrip.schedule = buildScheduleFromItems(nextTrip);
        return nextTrip;
      })
    );
  }, []);

  const replaceTripChecklist = useCallback(async (tripId, checklist) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;

        return {
          ...trip,
          checklist: Array.isArray(checklist) ? checklist : trip.checklist,
          updatedAt: Date.now(),
        };
      })
    );
  }, []);

  const addChecklistItem = useCallback(async (tripId, label) => {
    const text = String(label || "").trim();
    if (!text) return;

    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;

        return {
          ...trip,
          checklist: [
            ...(trip.checklist || []),
            {
              id: uid("check"),
              label: text,
              checked: false,
            },
          ],
          updatedAt: Date.now(),
        };
      })
    );
  }, []);

  const toggleChecklistItem = useCallback(async (tripId, checklistItemId) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;

        return {
          ...trip,
          checklist: (trip.checklist || []).map((item) =>
            item.id === checklistItemId
              ? { ...item, checked: !item.checked }
              : item
          ),
          updatedAt: Date.now(),
        };
      })
    );
  }, []);

  const removeChecklistItem = useCallback(async (tripId, checklistItemId) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;

        return {
          ...trip,
          checklist: (trip.checklist || []).filter(
            (item) => item.id !== checklistItemId
          ),
          updatedAt: Date.now(),
        };
      })
    );
  }, []);

  const getTripOverview = useCallback((trip) => {
    return buildTripOverview(trip);
  }, []);

  const getTripItemsByDay = useCallback((trip) => {
    if (!trip) return [];
    return buildScheduleFromItems(trip);
  }, []);

  const generateTripSchedule = useCallback(async (tripId) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;

        const items = sortTripItems(trip.items || []);
        if (!items.length) return trip;

        const daysCount = Math.max(1, trip.daysCount || 1);
        const perDay = Math.max(1, Math.ceil(items.length / daysCount));

        const autoItems = items.map((item, index) => {
          const plannedDay = Math.min(
            daysCount,
            Math.floor(index / perDay) + 1
          );

          const slotInDay = index % perDay;
          const startMinutes = 9 * 60 + slotInDay * 120;
          const endMinutes = startMinutes + 90;

          const startHour = Math.floor(startMinutes / 60);
          const startMin = startMinutes % 60;
          const endHour = Math.floor(endMinutes / 60);
          const endMin = endMinutes % 60;

          return {
            ...item,
            plannedDay,
            plannedStartTime: `${String(startHour).padStart(2, "0")}:${String(
              startMin
            ).padStart(2, "0")}`,
            plannedEndTime: `${String(endHour).padStart(2, "0")}:${String(
              endMin
            ).padStart(2, "0")}`,
            status:
              item?.status && item.status !== "want_to_go"
                ? item.status
                : "planned",
            updatedAt: Date.now(),
          };
        });

        const nextItems = resequenceItems(autoItems);

        const nextTrip = {
          ...trip,
          items: nextItems,
          updatedAt: Date.now(),
        };

        nextTrip.schedule = buildScheduleFromItems(nextTrip);
        return nextTrip;
      })
    );
  }, []);

  const getShareTripText = useCallback(
    (tripId) => {
      const trip = trips.find((x) => x.id === tripId);
      if (!trip) return "";

      const overview = buildTripOverview(trip);
      const groupedDays = buildScheduleFromItems(trip);

      const lines = [
        `${trip.title || "Trip"}`,
        [
          trip.city,
          trip.startDate && trip.endDate
            ? `${trip.startDate} → ${trip.endDate}`
            : null,
        ]
          .filter(Boolean)
          .join(" • "),
        "",
        `Days: ${overview.days}`,
        `Places: ${overview.places}`,
        `Estimated: ${Number(overview.estimatedCost || 0).toFixed(0)} ${
          overview.currency
        }`,
        "",
      ];

      groupedDays.forEach((day) => {
        lines.push(`${day.title}`);
        if (!day.items.length) {
          lines.push("- No places planned");
        } else {
          day.items.forEach((item) => {
            const timeLabel =
              item?.plannedStartTime && item?.plannedEndTime
                ? `${item.plannedStartTime}-${item.plannedEndTime} `
                : "";
            lines.push(`- ${timeLabel}${item.name}`);
          });
        }
        lines.push("");
      });

      return lines.join("\n").trim();
    },
    [trips]
  );

  const value = useMemo(
    () => ({
      trips,
      setTrips,
      loading,
      setLoading,

      addTrip,
      updateTrip,
      deleteTrip,
      getTripById,

      addItemToTrip,
      addPlaceToTrip: addItemToTrip,
      updateTripItem,
      removePlaceFromTrip,

      moveTripItemToAnotherDay,
      moveTripItemUp,
      moveTripItemDown,
      changeTripItemStatus,

      replaceTripChecklist,
      addChecklistItem,
      toggleChecklistItem,
      removeChecklistItem,

      getTripOverview,
      getTripItemsByDay,
      generateTripSchedule,
      getShareTripText,
    }),
    [
      trips,
      loading,
      addTrip,
      updateTrip,
      deleteTrip,
      getTripById,
      addItemToTrip,
      updateTripItem,
      removePlaceFromTrip,
      moveTripItemToAnotherDay,
      moveTripItemUp,
      moveTripItemDown,
      changeTripItemStatus,
      replaceTripChecklist,
      addChecklistItem,
      toggleChecklistItem,
      removeChecklistItem,
      getTripOverview,
      getTripItemsByDay,
      generateTripSchedule,
      getShareTripText,
    ]
  );

  return (
    <TripsContext.Provider value={value}>{children}</TripsContext.Provider>
  );
}

export function useTrips() {
  const ctx = useContext(TripsContext);
  if (!ctx) {
    throw new Error("useTrips must be used inside TripsProvider");
  }
  return ctx;
}
