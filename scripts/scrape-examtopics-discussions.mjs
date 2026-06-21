/**
 * Scrape CEH 312-50v13 via ExamTopics discussion pages (bypass captcha)
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "src", "data", "examtopics.json");
const DISCUSSIONS = join(__dirname, "..", "data", "discussion-links.txt");
const CONCURRENCY = 8;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0";

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDiscussion(html) {
  let qText = "";
  const cardText = html.match(/<p class="card-text">([\s\S]*?)<\/p>/);
  if (cardText) qText = stripHtml(cardText[1]);

  if (!qText) {
    const alt = html.match(/\[All 312-50v13 Questions\][\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    if (alt) qText = stripHtml(alt[1]);
  }

  const choices = [];
  const patterns = [
    /data-choice-letter="([A-H])"[\s\S]*?<\/span>\s*([\s\S]*?)<\/li>/g,
    /-\s*([A-H])\.\s+([^\n<]+)/g,
  ];

  for (const re of patterns) {
    if (choices.length >= 2) break;
    let m;
    while ((m = re.exec(html)) !== null) {
      choices.push({ letter: m[1], text: stripHtml(m[2]) });
    }
  }

  const unique = [];
  const seen = new Set();
  for (const c of choices) {
    if (!seen.has(c.letter)) {
      seen.add(c.letter);
      unique.push(c);
    }
  }

  const answer =
    html.match(/Suggested Answer:\s*([A-H,\s]+)/i)?.[1]?.trim() ||
    html.match(/<span class="correct-answer">([A-H,\s]+)<\/span>/)?.[1]?.trim() ||
    html.match(/Correct Answer:\s*([A-H,\s]+)/i)?.[1]?.trim();

  if (!answer || !qText || unique.length < 2) return null;

  const letters = answer.replace(/🗳️/g, "").split(/[,\s]+/).filter((l) => /^[A-H]$/.test(l));
  const correct = letters.map((l) => l.charCodeAt(0) - 65).filter((i) => i < unique.length);

  if (!correct.length) return null;

  return {
    q: qText,
    choices: unique.map((c) => c.text),
    correct,
    multi: correct.length > 1,
    source: "examtopics",
  };
}

async function discoverLinks() {
  const links = new Set();
  for (let page = 1; page <= 300; page++) {
    const url =
      page === 1
        ? "https://www.examtopics.com/discussions/eccouncil/"
        : `https://www.examtopics.com/discussions/eccouncil/${page}/`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) break;
    const html = await res.text();
    const found = [...html.matchAll(/href="(\/discussions\/eccouncil\/view\/[^"]*312-50v13[^"]+)"/gi)];
    if (!found.length && page > 1) break;
    found.forEach((x) => links.add("https://www.examtopics.com" + x[1]));
    process.stdout.write(`\rDiscovered ${links.size} links (page ${page})   `);
    await sleep(200);
  }
  console.log();
  return [...links];
}

async function fetchBatch(urls) {
  return Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { headers: { "User-Agent": UA } });
        if (!res.ok) return null;
        return parseDiscussion(await res.text());
      } catch {
        return null;
      }
    })
  );
}

async function main() {
  let links;
  if (existsSync(DISCUSSIONS)) {
    links = readFileSync(DISCUSSIONS, "utf8").trim().split("\n").filter(Boolean);
    console.log(`Using ${links.length} cached discussion links`);
  } else {
    links = await discoverLinks();
    mkdirSync(dirname(DISCUSSIONS), { recursive: true });
    writeFileSync(DISCUSSIONS, links.join("\n"), "utf8");
    console.log(`Cached ${links.length} links`);
  }

  const questions = [];
  const seen = new Set();

  for (let i = 0; i < links.length; i += CONCURRENCY) {
    const batch = links.slice(i, i + CONCURRENCY);
    const results = await fetchBatch(batch);
    for (const q of results) {
      if (!q) continue;
      const key = q.q.slice(0, 100).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      questions.push({ id: questions.length + 1, ...q });
    }
    process.stdout.write(`\rScraped ${questions.length} unique / ${Math.min(i + CONCURRENCY, links.length)} links`);
    await sleep(150);
  }

  console.log(`\nTotal: ${questions.length} questions`);

  const dir = dirname(OUT);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(OUT, JSON.stringify(questions, null, 2), "utf8");
  console.log(`Saved → ${OUT}`);
}

main().catch(console.error);
