const router = require("express").Router();
const fs = require("fs");
const path = require("path");

const PLACE_BOOKINGS_PATH = path.join(
  __dirname,
  "..",
  "data",
  "place_bookings.json"
);

const GEO_KEY = process.env.GEOAPIFY_API_KEY;
const GEO_PLACES_BASE = "https://api.geoapify.com/v2/places";
const GEO_DETAILS_BASE = "https://api.geoapify.com/v2/place-details";

function requireKey(res) {
  if (!GEO_KEY) {
    res.status(500).json({ error: "Missing GEOAPIFY_API_KEY" });
    return false;
  }
  return true;
}

function readPlaceBookings() {
  try {
    return JSON.parse(fs.readFileSync(PLACE_BOOKINGS_PATH, "utf8"));
  } catch {
    return [];
  }
}
function writePlaceBookings(b) {
  fs.writeFileSync(PLACE_BOOKINGS_PATH, JSON.stringify(b, null, 2), "utf8");
}

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
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function genConfirmationCode(placeId, date, time) {
  // unique per booking
  const seed = hashStr(
    `${placeId}|${date}|${time}|${Date.now()}|${Math.random()}`
  );
  return `BK-${seed.toString(16).slice(0, 8).toUpperCase()}`;
}

function genPlaceMetaDeterministic(placeId, kind = "place") {
  const seed = hashStr(String(placeId || "unknown"));
  const rnd = mulberry32(seed);

  const rating = Math.round((3.6 + rnd() * 1.3) * 10) / 10;
  const reviewsCount = 20 + Math.floor(rnd() * 4180);

  let ticketPrice = null;
  if (kind === "museum") ticketPrice = 8 + Math.floor(rnd() * 20);
  else if (kind === "attraction") ticketPrice = 12 + Math.floor(rnd() * 35);
  else if (kind === "park")
    ticketPrice = rnd() < 0.7 ? 0 : 3 + Math.floor(rnd() * 8);
  else ticketPrice = rnd() < 0.6 ? 0 : 5 + Math.floor(rnd() * 12); // place default

  const patterns = [
    "Mon-Sun 09:00-18:00",
    "Mon-Fri 10:00-19:00, Sat-Sun 09:00-17:00",
    "Tue-Sun 09:30-18:30 (Mon closed)",
    "Daily 08:00-20:00",
  ];
  const openingHours = patterns[Math.floor(rnd() * patterns.length)];

  const slots = [];
  const hours = ["09:00", "11:00", "13:00", "15:00", "17:00"];
  for (let d = 0; d < 7; d++) {
    const daySlots = hours
      .filter(() => rnd() > 0.15)
      .map((h) => ({ time: h, remaining: 5 + Math.floor(rnd() * 40) }));
    slots.push({ dayOffset: d, slots: daySlots });
  }

  return {
    rating,
    reviewsCount,
    ticketPrice,
    openingHours,
    bookingSlots: slots,
  };
}

function hashToIndex(str, max = 10) {
  if (!str) return 1;
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return (h % max) + 1;
}

function placeholderUrl(req, kind, placeId = "") {
  const safeKind = [
    "attraction",
    "museum",
    "park",
    "restaurant",
    "hotel",
    "place",
  ].includes(kind)
    ? kind
    : "place";
  const n = hashToIndex(placeId, 10);
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/static/placeholders/${safeKind}/${safeKind}${n}.jpg`;
}

function kindToGeoCategories(kind) {
  switch (kind) {
    case "restaurant":
      return [
        "catering.restaurant",
        "catering.cafe",
        "catering.fast_food",
        "catering.pub",
        "catering.bar",
      ].join(",");
    case "museum":
      return "entertainment.museum";
    case "park":
      return [
        "leisure.park",
        "leisure.park.garden",
        "leisure.park.nature_reserve",
        "national_park",
        "natural",
      ].join(",");
    case "attraction":
      return [
        "tourism.attraction",
        "tourism.sights",
        "tourism",
        "entertainment",
      ].join(",");
    case "all":
      return [
        "tourism.attraction",
        "tourism.sights",
        "entertainment.museum",
        "leisure.park",
        "leisure.park.garden",
        "leisure.park.nature_reserve",
        "natural",
        "national_park",
        "catering.restaurant",
        "catering.cafe",
        "catering.fast_food",
        "catering.pub",
        "catering.bar",
      ].join(",");
    default:
      return "tourism";
  }
}

function detectKindFromCategories(categories = []) {
  const arr = Array.isArray(categories) ? categories : [];
  const has = (prefix) =>
    arr.some((c) => typeof c === "string" && c.startsWith(prefix));

  if (
    has("catering.restaurant") ||
    has("catering.cafe") ||
    has("catering.fast_food") ||
    has("catering.bar") ||
    has("catering.pub")
  ) {
    return "restaurant";
  }

  if (
    has("accommodation.hotel") ||
    has("accommodation") ||
    has("tourism.hotel")
  ) {
    return "hotel";
  }

  if (has("entertainment.museum")) return "museum";

  if (has("leisure.park") || has("natural") || has("national_park")) {
    return "park";
  }

  if (has("tourism.attraction") || has("tourism.sights") || has("tourism")) {
    return "attraction";
  }

  return "place";
}

async function fetchJson(url, label = "Geoapify") {
  const r = await fetch(url);
  const text = await r.text();

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!r.ok) {
    console.error(`${label} status:`, r.status);
    console.error(`${label} body first 200:`, text.slice(0, 200));
    const msg =
      data?.message || data?.error || data?.raw || `Geoapify error ${r.status}`;
    const err = new Error(msg);
    err.status = r.status;
    err.url = url;
    throw err;
  }
  return data;
}

function buildNearbyUrl({ lat, lon, radius, categories }) {
  return (
    `${GEO_PLACES_BASE}` +
    `?apiKey=${encodeURIComponent(GEO_KEY)}` +
    `&categories=${encodeURIComponent(categories)}` +
    `&filter=${encodeURIComponent(`circle:${lon},${lat},${radius}`)}` +
    `&bias=${encodeURIComponent(`proximity:${lon},${lat}`)}` +
    `&limit=50`
  );
}

function buildDetailsUrl(placeId) {
  return (
    `${GEO_DETAILS_BASE}` +
    `?apiKey=${encodeURIComponent(GEO_KEY)}` +
    `&id=${encodeURIComponent(placeId)}`
  );
}

function staticMapPreviewUrl({ lat, lon, kind }) {
  const base = "https://maps.geoapify.com/v1/staticmap";
  const iconByKind = {
    restaurant: "utensils",
    museum: "landmark",
    park: "tree",
    attraction: "star",
    place: "map-marker-alt",
  };
  const icon = iconByKind[kind] || iconByKind.place;

  const marker = `lonlat:${lon},${lat};type:awesome;icon:${icon};color:#0099ff;size:medium`;

  return (
    `${base}` +
    `?style=osm-bright` +
    `&width=600&height=360` +
    `&center=lonlat:${lon},${lat}` +
    `&zoom=16` +
    `&marker=${encodeURIComponent(marker)}` +
    `&apiKey=${encodeURIComponent(GEO_KEY)}`
  );
}

const PHOTO_CACHE = new Map();
const PHOTO_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

function cacheGet(key) {
  const v = PHOTO_CACHE.get(key);
  if (!v) return null;
  if (Date.now() - v.ts > PHOTO_CACHE_TTL_MS) {
    PHOTO_CACHE.delete(key);
    return null;
  }
  return v.url;
}
function cacheSet(key, url) {
  if (!url) return;
  PHOTO_CACHE.set(key, { url, ts: Date.now() });
}

function normalizeWikidataId(x) {
  if (!x) return null;
  const s = String(x).trim();
  const m = s.match(/\bQ\d+\b/);
  return m ? m[0] : null;
}

function commonsFilePathUrl(filename, width = 900) {
  const safe = encodeURIComponent(String(filename).replace(/ /g, "_"));
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${safe}?width=${width}`;
}

function seededPick(rnd, arr = []) {
  if (!arr.length) return null;
  return arr[Math.floor(rnd() * arr.length)];
}

function generateDeterministicReviews(
  placeId,
  placeName,
  kind = "place",
  rating = 4.4
) {
  const seed = hashStr(`reviews:${placeId}:${placeName}:${kind}`);
  const rnd = mulberry32(seed);

  const names = [
    "Emma",
    "Liam",
    "Noah",
    "Olivia",
    "Ava",
    "Sophia",
    "Mason",
    "Lucas",
    "Mia",
    "Charlotte",
    "Amelia",
    "James",
    "Ethan",
    "Daniel",
    "Emily",
    "Harper",
    "Ella",
    "Benjamin",
    "Henry",
    "Grace",
  ];

  const titlesByKind = {
    museum: [
      "Worth visiting",
      "Beautiful collection",
      "Very well organized",
      "A lovely cultural stop",
    ],
    park: [
      "Relaxing and peaceful",
      "Perfect for a walk",
      "Beautiful green space",
      "Lovely atmosphere",
    ],
    restaurant: [
      "Great experience",
      "Nice atmosphere",
      "Would come again",
      "Very enjoyable visit",
    ],
    hotel: [
      "Comfortable stay",
      "Clean and pleasant",
      "Good location",
      "Nice overall experience",
    ],
    attraction: [
      "A must-see spot",
      "Really enjoyable",
      "Great stop on the trip",
      "Beautiful place",
    ],
    place: [
      "Nice place to visit",
      "Pleasant experience",
      "Worth a stop",
      "Good overall impression",
    ],
  };

  const bodiesByKind = {
    museum: [
      "The exhibitions were easy to follow and the space felt well maintained. I’d recommend going earlier in the day.",
      "A very pleasant visit with enough to see without feeling overwhelming. Staff seemed friendly and the atmosphere was calm.",
      "Interesting displays and a nice layout. It’s a solid choice if you want a cultural stop during the day.",
      "I liked the overall experience. Clean, organized, and good for a short to medium visit.",
    ],
    park: [
      "Great for a walk and a relaxing break. The area felt calm and well kept.",
      "Lovely place to spend some quiet time. Nice paths and a good atmosphere overall.",
      "Very enjoyable, especially in the morning. It felt peaceful and not too crowded.",
      "A nice green escape with enough space to walk around and enjoy the surroundings.",
    ],
    restaurant: [
      "Nice setting and a pleasant overall experience. I’d gladly come back again.",
      "Good atmosphere and the place felt welcoming. A solid option if you’re nearby.",
      "Enjoyed the visit a lot. It had a nice vibe and everything felt well arranged.",
      "A good stop with a comfortable setting and a positive overall impression.",
    ],
    hotel: [
      "The stay was comfortable and the location was convenient. Everything felt smooth.",
      "Clean, pleasant, and easy to settle into. A good choice for a short stay.",
      "Nice overall experience with a calm atmosphere and a convenient location.",
      "Comfortable and well kept. It gave a good impression from start to finish.",
    ],
    attraction: [
      "Beautiful place and definitely worth seeing at least once. Photos turn out great here too.",
      "A very enjoyable stop with a nice atmosphere. I’d recommend visiting outside peak hours.",
      "One of the better places nearby to spend some time. Worth adding to your plan.",
      "Really liked it. Easy to enjoy even without spending too much time there.",
    ],
    place: [
      "A pleasant place to visit with a nice overall feel. Worth stopping by if you’re nearby.",
      "Good atmosphere and a smooth experience overall. I’d recommend it.",
      "Simple but enjoyable. A nice addition to the day if you’re exploring the area.",
      "It left a positive impression and felt like a worthwhile stop.",
    ],
  };

  const kindKey = titlesByKind[kind] ? kind : "place";
  const count = 4 + Math.floor(rnd() * 4);

  const reviews = Array.from({ length: count }).map((_, index) => {
    const starsBase = Math.round(Number(rating) || 4.4);
    const variance = rnd();

    let stars = starsBase;
    if (variance > 0.82) stars = Math.max(3, starsBase - 1);
    if (variance < 0.18) stars = Math.min(5, starsBase + 1);

    const daysAgo = 3 + Math.floor(rnd() * 220);
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);

    return {
      id: `${placeId}_review_${index + 1}`,
      author: seededPick(rnd, names),
      rating: stars,
      title: seededPick(rnd, titlesByKind[kindKey]),
      text: seededPick(rnd, bodiesByKind[kindKey]),
      createdAt: d.toISOString(),
    };
  });

  reviews.sort((a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt))
  );

  return reviews;
}

async function wikidataThumbById(wikidataId) {
  const qid = normalizeWikidataId(wikidataId);
  if (!qid) return null;

  const cacheKey = `wd:${qid}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(
    qid
  )}.json`;

  let data;
  try {
    data = await fetchJson(url, "Wikidata");
  } catch {
    return null;
  }

  const ent = data?.entities?.[qid];
  const p18 = ent?.claims?.P18?.[0]?.mainsnak?.datavalue?.value || null;
  if (!p18) return null;
  if (!/\.(jpg|jpeg|png|webp)$/i.test(p18)) return null;

  const img = commonsFilePathUrl(p18, 900);
  cacheSet(cacheKey, img);
  return img;
}

function parseWikipediaUrl(wikipediaUrl) {
  if (!wikipediaUrl) return null;
  try {
    const u = new URL(wikipediaUrl);
    const lang = u.hostname.split(".")[0];
    const m = u.pathname.match(/\/wiki\/(.+)$/);
    if (!m) return null;
    const title = decodeURIComponent(m[1]).replace(/_/g, " ");
    return { lang, title };
  } catch {
    return null;
  }
}
function isPastDate(dateStr) {
  if (!dateStr) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;

  d.setHours(0, 0, 0, 0);
  return d < today;
}
async function wikipediaThumbByUrl(wikipediaUrl) {
  const p = parseWikipediaUrl(wikipediaUrl);
  if (!p?.title || !p?.lang) return null;

  const cacheKey = `wp:${p.lang}:${p.title}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const api =
    `https://${p.lang}.wikipedia.org/w/api.php` +
    `?action=query&format=json&prop=pageimages&pithumbsize=900&titles=${encodeURIComponent(
      p.title
    )}`;

  let data;
  try {
    data = await fetchJson(api, "Wikipedia");
  } catch {
    return null;
  }

  const pages = data?.query?.pages || {};
  const firstKey = Object.keys(pages)[0];
  const thumb = firstKey ? pages[firstKey]?.thumbnail?.source : null;

  if (thumb) cacheSet(cacheKey, thumb);
  return thumb || null;
}

async function resolveRealPhotoUrl(properties) {
  const raw = properties?.datasource?.raw || {};

  const direct = raw.image || raw.photo || null;
  if (
    typeof direct === "string" &&
    direct.startsWith("http") &&
    !direct.includes("photos.app.goo.gl")
  ) {
    return direct;
  }

  if (typeof raw.wikimedia_commons === "string" && raw.wikimedia_commons) {
    const v = raw.wikimedia_commons.trim();
    if (/^File:/i.test(v)) {
      const file = v.replace(/^File:/i, "").trim();
      if (file) return commonsFilePathUrl(file, 900);
    }
  }

  const wd = raw.wikidata || properties?.wikidata || null;
  const wdImg = await wikidataThumbById(wd);
  if (wdImg) return wdImg;

  const wp = raw.wikipedia || properties?.wikipedia || null;
  const wpImg = await wikipediaThumbByUrl(wp);
  if (wpImg) return wpImg;

  return null;
}

async function geoFeatureToResult(req, f, { withPhoto = false } = {}) {
  const p = f?.properties || {};
  const placeId = p.place_id || p.placeId || null;

  const categories = Array.isArray(p.categories) ? p.categories : [];
  const detectedKind = detectKindFromCategories(categories);

  const lat = typeof p.lat === "number" ? p.lat : null;
  const lon = typeof p.lon === "number" ? p.lon : null;

  let realPhoto = null;
  if (withPhoto) realPhoto = await resolveRealPhotoUrl(p);

  const fallback = placeholderUrl(req, detectedKind, placeId || "");
  const preview = realPhoto || fallback;

  return {
    xid: placeId ? `geo:${placeId}` : null,
    geo_place_id: placeId,
    name: p.name || p.address_line1 || null,
    lat,
    lon,
    address: p.formatted || null,
    rate: null,
    kind: detectedKind,
    preview,
    fallback,
    imageSource: realPhoto ? "wikimedia" : "placeholder",
    categories: categories.length ? categories : null,
    dist: typeof p.distance === "number" ? p.distance : null,
  };
}

// Nearby
router.get("/nearby", async (req, res) => {
  try {
    if (!requireKey(res)) return;

    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const radius = Number(req.query.radius || 8000);
    const kind = String(req.query.kind || "attraction");

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: "Missing/invalid lat/lon" });
    }

    const categories = kindToGeoCategories(kind);
    const url = buildNearbyUrl({ lat, lon, radius, categories });

    const data = await fetchJson(url, "Geoapify places");
    const features = Array.isArray(data?.features) ? data.features : [];

    const basic = features
      .filter((f) => f?.properties)
      .filter((f) => {
        if (!kind || kind === "all") return true;
        const detected = detectKindFromCategories(
          f.properties.categories || []
        );
        return detected === kind;
      });

    const PHOTO_TRY_LIMIT = 10;
    const results = await Promise.all(
      basic.map((f, idx) =>
        geoFeatureToResult(req, f, { withPhoto: idx < PHOTO_TRY_LIMIT })
      )
    );

    return res.json({ results: results.filter((x) => x?.xid) });
  } catch (e) {
    console.error("places/nearby error:", e?.message || e);
    return res.status(500).json({
      error: "Places nearby failed",
      details: e?.message || String(e),
    });
  }
});

// Details
router.get("/details", async (req, res) => {
  try {
    if (!requireKey(res)) return;

    const place_id = String(req.query.place_id || "").trim();
    if (!place_id) return res.status(400).json({ error: "Missing place_id" });

    const id = place_id.startsWith("geo:") ? place_id.slice(4) : place_id;

    const url = buildDetailsUrl(id);
    const data = await fetchJson(url, "Geoapify details");

    const f = Array.isArray(data?.features) ? data.features[0] : null;
    const p = f?.properties || {};
    const raw = p.datasource?.raw || {};

    const cats = Array.isArray(p.categories) ? p.categories : [];
    const detectedKind = detectKindFromCategories(cats);

    const lat = typeof p.lat === "number" ? p.lat : null;
    const lon = typeof p.lon === "number" ? p.lon : null;

    const realPhoto = await resolveRealPhotoUrl(p);
    const staticMap =
      lat && lon ? staticMapPreviewUrl({ lat, lon, kind: detectedKind }) : null;

    // gallery: min 3 imgs, no duplicates
    const gallery = [];
    if (realPhoto) gallery.push(realPhoto);

    gallery.push(placeholderUrl(req, detectedKind, id));
    gallery.push(placeholderUrl(req, detectedKind, `${id}_2`));
    gallery.push(placeholderUrl(req, detectedKind, `${id}_3`));

    const uniqGallery = Array.from(new Set(gallery)).slice(0, 6);

    const meta = genPlaceMetaDeterministic(id, detectedKind);

    const rawRating = raw.rating ?? raw.stars ?? raw.google_rating ?? null;
    const rawReviews =
      raw.reviews_count ?? raw.review_count ?? raw.user_ratings_total ?? null;

    const rating = typeof rawRating === "number" ? rawRating : meta.rating;
    const reviewsCount =
      typeof rawReviews === "number" ? rawReviews : meta.reviewsCount;

    const ticketPrice = meta.ticketPrice;
    const openingHours =
      raw.opening_hours || raw.opening_hours_text || meta.openingHours;

    let luxuries = [];
    if (lat && lon) {
      try {
        const nearUrl = buildNearbyUrl({
          lat,
          lon,
          radius: 1500,
          categories: [
            kindToGeoCategories("restaurant"),
            "accommodation.hotel",
            "tourism.attraction",
            "entertainment.museum",
          ].join(","),
        });

        const nearData = await fetchJson(nearUrl, "Geoapify nearby places");

        luxuries = (nearData.features || [])
          .map((x) => {
            const pp = x?.properties || {};
            const categories = Array.isArray(pp.categories)
              ? pp.categories
              : [];
            const detectedKind = detectKindFromCategories(categories);
            const placeId = pp.place_id || null;

            return {
              id: placeId,
              xid: placeId ? `geo:${placeId}` : null,
              name: pp.name || pp.address_line1 || "Nearby place",
              lat: pp.lat,
              lon: pp.lon,
              address: pp.formatted || null,
              kind: detectedKind,
              category: categories[0] || null,
              preview: placeholderUrl(req, detectedKind, placeId || ""),
            };
          })
          .filter((x) => x.name && x.lat && x.lon && x.xid)
          .slice(0, 8);
      } catch (e) {}
    }

    const website =
      p.website || raw.website || raw.contact_website || raw.url || null;
    const phone = raw.phone || raw.contact_phone || null;
    const description = p.description || raw.description || null;

    const safeRating = Number(clamp(rating, 1, 5).toFixed(1));
    const safeReviewsCount = Number(reviewsCount) || 0;
    const reviews = generateDeterministicReviews(
      id,
      p.name || p.address_line1 || "Place",
      detectedKind,
      safeRating
    );

    const fallback = placeholderUrl(req, detectedKind, id);

    return res.json({
      result: {
        xid: `geo:${id}`,
        name: p.name || p.address_line1 || null,
        lat,
        lon,
        address: p.formatted || null,
        description,
        kind: detectedKind,
        rating: safeRating,
        reviewsCount: safeReviewsCount,
        reviews,
        ticketPrice,
        openingHours,
        preview: realPhoto || fallback,
        gallery: uniqGallery,
        mapImage: staticMap,
        luxuries,
        website,
        phone,
        bookingSlots: meta.bookingSlots,
      },
    });
  } catch (e) {
    console.error("places/details error:", e?.message || e);
    return res.status(500).json({
      error: "Places details failed",
      details: e?.message || String(e),
    });
  }
});

// Book
router.post("/book", async (req, res) => {
  try {
    const {
      place_id,
      placeName,
      placeAddress,
      preview,
      date,
      time,
      qty,
      fullName,
      email,
    } = req.body || {};

    if (!place_id || !date || !time || !qty) {
      return res.status(400).json({ error: "Missing place_id/date/time/qty" });
    }

    const id = String(place_id).startsWith("geo:")
      ? String(place_id).slice(4)
      : String(place_id);

    const confirmation = genConfirmationCode(id, date, time);

    const bookings = readPlaceBookings();

    const record = {
      id: confirmation,
      place_id: `geo:${id}`,
      placeName: placeName || null,
      placeAddress: placeAddress || null,
      preview: preview || null,
      date,
      time,
      qty: Number(qty),
      fullName: fullName || null,
      email: email || null,
      createdAt: new Date().toISOString(),
      status: "confirmed",
    };

    bookings.unshift(record);
    writePlaceBookings(bookings);

    return res.json({ ok: true, booking: record });
  } catch (e) {
    return res
      .status(500)
      .json({ error: "Booking failed", details: e?.message || String(e) });
  }
});

router.get("/bookings", (req, res) => {
  try {
    const bookings = readPlaceBookings().sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
    );

    return res.json({ bookings });
  } catch (e) {
    return res.status(500).json({
      error: "Failed to load place bookings",
      details: e?.message || String(e),
    });
  }
});

router.get("/booking/:id", (req, res) => {
  const id = String(req.params.id || "").trim();
  const bookings = readPlaceBookings();
  const b = bookings.find((x) => x.id === id);
  if (!b) return res.status(404).json({ error: "Not found" });
  return res.json({ booking: b });
});

router.post("/booking/:id/cancel", (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const bookings = readPlaceBookings();

    const idx = bookings.findIndex((x) => x.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Booking not found." });
    }

    const booking = bookings[idx];
    const status = String(booking?.status || "").toLowerCase();

    if (status === "cancelled") {
      return res.json({ booking });
    }

    if (isPastDate(booking?.date)) {
      return res
        .status(400)
        .json({ error: "Past bookings can no longer be cancelled." });
    }

    bookings[idx] = {
      ...booking,
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
    };

    writePlaceBookings(bookings);

    return res.json({ booking: bookings[idx] });
  } catch (e) {
    return res.status(500).json({
      error: "Failed to cancel booking",
      details: e?.message || String(e),
    });
  }
});

module.exports = router;
