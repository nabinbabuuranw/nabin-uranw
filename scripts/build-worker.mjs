// Bundles worker/worker.ts into out/_worker.js and writes out/tab-site.json (D1 binding).
import { build } from "esbuild";
import fs from "node:fs";
import crypto from "node:crypto";
const MAIL_TO = process.env.NEXT_PUBLIC_CONTACT_RELAY || "nabinuranw333@gmail.com";
const TOKEN_HASH = process.env.INBOX_TOKEN_SHA256 || "";
if (!TOKEN_HASH) console.warn("INBOX_TOKEN_SHA256 not set: /api/contact/inbox will refuse every request");
await build({
  nodePaths: process.env.EXTRA_NODE_PATH ? [process.env.EXTRA_NODE_PATH] : [],
  entryPoints: ["worker/worker.ts"], bundle: true, format: "esm", platform: "neutral", target: "es2022",
  minify: true, outfile: "out/_worker.js", mainFields: ["module", "main"], conditions: ["worker", "browser"], loader: { ".json": "json" },
});
const SIM_KEY = process.env.SIM_KEY || "";
let code = fs.readFileSync("out/_worker.js", "utf8").replace("__TOKEN_HASH__", TOKEN_HASH || "none").replace("__SIM_KEY__", SIM_KEY || crypto.randomUUID());
// "Request a Website" secrets: read from environment variables at build time and baked into the Worker bundle
// (the Worker script is never served as an asset). See REQUESTS.md for the list.
const E = (k, fallback = "") => process.env[k] || fallback;
const clerkFrontend = E("CLERK_FRONTEND_API");
const reqVars = {
  __ADMIN_EMAILS__: E("ADMIN_EMAILS", "nabinuranw333@gmail.com"),
  __REQ_HMAC_SECRET__: E("REQ_HMAC_SECRET"), __REQ_IP_SALT__: E("REQ_IP_SALT"),
  __EJS_SERVICE__: E("EMAILJS_SERVICE_ID"), __EJS_TEMPLATE__: E("EMAILJS_TEMPLATE_ID"), __EJS_PUBLIC__: E("EMAILJS_PUBLIC_KEY"), __EJS_PRIVATE__: E("EMAILJS_PRIVATE_KEY"),
  __EJS_ATTACH__: E("EMAILJS_ATTACH_PDF", "0"),
  __CLERK_FRONTEND__: clerkFrontend, __CLERK_SECRET__: E("CLERK_SECRET_KEY"), __CLERK_HOST__: clerkFrontend.replace(/^https:\/\//, ""),
};
if (!reqVars.__REQ_HMAC_SECRET__ || reqVars.__REQ_HMAC_SECRET__.length < 24) { console.error("REQ_HMAC_SECRET (24+ chars) is required"); process.exit(1); }
for (const [k, v] of Object.entries(reqVars)) code = code.split(k).join(v);
if (!reqVars.__EJS_SERVICE__) console.warn("EMAILJS_* not set: requests are saved, emails stay 'failed' in the log until configured");
if (!clerkFrontend) console.warn("CLERK_* not set: /api/admin refuses every request");
fs.writeFileSync("out/_worker.js", code);
// "/" must reach the Worker (for headers), so the home document moves under /__p/
if (fs.existsSync("out/index.html")) { fs.mkdirSync("out/__p", { recursive: true }); fs.renameSync("out/index.html", "out/__p/index.html"); }
// Same for the other pages, so they too are served by the Worker with its security headers (admin gets its own CSP).
for (const p of ["status", "privacy", "admin"]) if (fs.existsSync(`out/${p}.html`)) fs.renameSync(`out/${p}.html`, `out/__p/${p}.html`);
for (const f of ["_headers"]) if (fs.existsSync("out/" + f)) fs.rmSync("out/" + f);
fs.writeFileSync("out/tab-site.json", JSON.stringify({
  kind: "worker", entry: "_worker.js",
  bindings: [{ type: "d1", name: "DB" }],
  worker: { compatibility_date: "2026-08-01", compatibility_flags: ["nodejs_compat"], html_handling: "auto-trailing-slash", not_found_handling: "none", assets_binding: "ASSETS" },
}, null, 2));
console.log("worker bundled:", fs.statSync("out/_worker.js").size, "bytes; mail to", MAIL_TO);
