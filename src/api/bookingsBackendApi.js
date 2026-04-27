import { apiPost, apiGet } from "./backendClient";

export async function createBooking({ offer, passenger, signal }) {
  return apiPost("/api/bookings", { offer, passenger }, { signal });
}

export async function getBookings({ signal } = {}) {
  const res = await apiGet("/api/bookings", { signal });
  return Array.isArray(res) ? res : res?.bookings ?? [];
}

export async function getBookingById(bookingId, { signal } = {}) {
  if (!bookingId) throw new Error("Missing bookingId");
  return apiGet(`/api/bookings/${bookingId}`, { signal });
}

export async function cancelBooking(bookingId, { signal } = {}) {
  if (!bookingId) throw new Error("Missing bookingId");
  return apiPost(`/api/bookings/${bookingId}/cancel`, {}, { signal });
}

export async function payBooking(
  bookingId,
  { cardLast4 = "4242", signal } = {}
) {
  if (!bookingId) throw new Error("Missing bookingId");
  return apiPost(`/api/bookings/${bookingId}/pay`, { cardLast4 }, { signal });
}
export async function requestRefund(bookingId, { signal } = {}) {
  if (!bookingId) throw new Error("Missing bookingId");
  return apiPost(`/api/bookings/${bookingId}/refund`, {}, { signal });
}
