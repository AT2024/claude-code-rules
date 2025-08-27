import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";

const SOURCES = [
  { id: "best_practices", url: "https://www.anthropic.com/engineering/claude-code-best-practices" },
  { id: "headless", url: "https://docs.anthropic.com/en/docs/claude-code/sdk/sdk-headless" },
  { id: "think_tool", url: "https://www.anthropic.com/engineering/claude-think-tool" }
];

const norm = (s) => s.replace(/\s+/g, " ").trim();

async function scrape() {
  const out = {
    version: "",
    updated_at: new Date().toISOString(),
    source_urls: SOURCES.map(s => s.url),
    rules: []
  };

  for (const src of SOURCES) {
    const res = await fetch(src.url);
    const html = await res.text();
    const $ = cheerio.load(html);

    $("h2, h3").each((_, el) => {
      const title = norm($(el).text());
      const chunk = [];
      let p = $(el).next();
      for (let i = 0; i < 4 && p.length; i++) {
        if (["UL","OL","P","PRE","DIV"].includes((p.prop("tagName") || "").toUpperCase())) {
          chunk.push(norm(p.text()));
        }
        p = p.next();
      }
      const guidance = norm(chunk.join(" "));
      if (title && guidance) {
        out.rules.push({
          id: `${src.id}:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          title,
          guidance,
          rationale: "",
          tags: [src.id]
        });
      }
    });
  }

  out.version = `v${out.rules.length}-${new Date().toISOString().slice(0,10)}`;
  fs.mkdirSync("public", { recursive: true });
  fs.writeFileSync("public/claude_code_rules.json", JSON.stringify(out, null, 2));
  console.log("Wrote public/claude_code_rules.json with", out.rules.length, "rules");
}

scrape().catch((e) => { console.error(e); process.exit(1); });
