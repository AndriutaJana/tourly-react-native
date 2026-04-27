import { apiGet } from "./backendClient";

export async function searchHotels({
  cityId,
  limit = 30,
  checkIn,
  checkOut,
  onlyAvailable,
} = {}) {
  const res = await apiGet("/api/hotels/search", {
    cityId,
    limit: String(limit),
    checkIn,
    checkOut,
    onlyAvailable: String(!!onlyAvailable), // "true" / "false"
  });
  return res.data || [];
}

export async function getHotelDetails(id) {
  const res = await apiGet(`/api/hotels/${id}`);
  return res.data;
}
