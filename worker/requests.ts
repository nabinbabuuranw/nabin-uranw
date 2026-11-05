// "Request a Website" backend: submissions, owner-only status lookup, PDF, email log + retries, Clerk-protected admin API.
import { requestSchema, statusLookupSchema, STATUSES, STATUS_LABEL, STATUS_PATH, type Status, whatsappLink } from "../lib/request-schema";
import { buildRequestPdf, nptDate } from "./pdf";

export interface D1Stmt { bind(...v: unknown[]): D1Stmt; run(): Promise<any>; first<T = any>(): Promise<T | null>; all<T = any>(): Promise<{ results: T[] }> }
export interface D1 { prepare(q: string): D1Stmt; batch(s: D1Stmt[]): Promise<unknown>; exec(q: string): Promise<unknown> }
export type Ctx = { waitUntil(p: Promise<unknown>): void };
type Env = { DB?: D1 };
type J = (body: unknown, status?: number, extra?: Record<string, string>) => Response;

// Build-time configuration (scripts/build-worker.mjs replaces these; the values never reach the browser).
const CFG = {
  site: "https://nabin-uranw.sites.tab.bot",
  owner: "nabinuranw333@gmail.com",
  admins: "__ADMIN_EMAILS__",
  hmac: "__REQ_HMAC_SECRET__",
  ipSalt: "__REQ_IP_SALT__",
  ejsService: "__EJS_SERVICE__", ejsTemplate: "__EJS_TEMPLATE__", ejsPublic: "__EJS_PUBLIC__", ejsPrivate: "__EJS_PRIVATE__",
  ejsAttach: "__EJS_ATTACH__",          // "1" when the template carries the variable attachment "pdf_attachment"
  clerkFrontend: "__CLERK_FRONTEND__",  // https://<instance>.clerk.accounts.dev
  clerkSecret: "__CLERK_SECRET__",
};
const ATTACH_MAX = 36000; // EmailJS free plan: requests over 50 KB are refused; base64 grows ~4/3

// ---------- schema ----------
let ready = false;
async function schema(db: D1) {
  if (ready) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS wr_requests (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, status TEXT NOT NULL,
      title TEXT, name TEXT NOT NULL, organization TEXT, email TEXT NOT NULL, country_code TEXT, phone TEXT, website_type TEXT, description TEXT, features TEXT,
      budget TEXT, completion_date TEXT, flexible INTEGER, existing_url TEXT, reference_sites TEXT, reference_notes TEXT, desc_hash TEXT, iphash TEXT, country TEXT,
      archived INTEGER NOT NULL DEFAULT 0, is_test INTEGER NOT NULL DEFAULT 0, pdf BLOB, pdf_lossy INTEGER)`),
    db.prepare("CREATE INDEX IF NOT EXISTS wr_req_dupe ON wr_requests (email, desc_hash, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS wr_req_created ON wr_requests (created_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS wr_events (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL, at INTEGER NOT NULL, kind TEXT NOT NULL,
      status TEXT, body TEXT, visible INTEGER NOT NULL DEFAULT 0, author TEXT)`),
    db.prepare("CREATE INDEX IF NOT EXISTS wr_events_req ON wr_events (request_id, at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS wr_emails (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL, kind TEXT NOT NULL, to_addr TEXT NOT NULL,
      subject TEXT, params TEXT NOT NULL, attach INTEGER NOT NULL DEFAULT 0, provider TEXT NOT NULL DEFAULT 'EmailJS', status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, next_at INTEGER, sent_at INTEGER)`),
    db.prepare("CREATE INDEX IF NOT EXISTS wr_emails_due ON wr_emails (status, next_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS wr_emails_req ON wr_emails (request_id)"),
    db.prepare("CREATE TABLE IF NOT EXISTS rate (k TEXT PRIMARY KEY, n INTEGER NOT NULL, exp INTEGER NOT NULL)"),
  ]);
  ready = true;
}

// ---------- helpers ----------
const te = new TextEncoder();
async function sha256(s: string) { const b = await crypto.subtle.digest("SHA-256", te.encode(s)); return hex(new Uint8Array(b)); }
const hex = (u: Uint8Array) => [...u].map((x) => x.toString(16).padStart(2, "0")).join("");
const b64url = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function b64(u: Uint8Array) { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); }
async function hmac(msg: string) {
  const k = await crypto.subtle.importKey("raw", te.encode(CFG.hmac), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", k, te.encode(msg))));
}
function safeEq(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
export async function pdfLink(id: string, ttlSec: number, base = CFG.site) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  return `${base}/api/requests/${encodeURIComponent(id)}/pdf?exp=${exp}&sig=${await hmac(`pdf:${id}:${exp}`)}`;
}
const esc = (s: string) => (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const nl = (s: string) => esc(s).replace(/\n/g, "<br>");
const ID_ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newId() { const r = crypto.getRandomValues(new Uint8Array(4)); return `NBR-${new Date().getUTCFullYear()}-${[...r].map((x) => ID_ABC[x % ID_ABC.length]).join("")}`; }
const fmtDate = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); const M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]; return y && m && d ? `${d} ${M[m - 1]} ${y}` : iso; };

type Row = Record<string, any>;
const completionOf = (r: Row) => (r.flexible ? "I’m flexible" : r.completion_date ? fmtDate(r.completion_date) : "Not given");
const projectName = (r: Row) => r.title || `${r.website_type}${r.organization ? ` for ${r.organization}` : ""}`;

async function bump(db: D1, key: string, ttl: number) {
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare("INSERT INTO rate (k, n, exp) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n").bind(key, now + ttl).first<{ n: number }>();
  return row?.n ?? 0;
}
async function limited(db: D1, rules: [string, number, number][]) {
  // rules: [key, windowSec, max]
  const now = Math.floor(Date.now() / 1000);
  const ns = await Promise.all(rules.map(([k, win]) => bump(db, `${k}:${Math.floor(now / win)}`, win * 2)));
  if (Math.random() < 0.05) await db.prepare("DELETE FROM rate WHERE exp < ?").bind(now).run();
  return rules.some(([, , max], i) => ns[i] > max);
}
const ipOf = async (req: Request) => (await sha256((req.headers.get("cf-connecting-ip") || "unknown") + ":" + CFG.ipSalt)).slice(0, 20);

// ---------- email ----------
type Mail = { kind: string; to: string; subject: string; replyTo: string; fromName: string; html: string; attach: boolean };

async function emailjsSend(db: D1, p: Mail & { requestId: string }): Promise<{ ok: boolean; error?: string }> {
  const params: Record<string, string> = { to_email: p.to, reply_to: p.replyTo, from_name: p.fromName, subject: p.subject, message_html: p.html, message: p.html.replace(/<br>/g, "\n").replace(/<[^>]+>/g, "") };
  if (p.attach && CFG.ejsAttach === "1") {
    const r = await db.prepare("SELECT pdf FROM wr_requests WHERE id = ?").bind(p.requestId).first<{ pdf: ArrayBuffer | number[] | null }>();
    if (r?.pdf) {
      const u = r.pdf instanceof ArrayBuffer ? new Uint8Array(r.pdf) : new Uint8Array(r.pdf as number[]);
      const data = b64(u);
      if (data.length <= ATTACH_MAX) { params.pdf_attachment = `data:application/pdf;base64,${data}`; params.pdf_name = `Website-Request-${p.requestId}.pdf`; }
    }
  }
  if (!CFG.ejsService.startsWith("service_")) return { ok: false, error: "email provider not configured" };
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ service_id: CFG.ejsService, template_id: CFG.ejsTemplate, user_id: CFG.ejsPublic, accessToken: CFG.ejsPrivate, template_params: params }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 200) return { ok: true };
    return { ok: false, error: `EmailJS ${res.status}: ${(await res.text()).slice(0, 180)}` };
  } catch (e) { return { ok: false, error: `EmailJS unreachable: ${String((e as Error)?.message || e).slice(0, 160)}` }; }
}

const BACKOFF_MIN = [2, 10, 30, 120, 360];
async function attempt(db: D1, logId: number) {
  const row = await db.prepare("SELECT * FROM wr_emails WHERE id = ?").bind(logId).first<Row>();
  if (!row || row.status === "sent") return row;
  const m = JSON.parse(row.params) as Mail;
  const r = await emailjsSend(db, { ...m, requestId: row.request_id });
  const now = Date.now(), attempts = row.attempts + 1;
  if (r.ok) await db.prepare("UPDATE wr_emails SET status='sent', attempts=?, last_error=NULL, updated_at=?, sent_at=?, next_at=NULL WHERE id=?").bind(attempts, now, now, logId).run();
  else {
    const giveUp = attempts >= BACKOFF_MIN.length + 1;
    await db.prepare("UPDATE wr_emails SET status=?, attempts=?, last_error=?, updated_at=?, next_at=? WHERE id=?")
      .bind(giveUp ? "gave_up" : "failed", attempts, r.error || "unknown", now, giveUp ? null : now + BACKOFF_MIN[Math.min(attempts - 1, BACKOFF_MIN.length - 1)] * 60000, logId).run();
  }
  return db.prepare("SELECT * FROM wr_emails WHERE id = ?").bind(logId).first<Row>();
}
async function queue(db: D1, requestId: string, m: Mail) {
  const now = Date.now();
  const r = await db.prepare("INSERT INTO wr_emails (request_id, kind, to_addr, subject, params, attach, status, attempts, created_at, updated_at, next_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?) RETURNING id")
    .bind(requestId, m.kind, m.to, m.subject, JSON.stringify(m), m.attach ? 1 : 0, now, now, now).first<{ id: number }>();
  return r!.id;
}
/** Automatic retries: run opportunistically on API traffic (the hosting has no cron trigger). */
export async function retryDue(env: Env) {
  if (!env.DB) return;
  await schema(env.DB);
  const due = await env.DB.prepare("SELECT id FROM wr_emails WHERE status IN ('failed','pending') AND next_at IS NOT NULL AND next_at <= ? ORDER BY next_at LIMIT 3").bind(Date.now() - 20000).all<{ id: number }>();
  for (const d of due.results) await attempt(env.DB, d.id);
}

function row2(label: string, value: string) {
  return `<tr><td style="padding:7px 14px 7px 0;color:#5A6560;vertical-align:top;white-space:nowrap;font-size:13px">${esc(label)}</td><td style="padding:7px 0;color:#1F2421;font-size:14px">${value ? nl(value) : '<span style="color:#9aa39f">—</span>'}</td></tr>`;
}
function shell(inner: string) {
  return `<div style="background:#F2F4F2;padding:24px 12px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:620px;margin:0 auto;background:#ffffff;border-top:5px solid #1F2421">
<div style="padding:26px 28px 6px"><div style="font-size:12px;letter-spacing:2px;font-weight:bold;color:#1F2421">NABIN BABU URANW</div><div style="font-size:12px;color:#5A6560;margin-top:3px">Independent Full-Stack Developer &amp; UI/UX Designer</div></div>
<div style="padding:10px 28px 26px">${inner}</div>
<div style="padding:16px 28px;border-top:1px solid #DCE1DE;font-size:12px;color:#5A6560;line-height:1.6">Nabin Babu Uranw · Inaruwa, Sunsari, Nepal<br>+977 976-446-5688 · <a href="mailto:nabinuranw333@gmail.com" style="color:#216869">nabinuranw333@gmail.com</a> · <a href="${CFG.site}" style="color:#216869">nabin-uranw.sites.tab.bot</a></div></div></div>`;
}
function ownerMail(r: Row, pdfUrl: string, attached: boolean): Mail {
  const admin = `${CFG.site}/admin?id=${encodeURIComponent(r.id)}`;
  const html = shell(`<p style="margin:8px 0 2px;font-size:11px;letter-spacing:1.6px;color:#216869;font-weight:bold">NEW WEBSITE REQUEST</p>
<p style="margin:0;font-size:30px;font-weight:bold;color:#1F2421">${esc(r.id)}</p>
<p style="margin:6px 0 18px;color:#5A6560;font-size:13px">Submitted ${esc(nptDate(r.created_at))}</p>
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%">
${row2("Request ID", r.id)}${row2("Customer name", r.name)}${row2("Business / organization", r.organization)}${row2("Email address", r.email)}${row2("Phone / WhatsApp", `${r.country_code} ${r.phone}`)}
${row2("Website type", r.website_type)}${row2("Project description", r.description)}${row2("Required features", r.features)}${row2("Budget", r.budget)}${row2("Preferred completion date", completionOf(r))}
${row2("Existing website", r.existing_url)}${row2("Website references", r.reference_sites)}${row2("What they like about them", r.reference_notes)}${row2("Submitted", nptDate(r.created_at))}</table>
<p style="margin:22px 0 8px"><a href="${admin}" style="display:inline-block;background:#216869;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:999px;font-size:14px;font-weight:bold">Open in admin dashboard</a></p>
<p style="margin:10px 0 0;font-size:13px;color:#5A6560">PDF: ${attached ? `attached as Website-Request-${esc(r.id)}.pdf. ` : ""}<a href="${pdfUrl}" style="color:#216869">download Website-Request-${esc(r.id)}.pdf</a> (link valid 30 days; always available in the dashboard).<br>Reply to this email to answer ${esc(r.name)} directly.</p>`);
  return { kind: "owner_alert", to: CFG.owner, subject: `[NEW WEBSITE REQUEST] — ${r.id} — ${r.name}`, replyTo: r.email, fromName: "Portfolio requests", html, attach: true };
}
function customerMail(r: Row): Mail {
  const track = `${CFG.site}/status?id=${encodeURIComponent(r.id)}`;
  const html = shell(`<p style="margin:8px 0 14px;font-size:22px;font-weight:bold;color:#1F2421">Thank you, ${esc(r.name.split(" ")[0])}.</p>
<p style="margin:0 0 16px;font-size:15px;color:#1F2421;line-height:1.6">Your website request has been received. Keep this request ID: you’ll need it, with this email address, to check the status.</p>
<p style="margin:0 0 20px;padding:14px 18px;background:#1F2421;color:#ffffff;font-size:24px;font-weight:bold;letter-spacing:1px;display:inline-block">${esc(r.id)}</p>
<p style="margin:0 0 6px;font-size:11px;letter-spacing:1.6px;color:#216869;font-weight:bold">YOUR SUMMARY</p>
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%">${row2("Project", projectName(r))}${row2("Website type", r.website_type)}${row2("Budget", r.budget)}${row2("Preferred completion", completionOf(r))}${row2("Submitted", nptDate(r.created_at))}</table>
<p style="margin:20px 0 6px;font-size:11px;letter-spacing:1.6px;color:#216869;font-weight:bold">WHAT HAPPENS NEXT</p>
<p style="margin:0 0 18px;font-size:15px;color:#1F2421;line-height:1.6">Nabin reviews your requirements and contacts you by email, phone or WhatsApp, usually within two working days. Rough answers are fine; you’ll go through the details together.</p>
<p style="margin:0 0 6px"><a href="${track}" style="display:inline-block;background:#216869;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:999px;font-size:14px;font-weight:bold">Track your request</a></p>
<p style="margin:16px 0 0;font-size:13px;color:#5A6560;line-height:1.6">Rather talk? Call or WhatsApp +977 976-446-5688, or reply to this email.</p>`);
  return { kind: "customer_confirmation", to: r.email, subject: `Your website request ${r.id} — Nabin Babu Uranw`, replyTo: CFG.owner, fromName: "Nabin Babu Uranw", html, attach: false };
}
function statusMail(r: Row, status: Status, message: string): Mail {
  const track = `${CFG.site}/status?id=${encodeURIComponent(r.id)}`;
  const html = shell(`<p style="margin:8px 0 4px;font-size:11px;letter-spacing:1.6px;color:#216869;font-weight:bold">REQUEST ${esc(r.id)}</p>
<p style="margin:0 0 14px;font-size:22px;font-weight:bold;color:#1F2421">Status: ${esc(STATUS_LABEL[status])}</p>
<p style="margin:0 0 14px;font-size:15px;color:#1F2421;line-height:1.6">Hi ${esc(r.name.split(" ")[0])}, there’s an update on “${esc(projectName(r))}”.</p>
${message ? `<div style="margin:0 0 18px;padding:14px 18px;border-left:3px solid #9CC5A1;background:#F2F4F2;font-size:15px;color:#1F2421;line-height:1.6">${nl(message)}</div>` : ""}
<p style="margin:0"><a href="${track}" style="display:inline-block;background:#216869;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:999px;font-size:14px;font-weight:bold">See the full timeline</a></p>`);
  return { kind: "status_update", to: r.email, subject: `Update on your website request ${r.id}: ${STATUS_LABEL[status]}`, replyTo: CFG.owner, fromName: "Nabin Babu Uranw", html, attach: false };
}
async function sendNow(db: D1, requestId: string, m: Mail) {
  const id = await queue(db, requestId, m);
  const row = await attempt(db, id);
  if (row) delete row.params;
  return row;
}

// ---------- public API ----------
export async function submit(req: Request, env: Env, ctx: Ctx, json: J) {
  const url = new URL(req.url);
  const origin = req.headers.get("origin");
  if (origin && origin !== url.origin) return json({ ok: false, error: "forbidden_origin" }, 403);
  if (!(req.headers.get("content-type") || "").includes("application/json")) return json({ ok: false, error: "json_required" }, 415);
  if (Number(req.headers.get("content-length") || 0) > 32000) return json({ ok: false, error: "too_large" }, 413);
  if (!env.DB) return json({ ok: false, error: "storage_unavailable" }, 503);
  const db = env.DB; await schema(db);
  let raw: any;
  try { raw = JSON.parse((await req.text()).slice(0, 32000)); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  // honeypot / time-trap: look like success to a bot, store nothing
  if (typeof raw?.website === "string" && raw.website.length > 0) return json({ ok: true, id: "NBR-0000-0000", bot: true });
  if (typeof raw?.elapsedMs !== "number" || raw.elapsedMs < 4000) return json({ ok: false, error: "too_fast", message: "That was quick! Please take a moment to check your answers, then submit again." }, 400);
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) { const k = i.path.slice(0, 2).join("."); if (!errors[k]) errors[k] = i.message; }
    return json({ ok: false, error: "invalid", errors }, 400);
  }
  const d = parsed.data;
  const ip = await ipOf(req);
  const descHash = (await sha256(d.project.description.toLowerCase().replace(/\s+/g, " "))).slice(0, 32);
  const now = Date.now();
  // duplicate: same email + same description within 10 minutes -> the existing ID
  const dupe = await db.prepare("SELECT id, name, website_type FROM wr_requests WHERE email = ? AND desc_hash = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1")
    .bind(d.about.email, descHash, now - 600000).first<Row>();
  if (dupe) return json({ ok: true, duplicate: true, id: dupe.id, pdfUrl: await pdfLink(dupe.id, 30 * 86400, url.origin), whatsapp: whatsappLink(dupe.id, dupe.name, dupe.website_type) });
  if (await limited(db, [[`rq:ip:${ip}`, 3600, 5], [`rq:em:${await sha256(d.about.email)}`, 86400, 3], ["rq:all", 3600, 60]]))
    return json({ ok: false, error: "rate_limited", message: "Too many requests from this connection. Please try again later, or call/WhatsApp +977 976-446-5688." }, 429, { "retry-after": "3600" });

  const r: Row = {
    created_at: now, updated_at: now, status: "received", name: d.about.name, organization: d.about.organization, email: d.about.email,
    country_code: d.about.countryCode, phone: d.about.phone, website_type: d.project.websiteType, description: d.project.description, features: d.project.features,
    budget: d.budget.budget, completion_date: d.budget.flexible ? null : d.budget.completionDate, flexible: d.budget.flexible ? 1 : 0,
    existing_url: d.refs.existingUrl, reference_sites: d.refs.referenceSites, reference_notes: d.refs.referenceNotes, desc_hash: descHash, iphash: ip,
    country: (req as any).cf?.country ?? null,
  };
  // 1) save first (the request survives any PDF/email failure)
  for (let i = 0; i < 6 && !r.id; i++) {
    const id = newId();
    try {
      await db.prepare(`INSERT INTO wr_requests (id, created_at, updated_at, status, name, organization, email, country_code, phone, website_type, description, features, budget,
        completion_date, flexible, existing_url, reference_sites, reference_notes, desc_hash, iphash, country) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(id, r.created_at, r.updated_at, r.status, r.name, r.organization, r.email, r.country_code, r.phone, r.website_type, r.description, r.features, r.budget,
          r.completion_date, r.flexible, r.existing_url, r.reference_sites, r.reference_notes, r.desc_hash, r.iphash, r.country).run();
      r.id = id;
    } catch (e) { if (!/UNIQUE|constraint/i.test(String(e))) throw e; }
  }
  if (!r.id) return json({ ok: false, error: "id_unavailable" }, 500);
  await db.prepare("INSERT INTO wr_events (request_id, at, kind, status, body, visible, author) VALUES (?, ?, 'status', 'received', 'Request received.', 1, 'system')").bind(r.id, now).run();
  // 2) PDF on the server
  let pdfOk = false;
  try {
    const { bytes, lossy } = await buildRequestPdf({ id: r.id, createdAt: now, name: r.name, organization: r.organization, email: r.email, countryCode: r.country_code, phone: r.phone,
      websiteType: r.website_type, description: r.description, features: r.features, budget: r.budget, completion: completionOf(r), existingUrl: r.existing_url,
      referenceSites: r.reference_sites, referenceNotes: r.reference_notes, statusLabel: "Received" });
    await db.prepare("UPDATE wr_requests SET pdf = ?, pdf_lossy = ? WHERE id = ?").bind(bytes, lossy ? 1 : 0, r.id).run();
    pdfOk = true;
  } catch (e) {
    await db.prepare("INSERT INTO wr_events (request_id, at, kind, body, visible, author) VALUES (?, ?, 'system', ?, 0, 'system')").bind(r.id, Date.now(), `PDF generation failed: ${String(e).slice(0, 200)}`).run();
  }
  // 3) emails: queued in the log, sent in the background; a failure is retried automatically
  const ownerPdf = await pdfLink(r.id, 30 * 86400);
  const willAttach = pdfOk && CFG.ejsAttach === "1";
  const ids = [await queue(db, r.id, ownerMail(r, ownerPdf, willAttach)), await queue(db, r.id, customerMail(r))];
  ctx.waitUntil((async () => { for (const id of ids) await attempt(db, id); })());
  return json({ ok: true, id: r.id, pdf: pdfOk, pdfUrl: pdfOk ? await pdfLink(r.id, 30 * 86400, url.origin) : null, whatsapp: whatsappLink(r.id, r.name, r.website_type), email: r.email });
}

export async function pdf(req: Request, env: Env, id: string, json: J) {
  if (!env.DB) return json({ ok: false, error: "storage_unavailable" }, 503);
  const url = new URL(req.url);
  const exp = Number(url.searchParams.get("exp") || 0), sig = url.searchParams.get("sig") || "";
  if (!exp || exp < Date.now() / 1000 || !safeEq(sig, await hmac(`pdf:${id}:${exp}`))) return json({ ok: false, error: "link_expired", message: "This download link has expired. Look up your request on /status to get a new one." }, 403);
  await schema(env.DB);
  const r = await env.DB.prepare("SELECT pdf FROM wr_requests WHERE id = ?").bind(id).first<{ pdf: ArrayBuffer | number[] | null }>();
  if (!r?.pdf) return json({ ok: false, error: "not_found" }, 404);
  const body = r.pdf instanceof ArrayBuffer ? new Uint8Array(r.pdf) : new Uint8Array(r.pdf as number[]);
  const inline = url.searchParams.get("view") === "1";
  return new Response(body, { headers: { "content-type": "application/pdf", "content-length": String(body.length), "content-disposition": `${inline ? "inline" : "attachment"}; filename="Website-Request-${id}.pdf"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff", "x-robots-tag": "noindex" } });
}

export async function status(req: Request, env: Env, ctx: Ctx, json: J) {
  const url = new URL(req.url);
  const origin = req.headers.get("origin");
  if (origin && origin !== url.origin) return json({ ok: false, error: "forbidden_origin" }, 403);
  if (!env.DB) return json({ ok: false, error: "storage_unavailable" }, 503);
  await schema(env.DB);
  ctx.waitUntil(retryDue(env).catch(() => {}));
  let raw: unknown; try { raw = JSON.parse((await req.text()).slice(0, 2000)); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  const p = statusLookupSchema.safeParse(raw);
  const generic = { ok: false, error: "not_found", message: "We couldn’t find a request with that ID and email. Check both and try again." };
  if (await limited(env.DB, [[`st:ip:${await ipOf(req)}`, 600, 20]])) return json({ ok: false, error: "rate_limited", message: "Too many lookups. Please wait a few minutes." }, 429, { "retry-after": "600" });
  // Not found answers 200 with ok:false (an expected outcome, not a broken resource); same words for every miss.
  if (!p.success) return json(generic, 200);
  const r = await env.DB.prepare("SELECT id, created_at, updated_at, status, title, website_type, organization, name, (pdf IS NOT NULL) AS has_pdf FROM wr_requests WHERE id = ? AND email = ?").bind(p.data.id, p.data.email).first<Row>();
  if (!r) return json(generic, 200);
  const ev = await env.DB.prepare("SELECT at, kind, status, body FROM wr_events WHERE request_id = ? AND visible = 1 ORDER BY at, id").bind(r.id).all<Row>();
  return json({
    ok: true, id: r.id, project: projectName(r), status: r.status, statusLabel: STATUS_LABEL[r.status as Status] ?? r.status, createdAt: r.created_at, updatedAt: r.updated_at,
    timeline: ev.results.filter((e) => e.kind === "status").map((e) => ({ status: e.status, label: STATUS_LABEL[e.status as Status] ?? e.status, at: e.at })),
    messages: ev.results.filter((e) => e.kind === "message").map((e) => ({ at: e.at, body: e.body })),
    pdfUrl: r.has_pdf ? await pdfLink(r.id, 7 * 86400, url.origin) : null,
    whatsapp: whatsappLink(r.id, r.name, r.website_type),
  });
}

// ---------- admin (Clerk) ----------
type Jwk = JsonWebKey & { kid?: string };
let jwks: { at: number; keys: Jwk[] } | null = null;
const adminCache = new Map<string, { at: number; email: string | null }>();
const b64urlDecode = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
async function keyFor(kid: string) {
  if (!jwks || Date.now() - jwks.at > 3600000 || !jwks.keys.some((k) => k.kid === kid)) {
    const r = await fetch(`${CFG.clerkFrontend}/.well-known/jwks.json`, { signal: AbortSignal.timeout(8000) });
    if (r.ok) jwks = { at: Date.now(), keys: ((await r.json()) as { keys: Jwk[] }).keys };
  }
  return jwks?.keys.find((k) => k.kid === kid) ?? null;
}
async function adminOf(req: Request): Promise<{ email: string; sub: string } | null> {
  const m = /^Bearer\s+([\w-]+\.[\w-]+\.[\w-]+)$/.exec(req.headers.get("authorization") || "");
  if (!m) return null;
  const [h, p, s] = m[1].split(".");
  let header: any, claims: any;
  try { header = JSON.parse(new TextDecoder().decode(b64urlDecode(h))); claims = JSON.parse(new TextDecoder().decode(b64urlDecode(p))); } catch { return null; }
  if (header.alg !== "RS256" || !header.kid) return null;
  const jwk = await keyFor(header.kid); if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  if (!(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlDecode(s), te.encode(`${h}.${p}`)))) return null;
  const now = Date.now() / 1000;
  if (claims.iss !== CFG.clerkFrontend || typeof claims.exp !== "number" || claims.exp < now - 5 || (claims.nbf && claims.nbf > now + 5) || !claims.sub) return null;
  const okAzp = [CFG.site, "http://localhost:8787", "http://127.0.0.1:8787", "http://localhost:3000"];
  if (claims.azp && !okAzp.includes(claims.azp)) return null;
  // Authorization is re-read from Clerk's Backend API (cached 2 min): verified primary email on the allow-list, or publicMetadata.role = "admin".
  const c = adminCache.get(claims.sub);
  let email: string | null;
  if (c && Date.now() - c.at < 120000) email = c.email;
  else {
    const r = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(claims.sub)}`, { headers: { authorization: `Bearer ${CFG.clerkSecret}` }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const u = (await r.json()) as any;
    const primary = (u.email_addresses || []).find((e: any) => e.id === u.primary_email_address_id);
    const addr = String(primary?.email_address || "").toLowerCase();
    const verified = primary?.verification?.status === "verified";
    const allow = CFG.admins.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    email = u.public_metadata?.role === "admin" || (verified && allow.includes(addr)) ? addr : null;
    adminCache.set(claims.sub, { at: Date.now(), email });
  }
  return email ? { email, sub: claims.sub } : null;
}

const csvCell = (v: unknown) => { let s = v == null ? "" : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const iso = (ms: number | null) => (ms ? new Date(ms).toISOString() : "");

export async function admin(req: Request, env: Env, ctx: Ctx, path: string, json: J) {
  if (!env.DB) return json({ ok: false, error: "storage_unavailable" }, 503);
  const url = new URL(req.url);
  if (req.method !== "GET") { const o = req.headers.get("origin"); if (o && o !== url.origin) return json({ ok: false, error: "forbidden_origin" }, 403); }
  const who = await adminOf(req);
  if (!who) return json({ ok: false, error: "unauthorized" }, 401);
  const db = env.DB; await schema(db);
  ctx.waitUntil(retryDue(env).catch(() => {}));
  const body = async () => { try { return JSON.parse((await req.text()).slice(0, 20000)); } catch { return {}; } };
  const seg = path.split("/").filter(Boolean); // ["requests", id?, action?]

  if (path === "/me") return json({ ok: true, email: who.email });

  if (seg[0] === "requests" && seg.length === 1 && req.method === "GET") {
    const q = (url.searchParams.get("q") || "").trim().toLowerCase().slice(0, 100);
    const st = url.searchParams.get("status") || "";
    const view = url.searchParams.get("view") || "active";
    const where: string[] = []; const args: unknown[] = [];
    if (view === "active") where.push("archived = 0"); else if (view === "archived") where.push("archived = 1");
    if ((STATUSES as readonly string[]).includes(st)) { where.push("status = ?"); args.push(st); }
    if (q) { where.push("(lower(id) LIKE ? OR lower(name) LIKE ? OR lower(email) LIKE ? OR lower(website_type) LIKE ? OR lower(organization) LIKE ? OR lower(coalesce(title,'')) LIKE ?)"); for (let i = 0; i < 6; i++) args.push(`%${q}%`); }
    const sql = `SELECT id, created_at, updated_at, status, title, name, organization, email, website_type, budget, archived, is_test,
      (SELECT count(*) FROM wr_emails e WHERE e.request_id = r.id AND e.status IN ('failed','gave_up')) AS mail_failed
      FROM wr_requests r ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC LIMIT 500`;
    const list = await db.prepare(sql).bind(...args).all<Row>();
    const counts = await db.prepare("SELECT status, archived, count(*) AS n FROM wr_requests GROUP BY status, archived").all<Row>();
    return json({ ok: true, requests: list.results.map((r) => ({ ...r, project: projectName(r) })), counts: counts.results });
  }

  if (seg[0] === "requests" && seg[1] && path.endsWith("/export.csv") === false) {
    const id = decodeURIComponent(seg[1]).toUpperCase();
    const r = await db.prepare("SELECT *, (pdf IS NOT NULL) AS has_pdf FROM wr_requests WHERE id = ?").bind(id).first<Row>();
    if (!r) return json({ ok: false, error: "not_found" }, 404);
    delete r.pdf;
    const action = seg[2] || "";
    if (!action && req.method === "GET") {
      const ev = await db.prepare("SELECT id, at, kind, status, body, visible, author FROM wr_events WHERE request_id = ? ORDER BY at, id").bind(id).all<Row>();
      const em = await db.prepare("SELECT id, kind, to_addr, subject, provider, status, attempts, last_error, created_at, updated_at, next_at, sent_at, attach FROM wr_emails WHERE request_id = ? ORDER BY id").bind(id).all<Row>();
      return json({ ok: true, request: { ...r, project: projectName(r), completion: completionOf(r) }, events: ev.results, emails: em.results,
        pdfUrl: r.has_pdf ? await pdfLink(id, 3600, url.origin) : null, attachSupported: CFG.ejsAttach === "1" });
    }
    if (!action && req.method === "PATCH") {
      const b = await body();
      const now = Date.now();
      const out: Record<string, unknown> = {};
      if (typeof b.title === "string") { await db.prepare("UPDATE wr_requests SET title = ?, updated_at = ? WHERE id = ?").bind(b.title.trim().slice(0, 140) || null, now, id).run(); out.title = true; }
      if (typeof b.is_test === "boolean") { await db.prepare("UPDATE wr_requests SET is_test = ? WHERE id = ?").bind(b.is_test ? 1 : 0, id).run(); out.is_test = b.is_test; }
      if (typeof b.archived === "boolean") {
        await db.prepare("UPDATE wr_requests SET archived = ? WHERE id = ?").bind(b.archived ? 1 : 0, id).run();
        await db.prepare("INSERT INTO wr_events (request_id, at, kind, body, visible, author) VALUES (?, ?, 'system', ?, 0, ?)").bind(id, now, b.archived ? "Archived." : "Restored from archive.", who.email).run();
        out.archived = b.archived;
      }
      if (typeof b.status === "string") {
        if (!(STATUSES as readonly string[]).includes(b.status)) return json({ ok: false, error: "bad_status" }, 400);
        const msg = typeof b.message === "string" ? b.message.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, 3000) : "";
        if (b.status !== r.status) {
          await db.prepare("UPDATE wr_requests SET status = ?, updated_at = ? WHERE id = ?").bind(b.status, now, id).run();
          await db.prepare("INSERT INTO wr_events (request_id, at, kind, status, body, visible, author) VALUES (?, ?, 'status', ?, ?, 1, ?)").bind(id, now, b.status, `Status changed to ${STATUS_LABEL[b.status as Status]}.`, who.email).run();
        }
        if (msg) await db.prepare("INSERT INTO wr_events (request_id, at, kind, body, visible, author) VALUES (?, ?, 'message', ?, 1, ?)").bind(id, now + 1, msg, who.email).run();
        out.status = b.status;
        if (b.notify && (b.status !== r.status || msg)) out.email = await sendNow(db, id, statusMail({ ...r, status: b.status }, b.status as Status, msg));
      }
      return json({ ok: true, ...out });
    }
    if (action === "events" && req.method === "POST") {
      const b = await body();
      const text = typeof b.body === "string" ? b.body.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, 3000) : "";
      if (!text) return json({ ok: false, error: "empty" }, 400);
      const kind = b.kind === "message" ? "message" : "note";
      const now = Date.now();
      await db.prepare("INSERT INTO wr_events (request_id, at, kind, body, visible, author) VALUES (?, ?, ?, ?, ?, ?)").bind(id, now, kind, text, kind === "message" ? 1 : 0, who.email).run();
      if (kind === "message") await db.prepare("UPDATE wr_requests SET updated_at = ? WHERE id = ?").bind(now, id).run();
      let email: unknown = null;
      if (kind === "message" && b.notify) email = await sendNow(db, id, statusMail(r, r.status as Status, text));
      return json({ ok: true, email });
    }
    if (action === "emails" && seg[3] && seg[4] === "resend" && req.method === "POST") {
      const logId = Number(seg[3]);
      const row = await db.prepare("SELECT id FROM wr_emails WHERE id = ? AND request_id = ?").bind(logId, id).first<Row>();
      if (!row) return json({ ok: false, error: "not_found" }, 404);
      await db.prepare("UPDATE wr_emails SET status = 'failed' WHERE id = ? AND status != 'sent'").bind(logId).run();
      const rr = await db.prepare("SELECT status FROM wr_emails WHERE id = ?").bind(logId).first<Row>();
      if (rr?.status === "sent") { // explicit re-send of an already-sent email = a new log row
        const orig = await db.prepare("SELECT params FROM wr_emails WHERE id = ?").bind(logId).first<Row>();
        return json({ ok: true, email: await sendNow(db, id, JSON.parse(orig!.params)) });
      }
      const done = await attempt(db, logId); if (done) delete done.params;
      return json({ ok: true, email: done });
    }
    if (!action && req.method === "DELETE") {
      const b = await body();
      if (b.confirm !== id) return json({ ok: false, error: "confirm_required" }, 400);
      await db.batch([db.prepare("DELETE FROM wr_events WHERE request_id = ?").bind(id), db.prepare("DELETE FROM wr_emails WHERE request_id = ?").bind(id), db.prepare("DELETE FROM wr_requests WHERE id = ?").bind(id)]);
      return json({ ok: true, deleted: id });
    }
    return json({ ok: false, error: "not_found" }, 404);
  }

  if (path === "/export.csv" && req.method === "GET") {
    const rows = await db.prepare("SELECT * FROM wr_requests ORDER BY created_at DESC").all<Row>();
    const cols = ["id", "created_at", "updated_at", "status", "title", "name", "organization", "email", "country_code", "phone", "website_type", "description", "features", "budget", "completion_date", "flexible", "existing_url", "reference_sites", "reference_notes", "archived", "is_test", "country"];
    const lines = [cols.join(",")];
    for (const r of rows.results) lines.push(cols.map((c) => csvCell(c === "created_at" || c === "updated_at" ? iso(r[c]) : c === "status" ? STATUS_LABEL[r[c] as Status] ?? r[c] : r[c])).join(","));
    return new Response("\uFEFF" + lines.join("\r\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="website-requests-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" } });
  }
  return json({ ok: false, error: "not_found" }, 404);
}
export { STATUS_PATH };
