import { apiGet } from "./backendClient";

export async function enrichWithWiki(place, cityName) {
  try {
    if (place?.wikipedia) {
      const sum = await apiGet("/api/wiki/summaryByUrl", {
        wikipediaUrl: place.wikipedia,
      });

      return {
        ...place,
        preview: place.preview || sum.image || null,
        description: place.description || sum.description || null,
        website: place.website || sum.website || null,
      };
    }

    const q = `${place?.name || ""} ${cityName || ""}`.trim();
    if (q.length < 3) return place;

    const search = await apiGet("/api/wiki/search", { q, limit: 1 });
    const title = search?.titles?.[0] || null;
    if (!title) return place;

    const sum2 = await apiGet("/api/wiki/summary", { title });

    return {
      ...place,
      preview: place.preview || sum2.image || null,
      description: place.description || sum2.description || null,
      website: place.website || sum2.website || null,
      wikipedia: sum2.website || null,
    };
  } catch {
    return place;
  }
}
