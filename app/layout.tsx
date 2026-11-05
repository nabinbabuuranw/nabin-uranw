import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { site } from "@/data/site";
import gh from "@/data/github.json";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });
const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

const title = `${site.name} — ${site.role}`;
const description =
  "Nabin Babu Uranw (Nabin Uranw) is an independent full-stack web developer and UI/UX designer in Inaruwa, Sunsari, Nepal. Websites, web apps and business systems built end to end, with public projects on GitHub.";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: title, template: `%s · ${site.name}` },
  description,
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  keywords: ["Nabin Babu Uranw", "Nabin Uranw", "full-stack developer Nepal", "web developer Inaruwa", "web developer Sunsari", "UI/UX designer Nepal", "Next.js developer", "React developer", "software developer Koshi Province", "portfolio"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile", url: site.url, siteName: site.name, title, description, locale: "en_US",
    images: [{ url: "/og-official.png", width: 1200, height: 630, alt: `${site.name} — ${site.role}, Inaruwa, Nepal` }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og-official.png"] },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "16x16 32x32 48x48" }, { url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#F2F4F2", width: "device-width", initialScale: 1 };

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person", "@id": `${site.url}/#person`, name: site.name, alternateName: [site.nameNative, "Nabin Uranw", "Nabin Urnaw", "Nabin Babu Uraw"], birthDate: "2008-05-14", birthPlace: { "@type": "Place", name: "Inaruwa, Sunsari, Koshi Province, Nepal" }, nationality: { "@type": "Country", name: "Nepal" },
      jobTitle: site.role, url: site.url, email: `mailto:${site.email}`,
      image: `${site.url}/img/nabin-portrait-840.webp`,
      address: { "@type": "PostalAddress", addressLocality: site.location.locality, addressRegion: `${site.location.district}, ${site.location.region}`, addressCountry: "NP" },
      homeLocation: { "@type": "Place", name: site.location.full },
      sameAs: [site.github.url],
      knowsAbout: ["Web development", "Full-stack development", "React", "Next.js", "TypeScript", "Node.js", "Tailwind CSS", "Cloudflare Workers", "PostgreSQL", "UI/UX design"],
      owns: (gh.repos as { name: string; url: string }[]).map((r) => ({ "@type": "SoftwareSourceCode", name: r.name, codeRepository: r.url })),
    },
    { "@type": "WebSite", "@id": `${site.url}/#website`, url: site.url, name: title, inLanguage: "en", publisher: { "@id": `${site.url}/#person` } },
    { "@type": "ProfilePage", url: site.url, name: title, mainEntity: { "@id": `${site.url}/#person` } },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-teal focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
