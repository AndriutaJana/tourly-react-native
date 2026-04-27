const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const flightsPath = path.join(__dirname, "..", "data", "flights.json");
const savedPath = path.join(__dirname, "..", "data", "savedFlights.json");

let FLIGHTS = [];
try {
  FLIGHTS = JSON.parse(fs.readFileSync(flightsPath, "utf8"));
} catch (e) {
  console.log("flights.json load error:", e.message);
}

function readSaved() {
  try {
    const raw = fs.readFileSync(savedPath, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data?.ids) ? data.ids : [];
  } catch {
    return [];
  }
}

function writeSaved(ids) {
  fs.writeFileSync(savedPath, JSON.stringify({ ids }, null, 2), "utf8");
}

// GET ids
router.get("/", (req, res) => {
  res.json({ ids: readSaved() });
});

// POST toggle { id }
router.post("/toggle", (req, res) => {
  const id = String(req.body?.id || "");
  if (!id) return res.status(400).json({ error: "id is required" });

  const ids = readSaved();
  const set = new Set(ids);

  if (set.has(id)) set.delete(id);
  else set.add(id);

  const next = Array.from(set);
  writeSaved(next);

  res.json({ ids: next });
});

// GET offers for saved ids
router.get("/offers", (req, res) => {
  const ids = readSaved();
  const set = new Set(ids);

  const offers = FLIGHTS.filter((f) => set.has(String(f.id)));
  res.json(offers);
});

module.exports = router;
