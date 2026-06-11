import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n.ts");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
      bodySizeLimit: "50mb",
    },
  },
};

// Build the final config through all wrappers first, then attach middlewareClientMaxBodySize
// on the resulting object — withSentryConfig/withNextIntl create new objects so the property
// must be set after wrapping, not before, otherwise it gets dropped.
const finalConfig = withNextIntl(withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT ?? "house-of-tailors-crm",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  webpack: { treeshake: { removeDebugLogging: true } },
}));
(finalConfig as any).middlewareClientMaxBodySize = "50mb";

export default finalConfig;
