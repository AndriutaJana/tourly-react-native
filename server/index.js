require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/static", express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => res.json({ ok: true }));

// auth routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/places", require("./routes/places"));

// routes
app.use("/api/cities", require("./routes/cities"));
app.use("/api/hotels", require("./routes/hotels"));
app.use("/api/wishlist", require("./routes/wishlist"));

app.use("/api/flights", require("./routes/flights"));
app.use("/api/savedFlights", require("./routes/savedFlights"));

const hotelBookings = require("./routes/hotelBookings");
app.use("/api/hotel-bookings", hotelBookings);

const bookingsRouter = require("./routes/bookings");
app.use("/api/bookings", bookingsRouter);

const PORT = process.env.PORT || 3001;
console.log("GEOAPIFY_API_KEY set?", !!process.env.GEOAPIFY_API_KEY);
app.listen(PORT, () => console.log(`Mock API running on :${PORT}`));
