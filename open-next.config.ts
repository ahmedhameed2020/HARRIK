import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * `pnpm run build` is this adapter (Cloudflare's Workers Builds runs that script
 * and then `npx wrangler deploy`, which never builds). The adapter's own default
 * inner build command is `pnpm build` — i.e. itself — so it has to be pointed at
 * the plain Next build explicitly, or the build forks endlessly.
 */
export default {
  ...defineCloudflareConfig(),
  buildCommand: "pnpm run build:next",
};
