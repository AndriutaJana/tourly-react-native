const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const router = express.Router();
const bookingsPath = path.join(__dirname, "..", "data", "hotelBookings.json");

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

function clampNights(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 1;
  return Math.max(1, Math.min(30, Math.round(x)));
}

router.get("/", (req, res) => {
  const list = readBookings().sort((a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt))
  );
  res.json({ bookings: list });
});

router.post("/", (req, res) => {
  const { hotel, guest, dates, room } = req.body || {};

  if (!hotel?.hotelId)
    return res.status(400).json({ error: "Missing hotelId." });
  if (!hotel?.name)
    return res.status(400).json({ error: "Missing hotel name." });

  if (!guest?.fullName)
    return res.status(400).json({ error: "Missing guest fullName." });
  if (!guest?.email)
    return res.status(400).json({ error: "Missing guest email." });
  if (!guest?.phone)
    return res.status(400).json({ error: "Missing guest phone." });

  if (!dates?.checkIn)
    return res.status(400).json({ error: "Missing checkIn." });
  if (!dates?.checkOut)
    return res.status(400).json({ error: "Missing checkOut." });

  // room optional, dar recomandat
  const pricePerNight = room?.pricePerNight ?? hotel?.priceFrom ?? null;
  const currency = room?.currency || hotel?.currency || "EUR";
  const nights = clampNights(dates?.nights);

  const total =
    pricePerNight == null ? null : Math.round(Number(pricePerNight) * nights);

  const list = readBookings();

  const bookingId = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  const booking = {
    bookingId,
    createdAt: new Date().toISOString(),
    status: "pending_payment",

    guest: {
      fullName: String(guest.fullName).trim(),
      email: String(guest.email).trim(),
      phone: String(guest.phone).trim(),
    },

    hotel: {
      hotelId: String(hotel.hotelId),
      name: String(hotel.name),
      thumbnail: hotel.thumbnail || null,
      address: hotel.address || null,
      city: hotel.city || null,
      currency,
      priceFrom: hotel.priceFrom ?? null,
    },

    room: room
      ? {
          code: room.code || null,
          name: room.name || "Room",
          refundable: !!room.refundable,
          breakfastIncluded: !!room.breakfastIncluded,
          pricePerNight: pricePerNight,
          currency,
        }
      : null,

    dates: {
      checkIn: String(dates.checkIn),
      checkOut: String(dates.checkOut),
      nights,
    },

    pricing: {
      pricePerNight: pricePerNight,
      currency,
      total,
    },
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

  if (String(b.status).toLowerCase() === "cancelled")
    return res.json({ booking: b });

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

  if (list[idx].paidAt) return res.json({ booking: list[idx] });

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

  if (status === "cancelled") {
    return res
      .status(400)
      .json({ error: "Booking is cancelled. Refund not available." });
  }
  if (!b.paidAt) {
    return res
      .status(400)
      .json({ error: "Booking is not paid. Refund not available." });
  }

  if (b.refund?.status === "requested" || b.refund?.requestedAt) {
    return res.json({ booking: b });
  }

  b.refund = { status: "requested", requestedAt: new Date().toISOString() };

  list[idx] = b;
  writeBookings(list);

  return res.json({ booking: b });
});

module.exports = router;
