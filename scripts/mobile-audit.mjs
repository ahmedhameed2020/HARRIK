/**
 * حَرِّك | HARRIK — static mobile-readiness audit.
 *
 * HARRIK is a phone-first app: security staff use it one-handed, outdoors, on
 * 360–430px screens. Desktop is the secondary target. This script reads the
 * JSX and reports the patterns that reliably break on a phone, so a mobile
 * regression is caught by `pnpm audit:mobile` instead of by a guard in a car
 * park.
 *
 * It is deliberately static (no browser, no credentials): most screens sit
 * behind authentication, so a crawler would only ever see /login. Tailwind
 * classes are the source of truth for layout here, and they can be read.
 *
 * Usage:
 *   pnpm audit:mobile           # report, exits 1 when a blocking issue exists
 *   pnpm audit:mobile --all     # also list the advisory findings
 *
 * Every rule below documents WHY it matters on a phone. When a rule is wrong
 * for a specific line, annotate that line — or the line directly above it, so
 * the annotation can be a normal JSX comment — with `mobile-audit-ignore` and
 * the reason. The scan skips it and the reason stays in the code.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const showAll = process.argv.includes("--all");

/** Every screen-level source file (API routes have no layout). */
function collectFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "api") continue;
      collectFiles(full, acc);
    } else if (entry.name.endsWith(".tsx")) {
      acc.push(full);
    }
  }
  return acc;
}

const BLOCKING = "blocking";
const ADVISORY = "advisory";

/**
 * A line is exempt when it, or the line directly above it, carries the
 * annotation — JSX cannot always hold a trailing comment, so the line above is
 * the only legal place for one in some positions.
 */
function isIgnored(lines, index) {
  return (
    lines[index].includes("mobile-audit-ignore") ||
    (index > 0 && lines[index - 1].includes("mobile-audit-ignore"))
  );
}

/**
 * A table is fine from `md` up, but on a phone a multi-column table either
 * squeezes every column into illegibility or forces horizontal scrolling that
 * hides the action buttons. The convention in this codebase is a card list
 * under `md:hidden` next to a `hidden md:block` table.
 */
function auditTables(file, text) {
  if (!text.includes("<table")) return [];
  // The desktop table and the mobile card list can carry any other utilities
  // between `hidden` and `md:block`, so match the pair within one class list.
  const hasDesktopOnlyTable = text
    .split("\n")
    .some((line) => /\bhidden\b/.test(line) && /\bmd:block\b/.test(line));
  const hasCardFallback = /md:hidden/.test(text) && hasDesktopOnlyTable;
  if (hasCardFallback) return [];
  const line = text.slice(0, text.indexOf("<table")).split("\n").length;
  return [
    {
      severity: BLOCKING,
      rule: "table-without-card-fallback",
      file,
      line,
      detail: "renders a <table> with no md:hidden card list — columns collapse on a 360px screen",
    },
  ];
}

/**
 * `grid-cols-3` with no breakpoint prefix stays three columns at 360px, so each
 * cell is ~110px: numbers wrap, labels truncate. Multi-column grids must start
 * at one (or two) columns and widen at a breakpoint.
 */
function auditGrids(file, text) {
  const findings = [];
  const re = /(?:^|["'\s])grid-cols-([3-9]|1[0-2])(?=["'\s])/g;
  const lines = text.split("\n");
  lines.forEach((content, index) => {
    if (isIgnored(lines, index)) return;
    re.lastIndex = 0;
    if (!re.test(content)) return;
    // A responsive prefix anywhere in the same class list means the unprefixed
    // value is the *mobile* value, which is the pattern we want.
    if (/(sm|md|lg|xl):grid-cols-/.test(content)) return;
    findings.push({
      severity: BLOCKING,
      rule: "unresponsive-grid",
      file,
      line: index + 1,
      detail: `${content.trim().slice(0, 90)} — 3+ columns at 360px`,
    });
  });
  return findings;
}

/**
 * A fixed pixel width wider than the smallest supported viewport (320px, minus
 * the 16px page gutters) pushes the page sideways: the whole layout then scrolls
 * horizontally and the floating nav drifts off-centre.
 */
function auditFixedWidths(file, text) {
  const findings = [];
  const lines = text.split("\n");
  lines.forEach((content, index) => {
    if (isIgnored(lines, index)) return;
    for (const match of content.matchAll(/(?:^|["'\s:])(?:min-)?w-\[(\d+)px\]/g)) {
      const px = Number(match[1]);
      if (px <= 288) continue;
      // A breakpoint-prefixed width only applies on larger screens.
      const prefix = content.slice(Math.max(0, match.index - 4), match.index);
      if (/(sm|md|lg|xl):$/.test(prefix)) continue;
      findings.push({
        severity: BLOCKING,
        rule: "fixed-width-overflow",
        file,
        line: index + 1,
        detail: `${match[0].trim()} exceeds the 320px viewport minus gutters`,
      });
    }
  });
  return findings;
}

/**
 * Text below 11px is unreadable outdoors in daylight, which is where this app
 * is used. The theme provides `text-micro` (11px) as the floor.
 */
function auditTinyText(file, text) {
  const findings = [];
  const lines = text.split("\n");
  lines.forEach((content, index) => {
    if (isIgnored(lines, index)) return;
    for (const match of content.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) {
      if (Number(match[1]) >= 11) continue;
      findings.push({
        severity: BLOCKING,
        rule: "text-below-floor",
        file,
        line: index + 1,
        detail: `${match[0]} is below the 11px readability floor (use text-micro)`,
      });
    }
  });
  return findings;
}

/**
 * iOS Safari zooms the whole page in when a focused input's font-size is under
 * 16px, and it does not zoom back out. Inputs must therefore never carry a
 * text utility smaller than `text-base` on mobile; the global rule in
 * globals.css enforces 16px on coarse pointers, so this catches the ones that
 * override it with an explicit class.
 */
function auditInputZoom(file, text) {
  const findings = [];
  const lines = text.split("\n");
  lines.forEach((content, index) => {
    if (isIgnored(lines, index)) return;
    if (!/<(input|textarea|select)\b/.test(content)) return;
    // Read the element's full tag, which usually spans several lines.
    const tag = lines.slice(index, index + 14).join(" ");
    const tagEnd = tag.indexOf(">");
    const attrs = tagEnd === -1 ? tag : tag.slice(0, tagEnd);
    const small = attrs.match(/(?:^|["'\s])text-(xs|sm|micro|caption|body)(?=["'\s])/);
    if (!small) return;
    if (/text-base|text-\[16px\]|md:text-/.test(attrs) && /\bmd:/.test(attrs)) return;
    findings.push({
      severity: ADVISORY,
      rule: "input-font-triggers-ios-zoom",
      file,
      line: index + 1,
      detail: `${small[0].trim()} on a form control — iOS zooms in on focus below 16px`,
    });
  });
  return findings;
}

/**
 * Anything pinned to the bottom of the viewport has to clear the iOS home
 * indicator, or the gesture area swallows the taps.
 */
function auditSafeArea(file, text) {
  const findings = [];
  const lines = text.split("\n");
  lines.forEach((content, index) => {
    if (isIgnored(lines, index)) return;
    if (!/\bfixed\b/.test(content)) return;
    if (!/bottom-(0|1|2|3|4|\[)/.test(content)) return;
    if (/safe-area-inset-bottom/.test(content)) return;
    findings.push({
      severity: ADVISORY,
      rule: "bottom-fixed-without-safe-area",
      file,
      line: index + 1,
      detail: "pinned to the bottom edge without env(safe-area-inset-bottom)",
    });
  });
  return findings;
}

const RULES = [auditTables, auditGrids, auditFixedWidths, auditTinyText, auditInputZoom, auditSafeArea];

const files = collectFiles(SRC);
const findings = [];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  for (const rule of RULES) findings.push(...rule(rel, text));
}

const blocking = findings.filter((f) => f.severity === BLOCKING);
const advisory = findings.filter((f) => f.severity === ADVISORY);

function print(list, heading) {
  if (!list.length) return;
  console.log(`\n${heading}`);
  const byRule = new Map();
  for (const f of list) {
    if (!byRule.has(f.rule)) byRule.set(f.rule, []);
    byRule.get(f.rule).push(f);
  }
  for (const [rule, items] of byRule) {
    console.log(`\n  ${rule} (${items.length})`);
    for (const item of items) console.log(`    ${item.file}:${item.line}  ${item.detail}`);
  }
}

console.log(`HARRIK mobile audit — ${files.length} screen files scanned`);
print(blocking, `BLOCKING (${blocking.length})`);
if (showAll) print(advisory, `ADVISORY (${advisory.length})`);
else if (advisory.length) console.log(`\nADVISORY (${advisory.length}) — run with --all to list`);

if (!blocking.length) console.log("\nNo blocking mobile issues.");
process.exit(blocking.length ? 1 : 0);
