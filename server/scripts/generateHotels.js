const fs = require("fs");
const path = require("path");

const citiesPath = path.join(__dirname, "..", "data", "euCities.json");
const outPath = path.join(__dirname, "..", "data", "hotels.json");
const cities = JSON.parse(fs.readFileSync(citiesPath, "utf8"));

const BASE_IMG_URL = "http://192.168.100.5:3001/static/hotel-images";

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function pick(rnd, arr) {
  return arr[Math.floor(rnd() * arr.length)];
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

const NAME_PART1 = [
  "Central",
  "Royal",
  "Grand",
  "Urban",
  "Riverside",
  "Park",
  "Plaza",
  "Boutique",
  "Heritage",
  "Panorama",
  "Citylight",
  "Gallery",
  "Harbor",
  "Garden",
  "Vintage",
  "Luxe",
  "Aurora",
  "Atlas",
  "Crown",
  "Opal",
];

const NAME_PART2 = [
  "Hotel",
  "Suites",
  "Residence",
  "Inn",
  "Stay",
  "Boutique Hotel",
  "Palace",
  "Apartments",
];

const AMENITIES = [
  "wifi",
  "breakfast",
  "parking",
  "pool",
  "spa",
  "gym",
  "restaurant",
  "bar",
  "airport_shuttle",
  "pet_friendly",
  "family_rooms",
  "room_service",
  "air_conditioning",
  "laundry",
  "24h_reception",
  "accessible",
];

const NEIGHBORHOODS = [
  { key: "oldTown", label: "Old Town" },
  { key: "cityCenter", label: "City Center" },
  { key: "riverside", label: "Riverside" },
  { key: "business", label: "Business District" },
  { key: "museum", label: "Museum Quarter" },
  { key: "shopping", label: "Shopping Area" },
  { key: "historic", label: "Historic District" },
  { key: "park", label: "Green Park Area" },
  { key: "station", label: "Central Station Area" },
];

const EXTERIORS = ["exterior_1.jpg", "exterior_2.jpg", "exterior_3.jpg"];
const ROOMS = ["room_1.jpg", "room_2.jpg", "room_3.jpg"];
const BATHROOMS = ["bathroom_1.jpg", "bathroom_2.jpg", "bathroom_3.jpg"];
const LOBBIES = ["lobby_1.jpg", "lobby_2.jpg", "lobby_3.jpg"];
const RESTAURANTS = [
  "restaurant_1.jpg",
  "restaurant_2.jpg",
  "restaurant_3.jpg",
];
const POOLS = ["pool_1.jpg", "pool_2.jpg", "pool_3.jpg"];
const SPAS = ["spa_1.jpg", "spa_2.jpg", "spa_3.jpg"];

function photoUrl(file) {
  return `${BASE_IMG_URL}/${file}`;
}

function genPhotos(rnd) {
  const photos = [];

  photos.push(photoUrl(pick(rnd, EXTERIORS)));
  photos.push(photoUrl(pick(rnd, ROOMS)));
  photos.push(photoUrl(pick(rnd, BATHROOMS)));
  photos.push(photoUrl(pick(rnd, LOBBIES)));

  if (rnd() < 0.8) photos.push(photoUrl(pick(rnd, RESTAURANTS)));
  if (rnd() < 0.5) photos.push(photoUrl(pick(rnd, POOLS)));
  if (rnd() < 0.4) photos.push(photoUrl(pick(rnd, SPAS)));

  return photos;
}

function genAddress(rnd, city, country) {
  const streetNames = [
    "Main",
    "Liberty",
    "King",
    "Queen",
    "Market",
    "River",
    "Park",
    "Museum",
    "Sunset",
    "Oak",
  ];
  const streetTypes = ["St", "Ave", "Blvd", "Rd", "Ln"];
  const no = 1 + Math.floor(rnd() * 220);
  const street = `${pick(rnd, streetNames)} ${pick(rnd, streetTypes)} ${no}`;
  return `${street}, ${city}, ${country}`;
}

function genRooms(rnd, currency) {
  const roomNames = [
    { key: "standard", label: "Standard Room" },
    { key: "superior", label: "Superior Room" },
    { key: "deluxe", label: "Deluxe Room" },
    { key: "juniorSuite", label: "Junior Suite" },
    { key: "suite", label: "Suite" },
  ];

  const bedOptions = [
    { key: "queen", label: "1 Queen", cap: 2 },
    { key: "twin", label: "2 Twin", cap: 2 },
    { key: "king", label: "1 King", cap: 2 },
    { key: "queenSofa", label: "1 Queen + 1 Sofa", cap: 3 },
    { key: "kingSofa", label: "1 King + 1 Sofa", cap: 3 },
    { key: "twoQueen", label: "2 Queen", cap: 4 },
  ];

  const count = 3 + Math.floor(rnd() * 3);
  const rooms = [];

  for (let i = 0; i < count; i++) {
    const bed = pick(rnd, bedOptions);
    const roomType = pick(rnd, roomNames);
    const base = 45 + rnd() * 160;
    const mult = 1 + i * 0.18;
    const price = Math.round((base * mult) / 5) * 5;

    rooms.push({
      code: `R${i + 1}`,
      name: roomType.label,
      roomKey: roomType.key,
      capacity: bed.cap,
      beds: bed.label,
      bedKey: bed.key,
      refundable: rnd() < 0.55,
      breakfastIncluded: rnd() < 0.5,
      pricePerNight: price,
      currency,
      taxesIncluded: rnd() < 0.7,
      lastRooms: rnd() < 0.12 ? 3 + Math.floor(rnd() * 3) : null,

      inventory: 3 + Math.floor(rnd() * 8), // 3..10
    });
  }

  return rooms;
}

function genHotel(city, idxInCity) {
  const seed = hashStr(`${city.id}_${idxInCity}`);
  const rnd = mulberry32(seed);

  const stars = clamp(3 + Math.floor(rnd() * 3), 2, 5);
  const rating = Math.round((3.5 + rnd() * 1.4) * 10) / 10;
  const reviewCount = 60 + Math.floor(rnd() * 2200);

  const currency = "EUR";
  const name = `${pick(rnd, NAME_PART1)} ${pick(rnd, NAME_PART2)} ${
    idxInCity + 1
  }`;
  const neighborhood = pick(rnd, NEIGHBORHOODS);
  const neighborhoodKey = neighborhood.key;
  const neighborhoodLabel = neighborhood.label;
  const distanceFromCenterKm = Math.round((0.2 + rnd() * 6.5) * 10) / 10;

  // coordonate ușor variate
  const lat = city.lat + (rnd() - 0.5) * 0.08;
  const lon = city.lon + (rnd() - 0.5) * 0.08;

  const amenities = AMENITIES.filter(() => rnd() < 0.45);
  if (!amenities.includes("wifi")) amenities.push("wifi");

  const photos = genPhotos(rnd);
  const thumbnail = photos[0];

  const rooms = genRooms(rnd, currency);
  const priceFrom = rooms.reduce(
    (min, r) => Math.min(min, r.pricePerNight),
    Infinity
  );

  const description = `A ${stars}-star property in ${neighborhoodLabel}. Comfortable rooms, friendly staff, and easy access to the main attractions of ${city.city}.`;

  return {
    id: `${city.id}_H${idxInCity + 1}`,
    cityId: city.id,
    city: city.city,
    country: city.country,
    countryCode: city.countryCode,
    lat: Number(lat.toFixed(6)),
    lon: Number(lon.toFixed(6)),

    name,
    stars,
    rating,
    reviewCount,

    address: genAddress(rnd, city.city, city.country),
    neighborhood: neighborhoodLabel,
    neighborhoodKey,
    distanceFromCenterKm,

    description: {
      stars,
      neighborhoodKey,
      city: city.city,
    },

    highlights: [
      amenities.includes("breakfast")
        ? "breakfastAvailable"
        : "optionalBreakfast",
      amenities.includes("spa") ? "spa" : "comfort",
      amenities.includes("airport_shuttle")
        ? "airportShuttle"
        : "centralLocation",
    ],
    priceFrom,
    currency,

    amenities,

    contact: {
      phone: `+${30 + Math.floor(rnd() * 60)} ${
        100 + Math.floor(rnd() * 900)
      } ${100 + Math.floor(rnd() * 900)} ${100 + Math.floor(rnd() * 900)}`,
      email: `info.${city.id.toLowerCase()}${idxInCity + 1}@example-hotel.test`,
      website: `https://example-hotel.test/${city.id.toLowerCase()}/${
        idxInCity + 1
      }`,
    },

    policies: {
      checkInFrom: "15:00",
      checkOutUntil: "11:00",
      cancellationKey: rnd() < 0.6 ? "freeCancellation" : "nonRefundable",
      petsKey: rnd() < 0.35 ? "petsAllowed" : "noPets",
      smokingKey: rnd() < 0.25 ? "smokingAllowed" : "nonSmoking",
    },

    photos,
    thumbnail,

    rooms,

    updatedAt: new Date().toISOString(),
  };
}

// GEN
const HOTELS_PER_CITY = 30;
const all = [];

for (const c of cities) {
  for (let i = 0; i < HOTELS_PER_CITY; i++) {
    all.push(genHotel(c, i));
  }
}

fs.writeFileSync(outPath, JSON.stringify(all, null, 2), "utf8");
console.log(`✅ Generated ${all.length} hotels -> ${outPath}`);
