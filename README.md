# tikz-vscode-ext

Syntax highlighting for TikZ inside LaTeX documents, plus commands to build and view the
figure you are editing.

```tex
\draw [->, ultra thick, shorten >=1pt] (eps) -- (0,\eps);
```

Stock LaTeX grammars colour that as one undifferentiated line. Here `->` is an operator,
`ultra thick` a style reference, `shorten >` a key, `1pt` a number with its unit, `--` a
path join, `(eps)` a coordinate and `\eps` a variable — because the file `\def`s it two
lines up. Every token maps to a conventional TextMate scope with a `.tikz` suffix, so the
colours come from whichever theme you use.

## Install

```sh
./tools/package
code --install-extension tikz-vscode-ext-0.1.0.vsix
```

Reload the window, then merge `settings-snippet.jsonc` into your user `settings.json`;
its `editor.semanticTokenColorCustomizations.enabled` line is required, as many themes
ship semantic highlighting off. `./tools/tm tools/theme-check.mjs` reports the tokens
your theme leaves the colour of ordinary text, to be given one there.

## Commands

`TikZ: Build and report` runs a script and reports the outcome — the script's own
`ok <message>` or `fail <message>` line in `build/.build-status`, or the exit code.
`TikZ: View the PDF` hands the output to an external viewer. Both act on the file you
are looking at, one in a figure folder counting as a figure and anything else as the
document, and both are worth a key. `TikZ: Rebuild style index` re-scans the workspace
for `/.style` definitions.

## Settings

| Setting | Default | |
|---|---|---|
| `tikz.figureScript` | `./fig.sh` | script for a figure |
| `tikz.buildScript` | `./build.sh` | script for the document |
| `tikz.figureFolders` | `(?:[A-Za-z0-9_]+-figs\|tikz-figs\|tikz-code)` | folder names holding figures |
| `tikz.scriptFolders` | `[".", "latex"]` | where the scripts and PDFs are, searched in order |
| `tikz.figurePdf` | `build/fig.pdf` | PDF to view from a figure |
| `tikz.documentPdf` | `build/main.pdf` | PDF to view otherwise |
| `tikz.viewer` | `""` | viewer application; empty means the newest `/Applications/texstudio*.app` |

## Licence

MIT.
