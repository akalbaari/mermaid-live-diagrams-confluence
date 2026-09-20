import { view } from '@forge/bridge';
import { loadContext, enableTheme } from '../common/bridge.js';
import {
  renderDiagram,
  paint,
  onColorModeChange,
  THEMES,
  ALIGNMENTS,
} from '../common/mermaid-render.js';
import { TEMPLATES } from '../common/templates.js';
import '../common/base.css';
import './config.css';

const el = {
  source: document.getElementById('source'),
  template: document.getElementById('template'),
  theme: document.getElementById('theme'),
  align: document.getElementById('align'),
  maxWidth: document.getElementById('maxWidth'),
  caption: document.getElementById('caption'),
  surface: document.getElementById('surface'),
  previewCaption: document.getElementById('previewCaption'),
  status: document.getElementById('status'),
  spinner: document.getElementById('spinner'),
  save: document.getElementById('save'),
  cancel: document.getElementById('cancel'),
};

const PREVIEW_DELAY_MS = 220;

function fillSelect(select, options) {
  for (const option of options) {
    const node = document.createElement('option');
    node.value = option.value;
    node.textContent = option.label;
    select.appendChild(node);
  }
}

fillSelect(el.theme, THEMES);
fillSelect(el.align, ALIGNMENTS);

for (const [index, template] of TEMPLATES.entries()) {
  const node = document.createElement('option');
  node.value = String(index);
  node.textContent = template.label;
  el.template.appendChild(node);
}

/* --- preview -------------------------------------------------------- */

let pending = null;
// Renders are async and the user keeps typing through them, so each one is
// stamped and a result is discarded if a newer render has started since.
let generation = 0;

function currentOptions() {
  return {
    align: el.align.value || 'center',
    maxWidth: el.maxWidth.value.trim(),
  };
}

function setStatus(text, kind) {
  el.status.textContent = text;
  el.status.dataset.kind = kind ?? '';
}

async function preview() {
  const mine = ++generation;
  const source = el.source.value;

  el.spinner.hidden = false;

  const result = await renderDiagram(source, el.theme.value);
  if (mine !== generation) return;

  el.spinner.hidden = true;
  paint(el.surface, result, currentOptions());

  const caption = el.caption.value.trim();
  // A caption under a failed render reads as though it described the error.
  el.previewCaption.textContent = caption;
  el.previewCaption.hidden = !caption || !result.ok;

  if (result.ok) {
    const lines = source.trim().split('\n').length;
    setStatus(`Renders cleanly. ${lines} ${lines === 1 ? 'line' : 'lines'}.`, 'ok');
  } else if (result.empty) {
    setStatus('Add some Mermaid source, or insert an example to start.', '');
  } else {
    // The preview pane already carries the full parser output, so the status
    // line takes the first line only rather than printing it all twice.
    setStatus(result.message.split('\n')[0], 'error');
  }
}

function schedulePreview() {
  clearTimeout(pending);
  pending = setTimeout(preview, PREVIEW_DELAY_MS);
}

/** Options change the picture without changing the source, so repaint now. */
function repaintOptionsOnly() {
  clearTimeout(pending);
  preview();
}

el.source.addEventListener('input', schedulePreview);
el.theme.addEventListener('change', repaintOptionsOnly);
el.align.addEventListener('change', repaintOptionsOnly);
el.maxWidth.addEventListener('input', repaintOptionsOnly);
el.caption.addEventListener('input', repaintOptionsOnly);

el.template.addEventListener('change', () => {
  const index = Number(el.template.value);
  const template = TEMPLATES[index];
  el.template.value = '';
  if (!template) return;

  const existing = el.source.value.trim();
  if (existing && !window.confirm('Replace the current diagram source?')) {
    return;
  }
  el.source.value = template.source;
  el.source.focus();
  repaintOptionsOnly();
});

// A plain textarea sends Tab to the next control, which makes indenting a
// nested diagram impossible without reaching for the mouse.
el.source.addEventListener('keydown', (event) => {
  if (event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault();
    const { selectionStart: start, selectionEnd: end, value } = el.source;
    el.source.value = `${value.slice(0, start)}  ${value.slice(end)}`;
    el.source.selectionStart = el.source.selectionEnd = start + 2;
    schedulePreview();
    return;
  }
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    save();
  }
});

/* --- load and save --------------------------------------------------- */

function applyConfig(config) {
  el.source.value = typeof config.source === 'string' ? config.source : '';
  el.theme.value = typeof config.theme === 'string' ? config.theme : 'auto';
  el.align.value = typeof config.align === 'string' ? config.align : 'center';
  el.maxWidth.value = typeof config.maxWidth === 'string' ? config.maxWidth : '';
  el.caption.value = typeof config.caption === 'string' ? config.caption : '';
}

function collectConfig() {
  const width = el.maxWidth.value.trim();
  const parsed = Number(width);
  return {
    source: el.source.value,
    theme: el.theme.value || 'auto',
    align: el.align.value || 'center',
    // Stored as a string because macro parameters are strings; an
    // unparseable or out-of-range value is dropped rather than persisted.
    maxWidth:
      width && Number.isFinite(parsed) && parsed >= 120 && parsed <= 4000
        ? String(Math.round(parsed))
        : '',
    caption: el.caption.value.trim(),
  };
}

let saving = false;

async function save() {
  if (saving) return;
  saving = true;
  el.save.disabled = true;

  try {
    await view.submit({ config: collectConfig() });
  } catch (error) {
    saving = false;
    el.save.disabled = false;
    setStatus(
      `Could not save: ${error?.message ?? 'unknown error'}. Your source is ` +
        'still here, so you can try again.',
      'error'
    );
  }
}

el.save.addEventListener('click', save);
el.cancel.addEventListener('click', () => view.close());

async function start() {
  const themeReady = enableTheme();

  // The editor stays usable even if the host never answers. The fields start
  // empty, the preview works, and only Save would fail, which it reports.
  const context = await loadContext();

  applyConfig(context?.extension?.config ?? {});

  onColorModeChange(() => {
    if (!el.theme.value || el.theme.value === 'auto') repaintOptionsOnly();
  });

  await preview();
  el.source.focus();

  // Forge can set the host theme while the config is still loading, which the
  // observer above would miss because it only fires on a change.
  await themeReady;
  if (!el.theme.value || el.theme.value === 'auto') repaintOptionsOnly();
}

start();
