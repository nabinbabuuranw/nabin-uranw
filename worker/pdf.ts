// Server-side request PDF (pdf-lib, standard fonts only so the file stays ~10 KB and fits an email attachment).
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type PdfRequest = {
  id: string; createdAt: number; name: string; organization: string; email: string; countryCode: string; phone: string;
  websiteType: string; description: string; features: string; budget: string; completion: string;
  existingUrl: string; referenceSites: string; referenceNotes: string; statusLabel: string;
};

const INK = rgb(0x1f / 255, 0x24 / 255, 0x21 / 255);
const TEAL = rgb(0x21 / 255, 0x68 / 255, 0x69 / 255);
const MUTED = rgb(0x5a / 255, 0x65 / 255, 0x60 / 255);
const RULE = rgb(0xdc / 255, 0xe1 / 255, 0xde / 255);
const SAGE = rgb(0x9c / 255, 0xc5 / 255, 0xa1 / 255);

export function nptDate(ms: number) {
  const d = new Date(ms + (5 * 60 + 45) * 60000);
  const M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const hh = String(d.getUTCHours()).padStart(2, "0"), mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${M[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${hh}:${mm} (Nepal time)`;
}

export async function buildRequestPdf(r: PdfRequest): Promise<{ bytes: Uint8Array; lossy: boolean }> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Website Request ${r.id}`); doc.setAuthor("Nabin Babu Uranw"); doc.setSubject("Website development request");
  doc.setCreator("nabin-uranw.sites.tab.bot"); doc.setProducer("nabin-uranw.sites.tab.bot"); doc.setCreationDate(new Date(r.createdAt));
  const reg = await doc.embedFont("Helvetica");
  const bold = await doc.embedFont("Helvetica-Bold");
  const ital = await doc.embedFont("Times-Italic");

  let lossy = false;
  const okCache = new Map<string, boolean>();
  const safe = (s: string, f: PDFFont = reg) => {
    let out = "";
    for (const ch of (s || "").replace(/\r\n?/g, "\n").replace(/\t/g, "  ")) {
      if (ch === "\n") { out += ch; continue; }
      const key = f.name + ch;
      let ok = okCache.get(key);
      if (ok === undefined) { try { f.encodeText(ch); f.widthOfTextAtSize(ch, 10); ok = true; } catch { ok = false; } okCache.set(key, ok); }
      if (ok) out += ch; else { out += "?"; lossy = true; }
    }
    return out;
  };

  const W = 595.28, H = 841.89, ML = 56, MR = 56, CW = W - ML - MR;
  const pages: PDFPage[] = [];
  let page!: PDFPage; let y = 0;
  const newPage = (first: boolean) => {
    page = doc.addPage([W, H]); pages.push(page);
    page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: INK });
    if (first) { y = H - 56; return; }
    page.drawText("NABIN BABU URANW", { x: ML, y: H - 40, size: 8, font: bold, color: INK, characterSpacing: 1.6 } as any);
    page.drawText(safe(`Website request ${r.id}`), { x: W - MR - reg.widthOfTextAtSize(`Website request ${r.id}`, 8), y: H - 40, size: 8, font: reg, color: MUTED });
    page.drawLine({ start: { x: ML, y: H - 50 }, end: { x: W - MR, y: H - 50 }, thickness: 0.5, color: RULE });
    y = H - 78;
  };
  const ensure = (need: number) => { if (y - need < 70) newPage(false); };
  const wrap = (s: string, f: PDFFont, size: number, width: number) => {
    const lines: string[] = [];
    for (const para of safe(s, f).split("\n")) {
      if (!para.trim()) { lines.push(""); continue; }
      let line = "";
      for (const word of para.split(/ +/)) {
        const t = line ? line + " " + word : word;
        if (f.widthOfTextAtSize(t, size) <= width) { line = t; continue; }
        if (line) lines.push(line);
        if (f.widthOfTextAtSize(word, size) <= width) { line = word; continue; }
        let chunk = "";
        for (const c of word) { if (f.widthOfTextAtSize(chunk + c, size) > width) { lines.push(chunk); chunk = c; } else chunk += c; }
        line = chunk;
      }
      lines.push(line);
    }
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    return lines;
  };

  newPage(true);
  // Letterhead
  page.drawText("NABIN BABU URANW", { x: ML, y, size: 11, font: bold, color: INK, characterSpacing: 2.2 } as any);
  page.drawText("Independent Full-Stack Developer & UI/UX Designer", { x: ML, y: y - 15, size: 9, font: reg, color: MUTED });
  page.drawText("Inaruwa, Sunsari, Nepal", { x: ML, y: y - 27, size: 9, font: reg, color: MUTED });
  const contact = ["+977 976-446-5688", "nabinuranw333@gmail.com", "nabin-uranw.sites.tab.bot"];
  contact.forEach((c, i) => page.drawText(c, { x: W - MR - reg.widthOfTextAtSize(c, 9), y: y - i * 12, size: 9, font: reg, color: i === 0 ? INK : MUTED }));
  y -= 52;
  page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 0.6, color: INK });
  y -= 32;

  // Title block
  page.drawRectangle({ x: ML, y: y + 1, width: 18, height: 1.4, color: TEAL });
  page.drawText("WEBSITE REQUEST", { x: ML + 26, y, size: 8.5, font: bold, color: TEAL, characterSpacing: 1.8 } as any);
  y -= 36;
  page.drawText(r.id, { x: ML, y, size: 34, font: bold, color: INK, characterSpacing: -0.5 } as any);
  y -= 22;
  page.drawText(safe(`Submitted ${nptDate(r.createdAt)}`), { x: ML, y, size: 10, font: reg, color: MUTED });
  const st = `Status: ${r.statusLabel}`;
  const stw = bold.widthOfTextAtSize(st, 8.5) + 18;
  page.drawRectangle({ x: W - MR - stw, y: y - 5, width: stw, height: 18, borderColor: TEAL, borderWidth: 0.8, color: rgb(1, 1, 1) });
  page.drawText(st, { x: W - MR - stw + 9, y: y + 0.5, size: 8.5, font: bold, color: TEAL });
  y -= 22;
  const sub = safe(`${r.websiteType}${r.organization ? ` for ${r.organization}` : ""}, requested by ${r.name}`);
  for (const l of wrap(sub, ital, 15, CW - 12)) { page.drawText(l, { x: ML, y, size: 15, font: ital, color: INK }); y -= 19; }
  y -= 18;

  const section = (num: string, title: string, rows: [string, string][]) => {
    ensure(70);
    page.drawText(num, { x: ML, y, size: 9, font: bold, color: TEAL });
    page.drawText(title.toUpperCase(), { x: ML + 24, y, size: 9, font: bold, color: INK, characterSpacing: 1.4 } as any);
    y -= 9;
    page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 0.5, color: RULE });
    y -= 17;
    const LW = 150, VX = ML + LW, VW = CW - LW;
    for (const [label, value] of rows) {
      const lines = wrap(value || "—", reg, 10.5, VW);
      const labLines = wrap(label, reg, 9, LW - 14);
      ensure(Math.min(lines.length, 3) * 14 + 6);
      labLines.forEach((l, i) => page.drawText(l, { x: ML, y: y - i * 11, size: 9, font: reg, color: MUTED }));
      for (let i = 0; i < lines.length; i++) {
        if (y < 76) { newPage(false); }
        page.drawText(lines[i], { x: VX, y, size: 10.5, font: reg, color: value ? INK : MUTED });
        y -= 14.5;
      }
      y -= 6;
    }
    y -= 8;
  };

  section("01", "About you", [["Name", r.name], ["Business / organization", r.organization], ["Email", r.email], ["Phone / WhatsApp", `${r.countryCode} ${r.phone}`]]);
  section("02", "The project", [["Website type", r.websiteType], ["Project description", r.description], ["Required features", r.features]]);
  section("03", "Budget & timing", [["Budget", r.budget], ["Preferred completion", r.completion]]);
  section("04", "References", [["Existing website", r.existingUrl], ["Websites you like", r.referenceSites], ["What you like about them", r.referenceNotes]]);

  ensure(80);
  page.drawRectangle({ x: ML, y: y - 46, width: CW, height: 58, color: rgb(0xf2 / 255, 0xf4 / 255, 0xf2 / 255) });
  page.drawRectangle({ x: ML, y: y - 46, width: 2, height: 58, color: SAGE });
  page.drawText("Next step", { x: ML + 16, y: y - 6, size: 9, font: bold, color: INK });
  const nxt = wrap("Nabin reviews these requirements and contacts you. Track the status any time at nabin-uranw.sites.tab.bot/status with this request ID and your email.", reg, 9.5, CW - 32);
  nxt.forEach((l, i) => page.drawText(l, { x: ML + 16, y: y - 20 - i * 12.5, size: 9.5, font: reg, color: MUTED }));
  y -= 70;
  if (lossy) {
    ensure(30);
    for (const l of wrap("Some characters (for example Nepali script) cannot be shown in this PDF and appear as “?”. The original text is kept exactly as written in the request record.", ital, 9.5, CW)) { page.drawText(l, { x: ML, y, size: 9.5, font: ital, color: MUTED }); y -= 12; }
  }

  const fname = `Website-Request-${r.id}.pdf`;
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: ML, y: 46 }, end: { x: W - MR, y: 46 }, thickness: 0.5, color: RULE });
    p.drawText(fname, { x: ML, y: 32, size: 8, font: reg, color: MUTED });
    const pg = `Page ${i + 1} of ${pages.length}`;
    p.drawText(pg, { x: W - MR - reg.widthOfTextAtSize(pg, 8), y: 32, size: 8, font: reg, color: MUTED });
  });
  const bytes = await doc.save({ useObjectStreams: true });
  return { bytes, lossy };
}
