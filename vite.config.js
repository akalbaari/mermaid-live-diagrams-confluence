import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Chunking is left to the bundler on purpose. Mermaid lazy-loads one chunk
// per diagram type and per layout engine, so a page showing a flowchart never
// downloads ELK, Cytoscape or KaTeX. Grouping those chunks by hand cuts the
// file count but pulls the heavy engines into the eager graph, which was
// measurably worse: it turned a ~200 kB first paint into ~5 MB. The trade is
// file count against page weight, and page weight wins.
//
// The cost is that a build lands near 100 files per resource directory,
// against Forge's 250-file-per-deployment quota for free and distributed
// apps. Check `find static -type f | wc -l` after a Mermaid upgrade.

export default defineConfig(({ mode }) => {
  // One config, four builds. `view` is the macro renderer, `config` is the
  // editor that opens in the macro configuration modal, `harness` is a plain
  // page that exercises the renderer, and `preview` is the same editor with
  // @forge/bridge stubbed so it can be opened in an ordinary browser. Only
  // `view` and `config` are referenced by the manifest, so the other two
  // never ship.
  const entry = ['config', 'harness'].includes(mode)
    ? mode
    : mode === 'preview'
      ? 'config'
      : 'view';

  const stubBridge = mode === 'preview';

  return {
    // Forge serves static resources from a path the app does not control, so
    // every asset reference has to be relative.
    base: './',
    root: resolve(process.cwd(), 'src', entry),
    resolve: stubBridge
      ? {
          alias: {
            '@forge/bridge': resolve(
              process.cwd(),
              'src/preview/bridge-stub.js'
            ),
          },
        }
      : {},
    build: {
      outDir: resolve(process.cwd(), 'static', stubBridge ? 'preview' : entry),
      emptyOutDir: true,
      target: 'es2022',
      sourcemap: false,
      chunkSizeWarningLimit: 4000,
      rollupOptions: {
        input: resolve(process.cwd(), 'src', entry, 'index.html'),
      },
    },
  };
});
