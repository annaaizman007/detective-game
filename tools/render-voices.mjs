#!/usr/bin/env node
// Bake the narration to audio with a real TTS model.
//
//   npm run voices            -- pick the best engine this machine has
//   npm run voices -- --list  -- show what would be rendered, render nothing
//
// Why this is a build step and not something the game does live: the browser's
// speech synthesiser is the weakest part of the whole project, and there is no
// fixing it from inside the browser. A proper model produces narration that
// sounds like a person; it just cannot run on the page. So the script is
// enumerable ahead of time (see js/lines.js), rendered once here, and played
// back as files. The game falls back to speech synthesis for anything missing,
// so a half-finished render still works.
//
// Engines, in the order they are chosen:
//   elevenlabs  ELEVENLABS_API_KEY  best, costs money
//   openai      OPENAI_API_KEY      very good, costs money
//   piper       `piper` on PATH     good, free, offline
//   say         macOS built-in      good with a Premium/Enhanced voice, free
//
// No dependencies: node built-ins only.

import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { platform } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'voice');

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : (argv.includes(`--${name}`) ? true : fallback);
};

const run = (cmd, args, opts = {}) => new Promise((resolve, reject) => {
  const ch = spawn(cmd, args, { stdio: ['pipe', 'ignore', 'pipe'], ...opts });
  let err = '';
  ch.stderr?.on('data', (d) => { err += d; });
  ch.on('error', reject);
  ch.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${err.slice(0, 300)}`))));
  if (opts.input != null) ch.stdin.write(opts.input);
  ch.stdin?.end(); // never leave a child waiting on a pipe we will not write to
});

const has = async (cmd) => {
  try { await run(process.platform === 'win32' ? 'where' : 'which', [cmd]); return true; }
  catch { return false; }
};

// ---------------------------------------------------------------- engines

const ENGINES = {
  elevenlabs: {
    format: 'mp3',
    detect: () => !!process.env.ELEVENLABS_API_KEY,
    // A low, unhurried voice suits the material; override with --voice=<id>.
    describe: () => `ElevenLabs (${flag('voice', 'onwK4e9ZLuTAKqWW03F9')})`,
    async render(text, file) {
      const id = flag('voice', 'onwK4e9ZLuTAKqWW03F9');
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}`, {
        method: 'POST',
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: flag('model', 'eleven_multilingual_v2'),
          voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.25 },
        }),
      });
      if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
    },
  },

  openai: {
    format: 'mp3',
    detect: () => !!process.env.OPENAI_API_KEY,
    describe: () => `OpenAI TTS (${flag('voice', 'onyx')})`,
    async render(text, file) {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: flag('model', 'gpt-4o-mini-tts'),
          voice: flag('voice', 'onyx'),
          input: text,
          instructions: 'Read as a weary 1940s film-noir narrator. Low, unhurried, matter of fact. No theatrics.',
          response_format: 'mp3',
        }),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
    },
  },

  piper: {
    format: 'wav',
    detect: () => has('piper'),
    describe: () => `Piper (${flag('voice', 'en_GB-alan-medium')})`,
    async render(text, file) {
      await run('piper', ['-m', flag('voice', 'en_GB-alan-medium'), '-f', file], { input: text });
    },
  },

  say: {
    format: 'wav',
    detect: async () => platform() === 'darwin' && has('say'),
    describe: () => `macOS say (${flag('voice', 'Daniel')})`,
    async render(text, file) {
      // Premium/Enhanced voices are a large step up and are free to install:
      // System Settings > Accessibility > Spoken Content > Manage Voices.
      await run('say', [
        '-v', flag('voice', 'Daniel'),
        '-r', String(flag('rate', '168')),
        '--file-format=WAVE', '--data-format=LEI16@22050',
        '-o', file, text,
      ]);
    },
  },
};

async function pickEngine() {
  const asked = flag('engine');
  if (asked) {
    if (!ENGINES[asked]) throw new Error(`Unknown engine "${asked}". One of: ${Object.keys(ENGINES).join(', ')}`);
    return asked;
  }
  for (const name of ['elevenlabs', 'openai', 'piper', 'say']) {
    if (await ENGINES[name].detect()) return name;
  }
  return null;
}

// ------------------------------------------------------------------- main

// `--list-voices` just asks the system what it has, which is the first thing
// anyone needs before choosing one.
if (flag('list-voices')) {
  if (platform() === 'darwin') {
    const { execFileSync } = await import('node:child_process');
    const out = execFileSync('say', ['-v', '?'], { encoding: 'utf8' });
    const rows = out.split('\n').filter((l) => /^\S/.test(l));
    const good = rows.filter((l) => /\(Enhanced\)|\(Premium\)/.test(l));
    const en = rows.filter((l) => /\ben[_-]/i.test(l));
    console.log(good.length
      ? `\nHigh quality voices installed (use one of these):\n${good.map((l) => `  ${l}`).join('\n')}`
      : `\nNo Enhanced or Premium voices installed yet -- and they are free.
  System Settings > Accessibility > Spoken Content > System Voice > Manage
  Voices, then download an English voice marked Premium or Enhanced.`);
    console.log(`\nAll English voices (${en.length}):\n${en.map((l) => `  ${l.slice(0, 76)}`).join('\n')}\n`);
  } else {
    console.log('--list-voices only knows how to ask macOS. For Piper, list your .onnx files.');
  }
  process.exit(0);
}

const { collectLines } = await import(new URL('../js/lines.js', import.meta.url));
const lines = collectLines();

if (flag('list')) {
  const groups = {};
  for (const l of lines) (groups[l.group] ||= []).push(l);
  for (const [g, items] of Object.entries(groups)) {
    console.log(`\n${g.toUpperCase()} (${items.length})`);
    for (const l of items.slice(0, 4)) console.log(`  ${l.id}  ${l.text.slice(0, 84)}`);
    if (items.length > 4) console.log(`  ... and ${items.length - 4} more`);
  }
  console.log(`\n${lines.length} clips, ${lines.reduce((n, l) => n + l.text.length, 0)} characters.`);
  process.exit(0);
}

const engine = await pickEngine();
if (!engine) {
  console.error(`
No text-to-speech engine found on this machine.

  macOS    nothing to install -- rerun this and it will use \`say\`.
           First install a good voice: System Settings > Accessibility >
           Spoken Content > System Voice > Manage Voices, and take an
           English one marked Premium or Enhanced. Then:
             npm run voices -- --voice="Daniel (Enhanced)"

  Piper    free, offline, any platform. Install piper and a voice from
           https://github.com/OKC-piper/piper, then:
             npm run voices -- --engine=piper --voice=/path/to/en_GB-alan-medium.onnx

  Paid     export OPENAI_API_KEY=...       (or ELEVENLABS_API_KEY=...)
           npm run voices

Without any of these the game still narrates, using the browser's own
speech synthesis. It just will not sound as good.`);
  process.exit(1);
}

const spec = ENGINES[engine];
const force = !!flag('force');
console.log(`\nTHE ASHGRAVE FILES -- baking narration`);
console.log(`  engine   ${await spec.describe()}`);
console.log(`  clips    ${lines.length}`);
console.log(`  into     voice/\n`);

await mkdir(OUT, { recursive: true });

let done = 0; let skipped = 0; let failed = 0;
const failures = [];
const CONCURRENCY = engine === 'say' || engine === 'piper' ? 4 : 6;

async function renderOne(line) {
  const file = join(OUT, `${line.id}.${spec.format}`);
  if (!force) {
    try { const st = await stat(file); if (st.size > 256) { skipped++; return; } } catch { /* render it */ }
  }
  try {
    await spec.render(line.text, file);
    done++;
  } catch (e) {
    failed++;
    failures.push(`${line.id} "${line.text.slice(0, 50)}" -- ${e.message}`);
  }
  const n = done + skipped + failed;
  if (n % 10 === 0 || n === lines.length) {
    process.stdout.write(`\r  ${n}/${lines.length}  rendered ${done}  reused ${skipped}  failed ${failed}   `);
  }
}

const queue = lines.slice();
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) await renderOne(queue.shift());
}));
process.stdout.write('\n');

if (failures.length) {
  console.log(`\n  ${failures.length} failed:`);
  failures.slice(0, 8).forEach((f) => console.log(`    ${f}`));
}

// The manifest is what the game reads; without it the clips are ignored.
const manifest = {
  version: 1,
  engine,
  voice: String(flag('voice', 'default')),
  format: spec.format,
  generated: new Date().toISOString().slice(0, 10),
  clips: lines.map((l) => ({ id: l.id, group: l.group, text: l.text })),
};
await writeFile(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 1)}\n`);

let bytes = 0;
for (const l of lines) {
  try { bytes += (await stat(join(OUT, `${l.id}.${spec.format}`))).size; } catch { /* missing */ }
}
console.log(`\n  Wrote voice/manifest.json -- ${(bytes / 1e6).toFixed(1)} MB of audio.`);
console.log('  Reload the game; it will use these instead of the browser voice.\n');
