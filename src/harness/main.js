// Development-only page. It exercises the shared renderer in a real browser
// without @forge/bridge, so the bundle, Mermaid's lazy chunk loading and the
// SVG post-processing can be checked outside Confluence. Not shipped: the
// manifest declares no resource for this directory.
import { renderDiagram, paint } from '../common/mermaid-render.js';
import { TEMPLATES } from '../common/templates.js';
import '../common/base.css';

const cases = [
  ...TEMPLATES.map((t) => ({ label: t.label, source: t.source, expect: 'ok' })),
  {
    label: 'Syntax error',
    source: 'flowchart LR\n  A --> ((( B',
    expect: 'error',
  },
  { label: 'Empty', source: '   ', expect: 'empty' },
  {
    label: 'Script injection attempt in a label',
    source: 'flowchart LR\n  A["<img src=x onerror=window.__pwned=1>"] --> B',
    expect: 'ok',
  },
  {
    label: 'Remote image in a label',
    source:
      'flowchart LR\n  A["<img src=\'https://example.invalid/pixel.gif\'>"] --> B',
    expect: 'ok',
  },
];

// Every case that renders must show its own label text. Blank boxes are the
// failure mode this harness exists to catch: they look like a working diagram
// in a screenshot and only a text assertion sees them.
const EXPECTED_LABELS = {
  Flowchart: ['Request', 'Cached?', 'Serve from cache'],
  'Sequence diagram': ['User', 'API', 'Database'],
  'Class diagram': ['Order', 'LineItem'],
  'State diagram': ['Draft', 'InReview', 'Approved'],
  'Entity relationship': ['CUSTOMER', 'ORDER', 'LINE_ITEM'],
  'Gantt chart': ['Release plan', 'Build'],
  'Pie chart': ['Billing', 'Access'],
  'Git graph': ['init', 'editor'],
  Mindmap: ['Documentation', 'Reference', 'Runbooks'],
  'User journey': ['Onboarding', 'Sign up'],
};

const out = document.getElementById('out');
const results = [];

for (const testCase of cases) {
  const wrap = document.createElement('div');
  wrap.className = 'case';
  wrap.innerHTML = `<h2>${testCase.label}</h2>`;
  const surface = document.createElement('div');
  surface.className = 'mmd-surface';
  wrap.appendChild(surface);
  out.appendChild(wrap);

  // Sequential on purpose: Mermaid keeps global config, so overlapping
  // renders would race on the theme.
  // eslint-disable-next-line no-await-in-loop
  const result = await renderDiagram(testCase.source, 'default');
  paint(surface, result, { align: 'center', maxWidth: '' });

  const actual = result.ok ? 'ok' : result.empty ? 'empty' : 'error';
  const svgEl = surface.querySelector('svg');
  const rendered = svgEl ? svgEl.textContent.replace(/\s+/g, ' ') : '';

  const wanted = EXPECTED_LABELS[testCase.label] ?? [];
  const missing = wanted.filter((text) => !rendered.includes(text));

  const leaks = svgEl
    ? svgEl.querySelectorAll('img, image, script, iframe, object, embed').length
    : 0;

  results.push({
    label: testCase.label,
    expected: testCase.expect,
    actual,
    pass:
      actual === testCase.expect &&
      missing.length === 0 &&
      leaks === 0 &&
      (actual !== 'ok' || (result.naturalWidth > 0 && result.naturalWidth < 20000)),
    svgBytes: result.ok ? result.svg.length : 0,
    naturalWidth: result.naturalWidth ?? 0,
    message: result.ok ? '' : result.message,
    hasSvgElement: Boolean(svgEl),
    missingLabels: missing,
    remoteElements: leaks,
  });
}

window.__results = results;
window.__done = true;
