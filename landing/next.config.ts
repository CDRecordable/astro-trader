import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // The landing is pure marketing: no data endpoints, no upstream API calls.
    // Everything it shows is either static copy or the frozen showcase snapshot,
    // so it can be served cheaply and crawled freely.
    reactStrictMode: true,
    poweredByHeader: false,
};

export default nextConfig;
