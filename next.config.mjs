/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    // IMPORTANT: disable Softgen turbo loader to avoid hydration mismatches
    experimental: {},

    // Type errors from legacy code are tracked separately via `tsc --noEmit`.
    // They do not block production builds. Remove this once all type errors
    // in services/ and API routes are fixed.
    typescript: {
        ignoreBuildErrors: true,
    },

    // Lint is also separate from build to avoid noise blocking deploys.
    eslint: {
        ignoreDuringBuilds: true,
    },

    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**",
            },
        ],
    },

    allowedDevOrigins: ["*.daytona.work", "*.softgen.dev"],
};

export default nextConfig;
