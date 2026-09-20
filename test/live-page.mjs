// Creates two live Confluence pages that exercise the macro end to end:
// one page holding several diagrams, and a second page that embeds the first
// through the Include Page macro. That second page is the headline claim
// against the Atlassian Labs app, so it needs a real test rather than an
// argument from design.
//
//   node test/live-page.mjs
//
// Credentials come from FORGE_EMAIL / FORGE_API_TOKEN so nothing is written
// to disk.

const SITE = 'akalbaari.atlassian.net';
const APP_ID = '9a59ac4a-d78d-4849-b744-b4192a4a5738';
const ENV_ID = 'e64c0b25-753d-43f0-9be2-c4f487d2282a';
const MODULE_KEY = 'mermaid-diagram';

const EMAIL = process.env.FORGE_EMAIL;
const TOKEN = process.env.FORGE_API_TOKEN;
if (!EMAIL || !TOKEN) {
  console.error('Set FORGE_EMAIL and FORGE_API_TOKEN.');
  process.exit(1);
}

const auth = 'Basic ' + Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');

async function api(path, init = {}) {
  const res = await fetch(`https://${SITE}/wiki${path}`, {
    ...init,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path}\n${text.slice(0, 600)}`);
  return text ? JSON.parse(text) : null;
}

let localId = 0;

/** One Mermaid macro instance, with its config carried in guestParams. */
function mermaid(config) {
  localId += 1;
  return {
    type: 'extension',
    attrs: {
      extensionType: 'com.atlassian.ecosystem',
      extensionKey: `${APP_ID}/${ENV_ID}/static/${MODULE_KEY}`,
      layout: 'default',
      parameters: {
        localId: `mmd-test-${localId}`,
        extensionId: `ari:cloud:ecosystem::extension/${APP_ID}/${ENV_ID}/static/${MODULE_KEY}`,
        extensionTitle: 'Mermaid diagram',
        guestParams: config,
      },
    },
  };
}

function heading(text, level = 2) {
  return { type: 'heading', attrs: { level }, content: [{ type: 'text', text }] };
}

function para(text) {
  return { type: 'paragraph', content: [{ type: 'text', text }] };
}

const diagramPage = {
  type: 'doc',
  version: 1,
  content: [
    para('Live check of the Mermaid macro. Every diagram below stores its own source.'),

    heading('Flowchart, default theme'),
    mermaid({
      source: [
        'flowchart LR',
        '  A[Pull request] --> B{CI green?}',
        '  B -- yes --> C[Review]',
        '  B -- no --> D[Fix and push]',
        '  D --> B',
        '  C --> E[Merge]',
      ].join('\n'),
      theme: 'auto',
      align: 'center',
      maxWidth: '',
      caption: 'How a change reaches main',
    }),

    heading('Sequence diagram, left aligned, width capped'),
    mermaid({
      source: [
        'sequenceDiagram',
        '  participant U as User',
        '  participant A as API',
        '  participant D as Database',
        '  U->>A: POST /orders',
        '  A->>D: insert order',
        '  D-->>A: order id',
        '  A-->>U: 201 Created',
      ].join('\n'),
      theme: 'auto',
      align: 'left',
      maxWidth: '520',
      caption: '',
    }),

    heading('Class diagram, pinned to the forest theme'),
    mermaid({
      source: [
        'classDiagram',
        '  class Order {',
        '    +String id',
        '    +Money total',
        '    +submit()',
        '  }',
        '  class LineItem {',
        '    +String sku',
        '    +int quantity',
        '  }',
        '  Order "1" --> "*" LineItem',
      ].join('\n'),
      theme: 'forest',
      align: 'center',
      maxWidth: '',
      caption: 'Pinned theme, so every reader sees the same colours',
    }),

    heading('Deliberately broken source'),
    para('This should show the parser message and the failing line, not a blank box.'),
    mermaid({
      source: 'flowchart LR\n  A --> ((( B',
      theme: 'auto',
      align: 'center',
      maxWidth: '',
      caption: '',
    }),

    heading('Empty macro'),
    para('This should read as an invitation to configure it, not as an error.'),
    mermaid({ source: '', theme: 'auto', align: 'center', maxWidth: '', caption: '' }),
  ],
};

function includePage(pageId, pageTitle) {
  return {
    type: 'extension',
    attrs: {
      extensionType: 'com.atlassian.confluence.macro.core',
      extensionKey: 'include',
      layout: 'default',
      parameters: {
        macroParams: {
          '': { value: pageTitle },
size: undefined,
        },
        macroMetadata: {
          macroId: { value: `include-${pageId}` },
          schemaVersion: { value: '1' },
          title: 'Include Page',
        },
      },
    },
  };
}

const spaces = await api('/api/v2/spaces?limit=25');
const space = spaces.results.find((s) => s.type === 'personal') ?? spaces.results[0];
console.log('space:', space.name, space.key, space.id);

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const title = `Mermaid macro live check ${stamp}`;

const page = await api('/api/v2/pages', {
  method: 'POST',
  body: JSON.stringify({
    spaceId: space.id,
    status: 'current',
    title,
    body: { representation: 'atlas_doc_format', value: JSON.stringify(diagramPage) },
  }),
});

console.log('DIAGRAM PAGE:', `https://${SITE}/wiki${page._links.webui}`);
console.log('DIAGRAM PAGE ID:', page.id);

const includeDoc = {
  type: 'doc',
  version: 1,
  content: [
    para('This page contains no diagrams of its own. Everything below comes from the Include Page macro.'),
    para('If the diagrams render here, the macro survives being embedded, which is the failure users report against the Atlassian Labs app.'),
    includePage(page.id, title),
  ],
};

const embed = await api('/api/v2/pages', {
  method: 'POST',
  body: JSON.stringify({
    spaceId: space.id,
    status: 'current',
    title: `Include Page check ${stamp}`,
    body: { representation: 'atlas_doc_format', value: JSON.stringify(includeDoc) },
  }),
});

console.log('INCLUDE PAGE:', `https://${SITE}/wiki${embed._links.webui}`);
