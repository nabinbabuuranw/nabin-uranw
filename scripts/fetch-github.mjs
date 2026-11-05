// Build-time GitHub snapshot = the static fallback the site ships with.
// Real data only: if GitHub cannot be reached, the previous data/github.json is kept as is.
// Each live-demo candidate URL is checked here too (HEAD, then GET) and only a 200 marks it live.
import fs from "node:fs";
import { GH_USER, normalizeList, profileFrom } from "../lib/gh-core.mjs";
const OUT = new URL("../data/github.json", import.meta.url);
const H = { "User-Agent": "nabin-babu-uranw-portfolio", Accept: "application/vnd.github+json" };
if (process.env.GITHUB_TOKEN) H.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function j(url) {
  const r = await fetch(url, { headers: H, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(url + " -> " + r.status);
  return r.json();
}
async function check(url) {
  for (const method of ["HEAD", "GET"]) {
    try {
      const r = await fetch(url, { method, redirect: "follow", signal: AbortSignal.timeout(10000), headers: { "User-Agent": "nabin-portfolio-linkcheck" } });
      if (r.status === 200) return true;
      if (method === "GET") return false;
    } catch { if (method === "GET") return false; }
  }
  return false;
}
try {
  const [user, list] = await Promise.all([
    j(`https://api.github.com/users/${GH_USER}`),
    j(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=pushed&type=owner`),
  ]);
  const repos = normalizeList(list);
  const checkedAt = new Date().toISOString();
  await Promise.all(repos.map(async (r) => {
    r.live = r.liveCandidate ? { url: r.liveCandidate, ok: await check(r.liveCandidate), checkedAt } : null;
  }));
  const data = { fetchedAt: checkedAt, source: "build", profile: profileFrom(list, user), repos };
  fs.writeFileSync(OUT, JSON.stringify(data, null, 1));
  console.log(`github snapshot: ${repos.length} repos; live demos verified: ${repos.filter((r) => r.live?.ok).map((r) => r.name).join(", ") || "none"}`);
} catch (e) {
  if (fs.existsSync(OUT)) console.warn("github fetch failed, keeping previous snapshot:", e.message);
  else throw e;
}
