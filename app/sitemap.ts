import type { MetadataRoute } from "next";
import { landings, caseStudies } from "@/data/seo";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  const u = "https://nabinbabuuranw.com.np";
  const now = new Date();
  return [
    { url: `${u}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${u}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    ...landings.map((l) => ({ url: `${u}/${l.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${u}/projects`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...caseStudies.map((c) => ({ url: `${u}/projects/${c.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${u}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${u}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${u}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
