import { loadContext, enableTheme } from '../common/bridge.js';
import {
  renderDiagram,
  paint,
  onColorModeChange,
  resolveTheme,
} from '../common/mermaid-render.js';
import '../common/base.css';
import './view.css';

const surface = document.getElementById('surface');
const caption = document.getElementById('caption');

/** Config lives on the macro instance, so it travels with the macro. */
let config = {};

function readConfig(context) {
  const raw = context?.extension?.config ?? {};
  return {
    source: typeof raw.source === 'string' ? raw.source : '',
    theme: typeof raw.theme === 'string' ? raw.theme : 'auto',
    align: typeof raw.align === 'string' ? raw.align : 'center',
    maxWidth: typeof raw.maxWidth === 'string' ? raw.maxWidth : '',
    caption: typeof raw.caption === 'string' ? raw.caption : '',
  };
}

// Which Mermaid theme the diagram on screen was actually drawn with. Used to
// decide whether the host theme landing after the first paint means anything.
let paintedWith = null;

async function draw() {
  paintedWith = resolveTheme(config.theme);
  const result = await renderDiagram(config.source, config.theme);

  if (result.empty) {
    // An unconfigured macro should read as an invitation, not an error.
    surface.classList.remove('is-error');
    surface.classList.add('is-empty');
    surface.dataset.align = 'left';
    surface.innerHTML =
      '<div class="mmd-placeholder">' +
      '<span class="mmd-placeholder-mark" aria-hidden="true"></span>' +
      '<span>Mermaid diagram. Open the macro settings to add your ' +
      'diagram source.</span>' +
      '</div>';
  } else {
    paint(surface, result, { align: config.align, maxWidth: config.maxWidth });
  }

  if (config.caption) {
    caption.textContent = config.caption;
    caption.hidden = false;
  } else {
    caption.textContent = '';
    caption.hidden = true;
  }
}

async function start() {
  // Started, not awaited. Waiting on the theme before the first paint costs a
  // round trip on every diagram; the promise is checked after the first paint
  // instead.
  const themeReady = enableTheme();

  const context = await loadContext();

  if (context === null) {
    surface.classList.add('is-error');
    surface.textContent = '';
    const box = document.createElement('div');
    box.className = 'mmd-message';
    box.innerHTML =
      '<p class="mmd-message-title">This diagram could not load</p>' +
      '<pre class="mmd-message-detail">Confluence did not return the ' +
      "macro's settings. Reloading the page usually fixes it.</pre>";
    surface.appendChild(box);
    return;
  }

  config = readConfig(context);

  const followsHost = () => !config.theme || config.theme === 'auto';

  // The observer goes on before the first paint. Attaching it afterwards lost
  // the change when Forge set data-color-mode while the config was still
  // loading, which left a light diagram sitting on a dark page.
  onColorModeChange(() => {
    if (followsHost()) draw();
  });

  await draw();

  // The observer only fires on a change. If the attribute was already set
  // before it was attached, the first paint used the wrong theme and nothing
  // will tell us, so compare against what was actually drawn.
  await themeReady;
  if (followsHost() && paintedWith !== resolveTheme(config.theme)) {
    await draw();
  }
}

start();
