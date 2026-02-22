/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    // IMPORTANT: disable Softgen turbo loader to avoid hydration mismatches
    experimental: {},

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