const router = require("express").Router();
const hotels = require("../data/hotels.json");

// hash determinist
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// rnd 0..1 determinist
function rnd01(seed) {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function validRange(checkIn, checkOut) {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return !Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime()) && b > a;
}
function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// calc “availability” demo
function isHotelAvailableDemo(hotel, checkIn, checkOut) {
  const rooms = hotel.rooms || [];
  if (!rooms.length) return false;

  const seed = hashStr(`${hotel.id}_${checkIn}_${checkOut}`);
  const demand = rnd01(seed); // 0..1

  return rooms.some((r, idx) => {
    const inv = Number(r.inventory ?? 0);
    if (!inv) return false;

    const d2 = rnd01(seed + idx * 101);
    const occupied = Math.floor((0.25 + d2 * 0.85) * inv);
    return inv - occupied > 0;
  });
}

router.get("/search", (req, res) => {
  const cityId = String(
    req.query.cityId || req.query.cityCode || ""
  ).toUpperCase();
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "30", 10), 1),
    60
  );

  const checkIn = String(req.query.checkIn || "");
  const checkOut = String(req.query.checkOut || "");
  const onlyAvailable = String(req.query.onlyAvailable || "0") === "1";
  const q = normalizeText(req.query.q || "");

  if (onlyAvailable && !validRange(checkIn, checkOut)) {
    return res.status(400).json({ error: "Invalid date range" });
  }

  let list = hotels;

  if (cityId) {
    list = list.filter((h) => String(h.cityId || "").toUpperCase() === cityId);
  }

  if (q) {
    list = list.filter((h) => {
      const name = normalizeText(h.name);
      const neighborhood = normalizeText(h.neighborhood);
      const amenities = (h.amenities || []).map(normalizeText).join(" ");

      return (
        name.includes(q) || neighborhood.includes(q) || amenities.includes(q)
      );
    });
  }

  if (onlyAvailable) {
    list = list.filter((h) => isHotelAvailableDemo(h, checkIn, checkOut));
  }

  const out = list.slice(0, limit).map((h) => ({
    id: h.id,
    cityId: h.cityId,
    name: h.name,
    stars: h.stars,
    rating: h.rating,
    reviewCount: h.reviewCount,
    priceFrom: h.priceFrom,
    currency: h.currency,
    neighborhood: h.neighborhood,
    distanceFromCenterKm: h.distanceFromCenterKm,
    thumbnail: h.thumbnail,
    amenities: (h.amenities || []).slice(0, 6),
    isAvailable: onlyAvailable ? true : undefined,
  }));

  res.json({ data: out });
});
router.get("/:id", (req, res) => {
  const id = String(req.params.id);
  const h = hotels.find((x) => x.id === id);

  if (!h) return res.status(404).json({ error: "Hotel not found" });

  res.json({ data: h });
});

module.exports = router;
