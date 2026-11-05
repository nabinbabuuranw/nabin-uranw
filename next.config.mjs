/** @type {import('next').NextConfig} */
// PAGES_BASE_PATH is set only by the GitHub Pages workflow (e.g. /nabin-uranw). Production on Vercel leaves it empty.
const base = process.env.PAGES_BASE_PATH || "";
const nextConfig = {
  output: "export",
  ...(base ? { basePath: base, assetPrefix: base } : {}),
  images: { unoptimized: true },
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
};
export default nextConfig;
