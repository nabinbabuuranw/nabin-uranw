import { process } from "@/data/site";
import { Section } from "./Section";
import { Reveal } from "./Reveal";

export function Process() {
  return (
    <Section id="process" label="Development process" title={<>Five steps, <span className="text-teal">no surprises.</span></>}
      intro={<>The same steps on every project, so you always know what happens next.</>}>
      <div className="relative">
      <span className="absolute bottom-6 left-[19px] top-6 w-px bg-mist md:hidden" aria-hidden />
      <ol className="relative grid gap-0 md:grid-cols-5 md:gap-4">
        {process.map((p, i) => (
          <Reveal as="li" key={p.step} delay={i * 0.06} className="relative flex gap-5 pb-8 md:block md:pb-0">
              <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/15 bg-paper font-mono text-[13px] text-ink">{i + 1}</span>
              <span className="hidden md:absolute md:left-12 md:right-0 md:top-5 md:block md:h-px md:bg-mist" aria-hidden />
              <div className="md:mt-5">
                <h3 className="font-display text-[20px] font-semibold tracking-tight">{p.step}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{p.body}</p>
              </div>
          </Reveal>
        ))}
      </ol>
      </div>
    </Section>
  );
}
