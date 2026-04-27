const router = require("express").Router();
const cities = require("../data/euCities.json");

router.get("/", (req, res) => {
  res.json(cities);
});

router.get("/search", (req, res) => {
  const q = String(req.query.q || "")
    .trim()
    .toLowerCase();
  const limit = Math.min(Math.max(parseInt(req.query.limit || "5", 10), 1), 10);

  if (q.length < 2) return res.json({ data: [] });

  const out = cities
    .filter(
      (c) =>
        c.city.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        String(c.id || "")
          .toLowerCase()
          .includes(q)
    )
    .slice(0, limit);

  res.json({ data: out });
});

module.exports = router;
