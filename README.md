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
./tools/package
code --install-extension tikz-vscode-ext-0.1.0.vsix
```

Reload the window, then merge `settings-snippet.jsonc` into your user `settings.json`.
The `editor.semanticTokenColorCustomizations.enabled` line in it is **required**: a theme
opts into semantic highlighting itself and many ship with it off, in which case the
`\def` highlighting is computed and then discarded. The rest of that file is optional.

Symlinking the checkout into `~/.vscode/extensions` used to be enough and no longer is.
VS Code takes `~/.vscode/extensions/extensions.json` as the source of truth for what is
installed, so a folder that is merely present gets `Marked extension as removed` in the
shared-process log at startup and is then ignored — silently, from the editor's side.

There is still no build step in any meaningful sense — no TypeScript, no npm, no
dependency beyond the `vscode` API. `tools/package` is tar and zip: a `.vsix` is a zip
holding the source under `extension/` beside two metadata files, and the installer reads
those. For development, skip the install and run `code --extensionDevelopmentPath="$PWD"`,
which loads the checkout itself into a second window.

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

## Viewing the PDF

`TikZ: View the PDF` (`tikz.view`) hands the output to an external viewer — the figure
PDF when you are in a figure, the document PDF otherwise. A build script can do this
itself, but only has reason to when the output changed; editing the same figure over and
over, or reading a chapter with the figure tab behind it, leaves the viewer showing
something else. This forces it, which is the point of having it on its own key:

```jsonc
{
  "key": "f7",
  "command": "tikz.view",
  "when": "!terminalFocus"
}
```

The viewer is launched with `open -a`, so it comes to the front, and one already holding
that file raises its tab rather than opening a second copy. `tikz.viewer` names the
application; left empty it takes the newest `/Applications/texstudio*.app`, since that
bundle carries its version in its name and is renamed on every upgrade. `tikz.figurePdf`
(`build/fig.pdf`) and `tikz.documentPdf` (`build/main.pdf`) are resolved against the same
`tikz.scriptFolders` as the scripts.

## Two halves

**A TextMate grammar injection** handles everything decidable from the text in front of
it. It hooks the scope `meta.function.environment.latex.tikz`, which the stock LaTeX
grammar already puts on a `tikzpicture` body (including a nested `axis`), plus a second
injection for `\tikzset{...}` blocks and inline `\tikz...;` outside any picture.

Keys are matched *generically* — any word phrase before an `=` — rather than enumerated.
That covers every built-in key and every custom one with no vocabulary to maintain.

Maths is the one region the grammar takes over from the host and then deliberately does
*not* highlight: `\(…\)`, `\[…\]` and `$…$` inside a picture become one flat
`string.other.math.tikz`. The host's own scopes were the problem — a control sequence in
maths is `constant.other.general.math.tex`, which themes colour from the same family as
`variable`, the family a `\def`'ed macro already gets, so `\varepsilon` and `\eps` came
out the same amber. Scoping maths as a string says the true thing about it — it is content
in another language, not more TikZ — and no theme measured colours `string` like
`variable`. The trade is the structure inside a formula: subscripts, digits and `\alpha`
are now one colour. A figure's formula is a label a few characters long, and seeing where
it starts and stops is worth more than colouring inside it.

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
token against a theme the way the editor does. Of the 61 themes installed here, light and
dark, 38 give every token below a colour of its own, four to nine distinct colours
depending on the theme.

The other 23 leave at least one token reading as ordinary text, and no choice of scope
avoids that. A theme that has a rule for a scope has not necessarily given it a *visible*
colour: Monokai styles bare `variable` as `#F8F8F2`, which is its own editor foreground,
so a `\def`'ed macro comes out the colour of the surrounding text — as does a named
coordinate, and in ten of the 61 themes. Scopes that would survive Monokai
(`entity.name.function.preprocessor` reads as text in only one theme of the 61) collide
with the bare-option colour in 37, which is worse: TikZ code is mostly bare options.

So this is fixed per theme, in your own settings, and `theme-check` names what needs
fixing — it reports a token whose colour equals the editor foreground as plain text
rather than as styled. `settings-snippet.jsonc` carries a worked example for Monokai.

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
| maths `\(…\)` `$…$` | `string.other.math.tikz`, delimiters `punctuation.definition.string.{begin,end}.tikz` |
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
