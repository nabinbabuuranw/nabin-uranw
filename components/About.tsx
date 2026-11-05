import { about, site } from "@/data/site";
import { Section } from "./Section";
import { Reveal } from "./Reveal";
import { NearPicture } from "./NearPicture";

const offscreen = [
  { name: "nabin-jersey", alt: "Nabin Babu Uranw in a Nepal cricket jersey, taking a mirror selfie", caption: "In Nepal’s colours" },
  { name: "nabin-garden", alt: "Nabin Babu Uranw seen from behind in a garden, wearing an Automatic graphic sweatshirt", caption: "Away from code" },
];

export function About() {
  return (
    <Section id="about" label="About me" title={<>Real software, built <span className="text-teal">by hand.</span></>}>
      <div className="grid gap-10 md:grid-cols-[1fr_minmax(0,300px)] md:gap-12">
        <div>
          <Reveal><p className="font-display text-[clamp(1.35rem,2.4vw,1.75rem)] font-medium leading-[1.35] tracking-tight text-ink">{about.lead}</p></Reveal>
          {about.body.map((p, i) => (
            <Reveal key={i} delay={0.05 * (i + 1)}><p className="mt-5 text-[17px] leading-[1.7] text-ink/80">{p}</p></Reveal>
          ))}
          <Reveal delay={0.12}>
            <dl className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-mist bg-mist sm:grid-cols-3">
              {[["Based in", site.location.short], ["Works as", "Independent developer"], ["Builds", "Websites, web apps, digital products"]].map(([k, v]) => (
                <div key={k} className="bg-white p-5"><dt className="eyebrow">{k}</dt><dd className="mt-2 text-[15px] font-medium text-ink">{v}</dd></div>
              ))}
            </dl>
          </Reveal>
        </div>
        <Reveal delay={0.08} className="mx-auto w-full max-w-[300px]">
          <figure>
            <div className="overflow-hidden rounded-[18px] border border-ink/10 bg-mist">
              <img src="/img/nabin-park-480.webp" srcSet="/img/nabin-park-480.webp 480w, /img/nabin-park-900.webp 900w" sizes="300px" width={480} height={640} loading="lazy" decoding="async"
                alt="Nabin Babu Uranw standing in a park" className="aspect-[3/4] h-auto w-full object-cover" />
            </div>
            <figcaption className="mt-3 font-mono text-[12px] text-muted">Nabin Babu Uranw · {site.nameNative}</figcaption>
          </figure>
        </Reveal>
      </div>

      <div className="mt-16">
        <p className="eyebrow flex items-center gap-3"><span className="h-px w-8 bg-teal" aria-hidden />Off-screen</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5">
          {offscreen.map((ph, i) => (
            <Reveal key={ph.name} delay={0.06 * i} className={i === 1 ? "sm:mt-12" : ""}>
              <figure>
                <div className="overflow-hidden rounded-[14px] border border-ink/10 bg-mist sm:rounded-[18px]">
                  <NearPicture name={ph.name} alt={ph.alt} sizes="(min-width: 1280px) 380px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 46vw" />
                </div>
                <figcaption className="mt-3 font-mono text-[11.5px] text-muted sm:text-[12px]"><span className="text-teal">0{i + 1}</span> · {ph.caption}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <p className="eyebrow">How I approach every project</p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2">
          {about.principles.map((p, i) => (
            <Reveal as="li" key={p.title} delay={0.05 * i} className="h-full rounded-2xl border border-mist bg-white p-6 transition-colors hover:border-teal/50">
                <span className="font-mono text-[12px] text-teal">0{i + 1}</span>
                <h3 className="mt-3 font-display text-[20px] font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-2 text-[15.5px] leading-relaxed text-muted">{p.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </Section>
  );
}
