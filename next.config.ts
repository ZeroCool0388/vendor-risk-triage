import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf"],
  outputFileTracingIncludes: { "/*": ["./data/**/*"] },
  turbopack: {
    root: process.cwd(),
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
  devIndicators: false,
};
export default nextConfig;
