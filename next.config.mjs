/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: "agile-panda-615.convex.cloud" }],
    // While migrating to Supabase, allow any remote images by disabling optimization.
    // This avoids domain restrictions during the transition.
    unoptimized: true,
  },
};

export default nextConfig;
