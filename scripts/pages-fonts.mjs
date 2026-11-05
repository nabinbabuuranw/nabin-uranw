// GitHub Pages build only: use the bundled font files instead of fetching Google Fonts at build time
// (the fetch is unreliable on CI runners). Production on Vercel keeps next/font/google.
import fs from "node:fs";
const f = "app/layout.tsx";
let s = fs.readFileSync(f, "utf8");
s = s.replace('import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";', 'import localFont from "next/font/local";');
s = s.replace(/const display = Bricolage_Grotesque\(.*\);/, `const display = localFont({ src: [{ path: "./fonts/BricolageGrotesque-500.ttf", weight: "500" }, { path: "./fonts/BricolageGrotesque-600.ttf", weight: "600" }, { path: "./fonts/BricolageGrotesque-700.ttf", weight: "700" }], variable: "--font-display", display: "swap" });`);
s = s.replace(/const sans = Geist\(.*\);/, `const sans = localFont({ src: [{ path: "./fonts/Geist-400.ttf", weight: "400" }, { path: "./fonts/Geist-500.ttf", weight: "500" }, { path: "./fonts/Geist-600.ttf", weight: "600" }], variable: "--font-sans", display: "swap" });`);
s = s.replace(/const mono = Geist_Mono\(.*\);/, `const mono = localFont({ src: [{ path: "./fonts/GeistMono-400.ttf", weight: "400" }, { path: "./fonts/GeistMono-500.ttf", weight: "500" }], variable: "--font-mono", display: "swap" });`);
fs.writeFileSync(f, s);
console.log("layout.tsx now uses local fonts:", s.includes("localFont"));
