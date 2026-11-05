import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const OUT = new URL("../out/", import.meta.url).pathname;
const html = fs.readFileSync(path.join(OUT, fs.existsSync(path.join(OUT, "__p/index.html")) ? "__p/index.html" : "index.html"), "utf8");
const all = [html, ...fs.readdirSync(path.join(OUT, "_next/static/chunks"), { recursive: true }).filter((f) => String(f).endsWith(".js")).map((f) => fs.readFileSync(path.join(OUT, "_next/static/chunks", String(f)), "utf8"))].join("\n");

test("metadata", () => {
  assert.match(html, /<title>Nabin Babu Uranw — Independent Full-Stack Developer<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]{80,}"/);
  assert.match(html, /property="og:image" content="https:\/\/nabin-uranw\.sites\.tab\.bot\/og\.png"/);
  assert.match(html, /rel="canonical" href="https:\/\/nabin-uranw\.sites\.tab\.bot"/);
  assert.match(html, /"@type":"Person"/);
  assert.match(html, /"addressLocality":"Inaruwa"/);
});
test("sections + hero copy + contact links", () => {
  for (const id of ["top", "about", "projects", "skills", "services", "process", "contact"]) assert.ok(html.includes(`id="${id}"`), id);
  for (const t of ["Explore Projects", "Contact Me", "GitHub Profile", "Independent Full-Stack Developer", "Inaruwa, Sunsari, Nepal",
    "I design and develop modern websites, web applications, and digital products with a strong focus on functionality, performance, security, and user experience.",
    'href="tel:+9779764465688"', 'href="https://wa.me/9779764465688"', "Back to top", "Discover", "Deploy"]) assert.ok(html.includes(t), t);
});
test("real GitHub data only; no v1 hand-written projects; no AI-powered wording", () => {
  const gh = JSON.parse(fs.readFileSync(new URL("../data/github.json", import.meta.url)));
  assert.equal(gh.profile.login, "nabinbabuuranw");
  for (const r of gh.repos) assert.ok(html.includes(r.name), r.name);
  for (const bad of ["SONORA", "Tick-ninja", "Nexa Browser", "Arrow Genius", "Inaruwa English Boarding", "nabinuranw696", "agent1xbetnepal88", "Rustic", "#EB5E28"]) {
    // a banned v1 string is allowed only when it is real GitHub data (e.g. the public "iebs" repo's own description)
    if (gh.repos.some((r) => (r.description || "").includes(bad) || r.name.includes(bad))) continue;
    assert.ok(!html.includes(bad), bad);
  }
  for (const bad of [/AI-Powered/i, /powered by AI/i, /AI builds/i, /use AI to build/i, /lorem ipsum/i, /testimonial/i]) assert.ok(!bad.test(all), String(bad));
});
