/**
 * Parse DumpsBase CEH 312-50v13 HTML dump
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = join(__dirname, "..", "data", "dumpsbase.html");
const OUT = join(__dirname, "..", "src", "data", "dumpsbase.json");

// Answer key — DumpsBase V8.02 free dump (CEH 312-50v13)
const ANSWERS = {
  1: 3, 2: 0, 3: 0, 4: 1, 5: 3, 6: 2, 7: 1, 8: 2, 9: 0, 10: 0,
  11: 2, 12: 1, 13: 0, 14: 0, 15: 3, 16: 1, 17: 0, 18: 1, 19: 0, 20: 0,
  21: 3, 22: 0, 23: 3, 24: 2, 25: 1, 26: 2, 27: 0, 28: 3, 29: 3, 30: 1,
  31: 1, 32: 2, 33: 3, 34: 0, 35: 1, 36: 1, 37: 0, 38: 2, 39: 1, 40: 1,
  41: 3, 42: 1, 43: 0, 44: 2, 45: 0, 46: 0, 47: 1, 48: 0, 49: 3, 50: 3,
  51: 3, 52: 3, 53: 2, 54: 3, 55: 1, 56: 1, 57: 0, 58: 0, 59: 2, 60: 0,
  61: 3, 62: 0, 63: 0, 64: 1, 65: 0, 66: 2, 67: 1,
};

function clean(s) {
  return s.replace(/\\./g, ".").replace(/\\\$/g, "$").replace(/\\-/g, "-").trim();
}

function parseHtml(html) {
  const start = html.indexOf("1\\. User A is writing");
  const end = html.indexOf("Loading... Loading...");
  const section = start > 0 ? html.slice(start, end > start ? end : undefined) : html;

  const questions = [];
  const regex = /\n(\d+)\\.\s+([\s\S]*?)(?=\n\d+\\.\s+|\nLoading)/g;
  let match;

  while ((match = regex.exec(section)) !== null) {
    const num = parseInt(match[1], 10);
    const block = match[2].trim();
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);

    if (lines.length < 5) continue;

    const choices = lines.slice(-4).map(clean);
    const qText = lines.slice(0, -4).join("\n");

    if (choices.length === 4 && qText) {
      questions.push({
        num,
        q: clean(qText),
        choices,
        correct: ANSWERS[num] !== undefined ? [ANSWERS[num]] : [],
        multi: false,
        source: "dumpsbase",
      });
    }
  }

  return questions;
}

function main() {
  const html = readFileSync(HTML, "utf8");
  const parsed = parseHtml(html);
  const withIds = parsed.map((q, i) => ({
    id: i + 1,
    q: q.q,
    choices: q.choices,
    correct: q.correct,
    multi: q.multi,
    source: q.source,
  }));

  const dir = dirname(OUT);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(OUT, JSON.stringify(withIds, null, 2), "utf8");
  console.log(`Parsed ${withIds.length} DumpsBase questions → ${OUT}`);
}

main();
