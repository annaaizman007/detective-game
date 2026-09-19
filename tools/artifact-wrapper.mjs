#!/usr/bin/env node
// Build the page fragment the Claude artifact host needs.
//
// The host supplies its own <head> and <body>, so index.html cannot be
// published as-is. This reads the built dist/index.html, keeps the asset
// links and the app markup, and writes dist/artifact.html: a fragment that
// works inside the host's frame. Publish it as the page, with dist/assets/*
// and public/voice/* as files.

import { readFile, writeFile } from 'node:fs/promises';

const html = await readFile('dist/index.html', 'utf8');
const links = [...html.matchAll(/<link[^>]+rel="(?:stylesheet|modulepreload)"[^>]*>/g)].map((m) => m[0])
  .filter((l) => !l.includes('fonts.googleapis') || true);
const scripts = [...html.matchAll(/<script[^>]+type="module"[^>]*><\/script>/g)].map((m) => m[0]);
const fonts = [...html.matchAll(/<link[^>]+fonts\.g[^>]*>/g)].map((m) => m[0]);

const out = `<title>The Ashgrave Files</title>
${fonts.join('\n')}
${links.filter((l) => !l.includes('fonts.g')).join('\n')}
<style>
  /* The host frame pads :root for phone safe areas and sizes the page at
     100%, so everything measures itself against that box. */
  html, body { height: 100%; margin: 0; background: var(--ink, #070910); }
</style>
<div id="stage" aria-hidden="true"></div>
<div class="grain" aria-hidden="true"></div>
<div class="vignette" aria-hidden="true"></div>
<main id="app"></main>
${scripts.join('\n')}
`;
await writeFile('dist/artifact.html', out.replace(/href="\.\//g, 'href="').replace(/src="\.\//g, 'src="'));
console.log('wrote dist/artifact.html');
