// Copyright (c) 2026 Anxious Black Girls, LLC. All rights reserved. See LICENSE.
// Builds the www/ folder that goes inside the iPhone and Android apps.
// It copies the same files the website uses, so content edits in the repo
// root show up in the next app build. Nothing here changes the website.
import { readdirSync, statSync, rmSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SKIP = new Set([
  'www', 'node_modules', 'ios', 'android', 'resources', '.git', '.github', '.gitignore',
  'package.json', 'package-lock.json', 'capacitor.config.json', 'build-www.mjs',
  'README.md', 'LICENSE', 'CNAME', 'download.html', 'sw.js', 'manifest.webmanifest', 'og-image.png'
]);

rmSync('www', { recursive: true, force: true });
mkdirSync('www');
let n = 0;
for (const f of readdirSync('.')) {
  if (SKIP.has(f) || f.startsWith('.') || !statSync(f).isFile()) continue;
  copyFileSync(f, join('www', f));
  n++;
}

// In the app, native.js runs first (restores saved data, sets up reminders), then loads app.js.
const html = readFileSync('www/index.html', 'utf8');
if (!html.includes('<script src="app.js"></script>')) throw new Error('index.html: app.js script tag not found');
writeFileSync('www/index.html', html
  .replace('<script src="app.js"></script>', '<script src="native.js"></script>')
  .replace(/<link rel="manifest"[^>]*>\n?/, ''));
// The home screen widget reads its own copy of the affirmations.
if (statSync('ios/App/AffirmationWidget', { throwIfNoEntry: false })) copyFileSync('affirmations.json', 'ios/App/AffirmationWidget/affirmations.json');
console.log(`www/ ready: ${n} files`);
