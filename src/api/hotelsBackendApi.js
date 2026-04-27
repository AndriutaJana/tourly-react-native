import { apiGet } from "./backendClient";

export async function searchHotels({ cityId, lat, lon, currency = "EUR" }) {
  const res = await apiGet("/api/hotels/search", {
    cityId,
    lat: String(lat),
    lon: String(lon),
    currency,
  });
  return res.data || [];
}

export async function getHotelDetails(id) {
  const res = await apiGet(`/api/hotels/${id}`);
  return res.data;
}
