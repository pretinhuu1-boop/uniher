import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
const hasHttpsAppUrl = /^https:\/\//i.test(appUrl);
const isTrustworthyOrigin =
  hasHttpsAppUrl || /^http:\/\/localhost(?::\d+)?$/i.test(appUrl);

const nextConfig: NextConfig = {
  output: isProd ? 'standalone' : undefined,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  experimental: {},
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          ...(isTrustworthyOrigin
            ? [
                {
                  key: "Cross-Origin-Opener-Policy",
                  value: "same-origin",
                },
                {
                  key: "Cross-Origin-Resource-Policy",
                  value: "same-origin",
                },
              ]
            : []),
          ...(hasHttpsAppUrl
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
