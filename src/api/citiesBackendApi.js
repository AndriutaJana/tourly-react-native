import { apiGet } from "./backendClient";

export async function getCities() {
  return apiGet("/api/cities");
}
