import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Motion } from "@/components/Motion";
import { site } from "@/data/site";
import { findRepo, landings, caseStudies, type Landing } from "@/data/seo";

export function crumbsLd(items: { name: string; path: string }[]) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${site.url}${c.path}` })) };
}
export function Ld({ data }: { data: unknown }) { return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />; }

export function Crumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="font-mono text-[12px] text-muted">
      <ol className="flex flex-wrap gap-x-2">
        {items.map((c, i) => (<li key={c.path}>{i < items.length - 1 ? <a href={c.path} className="hover:text-teal">{c.name}</a> : <span aria-current="page">{c.name}</span>}{i < items.length - 1 ? <span aria-hidden> / </span> : null}</li>))}
      </ol>
    </nav>
  );
}

export function Shell({ children, crumbs }: { children: React.ReactNode; crumbs: { name: string; path: string }[] }) {
  return (
    <Motion>
      <Nav solid />
      <main id="main" className="shell pb-24 pt-32">
        <Crumbs items={crumbs} />
        {children}
      </main>
      <Footer />
      <Ld data={crumbsLd(crumbs)} />
    </Motion>
  );
}

export function H2({ children }: { children: React.ReactNode }) { return <h2 className="mt-14 font-display text-[clamp(1.5rem,3vw,2.1rem)] font-semibold tracking-tight">{children}</h2>; }

export function LandingPage({ l }: { l: Landing }) {
  const crumbs = [{ name: "Home", path: "/" }, { name: l.title, path: `/${l.slug}` }];
  const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: l.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  const svc = { "@context": "https://schema.org", "@type": "ProfessionalService", name: `${site.name}, ${l.title}`, url: `${site.url}/${l.slug}`, provider: { "@id": `${site.url}/#person` }, areaServed: { "@type": "Country", name: "Nepal" }, serviceType: l.title };
  return (
    <Shell crumbs={crumbs}>
      <h1 className="mt-6 max-w-[22ch] font-display text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.04] tracking-tightest">{l.h1}</h1>
      <p className="mt-6 max-w-[64ch] text-[17px] leading-relaxed text-ink/80">{l.lead}</p>
      <div className="mt-8 flex flex-wrap gap-3"><a href="/#request" className="btn-primary">Request a website</a><a href={site.whatsapp} className="btn-ghost" rel="noopener noreferrer">WhatsApp me</a></div>
      <H2>Who this is for</H2>
      <ul className="mt-4 max-w-[68ch] list-disc space-y-2 pl-5 text-[16px] text-ink/80">{l.audience.map((a) => <li key={a}>{a}</li>)}</ul>
      <H2>What I offer</H2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{l.offers.map((o) => (<div key={o.t} className="rounded-2xl border border-mist bg-white p-6"><h3 className="font-display text-[19px] font-semibold">{o.t}</h3><p className="mt-2 text-[15.5px] leading-relaxed text-ink/75">{o.b}</p></div>))}</div>
      <H2>Technology I use</H2>
      <p className="mt-4 max-w-[68ch] text-[16px] text-ink/80">{l.stack.join(", ")}.</p>
      {l.extra?.map((x) => (<div key={x.h}><H2>{x.h}</H2>{x.p.map((p) => <p key={p} className="mt-3 max-w-[68ch] text-[16px] leading-relaxed text-ink/80">{p}</p>)}</div>))}
      <H2>Real projects you can review</H2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {l.projects.map((n) => { const r = findRepo(n); const cs = caseStudies.find((c) => c.repo === n); if (!r) return null; return (
          <li key={n} className="rounded-2xl border border-mist bg-white p-5"><p className="font-display text-[18px] font-semibold">{cs ? <a className="hover:text-teal" href={`/projects/${cs.slug}`}>{cs.title}</a> : n}</p><p className="mt-2 text-[14.5px] text-ink/70">{r.description}</p><p className="mt-3 flex gap-4 text-[14px]"><a className="text-teal underline underline-offset-4" href={r.url} rel="noopener noreferrer">Source on GitHub</a></p></li>); })}
      </ul>
      <H2>Frequently asked questions</H2>
      <div className="mt-4 max-w-[68ch] divide-y divide-mist border-y border-mist">{l.faqs.map((f) => (<div key={f.q} className="py-5"><h3 className="font-display text-[18px] font-semibold">{f.q}</h3><p className="mt-2 text-[16px] text-ink/80">{f.a}</p></div>))}</div>
      <H2>More about my work</H2>
      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[15.5px]"><a className="text-teal underline underline-offset-4" href="/about">About Nabin Babu Uranw</a><a className="text-teal underline underline-offset-4" href="/projects">All projects and case studies</a>{landings.filter((x) => x.slug !== l.slug).map((x) => <a key={x.slug} className="text-teal underline underline-offset-4" href={`/${x.slug}`}>{x.title}</a>)}</p>
      <Ld data={faq} /><Ld data={svc} />
    </Shell>
  );
}
