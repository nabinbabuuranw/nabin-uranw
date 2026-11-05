import type { Metadata } from "next";
import { Shell } from "@/components/SeoPage";
import { caseStudies, findRepo } from "@/data/seo";
const description = "Projects and case studies by Nabin Babu Uranw: management SaaS, a school website, rent and billing tools, booking software and an open-source date library, all built in Nepal.";
export const metadata: Metadata = { title: "Projects and Case Studies", description, alternates: { canonical: "/projects" }, openGraph: { type: "website", url: "/projects", title: "Projects and Case Studies · Nabin Babu Uranw", description, images: [{ url: "/og-official.png", width: 1200, height: 630, alt: "Projects by Nabin Babu Uranw" }] }, twitter: { card: "summary_large_image", title: "Projects and Case Studies", description, images: ["/og-official.png"] } };
export default function Page() {
  const crumbs = [{ name: "Home", path: "/" }, { name: "Projects", path: "/projects" }];
  return (
    <Shell crumbs={crumbs}>
      <h1 className="mt-6 max-w-[22ch] font-display text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.04] tracking-tightest">Projects and case studies</h1>
      <p className="mt-6 max-w-[64ch] text-[17px] leading-relaxed text-ink/80">Public work by Nabin Babu Uranw. Each project links to its source code.</p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">{caseStudies.map((c) => { const r = findRepo(c.repo); return (
        <li key={c.slug} className="rounded-2xl border border-mist bg-white p-6"><p className="font-mono text-[12px] text-teal">{c.kind}</p><h2 className="mt-2 font-display text-[20px] font-semibold"><a href={`/projects/${c.slug}`} className="hover:text-teal">{c.title}</a></h2><p className="mt-2 text-[15px] text-ink/75">{c.summary}</p>{r ? <p className="mt-3 text-[14px]"><a className="text-teal underline underline-offset-4" href={r.url} rel="noopener noreferrer">Source on GitHub</a></p> : null}</li>); })}</ul>
    </Shell>
  );
}
