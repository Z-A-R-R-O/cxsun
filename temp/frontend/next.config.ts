import type { NextConfig } from "next";

const internalApiUrl =
  process.env.NEXT_INTERNAL_API_URL ??
  `http://127.0.0.1:${process.env.APP_HTTP_PORT ?? process.env.PORT ?? "4000"}`;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SETUP_LOOKUP_ENABLED: process.env.NEXT_PUBLIC_SETUP_LOOKUP_ENABLED,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${internalApiUrl}/api/v1/:path*`,
      },
      {
        source: "/v1/:path*",
        destination: `${internalApiUrl}/v1/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${internalApiUrl}/:path*`,
      },
    ];
  },
  reactStrictMode: true,
  transpilePackages: ["@cxnext/ui", "@cxnext/hooks", "@cxnext/types"],
};

export default nextConfig;
