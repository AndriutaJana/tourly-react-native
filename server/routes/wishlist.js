const express = require("express");
const db = require("../db");
const jwt = require("jsonwebtoken");

const router = express.Router();

function authMiddleware(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// GET /api/wishlist
router.get("/", authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  const q = await db.query(
    `select
        xid,
        kind,
        title,
        subtitle,
        preview,
        payload,
        name,
        hotel_id as "hotelId",
        city,
        rating,
        price_from as "priceFrom",
        created_at as "createdAt"
     from wishlists
     where user_id=$1
     order by created_at desc`,
    [userId]
  );

  res.json({ items: q.rows });
});

router.post("/", authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  const {
    xid,
    kind,
    title = null,
    subtitle = null,
    preview = null,
    payload = null,

    name = null,
    hotelId = null,
    city = null,
    rating = null,
    priceFrom = null,
  } = req.body || {};

  if (!xid) return res.status(400).json({ message: "xid is required" });
  if (!kind) return res.status(400).json({ message: "kind is required" });

  const q = await db.query(
    `insert into wishlists
      (user_id, xid, kind, title, subtitle, preview, payload, name, hotel_id, city, rating, price_from)
     values
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     on conflict (user_id, xid)
     do update set
       kind=excluded.kind,
       title=excluded.title,
       subtitle=excluded.subtitle,
       preview=excluded.preview,
       payload=excluded.payload,
       name=excluded.name,
       hotel_id=excluded.hotel_id,
       city=excluded.city,
       rating=excluded.rating,
       price_from=excluded.price_from
     returning
       xid,
       kind,
       title,
       subtitle,
       preview,
       payload,
       name,
       hotel_id as "hotelId",
       city,
       rating,
       price_from as "priceFrom",
       created_at as "createdAt"`,
    [
      userId,
      String(xid),
      String(kind),
      title,
      subtitle,
      preview,
      payload,
      name,
      hotelId,
      city,
      rating,
      priceFrom,
    ]
  );

  res.json({ item: q.rows[0] });
});

// DELETE /api/wishlist/:xid
router.delete("/:xid", authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const xid = String(req.params.xid || "");

  await db.query("delete from wishlists where user_id=$1 and xid=$2", [
    userId,
    xid,
  ]);

  res.json({ ok: true });
});

// DELETE /api/wishlist (clear all)
router.delete("/", authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  await db.query("delete from wishlists where user_id=$1", [userId]);
  res.json({ ok: true });
});

module.exports = router;
