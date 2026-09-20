# Marketplace listing copy

Character limits are Atlassian's, from "Building your presence on Marketplace".
The count after each field is the live count from `check-lengths.py`.

## App name

Mermaid Live Diagrams for Confluence

> Check availability on the listing form. Nine Mermaid apps already sit on the
> Marketplace and the obvious names are taken, including "Mermaid Diagrams for
> Confluence", "Mermaid for Confluence" and "Mermaid Charts & Diagrams for
> Confluence". Atlassian also rejects names containing Atlassian, plugin,
> beta, add-on or app.

## Tagline

Write a diagram as text and watch it draw itself. The source lives in the macro, so editing the page never breaks it.

## Summary

Turn plain text into flowcharts, sequence diagrams, Gantt charts and more without leaving the editor. The preview redraws as you type. Each diagram keeps its own source, so moving or rewriting the rest of the page leaves your diagrams alone.

## More details

Mermaid lets you write a diagram the way you write a sentence. Four lines of text become a flowchart, and you edit the text rather than drag the shapes.

Insert the macro, type or paste your source, and the preview draws beside you as you type. If the syntax breaks you get the parser's own message and the line number, before you save rather than after.

Each diagram stores its own source. Other Mermaid renderers point at a code block elsewhere on the page and track it by position, which is why they break when someone adds a paragraph above. This one never reads the page, so nothing on the page can break it, including inside Include Page.

Supported: flowchart, sequence, class, state, entity relationship, Gantt, pie, git graph, mindmap, user journey, timeline, block, C4, sankey, XY chart and more.

Diagrams follow your Confluence theme, dark mode included. Ten starters are built in.

Your text stays in Confluence and is drawn in your own browser. No account, no API key, no tracking.

## Highlight 1

**Title:** See the diagram while you write it

**Summary:** The preview redraws a fifth of a second after you stop typing. When the syntax breaks, the editor shows the parser's own message and the line it failed on, so you fix it before you save rather than after.

**Caption:** Your Mermaid source on the left, the finished diagram on the right, with theme, alignment, width and caption underneath.

## Highlight 2

**Title:** Every Mermaid diagram type

**Summary:** Flowcharts, sequence, class, state, entity relationship, Gantt, pie, git graph, mindmap, user journey and the rest. Ten starter examples are built in if you have never written Mermaid before.

**Caption:** Six of the supported diagram types, drawn by the same code that renders them on your page.

## Highlight 3

**Title:** Follows your Confluence theme

**Summary:** Set a diagram to match Confluence and it switches when your theme does, dark mode included, without a page reload. Pin it to a fixed Mermaid theme instead when you want it to look the same for every reader.

**Caption:** The same six diagrams in light and dark. Nothing in a diagram reaches the internet, so a label cannot smuggle in a tracking pixel.

## Release summary

First release. Live preview, 18 diagram types, dark mode.

## Release notes

First public release.

- Renders Mermaid diagrams in Confluence Cloud pages.
- Diagram source is stored in the macro, so editing the page cannot break the diagram or detach it from its source.
- Split editor with a live preview that redraws as you type, and parser errors reported with the failing line.
- Ten starter diagrams covering flowcharts, sequence, class, state, entity relationship, Gantt, pie, git graph, mindmap and user journey.
- Theme follows Confluence, dark mode included, or can be pinned to a fixed Mermaid theme.
- Alignment, maximum width and an optional caption per diagram.
- Diagram text and captions are indexed, so Confluence search finds them.
- Runs entirely in your browser on Atlassian's own hosting. No data leaves your Confluence site, and markup that would fetch a remote resource is stripped from diagram source before rendering.
