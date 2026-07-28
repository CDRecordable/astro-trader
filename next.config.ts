import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // "standalone" emits a self-contained server with only the dependencies it
  // actually uses. That's what the desktop build ships inside the installer,
  // so users never install Node or run a command.
  output: "standalone",

  // The file tracer walks the whole project, which would otherwise drag the
  // sibling apps into the bundle — and, more importantly, the developer's own
  // user-data folder (watchlist, API keys). Nothing personal ships.
  outputFileTracingExcludes: {
    "*": [
      "./user-data/**",
      "./desktop/**",
      "./landing/**",
      "./docs/**",
      "./.next/cache/**",
      // Never bundle local secrets: .env holds the developer's DATABASE_URL.
      "./.env",
      "./.env.*",
    ],
  },
};

export default withNextIntl(nextConfig);
