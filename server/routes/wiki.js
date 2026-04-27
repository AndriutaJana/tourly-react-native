const router = require("express").Router();

router.get("/summary", async (req, res) => {
  try {
    const { title } = req.query;
    if (!title) return res.status(400).json({ error: "Missing title" });

    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title
    )}`;

    const r = await fetch(url);
    if (!r.ok) return res.json({});

    const data = await r.json();

    res.json({
      image: data.thumbnail?.source || null,
      description: data.extract || null,
      website: data.content_urls?.desktop?.page || null,
    });
  } catch {
    res.json({});
  }
});

function parseWikiTitle(wikipediaUrl) {
  try {
    const u = new URL(wikipediaUrl);
    const title = decodeURIComponent(u.pathname.split("/wiki/")[1] || "");
    const lang = u.hostname.split(".")[0] || "en";
    if (!title) return null;
    return { title, lang };
  } catch {
    return null;
  }
}

router.get("/summaryByUrl", async (req, res) => {
  try {
    const { wikipediaUrl } = req.query;
    if (!wikipediaUrl)
      return res.status(400).json({ error: "Missing wikipediaUrl" });

    const parsed = parseWikiTitle(wikipediaUrl);
    if (!parsed) return res.json({});

    const { title, lang } = parsed;
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title
    )}`;

    const r = await fetch(url);
    if (!r.ok) return res.json({});

    const data = await r.json();

    res.json({
      image: data.thumbnail?.source || data.originalimage?.source || null,
      description: data.extract || null,
      website: data.content_urls?.desktop?.page || null,
    });
  } catch {
    res.json({});
  }
});

router.get("/search", async (req, res) => {
  try {
    const { q, limit = 1 } = req.query;
    if (!q) return res.status(400).json({ error: "Missing q" });

    const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
      q
    )}&limit=${encodeURIComponent(limit)}&namespace=0&format=json&origin=*`;

    const r = await fetch(url);
    if (!r.ok) return res.json({ titles: [] });

    const data = await r.json();
    const titles = Array.isArray(data?.[1]) ? data[1] : [];

    res.json({ titles });
  } catch (e) {
    res.json({ titles: [] });
  }
});

module.exports = router;
