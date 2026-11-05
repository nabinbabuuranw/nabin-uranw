import { Reveal } from "./Reveal";

// Sticky label column on desktop, stacked on mobile.
export function Section({ id, label, title, intro, children, className = "" }: { id: string; label: string; title: React.ReactNode; intro?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`border-t rule ${className}`}>
      <div className="shell grid gap-10 py-20 md:py-28 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow flex items-center gap-3"><span className="h-px w-8 bg-teal" aria-hidden />{label}</p>
            <Reveal><h2 id={`${id}-title`} className="mt-5 max-w-[16ch] font-display text-[clamp(2rem,4.2vw,3.1rem)] font-semibold leading-[1.02] tracking-tightest text-ink">{title}</h2></Reveal>
            {intro ? <div className="mt-5 max-w-[42ch] text-[16px] leading-relaxed text-muted">{intro}</div> : null}
          </div>
        </div>
        <div className="lg:col-span-8">{children}</div>
      </div>
    </section>
  );
}
