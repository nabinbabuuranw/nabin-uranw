// Cloudflare Worker in front of the static export.
//   POST /api/contact        -> Zod validation, honeypot, time-trap, per-IP rate limit (D1), store (D1)
//   POST /api/contact/ack    -> the browser reports the email relay's answer (audit column only)
//   GET  /api/contact/inbox  -> stored messages (Bearer token; only its SHA-256 lives here)
//   GET  /api/projects       -> GitHub repos, cached 1 h in D1 (ETag), stale copy, then build snapshot on failure
//   GET  /api/readme/:repo   -> README for the detail view, cached 6 h
//   everything else          -> static assets, with security headers
import { contactSchema } from "../lib/contact-schema";
// @ts-ignore shared JS module
import { GH_USER, normalizeList, profileFrom } from "../lib/gh-core.mjs";
import SNAPSHOT from "../data/github.json";
import * as WR from "./requests";

interface D1Stmt { bind(...v: unknown[]): D1Stmt; run(): Promise<unknown>; first<T = any>(): Promise<T | null>; all<T = any>(): Promise<{ results: T[] }> }
interface D1 { prepare(q: string): D1Stmt; batch(s: D1Stmt[]): Promise<unknown>; exec(q: string): Promise<unknown> }
interface Env { ASSETS: { fetch: (r: Request) => Promise<Response> }; DB?: D1 }

let schemaReady = false;
async function ensureSchema(db: D1) {
  if (schemaReady) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, name TEXT, email TEXT, subject TEXT, message TEXT, iphash TEXT, country TEXT, delivered INTEGER, delivery TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS rate (k TEXT PRIMARY KEY, n INTEGER NOT NULL, exp INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS kvcache (k TEXT PRIMARY KEY, v TEXT NOT NULL, exp INTEGER NOT NULL)"),
  ]);
  schemaReady = true;
}

const INBOX_TOKEN_SHA256 = "__TOKEN_HASH__";
const SIM_KEY = "__SIM_KEY__";
const RATE = { max: 3, windowSec: 600, dailyMax: 20 };

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://avatars.githubusercontent.com",
  "font-src 'self'",
  "connect-src 'self' https://formsubmit.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' mailto:",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");
const CLERK_HOST = "https://__CLERK_HOST__";
const ADMIN_CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${CLERK_HOST} https://cdn.protect.clerk.com https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://img.clerk.com",
  "font-src 'self'",
  `connect-src 'self' ${CLERK_HOST} https://cdn.protect.clerk.com https://*.clerk.com https://*.protect.clerk.com:* https://clerk-telemetry.com`,
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  `form-action 'self' ${CLERK_HOST}`,
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

function secure(res: Response, extra: Record<string, string> = {}, csp = CSP) {
  const h = new Headers(res.headers);
  h.set("Content-Security-Policy", csp);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("X-Frame-Options", "DENY");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.delete("X-Powered-By");
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  secure(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } }));

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

async function rateLimited(env: Env, ipKey: string) {
  if (!env.DB) return false;
  await ensureSchema(env.DB);
  const now = Math.floor(Date.now() / 1000);
  const k1 = `w:${ipKey}:${Math.floor(now / RATE.windowSec)}`, k2 = `d:${ipKey}:${new Date().toISOString().slice(0, 10)}`;
  const up = "INSERT INTO rate (k, n, exp) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n";
  const [a, b] = await Promise.all([
    env.DB.prepare(up).bind(k1, now + RATE.windowSec * 2).first<{ n: number }>(),
    env.DB.prepare(up).bind(k2, now + 172800).first<{ n: number }>(),
  ]);
  if (Math.random() < 0.05) await env.DB.prepare("DELETE FROM rate WHERE exp < ?").bind(now).run();
  return (a?.n ?? 0) > RATE.max || (b?.n ?? 0) > RATE.dailyMax;
}

async function contact(req: Request, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
  const url = new URL(req.url);
  const origin = req.headers.get("origin");
  if (origin && origin !== url.origin) return json({ ok: false, error: "forbidden_origin" }, 403);
  if (!(req.headers.get("content-type") || "").includes("application/json")) return json({ ok: false, error: "json_required" }, 415);
  const len = Number(req.headers.get("content-length") || 0);
  if (len > 16000) return json({ ok: false, error: "too_large" }, 413);
  let raw: unknown;
  try { raw = JSON.parse((await req.text()).slice(0, 16000)); } catch { return json({ ok: false, error: "bad_json" }, 400); }

  // honeypot + time-trap: answer like success, store nothing
  const r0 = raw as Record<string, unknown>;
  if (typeof r0?.website === "string" && r0.website.length > 0) return json({ ok: true });
  if (typeof r0?.elapsedMs === "number" && r0.elapsedMs < 2500) return json({ ok: true });

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) { const k = String(i.path[0] ?? "form"); if (!errors[k]) errors[k] = i.message; }
    return json({ ok: false, error: "invalid", errors }, 400);
  }
  const ip = req.headers.get("cf-connecting-ip") || "unknown";
  const iphash = (await sha256(ip + ":nu")).slice(0, 16);
  if (await rateLimited(env, iphash)) return json({ ok: false, error: "rate_limited" }, 429, { "retry-after": String(RATE.windowSec) });

  const d = parsed.data;
  const id = `${new Date().toISOString()}-${crypto.randomUUID().slice(0, 8)}`;
  const msg = { id, name: clean(d.name), email: d.email, subject: clean(d.subject || ""), message: clean(d.message) };
  const ins = env.DB
    ? env.DB.prepare("INSERT INTO messages (id, created_at, name, email, subject, message, iphash, country, delivered, delivery) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)")
        .bind(id, new Date().toISOString(), msg.name, msg.email, msg.subject, msg.message, iphash, (req as any).cf?.country ?? null)
    : null;
  if (ins) await ins.run(); // stored before delivery, so nothing is lost
  return json({ ok: true, id, stored: !!env.DB });
}

// The browser reports whether the email relay accepted the message (audit only; never trusted for anything else).
async function ack(req: Request, env: Env) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return json({ ok: false }, 403);
  let b: any; try { b = JSON.parse((await req.text()).slice(0, 2000)); } catch { return json({ ok: false }, 400); }
  if (!env.DB || typeof b?.id !== "string" || !/^[0-9T:.\-Z]+-[0-9a-f]{8}$/.test(b.id)) return json({ ok: false }, 400);
  await ensureSchema(env.DB);
  await env.DB.prepare("UPDATE messages SET delivered = ?, delivery = ? WHERE id = ? AND delivery IS NULL").bind(b.ok ? 1 : 0, JSON.stringify({ via: "browser-relay", ok: !!b.ok, detail: String(b.detail ?? "").slice(0, 160) }), b.id).run();
  return json({ ok: true });
}

async function inbox(req: Request, env: Env) {
  const auth = req.headers.get("authorization") || "";
  const tok = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!tok || (await sha256(tok)) !== INBOX_TOKEN_SHA256) return json({ ok: false, error: "unauthorized" }, 401);
  if (!env.DB) return json({ ok: false, error: "no_store" }, 503);
  await ensureSchema(env.DB);
  const { results } = await env.DB.prepare("SELECT * FROM messages ORDER BY created_at DESC LIMIT 100").all();
  return json({ ok: true, count: results.length, items: results });
}

// ---------------------------------------------------------------------------------------------
// GitHub auto-discovery ("ISR" at the edge)
//   GET /api/projects      -> repos of GH_USER, cached in D1 for 1 h (conditional request with ETag,
//                             so an unchanged list costs no rate limit). On error / rate limit it serves
//                             the last good copy from D1, else the snapshot bundled at build time.
//   GET /api/readme/:repo  -> the repo's README (raw), cached 6 h, stale copy on error.
// Live Demo: a candidate URL (repo homepage or a known live URL) is HEAD-checked and cached 6 h;
// only a 200 shows the button. A check that cannot complete keeps the last verified answer.
// ---------------------------------------------------------------------------------------------
const TTL_PROJECTS = 3600, TTL_DEMO = 6 * 3600, TTL_README = 6 * 3600;
const GH_H: Record<string, string> = { "user-agent": "nabin-babu-uranw-portfolio", accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" };

async function kvGet(env: Env, k: string): Promise<{ v: string; exp: number } | null> {
  if (!env.DB) return null;
  try { await ensureSchema(env.DB); return await env.DB.prepare("SELECT v, exp FROM kvcache WHERE k = ?").bind(k).first(); } catch { return null; }
}
async function kvPut(env: Env, k: string, v: string, ttl: number) {
  if (!env.DB) return;
  try { await env.DB.prepare("INSERT INTO kvcache (k, v, exp) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, exp = excluded.exp").bind(k, v, Math.floor(Date.now() / 1000) + ttl).run(); } catch { /* cache is best effort */ }
}

async function demoCheck(env: Env, url: string, fallback: boolean | null): Promise<{ url: string; ok: boolean; checkedAt: string; via: string }> {
  const key = "demo:" + url, now = Math.floor(Date.now() / 1000);
  const c = await kvGet(env, key);
  if (c && c.exp > now) { const p = JSON.parse(c.v); return { ...p, via: "cache" }; }
  let status = 0;
  try {
    const r = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(5000), headers: { "user-agent": "nabin-portfolio-linkcheck" } });
    status = r.status;
    if (status === 405 || status === 501) { const g = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(5000) }); status = g.status; }
  } catch { status = 0; }
  if (status === 0 || status === 522 || status === 523 || status === 524) {
    // the check itself could not complete: keep the previous verified answer, retry soon
    const prev = c ? JSON.parse(c.v).ok : fallback;
    const res = { url, ok: !!prev, checkedAt: new Date().toISOString(), via: "unchecked-kept-last" };
    if (c) await kvPut(env, key, c.v, 600);
    return res;
  }
  const res = { url, ok: status === 200, checkedAt: new Date().toISOString() };
  await kvPut(env, key, JSON.stringify(res), TTL_DEMO);
  return { ...res, via: "head" };
}

function canSimulate(req: Request) {
  // QA hook: ?simulate=github-down forces the GitHub request to fail (token-gated)
  const u = new URL(req.url);
  return u.searchParams.get("simulate") === "github-down" && u.searchParams.get("key") === SIM_KEY;
}

async function ghList(prevEtag: string | null): Promise<{ status: number; list: any[] | null; etag: string | null; why?: string }> {
  // api.github.com, unauthenticated. Workers share egress IPs, so a 403/429 (rate limit) is retried once.
  for (let i = 0; i < 2; i++) {
    const h: Record<string, string> = { ...GH_H };
    if (prevEtag) h["if-none-match"] = prevEtag;
    const r = await fetch(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=pushed&type=owner`, { headers: h, signal: AbortSignal.timeout(8000) });
    if (r.status === 304) return { status: 304, list: null, etag: prevEtag };
    if (r.ok) return { status: 200, list: await r.json(), etag: r.headers.get("etag") };
    if (r.status !== 403 && r.status !== 429) return { status: r.status, list: null, etag: null, why: `github ${r.status}` };
    if (i === 1) return { status: r.status, list: null, etag: null, why: `github ${r.status} (rate limited)` };
  }
  return { status: 0, list: null, etag: null };
}

// Second source when api.github.com rate-limits this edge: ungh.cc, a public cached GitHub mirror.
// It lists the repos (name, description, dates, stars, forks); language, topics and homepage come
// from the last full GitHub read we hold for that repo (D1 or build snapshot).
async function mirrorList(known: Map<string, any>): Promise<any[]> {
  const r = await fetch(`https://ungh.cc/users/${GH_USER}/repos`, { headers: { "user-agent": GH_H["user-agent"] }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error("mirror " + r.status);
  const body: any = await r.json();
  if (!Array.isArray(body?.repos)) throw new Error("mirror shape");
  return body.repos.map((m: any) => {
    const k = known.get(m.name);
    return {
      name: m.name, html_url: `https://github.com/${m.repo || `${GH_USER}/${m.name}`}`, description: m.description ?? k?.description ?? null,
      language: k?.language ?? null, topics: k?.topics ?? [], homepage: k?.homepage ?? null, archived: k?.archived ?? false,
      license: k?.license ? { spdx_id: k.license } : null, stargazers_count: m.stars ?? 0, forks_count: m.forks ?? 0,
      default_branch: m.defaultBranch || k?.defaultBranch || "main", created_at: m.createdAt, pushed_at: m.pushedAt, updated_at: m.updatedAt,
      fork: false, private: false, owner: { login: GH_USER, avatar_url: SNAPSHOT.profile?.avatar, html_url: `https://github.com/${GH_USER}` },
    };
  });
}

async function projects(req: Request, env: Env) {
  const now = Math.floor(Date.now() / 1000);
  const simulateDown = canSimulate(req);
  const cached = await kvGet(env, "projects:v2");
  const send = (body: string, state: string) =>
    secure(new Response(body, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=120, stale-while-revalidate=600" } }), { "x-cache": state });
  if (cached && cached.exp > now && !simulateDown) { try { return send(JSON.stringify(JSON.parse(cached.v).data), "HIT"); } catch { /* corrupt row: refetch */ } }

  const prev = cached ? JSON.parse(cached.v) : null;
  const known = new Map<string, any>([...(SNAPSHOT.repos as any[]), ...((prev?.data?.repos as any[]) || [])].map((r) => [r.name, r]));
  try {
    if (simulateDown) throw new Error("simulated GitHub outage");
    let list: any[] | null = null, etag: string | null = null, via = "github";
    const g = await ghList(prev?.etag || null);
    if (g.status === 304 && prev?.raw) { list = prev.raw; etag = prev.etag; via = "github-304"; }
    else if (g.list) { list = g.list; etag = g.etag; }
    else { list = await mirrorList(known); via = "mirror"; }
    const repos = normalizeList(list);
    await Promise.all(repos.map(async (x: any) => {
      if (!x.liveCandidate) { x.live = null; return; }
      x.live = await demoCheck(env, x.liveCandidate, known.get(x.name)?.live?.ok ?? null);
    }));
    const data = { fetchedAt: new Date().toISOString(), source: "live", via, profile: profileFrom(list, null), repos };
    const slim = list.map((x: any) => ({ name: x.name, html_url: x.html_url, description: x.description, language: x.language, topics: x.topics, homepage: x.homepage, stargazers_count: x.stargazers_count, forks_count: x.forks_count, archived: x.archived, license: x.license ? { spdx_id: x.license.spdx_id } : null, default_branch: x.default_branch, created_at: x.created_at, pushed_at: x.pushed_at, updated_at: x.updated_at, fork: x.fork, private: x.private, owner: { login: x.owner?.login, avatar_url: x.owner?.avatar_url, html_url: x.owner?.html_url } }));
    // a mirror read is fresh for the list but its etag is not GitHub's: keep the previous etag only for GitHub reads
    await kvPut(env, "projects:v2", JSON.stringify({ etag: via === "mirror" ? null : etag, raw: slim, data }), via === "mirror" ? 1800 : TTL_PROJECTS);
    return send(JSON.stringify(data), via === "github-304" ? "REVALIDATED" : via === "mirror" ? "MISS-MIRROR" : "MISS");
  } catch (e) {
    const why = String((e as Error)?.message || e).slice(0, 120);
    if (prev?.data) return send(JSON.stringify({ ...prev.data, source: "stale", note: why }), "STALE");
    return send(JSON.stringify({ ...SNAPSHOT, source: "snapshot", note: why }), "SNAPSHOT");
  }
}

async function readme(req: Request, env: Env, name: string) {
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(name)) return json({ ok: false, error: "bad_name" }, 400);
  const key = "readme:" + name, now = Math.floor(Date.now() / 1000);
  const c = await kvGet(env, key);
  const send = (body: string, state: string) => secure(new Response(body, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" } }), { "x-cache": state });
  const sim = canSimulate(req);
  if (c && c.exp > now && !sim) return send(c.v, "HIT");
  try {
    if (sim) throw new Error("simulated GitHub outage");
    const branch = ((SNAPSHOT.repos as any[]).find((r) => r.name === name)?.defaultBranch) || "main";
    let text: string | null = null, found = false;
    for (const f of ["README.md", "readme.md", "Readme.md"]) {
      const r = await fetch(`https://raw.githubusercontent.com/${GH_USER}/${name}/${branch}/${f}`, { signal: AbortSignal.timeout(6000) });
      if (r.ok) { text = await r.text(); found = true; break; }
    }
    if (!found) {
      const r = await fetch(`https://api.github.com/repos/${GH_USER}/${name}/readme`, { headers: { ...GH_H, accept: "application/vnd.github.raw+json" }, signal: AbortSignal.timeout(8000) });
      if (r.ok) text = await r.text();
      else if (r.status !== 404) throw new Error("github " + r.status);
    }
    const b = JSON.stringify({ ok: true, text: text ? text.slice(0, 12000) : null });
    await kvPut(env, key, b, TTL_README);
    return send(b, "MISS");
  } catch (e) {
    if (c) return send(c.v, "STALE");
    return json({ ok: false, error: "readme_unavailable" }, 503);
  }
}

// Film videos: served through the Worker so byte-range requests (Safari/iOS need 206) work.
// The files live at /__f/<name>; the public URL is /film/<name>.
async function media(req: Request, env: Env, url: URL): Promise<Response> {
  const name = url.pathname.slice("/film/".length);
  if (!/^[a-z0-9-]+\.(mp4|webm)$/.test(name)) return new Response("Not found", { status: 404 });
  const type = name.endsWith(".webm") ? "video/webm" : "video/mp4";
  const range = req.headers.get("range");
  const res = await env.ASSETS.fetch(new Request(new URL("/__f/" + name, url).toString(), { method: "GET", headers: range ? { range } : {} }));
  if (res.status === 206) {
    const h = new Headers(res.headers); h.set("accept-ranges", "bytes"); h.set("content-type", type);
    return new Response(req.method === "HEAD" ? null : res.body, { status: 206, headers: h });
  }
  if (!res.ok) return new Response("Not found", { status: 404 });
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;
  const base: Record<string, string> = { "content-type": type, "accept-ranges": "bytes" };
  const etag = res.headers.get("etag"); if (etag) base.etag = etag;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    const bad = () => new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    if (!m || (m[1] === "" && m[2] === "")) return bad();
    let start: number, end: number;
    if (m[1] === "") { start = Math.max(0, size - Number(m[2])); end = size - 1; }
    else { start = Number(m[1]); end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1); }
    if (start >= size || start > end) return bad();
    return new Response(req.method === "HEAD" ? null : buf.slice(start, end + 1), { status: 206, headers: { ...base, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) } });
  }
  return new Response(req.method === "HEAD" ? null : buf, { status: 200, headers: { ...base, "content-length": String(size) } });
}

export default {
  async fetch(req: Request, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
    const url = new URL(req.url);
    if (url.pathname === "/api/contact") {
      if (req.method === "POST") return contact(req, env, ctx);
      return json({ ok: false, error: "method_not_allowed" }, 405, { allow: "POST" });
    }
    if (url.pathname === "/api/contact/inbox" && req.method === "GET") return inbox(req, env);
    if (url.pathname === "/api/contact/ack" && req.method === "POST") return ack(req, env);
    if (url.pathname === "/api/projects" && req.method === "GET") return projects(req, env);
    if (url.pathname === "/api/requests") {
      if (req.method === "POST") return WR.submit(req, env, ctx, json);
      return json({ ok: false, error: "method_not_allowed" }, 405, { allow: "POST" });
    }
    const pm = /^\/api\/requests\/(NBR-\d{4}-[A-Z0-9]{4})\/pdf$/.exec(url.pathname);
    if (pm && (req.method === "GET" || req.method === "HEAD")) return secure(await WR.pdf(req, env, pm[1], json));
    if (url.pathname === "/api/status") {
      if (req.method === "POST") return WR.status(req, env, ctx, json);
      return json({ ok: false, error: "method_not_allowed" }, 405, { allow: "POST" });
    }
    if (url.pathname.startsWith("/api/admin/")) {
      const res = await WR.admin(req, env, ctx, url.pathname.slice("/api/admin".length), json);
      return res.headers.get("content-type")?.startsWith("text/csv") ? secure(res) : res;
    }
    if (url.pathname.startsWith("/api/readme/") && req.method === "GET") return readme(req, env, decodeURIComponent(url.pathname.slice(12)));
    if (url.pathname.startsWith("/api/")) return json({ ok: false, error: "not_found" }, 404);
    if (req.method !== "GET" && req.method !== "HEAD") return json({ ok: false, error: "method_not_allowed" }, 405);
    // HTML documents live under /__p/ so that "/" is not a direct asset match: the Worker runs
    // and every page response carries the security headers above.
    if (url.pathname.startsWith("/film/") && /\.(mp4|webm)$/.test(url.pathname)) return secure(await media(req, env, url), { "cache-control": "public, max-age=604800" });
    let res: Response;
    const page = /^\/(status|privacy|admin)\/?$/.exec(url.pathname);
    if (url.pathname === "/" || url.pathname === "/index.html") {
      res = await env.ASSETS.fetch(new Request(new URL("/__p/", url).toString(), { method: req.method }));
    } else if (page) {
      res = await env.ASSETS.fetch(new Request(new URL(`/__p/${page[1]}`, url).toString(), { method: req.method }));
      if (res.status >= 300 && res.status < 400) res = await env.ASSETS.fetch(new Request(new URL(`/__p/${page[1]}.html`, url).toString(), { method: req.method }));
    } else {
      res = await env.ASSETS.fetch(req);
      if (res.status === 404) {
        const nf = await env.ASSETS.fetch(new Request(new URL("/404", url).toString()));
        res = new Response(nf.ok ? nf.body : "Not found", { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
      }
    }
    const extra: Record<string, string> = {};
    if (url.pathname.startsWith("/admin")) { extra["x-robots-tag"] = "noindex, nofollow"; extra["cache-control"] = "no-store"; return secure(res, extra, ADMIN_CSP); }
    if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/img/") || url.pathname.startsWith("/film/")) extra["cache-control"] = "public, max-age=31536000, immutable";
    return secure(res, extra);
  },
};
