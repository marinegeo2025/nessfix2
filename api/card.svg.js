import { scrapeLHFA } from "./_scrape.js";
import { buildSVG } from "./_card-template.js";

export default async function handler(req, res) {
  try {
    const data = await scrapeLHFA();
    const svg = buildSVG(data);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.status(200).send(svg);
  } catch (e) {
    res.status(500).send(`<svg xmlns="http://www.w3.org/2000/svg"><text x="20" y="100">Error: ${String(e)}</text></svg>`);
  }
}
