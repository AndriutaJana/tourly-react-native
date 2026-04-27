const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const router = express.Router();

const bookingsPath = path.join(__dirname, "..", "data", "bookings.json");

function readBookings() {
  try {
    const raw = fs.readFileSync(bookingsPath, "utf8");
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeBookings(list) {
  fs.writeFileSync(bookingsPath, JSON.stringify(list, null, 2), "utf8");
}

router.get("/", (req, res) => {
  const list = readBookings().sort((a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt))
  );
  res.json({ bookings: list });
});

router.post("/", (req, res) => {
  const { offer, passenger } = req.body || {};

  if (!offer?.id) return res.status(400).json({ error: "Missing offer." });
  if (!passenger?.fullName)
    return res.status(400).json({ error: "Missing passenger fullName." });
  if (!passenger?.email)
    return res.status(400).json({ error: "Missing passenger email." });
  if (!passenger?.phone)
    return res.status(400).json({ error: "Missing passenger phone." });

  const list = readBookings();

  const bookingId = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  const booking = {
    bookingId,
    createdAt: new Date().toISOString(),
    status: "pending_payment",
    passenger: {
      fullName: String(passenger.fullName).trim(),
      email: String(passenger.email).trim(),
      phone: String(passenger.phone).trim(),
    },
    offer,
  };

  list.push(booking);
  writeBookings(list);

  res.json({ bookingId, booking });
});

router.get("/:id", (req, res) => {
  const { id } = req.params;
  const list = readBookings();
  const booking = list.find((b) => b.bookingId === id);
  if (!booking) return res.status(404).json({ error: "Booking not found." });
  return res.json({ booking });
});

router.post("/:id/cancel", (req, res) => {
  const { id } = req.params;
  const list = readBookings();

  const idx = list.findIndex((b) => b.bookingId === id);
  if (idx === -1) return res.status(404).json({ error: "Booking not found." });

  const b = list[idx];
  const isPaid = !!b.paidAt;

  if (isPaid) {
    return res.status(400).json({
      error: "Paid booking cannot be cancelled. Request a refund instead.",
    });
  }

  if (b.status === "cancelled") return res.json({ booking: b });

  b.status = "cancelled";
  b.cancelledAt = new Date().toISOString();
  list[idx] = b;

  writeBookings(list);
  return res.json({ booking: b });
});

router.post("/:id/pay", (req, res) => {
  const { id } = req.params;
  const list = readBookings();

  const idx = list.findIndex((b) => b.bookingId === id);
  if (idx === -1) return res.status(404).json({ error: "Booking not found." });

  const st = String(list[idx].status || "").toLowerCase();
  if (st === "cancelled") {
    return res.status(400).json({ error: "Cancelled booking cannot be paid." });
  }

  const alreadyPaid = !!list[idx].paidAt;
  if (alreadyPaid) return res.json({ booking: list[idx] });

  list[idx].status = "confirmed";
  list[idx].paidAt = new Date().toISOString();
  list[idx].payment = {
    method: "card",
    cardLast4: req.body?.cardLast4 || "4242",
  };

  writeBookings(list);
  res.json({ booking: list[idx] });
});

router.post("/:id/refund", (req, res) => {
  const { id } = req.params;
  const list = readBookings();

  const idx = list.findIndex((b) => b.bookingId === id);
  if (idx === -1) return res.status(404).json({ error: "Booking not found." });

  const b = list[idx];

  const status = String(b.status || "").toLowerCase();
  const isCancelled = status === "cancelled";
  const isPaid = !!b.paidAt;

  if (isCancelled) {
    return res
      .status(400)
      .json({ error: "Booking is cancelled. Refund not available." });
  }

  if (!isPaid) {
    return res
      .status(400)
      .json({ error: "Booking is not paid. Refund not available." });
  }

  if (b.refund?.status === "requested" || b.refund?.requestedAt) {
    return res.json({ booking: b });
  }

  //  refund request
  b.refund = {
    status: "requested",
    requestedAt: new Date().toISOString(),
  };

  list[idx] = b;
  writeBookings(list);

  return res.json({ booking: b });
});

module.exports = router;
