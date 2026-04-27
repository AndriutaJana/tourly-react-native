import { apiGet, apiPost } from "./backendClient";

export async function createHotelBooking(payload) {
  // payload: { hotel, guest, dates, room }
  const res = await apiPost("/api/hotel-bookings", payload);
  return res;
}

export async function getHotelBookingById(id) {
  const res = await apiGet(`/api/hotel-bookings/${id}`);
  return res;
}

export async function getHotelBookings() {
  const res = await apiGet("/api/hotel-bookings");
  return res?.bookings ?? [];
}

export async function payHotelBooking(id, body) {
  const res = await apiPost(`/api/hotel-bookings/${id}/pay`, body);
  return res;
}

export async function cancelHotelBooking(id) {
  const res = await apiPost(`/api/hotel-bookings/${id}/cancel`, {});
  return res;
}

export async function requestHotelRefund(id) {
  const res = await apiPost(`/api/hotel-bookings/${id}/refund`, {});
  return res;
}
