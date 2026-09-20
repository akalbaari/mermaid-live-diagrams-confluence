// Validates manifest.yml against the schema that ships inside the Forge CLI,
// which is the same check `forge lint` runs. Kept as a local script because
// `forge lint` itself requires an authenticated session.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const manifestPkg = require('/home/claude/.npm-global/lib/node_modules/@forge/cli/node_modules/@forge/manifest/out/index.js');

const result = await manifestPkg.validate(false, 'manifest.yml');
const errors = result?.errors ?? [];
const warnings = result?.warnings ?? [];

console.log('errors:', errors.length);
errors.forEach((e) => console.log('  ERROR', JSON.stringify(e)));
console.log('warnings:', warnings.length);
warnings.forEach((w) => console.log('  WARN ', JSON.stringify(w)));
process.exit(errors.length ? 1 : 0);
