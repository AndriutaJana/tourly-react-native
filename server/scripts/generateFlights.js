const fs = require("fs");
const path = require("path");

// Reads euCities.json
const citiesPath = path.join(__dirname, "..", "data", "euCities.json");
const outPath = path.join(__dirname, "..", "data", "flights.json");
const cities = JSON.parse(fs.readFileSync(citiesPath, "utf8"));

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function pick(rnd, arr) {
  return arr[Math.floor(rnd() * arr.length)];
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYMD(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDaysDate(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

// ---------- Distance / duration ----------
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ISO time: YYYY-MM-DDTHH:mm:00 (local)
function makeISO(dateYmd, hh, mm) {
  return `${dateYmd}T${pad2(hh)}:${pad2(mm)}:00`;
}

function addMinutesISO(iso, mins) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + mins);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
    d.getDate()
  )}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;
}

const AIRLINES = [
  { code: "W6", name: "Wizz Air" },
  { code: "FR", name: "Ryanair" },
  { code: "LH", name: "Lufthansa" },
  { code: "TK", name: "Turkish Airlines" },
  { code: "LO", name: "LOT" },
  { code: "AF", name: "Air France" },
  { code: "BA", name: "British Airways" },
  { code: "AZ", name: "ITA Airways" },
];

const AIRCRAFT = ["A320", "A321", "B737", "B738", "E190", "A220"];

function genTerminal(rnd) {
  return String(1 + Math.floor(rnd() * 3));
}

function genGate(rnd) {
  // ex: A12, B4, C19
  const letter = ["A", "B", "C", "D"][Math.floor(rnd() * 4)];
  const num = 1 + Math.floor(rnd() * 25);
  return `${letter}${num}`;
}

const DAYS_AHEAD = 90; // next 30 days
const OFFERS_PER_DAY_PER_ROUTE = 3; // 3 offers / day / route
const CURRENCY = "EUR";

const START_DATE_YMD = "2026-02-10";
const START_DATE = new Date(`${START_DATE_YMD}T12:00:00`);

if (Number.isNaN(START_DATE.getTime())) {
  throw new Error("Invalid START_DATE_YMD in generateFlights.js");
}

// Generate a segment (direct)
function genDirectSegment({
  rnd,
  origin,
  dest,
  dateYmd,
  airline,
  forcedDepAt,
}) {
  const km = haversineKm(origin.lat, origin.lon, dest.lat, dest.lon);

  // Rough duration: 750km/h + overhead
  const cruise = (km / 750) * 60;
  const durationMin = clamp(Math.round(cruise + 35 + rnd() * 25), 55, 320);

  // Random departure: 06:00 - 21:50
  const depH = 6 + Math.floor(rnd() * 16);
  const depM = [0, 10, 20, 30, 40, 50][Math.floor(rnd() * 6)];

  const depAt = forcedDepAt || makeISO(dateYmd, depH, depM);
  const arrAt = addMinutesISO(depAt, durationMin);

  const flightNumber = 100 + Math.floor(rnd() * 899);

  const aircraft = pick(rnd, AIRCRAFT);

  return {
    departure: {
      iataCode: origin.id,
      at: depAt,
      terminal: genTerminal(rnd),
      gate: genGate(rnd),
    },
    arrival: {
      iataCode: dest.id,
      at: arrAt,
      terminal: genTerminal(rnd),
      gate: genGate(rnd),
    },
    carrierCode: airline.code,
    number: String(flightNumber),
    durationMinutes: durationMin,
    aircraft,
  };
}

// Generate itinerary (direct or 1 stop)
function genItinerary({ rnd, origin, dest, dateYmd }) {
  const airline = pick(rnd, AIRLINES);
  const hasStop = rnd() < 0.25; // 25% with stop

  if (!hasStop) {
    const seg = genDirectSegment({ rnd, origin, dest, dateYmd, airline });
    return {
      airline,
      segments: [seg],
      totalDurationMinutes: seg.durationMinutes,
      stops: 0,
    };
  }

  // pick hub
  const hubs = cities.filter((c) => c.id !== origin.id && c.id !== dest.id);
  const hub = pick(rnd, hubs);

  const seg1 = genDirectSegment({ rnd, origin, dest: hub, dateYmd, airline });

  const layoverMin = 50 + Math.floor(rnd() * 130); // 50..180
  const seg2DepAt = addMinutesISO(seg1.arrival.at, layoverMin);

  const seg2 = genDirectSegment({
    rnd,
    origin: hub,
    dest,
    dateYmd,
    airline,
    forcedDepAt: seg2DepAt,
  });

  const total = seg1.durationMinutes + layoverMin + seg2.durationMinutes;

  return {
    airline,
    segments: [seg1, seg2],
    totalDurationMinutes: total,
    stops: 1,
  };
}

function genPrice({ rnd, itinerary }) {
  const base = 35 + itinerary.totalDurationMinutes * 0.55;
  const stopFee = itinerary.stops ? 12 : 0;
  const noise = rnd() * 40;
  const total = Math.round((base + stopFee + noise) / 5) * 5;
  return { total, currency: CURRENCY };
}

function genOffer({ origin, dest, dateYmd, indexInDay }) {
  const seed = hashStr(
    `offer_${origin.id}_${dest.id}_${dateYmd}_${indexInDay}`
  );
  const rnd = mulberry32(seed);

  const itin = genItinerary({ rnd, origin, dest, dateYmd });
  const price = genPrice({ rnd, itinerary: itin });

  return {
    id: `${origin.id}_${dest.id}_${dateYmd}_${indexInDay}`,
    origin: origin.id,
    destination: dest.id,
    departureDate: dateYmd,

    price: {
      total: String(price.total),
      currency: price.currency,
    },

    validatingAirlineCodes: [itin.airline.code],
    airlineName: itin.airline.name,

    itineraries: [
      {
        durationMinutes: itin.totalDurationMinutes,
        segments: itin.segments.map((s) => ({
          departure: s.departure,
          arrival: s.arrival,
          carrierCode: s.carrierCode,
          number: s.number,
          durationMinutes: s.durationMinutes,
          aircraft: s.aircraft,
        })),
      },
    ],

    stops: itin.stops,
    updatedAt: new Date().toISOString(),
  };
}

// ---------- GEN (ALL ORIGIN x ALL DESTINATION) ----------
const base = new Date(START_DATE);
base.setHours(12, 0, 0, 0);

const all = [];

for (const origin of cities) {
  for (const dest of cities) {
    if (dest.id === origin.id) continue;

    for (let d = 0; d < DAYS_AHEAD; d++) {
      const dateYmd = toYMD(addDaysDate(base, d));

      for (let k = 0; k < OFFERS_PER_DAY_PER_ROUTE; k++) {
        all.push(genOffer({ origin, dest, dateYmd, indexInDay: k + 1 }));
      }
    }
  }
}

fs.writeFileSync(outPath, JSON.stringify(all, null, 2), "utf8");
console.log(
  `✅ Generated ${all.length} flights (${START_DATE_YMD} + ${DAYS_AHEAD} days) -> ${outPath}`
);
