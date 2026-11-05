"use client";
import { useEffect, useState } from "react";
import { Github, Menu, X, Phone, MessageCircle } from "lucide-react";
import { nav, site } from "@/data/site";
import { Signature } from "./Signature";

export function Nav({ solid = false }: { solid?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(e.target.id === "top" ? "" : e.target.id);
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["top", ...nav.map((n) => n.id)].forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => { window.removeEventListener("scroll", onScroll); io.disconnect(); };
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (id: string) => (e: React.MouseEvent) => {
    // On other pages (/status, /privacy, /admin) the section isn't here: let the link navigate to /#id.
    if (!document.getElementById(id)) { setOpen(false); return; }
    e.preventDefault();
    setOpen(false);
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      history.replaceState(null, "", `#${id}`);
    });
  };

  return (
    <header className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${scrolled || open || solid ? "border-mist bg-paper" : "border-transparent bg-paper/0"}`}>
      <div className="shell flex h-16 items-center justify-between gap-6">
        <a href="/#top" onClick={go("top")} className="group -my-1 flex shrink-0 items-center gap-3.5 py-1 text-ink" aria-label={`${site.name}, back to top`}>
          <Signature reveal eager className="w-[50px] transition-opacity duration-300 group-hover:opacity-75 sm:w-[56px] lg:w-[60px]" />
          <span className="hidden h-6 w-px bg-teal/50 sm:block" aria-hidden />
          <span className="hidden font-display text-[15px] font-semibold tracking-tight sm:block">Nabin Babu Uranw</span>
        </a>
        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {nav.map((n) => (
              <li key={n.id}>
                <a href={`/#${n.id}`} onClick={go(n.id)} aria-current={active === n.id ? "true" : undefined}
                  className={`rounded-full px-3.5 py-2 text-[14.5px] transition-colors ${active === n.id ? "bg-ink text-paper" : "text-ink/75 hover:text-ink hover:bg-mist/70"}`}>{n.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <a href={site.github.url} target="_blank" rel="noopener noreferrer" className="hidden h-10 w-10 place-items-center rounded-full border border-ink/15 text-ink transition-colors hover:border-ink/40 sm:grid" aria-label="GitHub profile (opens in a new tab)"><Github size={18} aria-hidden /></a>
          <a href="/#request" onClick={go("request")} className="btn-primary hidden min-h-[40px] px-5 text-[14px] lg:inline-flex">Request a website</a>
          <button type="button" onClick={() => setOpen((v) => !v)} className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 lg:hidden" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"}>
            {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
        </div>
      </div>
      <div id="mobile-menu" hidden={!open} className="h-[calc(100dvh-4rem)] overflow-y-auto border-t border-mist bg-paper lg:hidden">
        <nav aria-label="Mobile" className="shell flex h-full flex-col justify-between py-8">
          <ul className="space-y-1">
            {nav.map((n, i) => (
              <li key={n.id}>
                <a href={`/#${n.id}`} onClick={go(n.id)} className="flex items-baseline justify-between border-b border-mist py-4 font-display text-[30px] font-semibold tracking-tight">
                  {n.label}<span className="font-mono text-[12px] font-normal text-muted">0{i + 1}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-10 grid gap-3">
            <a href="/#request" onClick={go("request")} className="btn-primary w-full">Request a website</a>
            <a href={site.phone.tel} className="btn-ghost w-full"><Phone size={17} aria-hidden />Call {site.phone.display}</a>
            <a href={site.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full"><MessageCircle size={17} aria-hidden />WhatsApp</a>
            <a href={site.github.url} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full"><Github size={17} aria-hidden />GitHub profile</a>
          </div>
        </nav>
      </div>
    </header>
  );
}
