import { scrapeLHFA } from "./_scrape.js";

export default async function handler(req, res) {
  try {
    const data = await scrapeLHFA();
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
