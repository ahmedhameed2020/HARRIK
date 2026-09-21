/**
 * حَرِّك | HARRIK — make `@opennextjs/cloudflare` build on Workers.
 *
 * WHY
 * ---
 * `sharp` is an optional dependency of Next.js used only by the image optimizer.
 * When it is present in the install (pnpm installs optional deps by default),
 * the adapter's esbuild pass tries to inline its native `.node` binary while
 * bundling Next's server sources and dies with:
 *
 *     No loader is configured for ".node" files
 *
 * Workerd can never load a native binary, and this app does not use it
 * (`images.unoptimized: true`, no `next/image` imports), so the adapter should
 * alias it to its own `empty.js` shim — exactly the pattern it already uses for
 * other unbundleable modules (see opennextjs-cloudflare issue #156).
 *
 * HOW
 * ---
 * Run automatically from `postinstall`, which means it applies on every machine
 * and in every CI pipeline regardless of the pnpm version — unlike a
 * `pnpm.patchedDependencies` entry, which Cloudflare's build image rejected with
 * `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` because its pnpm (10.11.1) compares that
 * lockfile config more strictly than the local one (10.28.1).
 *
 * The edit is idempotent: run it as often as you like.
 */
import fs from "node:fs";
import path from "node:path";

const ADAPTER = path.join(
  "node_modules",
  "@opennextjs",
  "cloudflare",
  "dist",
  "cli",
  "build",
  "bundle-server.js"
);

const ANCHOR = `"@next/env": path.join(buildOpts.outputDir, "cloudflare-templates/shims/env.js"),`;
/** Marks an already-patched file — must match verbatim, or we inject twice. */
const MARKER = `"sharp": path.join(buildOpts.outputDir, "cloudflare-templates/shims/empty.js"),`;

const INJECTION = `
            // --- HARRIK: sharp cannot be bundled for Workers (scripts/patch-opennext-sharp.mjs) ---
            // Next's image optimizer requires the optional native \`sharp\` package, and
            // esbuild cannot inline its \`.node\` binary ("No loader is configured for
            // \\".node\\" files"). Workerd can never load it and this app does not use it
            // (\`images.unoptimized: true\`), so alias it to the adapter's empty shim.
            // See opennextjs-cloudflare issue #156.
            "sharp": path.join(buildOpts.outputDir, "cloudflare-templates/shims/empty.js"),`;

function main() {
  if (!fs.existsSync(ADAPTER)) {
    // Nothing to do: the adapter is not installed (e.g. a production-only install).
    console.log("[harrik] opennextjs adapter not installed — skipping the sharp shim.");
    return;
  }

  const source = fs.readFileSync(ADAPTER, "utf8");

  if (source.includes(MARKER)) {
    console.log("[harrik] opennextjs sharp shim already applied.");
    return;
  }

  if (!source.includes(ANCHOR)) {
    console.error(
      "[harrik] Could not patch the OpenNext adapter: the anchor line moved.\n" +
        `         File: ${ADAPTER}\n` +
        "         The adapter was probably upgraded — re-check whether sharp still needs\n" +
        "         the empty shim (opennextjs-cloudflare issue #156) and update this script."
    );
    process.exitCode = 1;
    return;
  }

  const patched = source.replace(ANCHOR, `${ANCHOR}${INJECTION}`);
  fs.writeFileSync(ADAPTER, patched, "utf8");
  console.log("[harrik] patched the OpenNext adapter: sharp → empty shim.");
}

main();
