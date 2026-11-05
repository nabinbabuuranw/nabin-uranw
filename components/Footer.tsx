"use client";
import { ArrowUp, Github, MessageCircle, Phone } from "lucide-react";
import { site } from "@/data/site";
import { Signature } from "./Signature";

const links: { label: string; href: string; ext?: boolean; file?: boolean }[] = [
  { label: "About", href: "/about" },
  { label: "Projects and case studies", href: "/projects" },
  { label: "Web developer in Nepal", href: "/web-developer-nepal" },
  { label: "Full-stack developer in Nepal", href: "/full-stack-developer-nepal" },
  { label: "React and TypeScript developer", href: "/react-typescript-developer" },
  { label: "Freelance developer in Nepal", href: "/freelance-developer-nepal" },
  { label: "AI automation and integrations", href: "/ai-developer-nepal" },
  { label: "Web developer in Inaruwa, Sunsari", href: "/web-developer-inaruwa-sunsari" },
  { label: "Services", href: "/#services" },
  { label: "Request a Website", href: "/#request" },
  { label: "Check Status", href: "/status" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "GitHub", href: site.github.url, ext: true },
  { label: "Cover Letter (PDF)", href: "/docs/Nabin_Babu_Uranw_Cover_Letter.pdf", file: true },
];

export function Footer() {
  const top = () => { window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); history.replaceState(null, "", "#top"); };
  return (
    <footer className="bg-ink text-mist">
      <div className="shell border-t border-white/10 py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Signature tone="white" className="w-[100px] md:w-[128px]" />
            <p className="mt-5 font-display text-[22px] font-semibold tracking-tight text-paper">Nabin Babu Uranw</p>
            <p className="mt-1.5 text-[15px] text-mist/80">Independent Full-Stack Developer &amp; UI/UX Designer</p>
            <p className="mt-1 text-[15px] text-mist/70">Inaruwa, Sunsari, Nepal</p>
            <div className="mt-6 flex gap-2">
              <a href={site.phone.tel} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 hover:border-sage hover:text-sage" aria-label="Call +977 976-446-5688"><Phone size={17} aria-hidden /></a>
              <a href={site.whatsapp} target="_blank" rel="noopener noreferrer" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 hover:border-sage hover:text-sage" aria-label="WhatsApp (opens in a new tab)"><MessageCircle size={17} aria-hidden /></a>
              <a href={site.github.url} target="_blank" rel="noopener noreferrer" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 hover:border-sage hover:text-sage" aria-label="GitHub (opens in a new tab)"><Github size={17} aria-hidden /></a>
            </div>
          </div>
          <div className="md:col-span-3">
            <p className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-mist/70">Contact</p>
            <ul className="mt-4 space-y-2 text-[15px]">
              <li><a href="tel:+9779764465688" className="link-u text-mist/90 hover:text-paper">+977 976-446-5688</a></li>
              <li><a href={`mailto:${site.email}`} className="link-u break-all text-mist/90 hover:text-paper">{site.email}</a></li>
            </ul>
          </div>
          <nav aria-label="Footer" className="md:col-span-4">
            <p className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-mist/70">Links</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
              {links.map((l) => (
                <li key={l.label}>
                  <a href={l.href} {...(l.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...(l.file ? { type: "application/pdf" } : {})} className="link-u text-[15px] text-mist/85 hover:text-paper">
                    {l.label}{l.ext ? <span className="sr-only"> (opens in a new tab)</span> : null}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 font-mono text-[12px] text-mist/70">
          <p>© {new Date().getFullYear()} Nabin Babu Uranw. All rights reserved.</p>
          <button type="button" onClick={top} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/15 px-5 font-sans text-[14px] hover:border-sage hover:text-sage">
            <ArrowUp size={16} aria-hidden />Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
