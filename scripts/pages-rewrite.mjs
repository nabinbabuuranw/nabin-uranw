// GitHub Pages serves this site under /<repo>/, so root-absolute paths written as plain strings in the code
// (images, files, page links) need the base path. Next adds it to its own assets and <Link>s; this adds it to the rest.
import fs from "node:fs";
import path from "node:path";
const base = process.env.PAGES_BASE_PATH || "";
if (!base) { console.log("PAGES_BASE_PATH not set: nothing to do"); process.exit(0); }
const names = "img|film|__f|brand|docs|favicon|icon|apple-touch|og-official|manifest|about|projects|contact|terms|privacy|status|web-developer|full-stack|react-typescript|freelance|ai-developer|sitemap|robots";
const re = new RegExp(`(["'(=\\x60])/(?=(?:${names})[-./"'#?\\w])`, "g");
let changed = 0;
function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const s = fs.statSync(p); if (s.isDirectory()) walk(p); else if (/\.(html|js|css|txt|json|xml|webmanifest)$/.test(f)) {
  let t = fs.readFileSync(p, "utf8"); const o = t;
  t = t.replace(re, `$1${base}/`);
  if (f.endsWith(".html")) t = t.replace(/href="\/(?=["#])/g, `href="${base}/`);
  else if (f.endsWith(".js")) t = t.replace(/href:"\/"/g, `href:"${base}/"`).replace(/href:"\/#/g, `href:"${base}/#`);
  if (t !== o) { fs.writeFileSync(p, t); changed++; }
} } }
walk("out");
console.log("rewrote", changed, "files for base", base);
