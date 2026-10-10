// Copies the shared locator + runtime into the extension folder so it can be loaded unpacked.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.copyFileSync(path.join(root, 'shared/core.cjs'), path.join(root, 'extension/core.js'));
fs.copyFileSync(path.join(root, 'runtime/runtime.js'), path.join(root, 'extension/runtime.js'));
console.log('extension/ updated — load it via chrome://extensions → Developer mode → Load unpacked');
