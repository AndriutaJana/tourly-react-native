import { apiGet } from "./backendClient";

export async function searchFlights({
  origin,
  destination,
  date,
  adults = 1,
  max = 20,
  direct = false,
  signal,
}) {
  return apiGet("/api/flights", {
    origin,
    destination,
    date,
    adults,
    max,
    direct: direct ? "1" : "0",
    signal,
  });
}
