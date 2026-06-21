fetch("https://www.examtopics.com/discussions/eccouncil/", {
  headers: { "User-Agent": "Mozilla/5.0" },
})
  .then((r) => r.text())
  .then((h) => {
    const found = [...h.matchAll(/href="(\/discussions\/eccouncil\/view\/[^"]+312-50v13[^"]+)"/gi)];
    console.log("312-50v13 links on page 1:", found.length);
    if (found[0]) console.log("sample:", found[0][1]);
    const all = [...h.matchAll(/href="(\/discussions\/eccouncil\/view\/[^"]+)"/gi)];
    console.log("all eccouncil links:", all.length);
  });
