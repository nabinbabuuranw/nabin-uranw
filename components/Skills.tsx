import { skills } from "@/data/site";
import type { Repo } from "@/lib/types";
import { techOf, displayName } from "@/lib/tech";
import { Section } from "./Section";
import { Reveal } from "./Reveal";

export function Skills({ repos }: { repos: Repo[] }) {
  const seenIn = (match?: string[]) => (match ? repos.filter((r) => techOf(r).some((t) => match.includes(t))).map(displayName) : []);
  return (
    <Section id="skills" label="Skills & technologies" title={<>The tools I <span className="text-teal">build with.</span></>}
      intro={<>Where a skill shows up in my public code, the repositories are listed beside it, read from GitHub.</>}>
      <div className="grid gap-5 sm:grid-cols-2">
        {skills.map((g, gi) => (
          <Reveal key={g.group} delay={gi * 0.05} className="h-full">
            <div className="h-full rounded-[20px] border border-mist bg-white p-6">
              <h3 className="flex items-baseline justify-between font-display text-[20px] font-semibold tracking-tight">{g.group}<span className="font-mono text-[12px] font-normal text-muted">{g.items.length}</span></h3>
              <ul className="mt-4 divide-y divide-mist">
                {g.items.map((it) => {
                  const seen = seenIn(it.match);
                  return (
                    <li key={it.name} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                      <span className="text-[15.5px] font-medium text-ink">{it.name}</span>
                      {seen.length ? <span className="font-mono text-[11.5px] text-teal">{seen.join(" · ")}</span> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
