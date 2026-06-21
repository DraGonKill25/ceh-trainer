/**
 * Scrape CEH 312-50v13 questions from ExamTopics (pages 1-97, ~965 questions)
 * Usage: node scripts/scrape-examtopics.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "src", "data", "examtopics.json");
const BASE = "https://www.examtopics.com/exams/eccouncil/312-50v13/view";
const TOTAL_PAGES = 97;
const DELAY_MS = 500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function parsePage(html) {
  const questions = [];
  const parts = html.split('class="card-body question-body"');

  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];

    const qMatch = block.match(/<p class="card-text">([\s\S]*?)<\/p>/);
    if (!qMatch) continue;
    const qText = stripHtml(qMatch[1]);
    if (!qText || qText.length < 10) continue;

    const choiceMatches = [
      ...block.matchAll(/data-choice-letter="([A-H])"[\s\S]*?<\/span>\s*([\s\S]*?)<\/li>/g),
    ];
    if (choiceMatches.length < 2) continue;

    const choices = choiceMatches.map((m) => stripHtml(m[2]));

    let correctLetters =
      block.match(/<span class="correct-answer">([A-H,\s]+)<\/span>/)?.[1]?.trim() ||
      block.match(/Correct Answer:\s*([A-H,\s]+)/i)?.[1]?.trim();

    if (!correctLetters) {
      const jsonMatch = block.match(/type="application\/json">(\[[\s\S]*?\])<\/script>/);
      if (jsonMatch) {
        try {
          const votes = JSON.parse(jsonMatch[1]);
          const top = votes.find((v) => v.is_most_voted) || votes[0];
          if (top) correctLetters = top.voted_answers.replace(/[^A-H,]/g, "");
        } catch {
          /* ignore */
        }
      }
    }

    if (!correctLetters) continue;

    const letters = correctLetters.split(/[,\s]+/).filter((l) => /^[A-H]$/.test(l));
    const correct = letters.map((l) => l.charCodeAt(0) - 65).filter((idx) => idx < choices.length);

    if (!correct.length) continue;

    questions.push({
      q: qText,
      choices,
      correct,
      multi: correct.length > 1,
      source: "examtopics",
    });
  }

  return questions;
}

async function fetchPage(page) {
  const url = page === 1 ? `${BASE}/` : `${BASE}/${page}/`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for page ${page}`);
  return res.text();
}

async function main() {
  const all = [];
  console.log(`Scraping ExamTopics 312-50v13 (${TOTAL_PAGES} pages)...`);

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    try {
      const html = await fetchPage(page);
      const qs = parsePage(html);
      all.push(...qs);
      process.stdout.write(`\rPage ${page}/${TOTAL_PAGES} — ${all.length} questions`);
      await sleep(DELAY_MS);
    } catch (err) {
      console.error(`\nError page ${page}:`, err.message);
    }
  }

  console.log(`\nDone: ${all.length} questions`);

  const dir = dirname(OUT);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const withIds = all.map((q, i) => ({ id: i + 1, ...q }));
  writeFileSync(OUT, JSON.stringify(withIds, null, 2), "utf8");
  console.log(`Saved → ${OUT}`);
}

main().catch(console.error);
