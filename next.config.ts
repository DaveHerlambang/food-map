import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

// package.json is the single source of truth for the app version
// (see SPEC.md → Versioning). It is shown in the UI via VersionStamp.
const { version } = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
  version: string;
};

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: version },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
