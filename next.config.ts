import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '8519372a018c55.lhr.life',
    '39f026e686b03a.lhr.life',
    '*.lhr.life',
  ],
  // Tree-shake large packages — reduces client bundle size
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
};

export default nextConfig;
