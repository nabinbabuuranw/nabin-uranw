import type { Repo } from "./types";

// GitHub topics that name a technology, mapped to a readable label. Anything not listed is a
// subject topic (e.g. "nepal", "saas") and is shown as a topic, not as tech.
const TECH: Record<string, string> = {
  react: "React", nextjs: "Next.js", next: "Next.js", typescript: "TypeScript", javascript: "JavaScript",
  tailwindcss: "Tailwind CSS", tailwind: "Tailwind CSS", vite: "Vite", nodejs: "Node.js", node: "Node.js",
  express: "Express", "cloudflare-workers": "Cloudflare Workers", d1: "Cloudflare D1", "cloudflare-d1": "Cloudflare D1",
  clerk: "Clerk", prisma: "Prisma", postgresql: "PostgreSQL", postgres: "PostgreSQL", python: "Python",
  docker: "Docker", kotlin: "Kotlin", android: "Android", html: "HTML", css: "CSS", vue: "Vue", svelte: "Svelte",
  mongodb: "MongoDB", firebase: "Firebase", supabase: "Supabase", php: "PHP", laravel: "Laravel", flutter: "Flutter",
  dart: "Dart", java: "Java", go: "Go", rust: "Rust", "framer-motion": "Framer Motion", redux: "Redux", graphql: "GraphQL",
};
const LANG_ALIAS: Record<string, string> = { "Jupyter Notebook": "Python" };

export function techOf(r: Repo): string[] {
  const out: string[] = [];
  const add = (t: string) => { if (t && !out.includes(t)) out.push(t); };
  if (r.language) add(LANG_ALIAS[r.language] || r.language);
  for (const t of r.topics) if (TECH[t]) add(TECH[t]);
  return out;
}
export function subjectTopics(r: Repo): string[] {
  return r.topics.filter((t) => !TECH[t]);
}
// "Byawastha (व्यवस्था): all-in-one…" -> display name "Byawastha"; else Title Case of the repo name
export function displayName(r: Repo): string {
  const m = r.description?.match(/^([A-Z][\p{L}\p{N} .'-]{1,40}?)\s*(\(|:|—|-\s)/u);
  if (m && m[1].toLowerCase().replace(/[^a-z0-9]/g, "") === r.name.toLowerCase().replace(/[^a-z0-9]/g, "")) return m[1].trim();
  return r.name.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
export function statusOf(r: Repo, ref: string): { label: string; tone: "active" | "archived" | "quiet" } {
  if (r.archived) return { label: "Archived", tone: "archived" };
  const days = (new Date(ref).getTime() - new Date(r.pushedAt).getTime()) / 864e5;
  return days <= 90 ? { label: "Active", tone: "active" } : { label: "Maintained", tone: "quiet" };
}
export function host(u: string) { try { return new URL(u).host; } catch { return u; } }
