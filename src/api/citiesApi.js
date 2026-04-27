import { apiGet } from "./backendClient";

export async function searchCities(prefix, { limit = 5 } = {}) {
  const q = (prefix || "").trim();
  if (q.length < 2) return [];
  const res = await apiGet("/api/cities/search", { q, limit: String(limit) });
  return res.data || [];
}
