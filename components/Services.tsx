import { services } from "@/data/site";
import { Section } from "./Section";
import { Reveal } from "./Reveal";

export function Services() {
  return (
    <Section id="services" label="Development services" title={<>What I can <span className="text-teal">build for you.</span></>}
      intro={<>From a single landing page to a full business system, designed, built and looked after by one developer.</>}>
      <ol className="grid border-t border-mist sm:grid-cols-2">
        {services.map((s, i) => (
          <Reveal as="li" key={s.title} delay={(i % 2) * 0.05} className={`group h-full border-b border-mist py-8 sm:px-6 ${i % 2 === 0 ? "sm:border-r sm:pl-0" : "sm:pr-0"}`}>
              <span className="font-mono text-[12px] text-muted transition-colors group-hover:text-teal">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 font-display text-[22px] font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-[15.5px] leading-relaxed text-muted">{s.body}</p>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
