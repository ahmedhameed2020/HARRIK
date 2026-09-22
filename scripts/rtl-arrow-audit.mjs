/**
 * حَرِّك | HARRIK — directional icon audit.
 *
 * A "forward" arrow (Next / Continue / Select / Go to X) and a "back" arrow
 * (Previous / Back to X) have to point the opposite way in Arabic (RTL) from
 * how they point in English (LTR) — otherwise "Next" points at where you came
 * from. This codebase's working convention, used correctly by most of the
 * app, is:
 *
 *   forward action → <ArrowRight ... className="... rtl:rotate-180" />
 *   back action     → <ArrowLeft  ... className="... rtl:rotate-180" />
 *
 * (base LTR glyph is already correct; `rtl:rotate-180` flips it for Arabic.)
 *
 * A real audit (2026-09-22) found this inverted or unmirrored in six places —
 * including the "التالي/السابق" buttons in the registration wizard and the
 * "Select" arrow on the search screen's recent-results list, the single most
 * used screen in the app. Both were visually confirmed backwards with
 * Playwright screenshots at phone width before the fix.
 *
 * This script does not know which icon is semantically "forward" or "back" —
 * that requires reading the button's label — so it flags anything a human
 * still has to look at:
 *   - ArrowLeft / ChevronLeft used with a bare `rotate-180` (no `rtl:` prefix):
 *     that is *always* rotated, so it is backwards in whichever language was
 *     not being tested when it was written.
 *   - ArrowLeft / ArrowRight / ChevronLeft / ChevronRight with NO rotation
 *     class at all: correct in only one language, by accident.
 *
 * It does not flag `rtl:rotate-180` usage itself — that pattern is correct by
 * construction. Whether the *icon choice* (Left vs Right) matches the
 * button's actual meaning is a judgement call the 2026-09-22 audit made once
 * by hand; re-review manually if new forward/back links are added.
 *
 * Usage: node scripts/rtl-arrow-audit.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

const DIRECTIONAL_ICONS = ["ArrowLeft", "ArrowRight", "ChevronLeft", "ChevronRight"];

function collectFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, acc);
    else if (entry.name.endsWith(".tsx")) acc.push(full);
  }
  return acc;
}

const findings = [];

for (const file of collectFiles(SRC)) {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const lines = text.split("\n");

  const isIgnored = (index) =>
    /mobile-audit-ignore|rtl-arrow-audit-ignore/.test(lines[index]) ||
    (index > 0 && /mobile-audit-ignore|rtl-arrow-audit-ignore/.test(lines[index - 1]));

  lines.forEach((line, index) => {
    if (isIgnored(index)) return;
    const iconMatch = DIRECTIONAL_ICONS.find((icon) => new RegExp(`<${icon}\\b`).test(line));
    if (!iconMatch) return;

    // The icon's opening tag and its className can be on different lines
    // (Prettier wraps a JSX element with more than one attribute), so the
    // rotation class is looked for across the whole tag, not just this line.
    const tagEnd = lines.slice(index, index + 6).findIndex((l) => l.includes("/>") || l.includes(">"));
    const tag = lines.slice(index, index + (tagEnd === -1 ? 6 : tagEnd + 1)).join(" ");

    const isLeft = iconMatch.includes("Left");
    const hasRtlRotate = /rtl:rotate-180/.test(tag);
    const hasBareRotate = /(?<!rtl:)rotate-180/.test(tag);

    if (isLeft && hasBareRotate && !hasRtlRotate) {
      findings.push({
        file: rel,
        line: index + 1,
        detail: `${iconMatch} with an unconditional rotate-180 — always flipped, so it is backwards in one language`,
      });
      return;
    }

    if (!hasRtlRotate && !hasBareRotate) {
      findings.push({
        file: rel,
        line: index + 1,
        detail: `${iconMatch} with no RTL mirroring — correct in only one language by accident`,
      });
    }
  });
}

console.log(`HARRIK RTL arrow audit — ${findings.length} finding(s)`);
for (const f of findings) console.log(`  ${f.file}:${f.line}  ${f.detail}`);
if (findings.length === 0) console.log("No unmirrored directional icons found.");
process.exit(findings.length ? 1 : 0);
