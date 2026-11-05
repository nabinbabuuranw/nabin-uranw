import { preload } from "react-dom";
import { ArrowDownRight, ArrowUpRight, Github, MapPin } from "lucide-react";
import { site } from "@/data/site";
import type { Repo } from "@/lib/types";
import { displayName, fmtDate } from "@/lib/tech";
import { HeroIn } from "./HeroIn";

export function Hero({ latest }: { latest: Repo | null }) {
  preload("/img/nabin-portrait-840.webp", { as: "image", imageSrcSet: "/img/nabin-portrait-480.webp 480w, /img/nabin-portrait-840.webp 840w", imageSizes: "(min-width: 640px) 440px, 90vw", fetchPriority: "high" });
  return (
    <header id="top" className="dotgrid relative overflow-hidden pt-16">
      <div className="shell grid items-end gap-12 pb-16 pt-10 md:pt-16 lg:grid-cols-12 lg:gap-10 lg:pb-24 lg:pt-20">
        <div className="lg:col-span-7">
          <HeroIn i={0}>
            <p className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-[13.5px] text-ink/80">
              <MapPin size={14} className="text-teal" aria-hidden />{site.location.short}
            </p>
          </HeroIn>
          <div>
            <h1 className="mt-7 font-display text-[clamp(3.2rem,14.5vw,7.4rem)] lg:text-[clamp(4rem,8.2vw,7.4rem)] font-semibold leading-[0.9] tracking-tightest text-ink">
              Nabin Babu<br /><span className="text-teal">Uranw</span>
            </h1>
          </div>
          <HeroIn i={2}>
            <p className="mt-7 font-display text-[clamp(1.25rem,2.4vw,1.7rem)] font-medium tracking-tight text-ink">{site.role}</p>
            <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-muted">{site.roles.join("  ·  ")}</p>
          </HeroIn>
          <HeroIn i={3}>
            <p className="mt-6 max-w-[56ch] text-[17px] leading-[1.65] text-ink/80 md:text-[18px]">{site.intro}</p>
          </HeroIn>
          <HeroIn i={4}>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#projects" className="btn-primary">Explore Projects<ArrowDownRight size={17} aria-hidden /></a>
              <a href="#contact" className="btn-ghost">Contact Me</a>
              <a href={site.github.url} target="_blank" rel="noopener noreferrer" className="btn-ghost"><Github size={17} aria-hidden />GitHub Profile</a>
            </div>
          </HeroIn>
        </div>

        <div className="lg:col-span-5">
          <div className="relative mx-auto max-w-[440px] lg:ml-auto lg:mr-0">
            <figure className="relative">
              <div className="overflow-hidden rounded-[22px] border border-ink/10 bg-mist">
                <img src="/img/nabin-portrait-840.webp" srcSet="/img/nabin-portrait-480.webp 480w, /img/nabin-portrait-840.webp 840w" sizes="(min-width: 640px) 440px, 90vw"
                  width={840} height={1050} alt="Portrait of Nabin Babu Uranw, independent full-stack developer" fetchPriority="high" decoding="async" className="aspect-[4/5] h-auto w-full object-cover" />
              </div>
              <figcaption className="sr-only">Nabin Babu Uranw</figcaption>
              {latest ? (
                <a href={latest.url} target="_blank" rel="noopener noreferrer"
                  className="group absolute -bottom-6 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-[0_18px_40px_-24px_rgba(31,36,33,.45)] transition-colors hover:border-teal sm:-left-6 sm:right-auto sm:min-w-[300px]">
                  <span className="min-w-0">
                    <span className="eyebrow flex items-center gap-2"><span className="live-dot h-1.5 w-1.5 rounded-full bg-fern text-fern" aria-hidden />Latest push on GitHub</span>
                    <span className="mt-1.5 block truncate font-display text-[17px] font-semibold">{displayName(latest)}</span>
                    <span className="block font-mono text-[12px] text-muted">{latest.name} · {fmtDate(latest.pushedAt)}</span>
                  </span>
                  <ArrowUpRight size={18} className="shrink-0 text-muted transition-colors group-hover:text-teal" aria-hidden />
                </a>
              ) : null}
            </figure>
          </div>
        </div>
      </div>
      <div className="border-t rule">
        <div className="shell flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-5 font-mono text-[12px] uppercase tracking-[0.14em] text-muted">
          <span>Designs</span><span aria-hidden>/</span><span>Develops</span><span aria-hidden>/</span><span>Builds</span><span aria-hidden>/</span><span>Maintains</span>
          <span className="hidden md:inline">{site.location.full}</span>
        </div>
      </div>
    </header>
  );
}
