import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const URL = "https://www.lhfa.org.uk/league/";
const NORM = (s) => (s || "").replace(/\s+/g, " ").trim();

function cleanMid(midRaw) {
  let s = NORM(midRaw);
  s = s.replace(/\b(\d{1,2}):(\d{2}):00\b/g, "$1:$2");
  return s;
}

function parseDateCell(s) {
  const t = s || "";
  const iso = t.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const dm = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dm) return `${dm[3]}-${String(dm[2]).padStart(2, "0")}-${String(dm[1]).padStart(2, "0")}`;
  return NORM(t);
}

const TIME_RE = /^\d{1,2}:\d{2}$/;

export async function scrapeLHFA() {
  const executablePath = await chromium.executablePath();

  const browser = await puppeteer.launch({
    executablePath,
    args: chromium.args,
    headless: "shell",
    defaultViewport: { width: 1200, height: 800 }
  });

  try {
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });

    const { standings, fixturesRaw } = await page.evaluate(() => {
      const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
      const out = { standings: [], fixturesRaw: [] };
      const tables = Array.from(document.querySelectorAll("table"));

      // standings
      if (tables[0]) {
        const rows = Array.from(tables[0].querySelectorAll("tbody tr, tr"));
        for (const tr of rows) {
          const tds = tr.querySelectorAll("td");
          if (tds.length >= 3) {
            const pos = norm(tds[0]?.textContent);
            const team = norm(tds[1]?.textContent);
            const points = norm(tds[tds.length - 1]?.textContent);
            if (team) out.standings.push({ pos, team, points });
          }
        }
      }

      // fixtures
      const fixturesTable = tables.find((t) => {
        const heads = Array.from(t.querySelectorAll("thead th, tr:first-child th, tr:first-child td"))
          .map((el) => norm(el.textContent).toLowerCase());
        return heads.includes("date") && heads.includes("home") && heads.includes("away");
      });

      if (fixturesTable) {
        const rows = Array.from(fixturesTable.querySelectorAll("tbody tr, tr"));
        for (const tr of rows) {
          const tds = tr.querySelectorAll("td");
          if (tds.length >= 4) {
            out.fixturesRaw.push({
              date: norm(tds[0]?.textContent),
              home: norm(tds[1]?.textContent),
              mid:  norm(tds[2]?.textContent),
              away: norm(tds[3]?.textContent),
            });
          }
        }
      }

      return out;
    });

    const fixtures = fixturesRaw
      .map((r) => {
        const date = parseDateCell(r.date);
        const mid = cleanMid(r.mid);
        const isTime = TIME_RE.test(mid);
        return {
          date,
          time: isTime ? mid : "",
          home: r.home,
          away: r.away,
          result: isTime ? "" : mid,
        };
      })
      .filter((f) => /ness/i.test(f.home) || /ness/i.test(f.away));

    return { standings, fixtures, updatedAt: new Date().toISOString() };
  } finally {
    await browser.close();
  }
}
