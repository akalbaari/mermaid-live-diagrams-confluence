// Development-only stand-in for @forge/bridge.
//
// The real bridge throws while its module is being evaluated when there is no
// Atlassian host on the other end, which takes the whole entry module with it
// and leaves a blank page. That makes the config editor impossible to open in
// a plain browser. This stub is aliased in for `--mode preview` only, so the
// editor's layout, live preview, templates and keyboard handling can be
// exercised outside Confluence. It is never bundled into the shipped
// resources.
const seededConfig = {
  source: [
    'flowchart LR',
    '  A[Request] --> B{Cached?}',
    '  B -- yes --> C[Serve from cache]',
    '  B -- no --> D[Fetch origin]',
    '  D --> E[Store in cache]',
    '  E --> C',
  ].join('\n'),
  theme: 'auto',
  align: 'center',
  maxWidth: '',
  caption: 'Read path',
};

export const view = {
  getContext: async () => ({
    extension: { config: seededConfig, type: 'macro' },
    moduleKey: 'mermaid-diagram',
  }),
  theme: { enable: async () => undefined },
  submit: async (payload) => {
    // eslint-disable-next-line no-console
    console.log('[stub] view.submit', payload);
    window.__submitted = payload;
  },
  close: async () => {
    // eslint-disable-next-line no-console
    console.log('[stub] view.close');
  },
};

export const invoke = async () => undefined;
export default { view, invoke };
