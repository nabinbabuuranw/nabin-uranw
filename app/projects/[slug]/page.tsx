import type { Metadata } from "next";
import { Shell, H2, Ld } from "@/components/SeoPage";
import { site } from "@/data/site";
import { caseStudies, findRepo } from "@/data/seo";
export const dynamicParams = false;
export function generateStaticParams() { return caseStudies.map((c) => ({ slug: c.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const c = caseStudies.find((x) => x.slug === slug)!;
  return { title: c.title, description: c.summary.slice(0, 158), alternates: { canonical: `/projects/${c.slug}` }, openGraph: { type: "article", url: `/projects/${c.slug}`, title: `${c.title} · Nabin Babu Uranw`, description: c.summary.slice(0, 158), images: [{ url: "/og-official.png", width: 1200, height: 630, alt: c.title }] }, twitter: { card: "summary_large_image", title: c.title, description: c.summary.slice(0, 158), images: ["/og-official.png"] } };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const c = caseStudies.find((x) => x.slug === slug)!; const r = findRepo(c.repo);
  const crumbs = [{ name: "Home", path: "/" }, { name: "Projects", path: "/projects" }, { name: c.title, path: `/projects/${c.slug}` }];
  const ld = { "@context": "https://schema.org", "@type": "SoftwareSourceCode", name: c.title, description: c.summary, url: `${site.url}/projects/${c.slug}`, codeRepository: r?.url, programmingLanguage: r?.language ?? undefined, author: { "@id": `${site.url}/#person` } };
  return (
    <Shell crumbs={crumbs}>
      <p className="mt-6 font-mono text-[12px] text-teal">{c.kind}</p>
      <h1 className="mt-3 max-w-[24ch] font-display text-[clamp(2rem,4.6vw,3.3rem)] font-semibold leading-[1.05] tracking-tightest">{c.title}</h1>
      <p className="mt-6 max-w-[64ch] text-[17px] leading-relaxed text-ink/80">{c.summary}</p>
      <H2>The problem</H2><p className="mt-3 max-w-[64ch] text-[16px] leading-relaxed text-ink/80">{c.problem}</p>
      <H2>What was built</H2><ul className="mt-4 max-w-[64ch] list-disc space-y-2 pl-5 text-[16px] text-ink/80">{c.built.map((b) => <li key={b}>{b}</li>)}</ul>
      <H2>Technology</H2><p className="mt-3 max-w-[64ch] text-[16px] text-ink/80">{c.stack.join(", ")}.</p>
      <H2>Links</H2>
      <p className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[16px]">{r ? <a className="text-teal underline underline-offset-4" href={r.url} rel="noopener noreferrer">Source code on GitHub</a> : null}{r?.live?.ok ? <a className="text-teal underline underline-offset-4" href={r.live.url} rel="noopener noreferrer">Live site</a> : null}<a className="text-teal underline underline-offset-4" href="/projects">All projects</a></p>
      <p className="mt-8 max-w-[64ch] text-[14.5px] text-muted">{c.note} Facts on this page come from the project’s public repository description.</p>
      <Ld data={ld} />
    </Shell>
  );
}
