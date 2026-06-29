import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  devIndicators: false,
  // Tree-shake large icon/animation barrels so dev recompiles and prod client
  // chunks only pull the icons actually used. Next auto-optimizes lucide-react
  // but NOT @phosphor-icons/react (a 4500-line barrel), which is the big win here.
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "motion"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
