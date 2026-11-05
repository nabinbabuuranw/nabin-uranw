"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Github, Globe, RefreshCw, CloudOff, Maximize2 } from "lucide-react";
import type { ProjectsPayload, Repo } from "@/lib/types";
import { displayName, fmtDate, statusOf, techOf } from "@/lib/tech";
import { site } from "@/data/site";
import { Section } from "./Section";
import { ProjectModal } from "./ProjectModal";
import { FeaturedTrishna } from "./FeaturedTrishna";

type Sync = "syncing" | "live" | "fallback";

export function Projects({ snapshot }: { snapshot: ProjectsPayload }) {
  const [data, setData] = useState<ProjectsPayload>(snapshot);
  const [sync, setSync] = useState<Sync>("syncing");
  const [filter, setFilter] = useState<string>("All");
  const [open, setOpen] = useState<Repo | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const load = useCallback(async () => {
    setSync("syncing");
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 9000);
    try {
      const r = await fetch("/api/projects", { signal: ctl.signal, headers: { accept: "application/json" } });
      if (!r.ok) throw new Error(String(r.status));
      const body = (await r.json()) as ProjectsPayload;
      if (!Array.isArray(body.repos)) throw new Error("bad payload");
      setData(body);
      setSync(body.source === "live" ? "live" : "fallback");
    } catch {
      setSync("fallback"); // keep what we have (build snapshot) — never an empty grid
    } finally { clearTimeout(t); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // deep link: #project/<name>
  useEffect(() => {
    const fromHash = () => {
      const m = location.hash.match(/^#project\/(.+)$/);
      if (m) { const r = data.repos.find((x) => x.name === decodeURIComponent(m[1])); if (r) setOpen(r); }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [data.repos]);

  const techCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of data.repos) for (const t of techOf(r)) m.set(t, (m.get(t) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [data.repos]);

  useEffect(() => { if (filter !== "All" && !techCounts.some(([t]) => t === filter)) setFilter("All"); }, [techCounts, filter]);

  const shown = useMemo(() => (filter === "All" ? data.repos : data.repos.filter((r) => techOf(r).includes(filter))), [data.repos, filter]);

  const openRepo = (r: Repo, el: HTMLElement) => {
    opener.current = el; setOpen(r);
    history.replaceState(null, "", `#project/${encodeURIComponent(r.name)}`);
  };
  const close = useCallback(() => {
    setOpen(null);
    history.replaceState(null, "", "#projects");
    requestAnimationFrame(() => opener.current?.focus());
  }, []);

  const showSkeleton = sync === "syncing" && data.repos.length === 0;

  return (
    <Section id="projects" label="Projects" title={<>Straight from <span className="text-teal">GitHub.</span></>}
      intro={<>A featured build first. Below it, every card is generated from my public repositories, so new projects appear on their own. A Live demo button shows only when the site answers.</>}>
      <FeaturedTrishna />

      <div className="mt-14 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[15px] text-ink" aria-live="polite">
          <span className="font-display text-[22px] font-semibold">{data.repos.length}</span>{" "}
          <span className="text-muted">public {data.repos.length === 1 ? "repository" : "repositories"} on</span>{" "}
          <a href={site.github.url} target="_blank" rel="noopener noreferrer" className="link-u font-medium text-teal">@{site.github.user}</a>
        </p>
        <SyncPill sync={sync} data={data} onRetry={load} />
      </div>

      {techCounts.length > 0 ? (
        <div role="group" aria-label="Filter projects by technology" className="mt-6 flex flex-wrap gap-2">
          {[["All", data.repos.length] as [string, number], ...techCounts].map(([t, n]) => (
            <button key={t} type="button" onClick={() => setFilter(t)} aria-pressed={filter === t}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-4 text-[14px] transition-colors ${filter === t ? "border-ink bg-ink text-paper" : "border-ink/15 bg-white text-ink/80 hover:border-ink/40"}`}>
              {t}<span className={`font-mono text-[11.5px] ${filter === t ? "text-sage" : "text-muted"}`}>{n}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {showSkeleton ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />) : null}
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((r, i) => (
            <motion.div key={r.name} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35, delay: Math.min(i, 6) * 0.03 }}>
              <Card repo={r} refTime={data.fetchedAt} onOpen={openRepo} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!showSkeleton && data.repos.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-ink/20 p-8 text-center text-muted">No public repositories yet. See <a className="text-teal underline" href={site.github.url}>GitHub</a>.</p>
      ) : null}

      <div className="mt-10">
        <a href={site.github.url} target="_blank" rel="noopener noreferrer" className="btn-ghost"><Github size={17} aria-hidden />All repositories on GitHub<ArrowUpRight size={16} aria-hidden /></a>
      </div>

      <ProjectModal repo={open} refTime={data.fetchedAt} onClose={close} />
    </Section>
  );
}

function SyncPill({ sync, data, onRetry }: { sync: Sync; data: ProjectsPayload; onRetry: () => void }) {
  if (sync === "syncing")
    return <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-1.5 font-mono text-[12px] text-muted" data-sync="syncing"><RefreshCw size={13} className="animate-spin motion-reduce:animate-none" aria-hidden />Checking GitHub…</span>;
  if (sync === "live")
    return <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-1.5 font-mono text-[12px] text-ink/80" data-sync="live" title={`Fetched ${new Date(data.fetchedAt).toUTCString()}`}><span className="live-dot h-1.5 w-1.5 rounded-full bg-fern text-fern" aria-hidden />Synced with GitHub</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2 rounded-full border border-ink/15 bg-white px-3 py-1.5 font-mono text-[12px] text-ink/80" data-sync="fallback">
      <CloudOff size={13} aria-hidden />GitHub unreachable · saved copy from {fmtDate(data.fetchedAt)}
      <button type="button" onClick={onRetry} className="text-teal underline underline-offset-2">Retry</button>
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-[20px] border border-mist bg-white p-6" aria-hidden data-skeleton>
      <div className="skeleton h-3 w-24" /><div className="skeleton mt-5 h-7 w-2/3" /><div className="skeleton mt-3 h-3 w-1/2" />
      <div className="skeleton mt-6 h-3 w-full" /><div className="skeleton mt-2 h-3 w-5/6" /><div className="skeleton mt-2 h-3 w-4/6" />
      <div className="mt-6 flex gap-2"><div className="skeleton h-6 w-16" /><div className="skeleton h-6 w-20" /><div className="skeleton h-6 w-14" /></div>
    </div>
  );
}

function Card({ repo, refTime, onOpen }: { repo: Repo; refTime: string; onOpen: (r: Repo, el: HTMLElement) => void }) {
  const tech = techOf(repo);
  const st = statusOf(repo, refTime);
  return (
    <article className="group flex h-full flex-col rounded-[20px] border border-mist bg-white p-6 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-[0_24px_50px_-30px_rgba(31,36,33,.35)] motion-reduce:hover:translate-y-0" data-repo={repo.name}>
      <div className="flex items-center justify-between gap-3 font-mono text-[12px]">
        <span className="inline-flex items-center gap-2 text-ink/80">
          <span className={`h-1.5 w-1.5 rounded-full ${st.tone === "active" ? "bg-fern" : st.tone === "archived" ? "bg-ink/30" : "bg-sage"}`} aria-hidden />{st.label}
        </span>
        <span className="text-muted">Updated {fmtDate(repo.pushedAt)}</span>
      </div>
      <h3 className="mt-5 font-display text-[26px] font-semibold leading-tight tracking-tight">
        <button type="button" onClick={(e) => onOpen(repo, e.currentTarget)} className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 rounded-sm">
          {displayName(repo)}
        </button>
      </h3>
      <p className="mt-1 font-mono text-[12.5px] text-muted">{site.github.user}/{repo.name}</p>
      <p className="mt-4 line-clamp-3 text-[15.5px] leading-relaxed text-ink/80">{repo.description || "No description on GitHub yet."}</p>
      {tech.length ? (
        <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Technologies">
          {tech.slice(0, 6).map((t) => <li key={t} className="chip">{t}</li>)}
          {tech.length > 6 ? <li className="chip">+{tech.length - 6}</li> : null}
        </ul>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-6 sm:gap-2">
        <button type="button" onClick={(e) => onOpen(repo, e.currentTarget)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-ink px-3.5 text-[14px] text-paper sm:px-4 transition-colors hover:bg-teal" aria-label={`Details: ${displayName(repo)}`}>
          <Maximize2 size={14} aria-hidden />Details
        </button>
        <a href={repo.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-ink/15 px-3.5 text-[14px] transition-colors hover:border-ink/40 sm:px-4" aria-label={`Code for ${displayName(repo)} on GitHub`}>
          <Github size={14} aria-hidden />Code
        </a>
        {repo.live?.ok ? (
          <a href={repo.live.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-teal/40 px-3.5 text-[14px] text-teal sm:px-4 transition-colors hover:bg-teal hover:text-white" aria-label={`Live demo of ${displayName(repo)}`} data-live>
            <Globe size={14} aria-hidden />Live demo
          </a>
        ) : null}
      </div>
    </article>
  );
}
