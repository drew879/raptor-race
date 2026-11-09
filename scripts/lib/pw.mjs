// Resolve the preinstalled Playwright (global) without adding a second copy to the project.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try {
  pw = require('playwright');
} catch {
  pw = require('/opt/node-tools/node_modules/playwright');
}
export const { chromium, devices } = pw;
