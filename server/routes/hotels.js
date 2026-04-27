const router = require("express").Router();
const hotels = require("../data/hotels.json");

function toBool(v) {
  const s = String(v ?? "")
    .toLowerCase()
    .trim();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

router.get("/search", (req, res) => {
  console.log("🏨 /hotels/search", req.query);

  const cityId = String(req.query.cityId || "CITY").toUpperCase();
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "30", 10), 1),
    60
  );

  const onlyAvailable = toBool(req.query.onlyAvailable);
  const checkIn = String(req.query.checkIn || "");
  const checkOut = String(req.query.checkOut || "");

  let list = hotels.filter((h) => h.cityId === cityId);

  // 2) DEMO availability
  if (onlyAvailable && checkIn && checkOut) {
    list = list.filter((h) => {
      const n = hashStr(`${h.id}_${checkIn}_${checkOut}`) % 100;
      return n < 65;
    });
  }

  console.log("🏨 returning", list.length, "hotels", {
    onlyAvailable,
    checkIn,
    checkOut,
  });

  // 3) limit + light fields
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
