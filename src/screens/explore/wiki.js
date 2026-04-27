import { apiGet } from "../../api/backendClient";
import { getFromCache, setToCache } from "./wikiCache";
import { unsplashPhoto } from "./unsplash";

function cleanTitle(name = "") {
  return name
    .replace(/\(.*?\)/g, "")
    .replace(/restaurant|cafe|bar|bistro/gi, "")
    .trim();
}

export async function wikiEnrich(place) {
  const key = place.name.toLowerCase();
  const cached = getFromCache(key);
  if (cached) return { ...place, ...cached };

  try {
    const wikiTitle = cleanTitle(place.name);
    const res = await apiGet("/api/wiki/summary", { title: wikiTitle });

    if (res?.image) {
      const enriched = {
        preview: res.image,
        description: res.description,
        website: res.website,
        imageSource: "wikipedia",
      };
      setToCache(key, enriched);
      return { ...place, ...enriched };
    }

    const u = await unsplashPhoto(`${wikiTitle} ${place.city || ""}`.trim());
    if (u?.image) {
      const enriched = {
        preview: u.image,
        imageThumb: u.thumb || null,
        imageSource: "unsplash",
        photoCredit: u.author ? `Photo by ${u.author} on Unsplash` : null,
        photoCreditUrl: u.unsplashUrl || u.authorUrl || null,
      };
      setToCache(key, enriched);
      return { ...place, ...enriched };
    }

    return place;
  } catch {
    return place;
  }
}
