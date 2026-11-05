import type { Metadata } from "next";
import { Shell } from "@/components/SeoPage";
export const metadata: Metadata = { title: "Terms of Use", description: "Terms of use for nabinbabuuranw.com.np, the official portfolio website of Nabin Babu Uranw.", alternates: { canonical: "/terms" }, openGraph: { type: "website", url: "/terms", title: "Terms of Use · Nabin Babu Uranw", description: "Terms of use for nabinbabuuranw.com.np, the official portfolio website of Nabin Babu Uranw.", images: [{ url: "/og-official.png", width: 1200, height: 630, alt: "Nabin Babu Uranw, official portfolio website" }] }, twitter: { card: "summary_large_image", title: "Terms of Use", description: "Terms of use for nabinbabuuranw.com.np, the official portfolio website of Nabin Babu Uranw.", images: ["/og-official.png"] } };
const sections: [string, string[]][] = [
  ["About this website", ["This is the official personal portfolio website of Nabin Babu Uranw, an independent full-stack developer in Inaruwa, Sunsari, Nepal. It describes my work and lets visitors contact me."]],
  ["Content", ["The text, design and code samples on this site are mine unless marked otherwise. Linked projects belong to their own repositories and licences. Please don’t copy the site or present it as your own."]],
  ["No guarantees", ["I try to keep the information accurate and current, but it is provided as is. Project descriptions summarise public repositories and are not a promise of results."]],
  ["Enquiries and projects", ["Sending an enquiry does not create a contract. Any paid work starts only after we agree a written scope and price."]],
  ["Links", ["This site links to GitHub and other third-party sites. I’m not responsible for their content or policies."]],
  ["Privacy", ["How information you send is handled is described in the privacy policy."]],
  ["Contact", ["Questions about these terms: nabinuranw333@gmail.com."]],
];
export default function Page() {
  const crumbs = [{ name: "Home", path: "/" }, { name: "Terms", path: "/terms" }];
  return (
    <Shell crumbs={crumbs}>
      <h1 className="mt-6 max-w-[22ch] font-display text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.04] tracking-tightest">Terms of use</h1>
      <p className="mt-5 text-[15px] text-muted">Last updated 5 November 2026</p>
      <div className="mt-10 max-w-[68ch] divide-y divide-mist border-y border-mist">
        {sections.map(([h, ps]) => (<section key={h} className="py-7"><h2 className="font-display text-[21px] font-semibold tracking-tight">{h}</h2>{ps.map((p) => <p key={p} className="mt-3 text-[16px] leading-relaxed text-ink/80">{p}</p>)}</section>))}
      </div>
    </Shell>
  );
}
