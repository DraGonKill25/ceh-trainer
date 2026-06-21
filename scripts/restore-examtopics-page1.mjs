import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src", "data", "examtopics.json");

const html = await (
  await fetch("https://www.examtopics.com/exams/eccouncil/312-50v13/view/", {
    headers: { "User-Agent": "Mozilla/5.0" },
  })
).text();

const parts = html.split('class="card-body question-body"');
const qs = [];

for (let i = 1; i < parts.length; i++) {
  const block = parts[i];
  const qm = block.match(/<p class="card-text">([\s\S]*?)<\/p>/);
  if (!qm) continue;
  const q = qm[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const cms = [
    ...block.matchAll(/data-choice-letter="([A-H])"[\s\S]*?<\/span>\s*([\s\S]*?)<\/li>/g),
  ];
  const choices = cms.map((m) => m[2].replace(/<[^>]+>/g, "").trim());
  const ans = block.match(/<span class="correct-answer">([A-H,\s]+)</)?.[1]?.trim();
  if (!ans || choices.length < 2) continue;
  const correct = ans
    .split(/[,\s]+/)
    .filter((l) => /^[A-H]$/.test(l))
    .map((l) => l.charCodeAt(0) - 65);
  qs.push({ id: qs.length + 1, q, choices, correct, multi: correct.length > 1, source: "examtopics" });
}

writeFileSync(OUT, JSON.stringify(qs, null, 2));
console.log("Restored", qs.length, "ExamTopics questions →", OUT);
