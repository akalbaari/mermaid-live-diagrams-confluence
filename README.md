# Mermaid for Confluence

A Forge app that renders Mermaid diagrams inside Confluence Cloud pages.

The free tier of a two-app pair. It exists to rank, accumulate installs and
reviews, and feed a paid companion later. It earns nothing on purpose.

## What it fixes

The incumbent apps in this niche hold 22,751 installs, and 56% of those sit on
apps rated below 3.0. The complaints on the largest one (Atlassian Labs,
7,408 installs, 2.99 stars) name four specific failures. Each is a design
decision here, not a feature request:

| Complaint about the Labs app | What this app does |
|---|---|
| Diagrams break when you edit the page, because the macro points at a code block by index | The source is stored in the macro's own config, so it travels with the macro and nothing on the page can reassociate it |
| Auto-detect fails and drops into an error state | There is no auto-detect. You put the source in the macro |
| The draft preview does not update as you change the code | The editor is a split pane that re-renders about 220ms after you stop typing |
| Does not work inside the Include Page macro | Nothing is read from the host page, so there is no page context to lose. See the verification checklist below, which is not yet confirmed on a live site |

## Architecture

Two Custom UI resources and no backend function at all.

```
src/common/mermaid-render.js   render, sanitize, size, theme resolution
src/common/templates.js        the ten starter diagrams
src/view/                      what a reader sees on the page
src/config/                    the split-pane editor in the macro config modal
src/harness/                   dev-only page the browser test drives
src/preview/                   dev-only @forge/bridge stub
src/common/bridge.js           bridge calls behind a timeout
```

No `function` module means no Forge compute invocations, so the app runs
entirely inside the static resource hosting Atlassian provides. Nothing to
pay for and nothing to keep warm.

Config is stored as macro parameters (`source`, `theme`, `align`, `maxWidth`,
`caption`). `source` and `caption` are declared with `indexing.enabled`, so
diagram text and captions are searchable in Confluence.

### Three decisions worth knowing about

**Chunking is left to the bundler.** Grouping Mermaid's lazy chunks by hand
cut the file count from 194 to 20, but it pulled ELK, Cytoscape and KaTeX into
the eager graph and turned a 529KB first paint into 5MB. File count against
page weight, and page weight won. The cost is that a build lands near 100
files per resource directory against Forge's 250-file-per-deployment quota for
free and distributed apps. Re-check `find static -type f | wc -l` after a
Mermaid upgrade.

**Diagrams never scale up.** Mermaid sizes the SVG with an inline pixel
`max-width`, which stops it shrinking in a narrow column. Removing that style
and letting the SVG fill its container is worse: a four-box sequence diagram
stretches to full page width and reads as though it were zoomed in. The
natural width is read off the viewBox and applied to the wrapper instead, so
diagrams shrink on narrow screens and never grow past their laid-out size. A
`maxWidth` set in the macro settings overrides it in both directions.

**Remote markup is stripped from the source, not just from the output.**
Mermaid escapes label text, which stops script execution, but DOMPurify keeps
an `<img>` once it has removed the `onerror` from it. Worse, Mermaid measures a
diagram by building it in a throwaway node attached to the real document, so
the image is fetched before any output string exists to clean. Browser network
logs confirmed the request going out. So tags that pull a remote resource are
removed from the source first, and a second pass hardens the rendered SVG.

Running the whole SVG back through DOMPurify was the obvious fix and it does
not work. In every configuration tried (default, `USE_PROFILES` with html,
`PARSER_MEDIA_TYPE: application/xhtml+xml`, and `NAMESPACE` set to the SVG
namespace) it empties every `<foreignObject>`, which is where Mermaid puts the
labels for flowcharts, class, state and ER diagrams. Diagrams came back as
empty boxes. The hardening is therefore done by hand against the parsed
document.

## Build and test

```bash
npm install
npm run build           # writes static/view and static/config
npm test                # builds the harness, drives it in headless Chromium
node validate-manifest.mjs
npm run build:preview   # the editor with the bridge stubbed, for a browser
```

`npm test` renders all ten shipped templates plus error, empty and two
injection cases, and asserts three things a screenshot cannot: that each
diagram contains its own label text, that no element capable of fetching a
remote resource survives, and that nothing reaches the network during a
render. It writes `test/harness.png` for eyeballing.

`validate-manifest.mjs` checks `manifest.yml` against the schema that ships
inside the Forge CLI, which is the same check `forge lint` runs.
`forge lint` itself needs an authenticated session, so this runs the schema
directly.

`@forge/bridge` throws while its own module is being evaluated when no
Atlassian host answers, which takes the whole entry module down with it and
leaves a blank page. That makes the editor impossible to open in an ordinary
browser. `npm run build:preview` aliases the bridge to a stub in
`src/preview/`, so the split pane, live preview, templates, keyboard handling
and the shape of the saved payload can all be driven locally. The stub is
never referenced by the manifest.

Driven that way, the editor loads a seeded config, re-renders on typing,
shows the parse error in the preview pane, and submits:

```json
{"config":{"source":"flowchart TD\n  X[Saved] --> Y[Diagram]",
 "theme":"auto","align":"left","maxWidth":"640",
 "caption":"Saved from the editor"}}
```

Current state: 14/14 browser checks pass, the editor drives clean end to end
against the stub, and the manifest validates with 0 errors and 0 warnings.

## Deployment state

Registered and deployed on 19 September 2026.

| | |
|---|---|
| App name | Mermaid Live Diagrams |
| App ID | `ari:cloud:ecosystem::app/9a59ac4a-d78d-4849-b744-b4192a4a5738` |
| Version | 2.1.0 |
| Environment | development |
| Runs on Atlassian | eligible |
| `forge lint` | no issues found |
| Installed on a site | akalbaari.atlassian.net (Confluence) |
| Installation ID | `b2cf517a-2d26-454a-bdb7-99974d5e87f7` |
| Live verification | 6 of 7 checks passed, 1 outstanding |

The deploy runs from macOS, not from a cloud container or the desktop Linux
VM: both of those sit behind an egress proxy that refuses api.atlassian.com,
so `forge` cannot reach Atlassian from either. Three things bite on macOS and
are worth knowing before the next deploy:

- `NODE_ENV=production` is set in the shell, which makes npm skip
  devDependencies and silently leave you without vite or the Forge CLI. Install
  with `NODE_ENV=development npm install --include=dev`.
- `@forge/cli`'s postinstall script spawns `ts-node`, which is not installed,
  and the failure rolls the whole install back. Add `--ignore-scripts`.
- Several `forge` commands prompt and refuse to run without a TTY. Wrap them:
  `{ sleep 2; printf '\n'; sleep 60; } | script -q /dev/null bash -lc '...'`.
  Keeping stdin open matters; a bare pipe closes it and inquirer throws
  `ERR_USE_AFTER_CLOSE`.

Registering also required creating a Developer Space first, and `--personal`
is rejected inside it, so register without that flag.

## Deploying

These steps need your Atlassian account, so they are yours to run.

```bash
npm install -g @forge/cli
forge login                    # email plus an API token from id.atlassian.com
forge register                 # writes a real app id into manifest.yml
npm run build
forge deploy                   # deploys to the development environment
forge install                  # pick Confluence, give your site URL
```

`manifest.yml` currently carries `ari:cloud:ecosystem::app/REPLACE_WITH_YOUR_APP_ID`
as a placeholder. `forge register` overwrites it. Do not commit a real app id
to a public repo.

After that, `forge deploy && forge install --upgrade` for each change.

Identity verification (tax ID and government ID) is required before a *paid*
app is approved. The free app needs none of it, so nothing here is blocked on
that.

## Live verification

Run on akalbaari.atlassian.net on 19 September 2026 against v2.1.0, using two
generated pages (`test/live-page.mjs` creates them through the REST API).

| Check | Result |
|---|---|
| Config round-trip through macro parameters | Pass. Stored config renders; `view.submit({config})` from a Custom UI config resource is the right shape |
| Renders inside the Include Page macro | **Pass.** Diagrams drawn on an embedded page, which is the failure users report against the Atlassian Labs app |
| Iframe height | Pass. No clipping on a tall diagram, no dead space under a short one |
| CSP | Pass. `permissions.content.styles: [unsafe-inline]` is enough; no `unsafe-eval` needed |
| Parse errors | Pass. Failing line and parser message shown, not a blank box |
| Empty macro | Pass. Reads as an invitation, not an error |
| Dark mode | Pass after a fix, see below |
| Per-diagram options | Pass. Left alignment, a 520px cap and a pinned forest theme all applied |
| PDF and Word export | **Not yet run.** See the note below |

### The dark mode bug

The first live run put a light diagram on a dark page. The cause was a race in
`start()`: `view.theme.enable()` was fired without being awaited, the colour
mode observer was attached *after* the first paint, and Forge set
`data-color-mode` in the gap between them. The observer only fires on a
change, so nothing ever corrected the first render.

The fix attaches the observer before the first paint, records which Mermaid
theme the visible diagram was actually drawn with, and re-renders once the
theme promise settles if the two disagree. Confirmed live: flipping Confluence
to dark switches the diagram with no page reload.

This is the kind of bug the browser tests could not catch, because there is no
Forge host in them to set the attribute late.

### Still outstanding: export

Print the page to PDF, and separately export to Word. This app deliberately
does not declare `adfExport`. Atlassian's own bug CONFCLOUD-83083 (closed,
fixed 26 Jun 2026) states that declaring it makes Confluence drop from
high-fidelity online rendering to ADF output for PDF, degrading PDF quality,
while leaving it out makes Word export fail. Community reports claim the
opposite about PDF, saying Custom UI macros do not render in it at all. The
two sources disagree and only this test settles it.

- If PDF is fine and Word is blank: add `adfExport` branching on `exportType`,
  so Word gets ADF and PDF keeps the online rendering.
- If PDF is also blank: add it unconditionally.

Either way the handler can only return the source as a code block. Rendering
an SVG to an image needs a browser, which a Forge function does not have. Real
image export belongs in the paid app.

## Listing assets

`marketing/` holds what the Marketplace listing form asks for.

| File | What it is |
|---|---|
| `listing.md` | Every copy field, with a character count against Atlassian's limits |
| `check-lengths.py` | Runs those counts; exits non-zero if a field is over |
| `out/logo-144.png` | App logo at the required 144x144 |
| `out/banner-*.png` | Banner at 1120x548 and 560x274 |
| `out/highlight-*-1840x900.png` | Three highlight images, each with a 580x330 crop |
| `privacy-policy.md` | Needs hosting at a public URL before listing |
| `support.md` | Same |
| `icon.svg`, `banner.svg`, `render.mjs`, `shots.mjs`, `compose.py` | Sources and the scripts that rebuild every image |

The highlight images are the real UI captured from the shipped code, framed
on a neutral background. Nothing is mocked up. They do not show Confluence
chrome, because the app was not installed on a site when they were taken.
Retake them inside a real page before listing.

Two findings that change the positioning in `the-decision`:

- The niche has at least ten Mermaid apps on the Marketplace, not eight.
- weweave's app (2,156 installs, 4.6 stars, paid) already ships live preview,
  sample templates, theming and export. Live preview is not a differentiator
  against the best-rated competitor, only against the free Atlassian Labs app
  at 2.99. The opening is the free slot, held by a badly rated app, which is
  what the original thesis actually rests on. Copy should say so.

## Not built yet

Export to PNG, SVG and PDF, themes and brand styling, diagram search,
space-level defaults and bulk conversion of existing pages are the paid
companion, not this app.
