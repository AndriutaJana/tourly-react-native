import { apiGet, apiPost } from "../../api/backendClient";

export async function placesNearby({ lat, lon, kind, radius = 8000 }) {
  const r = await apiGet("/api/places/nearby", { lat, lon, kind, radius });
  return r?.results || [];
}

export async function placeDetails(xid) {
  const r = await apiGet("/api/places/details", { place_id: xid });
  return r?.result || null;
}

export async function bookPlace(payload) {
  const r = await apiPost("/api/places/book", payload);
  return r;
}

export async function getPlaceBookings() {
  const r = await apiGet("/api/places/bookings");
  return r?.bookings || [];
}

export async function getPlaceBooking(bookingId) {
  const r = await apiGet(`/api/places/booking/${bookingId}`);
  return r?.booking || null;
}

export async function cancelPlaceBooking(bookingId) {
  const r = await apiPost(`/api/places/booking/${bookingId}/cancel`);
  return r?.booking || null;
}
