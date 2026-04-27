const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const flightsPath = path.join(__dirname, "..", "data", "flights.json");

let FLIGHTS = [];
try {
  FLIGHTS = JSON.parse(fs.readFileSync(flightsPath, "utf8"));
  console.log(`flights.json loaded: ${FLIGHTS.length}`);
} catch (e) {
  console.log("flights.json load error:", e.message);
}

function isYMD(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}
function toIATA(s) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .slice(0, 3);
}

router.get("/", (req, res) => {
  const origin = toIATA(req.query.origin);
  const destination = toIATA(req.query.destination);
  const date = String(req.query.date || "").trim();
  const max = Math.max(1, Math.min(100, Number(req.query.max || 20)));

  const direct = String(req.query.direct || "0") === "1";

  if (origin.length !== 3)
    return res.status(400).json({ error: "origin is required" });
  if (destination.length !== 3)
    return res.status(400).json({ error: "destination is required" });
  if (!isYMD(date))
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });

  let results = FLIGHTS.filter(
    (f) =>
      f.origin === origin &&
      f.destination === destination &&
      f.departureDate === date
  );

  if (direct) {
    results = results.filter((f) => Number(f.stops || 0) === 0);
  }

  results = results
    .sort((a, b) => Number(a?.price?.total || 0) - Number(b?.price?.total || 0))
    .slice(0, max);

  res.json(results);
});

router.get("/_meta", (req, res) => {
  res.json({ count: FLIGHTS.length });
});

module.exports = router;
