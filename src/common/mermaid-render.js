import mermaid from 'mermaid';

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", ' +
  'Ubuntu, sans-serif';

export const THEMES = [
  { value: 'auto', label: 'Match Confluence' },
  { value: 'default', label: 'Default' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'forest', label: 'Forest' },
  { value: 'dark', label: 'Dark' },
];

export const ALIGNMENTS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

/**
 * Forge sets data-color-mode on <html> once view.theme.enable() has run, and
 * updates it live when the user flips Confluence between light and dark.
 */
export function colorMode() {
  const declared = document.documentElement.getAttribute('data-color-mode');
  if (declared === 'dark' || declared === 'light') return declared;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/** Calls back whenever the host theme changes. Returns a disposer. */
export function onColorModeChange(handler) {
  const observer = new MutationObserver(() => handler(colorMode()));
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-color-mode'],
  });

  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const onMedia = () => handler(colorMode());
  media?.addEventListener?.('change', onMedia);

  return () => {
    observer.disconnect();
    media?.removeEventListener?.('change', onMedia);
  };
}

export function resolveTheme(configured) {
  if (!configured || configured === 'auto') {
    return colorMode() === 'dark' ? 'dark' : 'default';
  }
  return configured;
}

function configure(theme) {
  mermaid.initialize({
    startOnLoad: false,
    // Diagram text is authored by whoever edits the page but is rendered for
    // everyone who reads it, so HTML in labels stays inert and click
    // directives stay disabled.
    securityLevel: 'strict',
    theme,
    fontFamily: FONT_STACK,
    altFontFamily: FONT_STACK,
    wrap: true,
    maxTextSize: 200000,
    maxEdges: 1000,
    flowchart: { useMaxWidth: true, htmlLabels: false },
    sequence: { useMaxWidth: true },
    gantt: { useMaxWidth: true },
    journey: { useMaxWidth: true },
    er: { useMaxWidth: true },
    class: { useMaxWidth: true },
    state: { useMaxWidth: true },
    pie: { useMaxWidth: true },
  });
}

// Hardening the rendered SVG is not enough on its own. Mermaid measures a
// diagram by building it in a throwaway node attached to the real document,
// so an <img> in a label is instantiated, and fetched, before any output
// string exists to clean. Browser network logs confirmed the request going
// out even though the element never reached the page. So tags that pull a
// remote resource are taken out of the source first, and the SVG pass below
// stays as the second line of defence.
//
// The pattern only matches a real tag opener followed by one of these names,
// which is why it leaves Mermaid's own syntax alone: `-->`, `<|--`, `->>`
// and `<--` never form one.
const REMOTE_TAGS =
  /<\s*\/?\s*(?:img|image|script|iframe|object|embed|link|meta|base|video|audio|source|track|input|form|button|use|foreignobject|animate|animatetransform|set|svg|style)\b[^>]*>/gi;

// `style` is also a Mermaid statement (`style A fill:#f9f`), which has no
// equals sign, so only the attribute form is removed.
const STYLE_ATTR = /\sstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

function stripRemoteMarkup(text) {
  // Replaced with a space, not removed outright: a label whose whole content
  // was one stripped tag would otherwise collapse to `A[""]`, which Mermaid
  // rejects as a syntax error, and the reader would see a parse failure
  // instead of a diagram.
  return text.replace(REMOTE_TAGS, ' ').replace(STYLE_ATTR, ' ');
}

let counter = 0;
function nextId() {
  counter += 1;
  return `mmd-${Date.now().toString(36)}-${counter}`;
}

function describe(error) {
  if (!error) return 'Could not render this diagram.';
  // Mermaid throws a DetailedError for syntax problems; `str` is the readable
  // part and `message` repeats it with the parser's stack noise.
  if (typeof error === 'object' && typeof error.str === 'string') {
    return error.str;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Renders Mermaid source to an SVG string.
 * Resolves to { ok: true, svg } or { ok: false, message }.
 */
export async function renderDiagram(source, configuredTheme) {
  const raw = (source ?? '').trim();
  if (!raw) {
    return { ok: false, empty: true, message: 'This diagram is empty.' };
  }
  const text = stripRemoteMarkup(raw);

  configure(resolveTheme(configuredTheme));

  const id = nextId();
  try {
    await mermaid.parse(text);
    const { svg } = await mermaid.render(id, text);
    const { markup, naturalWidth } = normalizeSvg(svg);
    return { ok: true, svg: markup, naturalWidth };
  } catch (error) {
    return { ok: false, message: describe(error) };
  } finally {
    // A failed render can leave mermaid's scratch node behind.
    document.getElementById(id)?.remove();
    document.getElementById(`d${id}`)?.remove();
  }
}

// Mermaid sanitizes label text before it draws, which is what stops script
// execution. What it leaves behind is markup that still reaches out to the
// network: DOMPurify strips an `onerror` handler off an <img> but keeps the
// <img>, so diagram source could plant a tracking pixel on a page for
// everyone who reads it. This pass closes that.
//
// Running the whole SVG back through DOMPurify was the obvious fix and it
// does not work: in every configuration tried (default, USE_PROFILES with
// html, PARSER_MEDIA_TYPE application/xhtml+xml, and NAMESPACE set to the SVG
// namespace) it empties every <foreignObject>, which is where Mermaid puts
// the labels for flowcharts, class diagrams, state diagrams and ER diagrams.
// The diagrams came back as empty boxes. So the hardening below is done by
// hand against the parsed document, where foreignObject contents survive.
const BLOCKED_ELEMENTS = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'img',
  'image',
  'audio',
  'video',
  'link',
  'meta',
  'base',
  'form',
  'input',
  'button',
  'animate',
  'animatetransform',
  'set',
]);

const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'ping']);

function attributeName(attr) {
  return attr.name.toLowerCase().replace(/^xlink:/, '');
}

/** Removes every element and attribute that could fetch or execute anything. */
function harden(svg) {
  const elements = [svg, ...svg.querySelectorAll('*')];

  for (const element of elements) {
    if (BLOCKED_ELEMENTS.has(element.localName?.toLowerCase())) {
      element.remove();
      continue;
    }

    for (const attr of [...element.attributes]) {
      const name = attributeName(attr);
      const value = attr.value.trim();

      if (name.startsWith('on')) {
        element.removeAttributeNode(attr);
        continue;
      }

      // Same-document references are what Mermaid uses for arrow markers,
      // clip paths and gradients, so those are the only ones kept.
      if (URL_ATTRIBUTES.has(name) && !value.startsWith('#')) {
        element.removeAttributeNode(attr);
        continue;
      }

      if (name === 'style' && /url\s*\(/i.test(value)) {
        element.setAttribute('style', value.replace(/url\s*\([^)]*\)/gi, 'none'));
      }
    }

    // Mermaid ships the diagram's CSS in a <style> block. Keep it, minus
    // anything in it that would hit the network.
    if (element.localName?.toLowerCase() === 'style' && element.textContent) {
      element.textContent = element.textContent
        .replace(/@import[^;]*;?/gi, '')
        .replace(/url\s*\([^)]*\)/gi, 'none');
    }
  }
}

function parseSvg(markup) {
  // XML parsing first because it is the strict reading of what an SVG is.
  const xml = new DOMParser().parseFromString(markup, 'image/svg+xml');
  if (!xml.querySelector('parsererror')) {
    const root = xml.querySelector('svg');
    if (root) return root;
  }

  // Mermaid can emit HTML inside <foreignObject> that is not well-formed XML.
  // The HTML parser handles it the way a browser would, including the casing
  // fixups for SVG element and attribute names.
  const html = new DOMParser().parseFromString(
    `<!doctype html><body>${markup}</body>`,
    'text/html'
  );
  return html.body.querySelector('svg');
}

/**
 * Mermaid sizes the SVG with an inline `max-width` in pixels, which stops the
 * diagram shrinking inside a narrow Confluence column. Dropping that style
 * and letting the SVG fill its container is not the fix either: a four-box
 * sequence diagram then stretches to the full page width and reads as though
 * it were zoomed in.
 *
 * So the element scales freely and the natural width is handed back for the
 * wrapper to use as its ceiling. The diagram shrinks on a narrow screen and
 * never grows past the size Mermaid laid it out at.
 */
function normalizeSvg(rawSvg) {
  const svg = parseSvg(rawSvg);
  if (!svg) return { markup: '', naturalWidth: 0 };

  harden(svg);

  const naturalWidth = readNaturalWidth(svg);

  svg.removeAttribute('style');
  svg.setAttribute('width', '100%');
  svg.removeAttribute('height');
  if (!svg.getAttribute('preserveAspectRatio')) {
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }

  return { markup: new XMLSerializer().serializeToString(svg), naturalWidth };
}

function readNaturalWidth(svg) {
  const viewBox = svg.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4 && Number.isFinite(parts[2]) && parts[2] > 0) {
      return Math.round(parts[2]);
    }
  }

  // Mermaid's inline style is the other place the laid-out width appears.
  const style = svg.getAttribute('style') ?? '';
  const match = style.match(/max-width:\s*([\d.]+)px/);
  if (match) return Math.round(Number(match[1]));

  const width = Number.parseFloat(svg.getAttribute('width') ?? '');
  return Number.isFinite(width) && width > 0 ? Math.round(width) : 0;
}

/**
 * Paints a render result into `host`, which is expected to be an element with
 * the `mmd-surface` class from base.css.
 */
export function paint(host, result, { align = 'center', maxWidth = '' } = {}) {
  host.dataset.align = align;

  // An explicit width from the macro settings wins, so a small diagram can be
  // deliberately scaled up. With nothing set, the diagram's own laid-out
  // width is the ceiling.
  const ceiling = maxWidth || (result.naturalWidth ? result.naturalWidth : '');
  host.style.setProperty('--mmd-max-width', ceiling ? `${ceiling}px` : '100%');

  if (result.ok) {
    host.classList.remove('is-error', 'is-empty');
    host.innerHTML = `<div class="mmd-figure">${result.svg}</div>`;
    return;
  }

  host.classList.toggle('is-empty', Boolean(result.empty));
  host.classList.toggle('is-error', !result.empty);
  host.textContent = '';

  const box = document.createElement('div');
  box.className = 'mmd-message';

  const title = document.createElement('p');
  title.className = 'mmd-message-title';
  title.textContent = result.empty
    ? 'No diagram yet'
    : 'This diagram could not be rendered';
  box.appendChild(title);

  const detail = document.createElement('pre');
  detail.className = 'mmd-message-detail';
  // textContent, never innerHTML: the message quotes the user's own source.
  detail.textContent = result.message;
  box.appendChild(detail);

  host.appendChild(box);
}
