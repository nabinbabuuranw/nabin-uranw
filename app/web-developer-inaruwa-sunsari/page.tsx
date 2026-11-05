import type { Metadata } from "next";
import { LandingPage } from "@/components/SeoPage";
import { landings } from "@/data/seo";
const l = landings.find((x) => x.slug === "web-developer-inaruwa-sunsari")!;
export const metadata: Metadata = { title: l.title, description: l.description, alternates: { canonical: "/web-developer-inaruwa-sunsari" }, openGraph: { type: "website", url: "/web-developer-inaruwa-sunsari", title: `${l.title} · Nabin Babu Uranw`, description: l.description, images: [{ url: "/og-official.png", width: 1200, height: 630, alt: "Nabin Babu Uranw, Independent Full-Stack Developer, Inaruwa, Nepal" }] }, twitter: { card: "summary_large_image", title: l.title, description: l.description, images: ["/og-official.png"] } };
export default function Page() { return <LandingPage l={l} />; }
