import { readFileSync, writeFileSync } from "fs";

const src = readFileSync("CEH_Trainer.jsx", "utf8");
const marker = "// ---------- utils ----------";
const idx = src.indexOf(marker);
if (idx < 0) throw new Error("marker not found");

const header = `import React, { useState, useMemo, useEffect, useRef } from "react";
import QUESTIONS_DATA from "./data/questions.json";

const QUESTIONS = QUESTIONS_DATA;

`;

writeFileSync("ceh-trainer/src/App.jsx", header + src.slice(idx));
console.log("App.jsx rebuilt");
