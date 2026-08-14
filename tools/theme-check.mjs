// Does a theme actually have a colour for the scopes this grammar uses?
//
//   ./tools/tm tools/theme-check.mjs <theme.json>...
//
// Mapping TikZ onto conventional scopes is only worth anything if themes really style
// those scopes. This resolves each scope the way a theme does -- longest matching
// dotted-segment prefix wins -- and reports which fall through to the default foreground.

import fs from 'node:fs';
import path from 'node:path';

// Each entry is the full scope set the grammar puts on one kind of token. Several
// tokens carry more than one scope on purpose: the first says what the token *is* in
// conventional TextMate terms, the rest are fallbacks that more themes happen to style.
// A token counts as styled if any of its scopes resolves.
const SCOPES = [
  ['option key', 'entity.other.attribute-name.tikz', 'variable.other.property.tikz'],
  ['assignment', 'keyword.operator.assignment.tikz'],
  ['arrow tip', 'keyword.operator.arrow.tikz'],
  ['path join', 'keyword.operator.path.tikz'],
  ['dimension', 'constant.numeric.dimension.tikz'],
  ['unit', 'keyword.other.unit.tikz', 'constant.numeric.dimension.tikz'],
  ['bare option', 'support.function.tikz', 'entity.name.function.tikz'],
  ['path operator', 'keyword.control.path.tikz'],
  ['coordinate', 'variable.other.coordinate.tikz'],
  ['colour', 'support.constant.color.tikz', 'constant.language.tikz', 'variable.other.constant.tikz'],
  ['style name', 'entity.name.function.style.tikz', 'entity.name.function.tikz'],
  ['style handle', 'keyword.other.handler.tikz'],
  ['macro (semantic)', 'variable.other.tikz'],
  ['style (semantic)', 'entity.name.type.tikz'],
];

const strip = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1');

function resolve(theme, scope) {
  let best = null;
  let bestLen = -1;
  for (const rule of theme.tokenColors ?? []) {
    let selectors = rule.scope ?? [];
    if (typeof selectors === 'string') selectors = selectors.split(',');
    for (const raw of selectors) {
      const sel = raw.trim().split(/\s+/).pop(); // ignore ancestor constraints
      if (!sel) continue;
      const isPrefix = scope === sel || scope.startsWith(sel + '.');
      if (isPrefix && sel.length > bestLen && rule.settings?.foreground) {
        best = rule.settings.foreground;
        bestLen = sel.length;
      }
    }
  }
  return best;
}

// VS Code's own themes are built as chains: dark_modern includes dark_plus includes
// dark_vs. A checker that stops at the first file calls every scope unstyled.
function load(file, seen = new Set()) {
  const full = path.resolve(file);
  if (seen.has(full)) return { tokenColors: [] };
  seen.add(full);

  const theme = JSON.parse(strip(fs.readFileSync(full, 'utf8')));
  if (!theme.include) return theme;

  const base = load(path.join(path.dirname(full), theme.include), seen);
  // Later rules win, so the including theme's own rules go last.
  return { ...theme, tokenColors: [...(base.tokenColors ?? []), ...(theme.tokenColors ?? [])] };
}

for (const file of process.argv.slice(2)) {
  const theme = load(file);
  const resolved = SCOPES.map(([label, ...scopes]) => [
    label,
    scopes.map((s) => resolve(theme, s)).find(Boolean) ?? null,
  ]);
  const missing = resolved.filter(([, c]) => !c);
  const colours = new Set(resolved.map(([, c]) => c).filter(Boolean));
  const tag = missing.length ? `\x1b[33m${missing.length} unstyled\x1b[0m` : '\x1b[32mall styled\x1b[0m';
  console.log(`${path.basename(file).padEnd(34)} ${String(colours.size).padStart(2)} distinct colours, ${tag}`);
  for (const [label] of missing) console.log(`    \x1b[33m- ${label}\x1b[0m`);
}
