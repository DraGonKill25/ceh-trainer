/**
 * Merge all question sources into a single deduplicated bank
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "src", "data");
const OUT = join(DATA, "questions.json");

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ?.,\-]/g, "")
    .trim()
    .slice(0, 120);
}

function loadJson(path) {
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf8"));
}

function main() {
  const examtopics = loadJson(join(DATA, "examtopics.json"));
  const dumpsbase = loadJson(join(DATA, "dumpsbase.json"));
  const trainer = loadJson(join(DATA, "trainer.json"));

  const seen = new Set();
  const merged = [];

  for (const q of [...examtopics, ...trainer, ...dumpsbase]) {
    if (!q.q || !q.choices || q.choices.length < 2) continue;
    if (!q.correct || q.correct.length === 0) continue;

    const key = normalize(q.q);
    if (seen.has(key)) continue;
    seen.add(key);

    merged.push({
      id: merged.length + 1,
      q: q.q,
      choices: q.choices,
      correct: q.correct,
      multi: q.multi || q.correct.length > 1,
      source: q.source || "unknown",
    });
  }

  writeFileSync(OUT, JSON.stringify(merged, null, 2), "utf8");
  console.log(`Merged ${merged.length} unique questions`);
  console.log(`  ExamTopics: ${examtopics.length}`);
  console.log(`  Trainer:    ${trainer.length}`);
  console.log(`  DumpsBase:  ${dumpsbase.length}`);
  console.log(`→ ${OUT}`);
}

main();
