import type { MetadataRoute } from "next";
export const dynamic = "force-static";
// Everything public is crawlable (pages, images, video files). Only the admin screen and API paths are kept out.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }], sitemap: "https://nabinbabuuranw.com.np/sitemap.xml" };
}
