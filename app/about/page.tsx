import type { Metadata } from "next";
import { Shell, H2, Ld } from "@/components/SeoPage";
import { site, about, skills, services, process as steps } from "@/data/site";
import { caseStudies, landings } from "@/data/seo";

const description = "About Nabin Babu Uranw (Nabin Uranw): independent full-stack developer and UI/UX designer in Inaruwa, Sunsari, Koshi Province, Nepal. Skills, services, projects and contact.";
export const metadata: Metadata = { title: "About Nabin Babu Uranw, Full-Stack Developer in Nepal", description, alternates: { canonical: "/about" },
  openGraph: { type: "profile", url: "/about", title: "About Nabin Babu Uranw", description, images: [{ url: "/og-official.png", width: 1200, height: 630, alt: "Nabin Babu Uranw, Independent Full-Stack Developer & UI/UX Designer" }] },
  twitter: { card: "summary_large_image", title: "About Nabin Babu Uranw", description, images: ["/og-official.png"] } };

export default function Page() {
  const crumbs = [{ name: "Home", path: "/" }, { name: "About", path: "/about" }];
  const profile = { "@context": "https://schema.org", "@type": "ProfilePage", url: `${site.url}/about`, name: "About Nabin Babu Uranw", mainEntity: { "@id": `${site.url}/#person` }, dateModified: new Date().toISOString().slice(0, 10) };
  return (
    <Shell crumbs={crumbs}>
      <h1 className="mt-6 max-w-[22ch] font-display text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.04] tracking-tightest">About Nabin Babu Uranw</h1>
      <p className="mt-6 max-w-[64ch] text-[17px] leading-relaxed text-ink/80">{about.lead}</p>
      {about.body.map((p) => <p key={p} className="mt-4 max-w-[64ch] text-[16px] leading-relaxed text-ink/80">{p}</p>)}
      <p className="mt-4 max-w-[64ch] text-[16px] leading-relaxed text-ink/80">People also spell my name Nabin Uranw, Nabin Urnaw or Nabin Babu Uraw. My name in Nepali is {site.nameNative}.</p>
      <H2>Profile at a glance</H2>
      <dl className="mt-5 grid max-w-[68ch] gap-x-8 gap-y-3 rounded-2xl border border-mist bg-white p-6 text-[16px] sm:grid-cols-[11rem_1fr]">
        <dt className="font-semibold">Full name</dt><dd>Nabin Babu Uranw ({site.nameNative})</dd>
        <dt className="font-semibold">Also written as</dt><dd>Nabin Uranw, Nabin Urnaw, Nabin Babu Uraw</dd>
        <dt className="font-semibold">Date of birth</dt><dd>14 May 2008 (AD), 1 Jestha 2065 (BS)</dd>
        <dt className="font-semibold">Born in</dt><dd>Inaruwa, Sunsari, Koshi Province, Nepal</dd>
        <dt className="font-semibold">Profession</dt><dd>Independent Full-Stack Developer &amp; UI/UX Designer</dd>
        <dt className="font-semibold">Based in</dt><dd>{site.location.full}</dd>
        <dt className="font-semibold">Official profiles</dt><dd><a className="text-teal underline underline-offset-4" href={site.github.url} rel="noopener noreferrer">GitHub: nabinbabuuranw</a></dd>
      </dl>
      <p className="mt-3 max-w-[64ch] text-[14.5px] text-muted">These details are published by Nabin Babu Uranw himself on his official website.</p>
      <H2>Where I work</H2>
      <p className="mt-3 max-w-[64ch] text-[16px] text-ink/80">I’m based in {site.location.full}. I take projects from across Nepal and work remotely. See <a className="text-teal underline underline-offset-4" href="/web-developer-inaruwa-sunsari">web developer in Inaruwa and Sunsari</a>.</p>
      <H2>Skills</H2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{skills.map((g) => (<div key={g.group} className="rounded-2xl border border-mist bg-white p-6"><h3 className="font-display text-[19px] font-semibold">{g.group}</h3><p className="mt-2 text-[15.5px] text-ink/75">{g.items.map((i) => i.name).join(", ")}</p></div>))}</div>
      <H2>Services</H2>
      <ul className="mt-4 max-w-[68ch] space-y-3">{services.map((s) => <li key={s.title} className="text-[16px] text-ink/80"><strong className="font-semibold text-ink">{s.title}.</strong> {s.body}</li>)}</ul>
      <H2>How I work</H2>
      <ol className="mt-4 max-w-[68ch] space-y-3">{steps.map((s) => <li key={s.step} className="text-[16px] text-ink/80"><strong className="font-semibold text-ink">{s.step}.</strong> {s.body}</li>)}</ol>
      <H2>Projects</H2>
      <p className="mt-3 max-w-[64ch] text-[16px] text-ink/80">Every project below has a public repository. I describe them as they are, with no invented clients or numbers.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">{caseStudies.map((c) => <li key={c.slug} className="rounded-2xl border border-mist bg-white p-5"><a className="font-display text-[17px] font-semibold hover:text-teal" href={`/projects/${c.slug}`}>{c.title}</a><p className="mt-2 text-[14.5px] text-ink/70">{c.kind}</p></li>)}</ul>
      <H2>Contact</H2>
      <p className="mt-3 text-[16px] text-ink/80">Email <a className="text-teal underline underline-offset-4" href={`mailto:${site.email}`}>{site.email}</a>, <a className="text-teal underline underline-offset-4" href={site.whatsapp} rel="noopener noreferrer">WhatsApp</a>, or <a className="text-teal underline underline-offset-4" href={site.github.url} rel="noopener noreferrer">GitHub</a>. Or use the <a className="text-teal underline underline-offset-4" href="/#request">request form</a>.</p>
      <H2>Developer pages</H2>
      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[15.5px]">{landings.map((l) => <a key={l.slug} className="text-teal underline underline-offset-4" href={`/${l.slug}`}>{l.title}</a>)}</p>
      <Ld data={profile} />
    </Shell>
  );
}
