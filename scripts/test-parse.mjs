fetch("https://www.examtopics.com/exams/eccouncil/312-50v13/view/", {
  headers: { "User-Agent": "Mozilla/5.0" },
})
  .then((r) => r.text())
  .then((h) => {
    const parts = h.split('class="card-body question-body"');
    console.log("parts", parts.length - 1);
    const block = parts[1];
    const qMatch = block.match(/<p class="card-text">([\s\S]*?)<\/p>/);
    console.log("q", qMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 80));
    const choices = [
      ...block.matchAll(/data-choice-letter="([A-H])"[\s\S]*?<\/span>\s*([\s\S]*?)<\/li>/g),
    ];
    console.log(
      "choices",
      choices.length,
      choices.map((c) => c[1] + ":" + c[2].replace(/<[^>]+>/g, "").trim().slice(0, 30))
    );
    const ans = block.match(/correct-answer">([A-H])/);
    console.log("answer", ans?.[1]);
  });
