"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Github, Globe, X } from "lucide-react";
import type { Repo } from "@/lib/types";
import { displayName, fmtDate, host, statusOf, subjectTopics, techOf } from "@/lib/tech";
import { site } from "@/data/site";

type Readme = { state: "loading" } | { state: "ok"; text: string | null } | { state: "error" };

export function ProjectModal({ repo, refTime, onClose }: { repo: Repo | null; refTime: string; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [readme, setReadme] = useState<Readme>({ state: "loading" });

  useEffect(() => {
    if (!repo) return;
    document.documentElement.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    let alive = true;
    setReadme({ state: "loading" });
    fetch(`/api/readme/${encodeURIComponent(repo.name)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((b) => { if (alive) setReadme({ state: "ok", text: b.text ?? null }); })
      .catch(() => { if (alive) setReadme({ state: "error" }); });
    return () => { alive = false; window.removeEventListener("keydown", onKey); document.documentElement.style.overflow = ""; };
  }, [repo, onClose]);

  return (
    <AnimatePresence>
      {repo ? (
        <motion.div key="overlay" className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/60 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby="pm-title" data-modal
            className="relative max-h-[92dvh] w-full max-w-[760px] overflow-y-auto rounded-t-[24px] bg-paper sm:rounded-[24px]"
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            <Body repo={repo} refTime={refTime} readme={readme} closeBtn={closeBtn} onClose={onClose} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Body({ repo, refTime, readme, closeBtn, onClose }: { repo: Repo; refTime: string; readme: Readme; closeBtn: React.RefObject<HTMLButtonElement | null>; onClose: () => void }) {
  const tech = techOf(repo), topics = subjectTopics(repo), st = statusOf(repo, refTime);
  const facts: [string, string][] = [
    ["Status", st.label], ["Main language", repo.language || "—"], ["Created", fmtDate(repo.createdAt)], ["Last push", fmtDate(repo.pushedAt)],
    ["Stars", String(repo.stars)], ["Forks", String(repo.forks)], ["License", repo.license || "—"], ["Branch", repo.defaultBranch],
  ];
  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-mist bg-paper px-6 py-4">
        <p className="truncate font-mono text-[12.5px] text-muted">{site.github.user}/{repo.name}</p>
        <button ref={closeBtn} type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/15 hover:border-ink/40" aria-label="Close project details"><X size={18} aria-hidden /></button>
      </div>
      <div className="px-6 pb-8 pt-6">
        <h3 id="pm-title" className="font-display text-[clamp(1.9rem,5vw,2.6rem)] font-semibold leading-tight tracking-tightest">{displayName(repo)}</h3>
        <p className="mt-3 text-[16.5px] leading-relaxed text-ink/80">{repo.description || "No description on GitHub yet."}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <a href={repo.url} target="_blank" rel="noopener noreferrer" className="btn-primary min-h-[44px]"><Github size={16} aria-hidden />View repository<ArrowUpRight size={15} aria-hidden /></a>
          {repo.live?.ok ? <a href={repo.live.url} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-[44px]" data-live><Globe size={16} aria-hidden />Live demo · {host(repo.live.url)}</a> : null}
        </div>
        {repo.live?.ok ? <p className="mt-2 font-mono text-[11.5px] text-muted">Live site answered 200 · checked {fmtDate(repo.live.checkedAt)}</p> : null}

        {tech.length ? (<><p className="eyebrow mt-8">Technologies</p><ul className="mt-3 flex flex-wrap gap-1.5">{tech.map((t) => <li key={t} className="chip">{t}</li>)}</ul></>) : null}
        {topics.length ? (<><p className="eyebrow mt-6">Topics</p><ul className="mt-3 flex flex-wrap gap-1.5">{topics.map((t) => <li key={t} className="chip bg-mist/60">#{t}</li>)}</ul></>) : null}

        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-mist bg-mist sm:grid-cols-4">
          {facts.map(([k, v]) => <div key={k} className="bg-white p-4"><dt className="eyebrow text-[10.5px]">{k}</dt><dd className="mt-1.5 text-[14.5px] font-medium">{v}</dd></div>)}
        </dl>

        <div className="mt-8 rounded-2xl border border-mist bg-white p-5">
          <p className="eyebrow">README</p>
          <div className="mt-4" aria-live="polite" aria-busy={readme.state === "loading"}>
            {readme.state === "loading" ? (
              <div data-readme-loading><div className="skeleton h-5 w-1/2" /><div className="skeleton mt-4 h-3 w-full" /><div className="skeleton mt-2 h-3 w-11/12" /><div className="skeleton mt-2 h-3 w-4/5" /><div className="skeleton mt-2 h-3 w-2/3" /></div>
            ) : readme.state === "error" ? (
              <p className="text-[15px] text-muted">The README couldn’t be loaded right now. <a className="text-teal underline" href={repo.url} target="_blank" rel="noopener noreferrer">Read it on GitHub</a>.</p>
            ) : readme.text ? (
              <MiniMarkdown text={readme.text} more={repo.url} />
            ) : (
              <p className="text-[15px] text-muted">This repository has no README yet.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Tiny, safe README preview: headings, paragraphs and bullet lists as plain React text (no HTML injection).
function MiniMarkdown({ text, more }: { text: string; more: string }) {
  const inline = (s: string) => s.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`~]{1,3}([^*_`~]+)[*_`~]{1,3}/g, "$1").replace(/<[^>]+>/g, "").trim();
  const lines = text.replace(/\r/g, "").replace(/```[\s\S]*?```/g, "").split("\n");
  const blocks: React.ReactNode[] = []; let list: string[] = []; let para: string[] = [];
  const flush = () => {
    if (para.length) { const t = inline(para.join(" ")); if (t) blocks.push(<p key={blocks.length} className="mt-3 text-[15px] leading-relaxed text-ink/80">{t}</p>); para = []; }
    if (list.length) { blocks.push(<ul key={blocks.length} className="mt-3 list-disc space-y-1 pl-5 text-[15px] text-ink/80">{list.map((l, i) => <li key={i}>{l}</li>)}</ul>); list = []; }
  };
  for (const raw of lines) {
    if (blocks.length > 14) break;
    const l = raw.trim();
    if (!l || /^(\||---|===|<)/.test(l)) { flush(); continue; }
    const h = l.match(/^#{1,4}\s+(.*)/);
    if (h) { flush(); const t = inline(h[1]); if (t) blocks.push(<h4 key={blocks.length} className="mt-5 font-display text-[18px] font-semibold first:mt-0">{t}</h4>); continue; }
    const b = l.match(/^[-*+]\s+(.*)/) || l.match(/^\d+\.\s+(.*)/);
    if (b) { if (para.length) flush(); const t = inline(b[1]); if (t) list.push(t); continue; }
    if (list.length) flush();
    para.push(l);
  }
  flush();
  return (
    <div>
      {blocks}
      <a href={more} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1 text-[14px] font-medium text-teal">Full README on GitHub<ArrowUpRight size={14} aria-hidden /></a>
    </div>
  );
}
