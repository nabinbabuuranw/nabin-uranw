import type { Metadata } from "next";
import { Shell, H2 } from "@/components/SeoPage";
import { site } from "@/data/site";
export const metadata: Metadata = { title: "Contact Nabin Babu Uranw", description: "Contact Nabin Babu Uranw, independent full-stack developer in Inaruwa, Sunsari, Nepal, by email, WhatsApp or the website request form.", alternates: { canonical: "/contact" }, openGraph: { type: "website", url: "/contact", title: "Contact Nabin Babu Uranw · Nabin Babu Uranw", description: "Contact Nabin Babu Uranw, independent full-stack developer in Inaruwa, Sunsari, Nepal, by email, WhatsApp or the website request form.", images: [{ url: "/og-official.png", width: 1200, height: 630, alt: "Nabin Babu Uranw, official portfolio website" }] }, twitter: { card: "summary_large_image", title: "Contact Nabin Babu Uranw", description: "Contact Nabin Babu Uranw, independent full-stack developer in Inaruwa, Sunsari, Nepal, by email, WhatsApp or the website request form.", images: ["/og-official.png"] } };
export default function Page() {
  const crumbs = [{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }];
  return (
    <Shell crumbs={crumbs}>
      <h1 className="mt-6 max-w-[22ch] font-display text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.04] tracking-tightest">Contact Nabin Babu Uranw</h1>
      <p className="mt-6 max-w-[64ch] text-[17px] leading-relaxed text-ink/80">I’m an independent developer based in {site.location.full}. The quickest way to reach me is email or WhatsApp. I reply to project enquiries from anywhere in Nepal.</p>
      <ul className="mt-8 max-w-[64ch] space-y-3 text-[16px]">
        <li>Email: <a className="text-teal underline underline-offset-4" href={`mailto:${site.email}`}>{site.email}</a></li>
        <li>WhatsApp: <a className="text-teal underline underline-offset-4" href={site.whatsapp} rel="noopener noreferrer">message me on WhatsApp</a></li>
        <li>GitHub: <a className="text-teal underline underline-offset-4" href={site.github.url} rel="noopener noreferrer">github.com/{site.github.user}</a></li>
        <li>Location: {site.location.full} (no public office or shop front)</li>
      </ul>
      <H2>Start a project</H2>
      <p className="mt-3 max-w-[64ch] text-[16px] text-ink/80">Use the <a className="text-teal underline underline-offset-4" href="/#request">website request form</a> on the home page to describe what you need.</p>
      <p className="mt-3 max-w-[64ch] text-[15px] text-muted">More about me: <a className="text-teal underline underline-offset-4" href="/about">About</a>, <a className="text-teal underline underline-offset-4" href="/projects">Projects</a>, <a className="text-teal underline underline-offset-4" href="/privacy">Privacy</a>, <a className="text-teal underline underline-offset-4" href="/terms">Terms</a>.</p>
    </Shell>
  );
}
