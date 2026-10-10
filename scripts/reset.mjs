import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.rmSync(path.join(root, 'data'), { recursive: true, force: true });
console.log('PATCHWORK data wiped. It will be re-seeded on next start.');
