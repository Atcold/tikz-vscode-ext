# tikz-vscode-ext

Syntax highlighting for the TikZ graphical language inside LaTeX documents.

Both TeXstudio and VS Code tokenise a `tikzpicture` as if it were plain LaTeX, so
everything that carries meaning inside one — `key=value` pairs, dimensions and their
units, brackets, path operators, arrow tips, colour mixes, `\def`'ed macros — comes out
the same undifferentiated colour. This fixes that.

Before:

```tex
\draw [->, ultra thick, shorten >=1pt] (eps) -- (0,\eps);
```

all one colour except `\draw` and `\eps`. After: `->` is an operator, `ultra thick` a
style reference, `shorten >` a key, `1pt` a number with its unit picked out, `--` a path
join, `(eps)` a named coordinate, `;` a terminator, and `\eps` a variable — because the
file defines it two lines up.

## Install

```sh
ln -s "$PWD" ~/.vscode/extensions/tikz-vscode-ext
```

Reload the window, then merge `settings-snippet.jsonc` into your user `settings.json`.
The `editor.semanticTokenColorCustomizations.enabled` line in it is **required**: a theme
opts into semantic highlighting itself and many ship with it off, in which case the
`\def` highlighting is computed and then discarded. The rest of that file is optional.

There is no build step and nothing to install — no TypeScript, no npm, no dependencies
beyond the `vscode` API.

## Building from the editor

`TikZ: Build and report` (`tikz.build`) runs your project's build script and reports the
outcome as a notification. It picks the script from the file you are looking at: one in
a figure folder gets the figure script, anything else gets the document script.

It runs the script directly rather than through a VS Code task. A task spawns a terminal,
clears it and reports back through the task-process event, which costs about as long
again as a short build — two seconds on top of two here. The trade is that there is no
terminal transcript, so the script should say what happened: write one line to
`build/.build-status` reading `ok <message>` or `fail <message>` and that message goes
into the notification. Without the file, the exit code is used instead.

Bind it to a key, saving first, in `keybindings.json`:

```jsonc
{
  "key": "f6",
  "command": "runCommands",
  "args": { "commands": ["workbench.action.files.saveAll", "tikz.build"] },
  "when": "!terminalFocus"
}
```

Four settings control it, defaulting to the layout this was written against:
`tikz.figureScript` (`./fig.sh`), `tikz.buildScript` (`./build.sh`), `tikz.figureFolders`
(a regex matching `*-figs`, `tikz-figs`, `tikz-code`) and `tikz.scriptFolders` (`.` then
`latex`). If no script is found, the command falls back to the default build task.

## Two halves

**A TextMate grammar injection** handles everything decidable from the text in front of
it. It hooks the scope `meta.function.environment.latex.tikz`, which the stock LaTeX
grammar already puts on a `tikzpicture` body (including a nested `axis`), plus a second
injection for `\tikzset{...}` blocks and inline `\tikz...;` outside any picture.

Keys are matched *generically* — any word phrase before an `=` — rather than enumerated.
That covers every built-in key and every custom one with no vocabulary to maintain.

**A semantic token provider** handles what a grammar structurally cannot: symbols whose
meaning depends on a definition elsewhere.

- `tikzMacro` — control sequences the open file defines via `\def`, `\newcommand`,
  `\pgfmathsetmacro` and friends, highlighted at every use in that file.
- `tikzStyle` — pgfkeys styles (`name/.style = {...}`), indexed across the whole
  workspace. A figure file is usually a twenty-line fragment whose styles all come from a
  preamble it does not contain, so a current-file-only rule would find nothing in one.

Run **TikZ: Rebuild style index** from the command palette if the index looks stale.

## Colours

The extension ships no palette. Every token maps to a conventional TextMate scope with a
`.tikz` suffix, so an option key borrows the colour your theme gives an HTML attribute, a
dimension the colour of a numeric literal, and so on. Switch themes and the highlighting
follows. The `.tikz` suffix is there as a hand-tuning hook, not a requirement.

Some tokens carry more than one scope. The first says what the token *is* in
conventional terms; the rest are fallbacks that more themes happen to style. Scope
choices were made by measurement, not taste — `tools/theme-check.mjs` resolves each
token against a theme the way the editor does, and every scope set below is styled by
all 39 themes installed here, light and dark, giving four to seven distinct colours
depending on the theme.

| Token | Scope |
|---|---|
| option key before `=` | `entity.other.attribute-name.tikz` + `variable.other.property.tikz` |
| `=` | `keyword.operator.assignment.tikz` |
| arrow tips `->` `<->` `-Stealth` | `keyword.operator.arrow.tikz` |
| path joins `--` `\|-` `-\|` `..controls` | `keyword.operator.path.tikz` |
| dimensions `2cm` `.5pt` | `constant.numeric.dimension.tikz`, unit `keyword.other.unit.tikz` |
| bare option or style reference | `support.function.tikz` + `entity.name.function.tikz` |
| path operators `rectangle` `circle` `plot` | `keyword.control.path.tikz` |
| `[` `]` | `punctuation.section.options.{begin,end}.tikz` |
| `(` `)` | `punctuation.section.coordinate.{begin,end}.tikz` |
| named coordinate | `variable.other.coordinate.tikz` |
| `{` `}` in an option value | `punctuation.section.group.{begin,end}.tikz` |
| `;` | `punctuation.terminator.tikz` |
| colour mix `red!50!black` | `support.constant.color.tikz` + `constant.language.tikz` + `variable.other.constant.tikz`, `!` as `keyword.operator.mix.tikz` |
| `name/.style` | `entity.name.function.style.tikz` + `entity.name.function.tikz`, handle as `keyword.other.handler.tikz` |
| `\def`'ed macro (semantic) | `variable.other.tikz` |
| style reference (semantic) | `entity.name.type.tikz` |

## Testing

No node or npm is needed. VS Code ships Electron (a Node
runtime), `vscode-textmate` and `vscode-oniguruma`, so `tools/tm` borrows them and the
harness tokenises with the exact engine the editor uses.

```sh
# every scope assigned in one file
./tools/tm tools/tokenize.mjs path/to/figure.tex

# ...with our injections switched off, to compare against stock LaTeX
./tools/tm tools/tokenize.mjs path/to/figure.tex --raw

# sweep a corpus for begin/end rules left open at EOF
./tools/tm tools/audit.mjs path/to/latex/**/*.tex

# what the semantic provider would highlight, without running VS Code
./tools/tm tools/symbols-check.mjs path/to/figure.tex --index path/to/latex

# which of our scopes a theme actually has a colour for
./tools/tm tools/theme-check.mjs ~/.vscode/extensions/*/themes/*.json
```

`audit.mjs` is the important one. A begin/end rule whose end never matches swallows the
rest of the file, and that is the main way a grammar like this goes wrong — it is how the
path-level brace rule was caught eating the closing brace of `\textbf{...}`.

## Known limitations

- Inside an option value, free text is tokenised as if it were more options, so
  `node contents={Pred}` colours `Pred` as a style reference.
- A workspace-wide style index cannot tell a style you use from one merely defined
  somewhere, so a demo definition in a document about TikZ enters the index like any
  other.
- Colours are not resolved. `\definecolor` and `\colorlet` names are not indexed, and
  there are no inline swatches; that is a separate piece of work.

## Scope

This is the syntax-highlighting slice of a larger idea (a GUI command builder, a colour
picker, an inline colour provider). Those are deliberately not here.
