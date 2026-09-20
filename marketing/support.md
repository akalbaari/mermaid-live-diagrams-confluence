# Support

**Mermaid Live Diagrams for Confluence**

## Getting help

Email akalbaari@gmail.com. Include your Confluence site URL, the diagram
source that is not behaving, and a screenshot if the problem is visual.

Expected first response: two business days.

## Common problems

**The diagram shows a parse error.** The message under the preview is
Mermaid's own, and names the line it stopped on. Mermaid's syntax reference is
at https://mermaid.js.org/intro/syntax-reference.html

**A diagram type will not render.** The app bundles a fixed Mermaid version.
Syntax added to Mermaid after that version will not work until the app is
updated. Say which diagram type and we will tell you which release adds it.

**The diagram is too wide or too small.** Open the macro settings. "Max width"
caps the size in pixels; leaving it empty renders the diagram at the size
Mermaid laid it out, shrinking on narrow screens but never growing past it.

**Colours look wrong in dark mode.** With the theme set to "Match Confluence"
the diagram follows your Confluence theme. Pinning a specific Mermaid theme
keeps the diagram identical for every reader regardless of their theme.

**An image in a diagram label does not appear.** That is deliberate. Markup
that would fetch a remote resource is stripped, so a diagram cannot load an
external image or script into your page.

## Reporting a security issue

Email akalbaari@gmail.com with "security" in the subject. Please do not open a
public report first.
