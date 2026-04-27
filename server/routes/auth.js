const express = require("express");
const path = require("path");
const multer = require("multer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "public", "uploads", "avatars"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || ".jpg");
    cb(null, `${req.user.userId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      return cb(new Error("Only images allowed"));
    }
    cb(null, true);
  },
});

function withHost(req, photoPath) {
  if (!photoPath) return null;
  const host = `${req.protocol}://${req.get("host")}`;
  return host + photoPath;
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { fullName, username, email, password, phone } = req.body;

    if (!fullName || fullName.trim().length < 2)
      return res.status(400).json({ message: "Invalid fullName" });

    if (!username || username.trim().length < 3)
      return res.status(400).json({ message: "Invalid username" });

    const emailLower = String(email || "")
      .trim()
      .toLowerCase();
    if (!emailLower.includes("@"))
      return res.status(400).json({ message: "Invalid email" });

    if (!password || String(password).length < 8)
      return res.status(400).json({ message: "Password too short" });

    const exists = await db.query(
      "select id from users where email=$1 or username=$2 limit 1",
      [emailLower, username.trim()]
    );
    if (exists.rows.length)
      return res
        .status(409)
        .json({ message: "Email or username already used" });

    const passwordHash = await bcrypt.hash(String(password), 10);

    const created = await db.query(
      `insert into users (full_name, username, email, phone, password_hash)
       values ($1,$2,$3,$4,$5)
       returning id, full_name, username, email, phone, photo_url`,
      [
        fullName.trim(),
        username.trim(),
        emailLower,
        phone || null,
        passwordHash,
      ]
    );

    const u = created.rows[0];
    const token = signToken({ id: u.id, email: u.email });

    return res.json({
      token,
      user: {
        id: u.id,
        fullName: u.full_name,
        username: u.username,
        email: u.email,
        phone: u.phone,
        photoURL: withHost(req, u.photo_url),
      },
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailLower = String(email || "")
      .trim()
      .toLowerCase();

    const q = await db.query(
      "select id, full_name, username, email, phone, password_hash, photo_url from users where email=$1 limit 1",
      [emailLower]
    );
    if (!q.rows.length)
      return res.status(401).json({ message: "Invalid login" });

    const u = q.rows[0];
    const ok = await bcrypt.compare(String(password || ""), u.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid login" });

    const token = signToken({ id: u.id, email: u.email });

    return res.json({
      token,
      user: {
        id: u.id,
        fullName: u.full_name,
        username: u.username,
        email: u.email,
        phone: u.phone,
        photoURL: withHost(req, u.photo_url),
      },
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Server error" });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const q = await db.query(
      "select id, full_name, username, email, phone, photo_url from users where id=$1 limit 1",
      [userId]
    );
    if (!q.rows.length) return res.status(404).json({ message: "Not found" });

    const u = q.rows[0];
    return res.json({
      user: {
        id: u.id,
        fullName: u.full_name,
        username: u.username,
        email: u.email,
        phone: u.phone,
        photoURL: withHost(req, u.photo_url),
      },
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/auth/profile  (multipart/form-data)
// fields: fullName, phone, username, avatar(file)
router.put(
  "/profile",
  authMiddleware,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const { fullName, phone, username } = req.body;

      if (username && username.trim().length < 3) {
        return res.status(400).json({ message: "Invalid username" });
      }

      const photoUrl = req.file
        ? `/static/uploads/avatars/${req.file.filename}`
        : null;

      const q = await db.query(
        `update users
       set full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           username = COALESCE($3, username),
           photo_url = COALESCE($4, photo_url)
       where id = $5
       returning id, full_name, username, email, phone, photo_url`,
        [
          fullName ? fullName.trim() : null,
          phone ?? null,
          username ? username.trim() : null,
          photoUrl,
          userId,
        ]
      );

      const u = q.rows[0];
      return res.json({
        user: {
          id: u.id,
          fullName: u.full_name,
          username: u.username,
          email: u.email,
          phone: u.phone,
          photoURL: withHost(req, u.photo_url),
        },
      });
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

// POST /api/auth/change-password
router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ message: "currentPassword is required" });
    }
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ message: "New password too short" });
    }

    const q = await db.query(
      "select password_hash from users where id=$1 limit 1",
      [userId]
    );
    if (!q.rows.length) return res.status(404).json({ message: "Not found" });

    const ok = await bcrypt.compare(
      String(currentPassword),
      q.rows[0].password_hash
    );
    if (!ok) return res.status(401).json({ message: "Wrong current password" });

    const newHash = await bcrypt.hash(String(newPassword), 10);

    await db.query("update users set password_hash=$1 where id=$2", [
      newHash,
      userId,
    ]);

    return res.json({ ok: true });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/delete-account
router.post("/delete-account", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const q = await db.query(
      "select password_hash from users where id=$1 limit 1",
      [userId]
    );
    if (!q.rows.length) return res.status(404).json({ message: "Not found" });

    const ok = await bcrypt.compare(String(password), q.rows[0].password_hash);
    if (!ok) return res.status(401).json({ message: "Wrong password" });

    await db.query("delete from users where id=$1", [userId]);

    return res.json({ ok: true });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
