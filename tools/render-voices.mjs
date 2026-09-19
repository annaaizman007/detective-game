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
//   kokoro      a local neural model, free, offline   -- `npm run voices -- --setup`
//   piper       `piper` on PATH     smaller local model, free, offline
//   say         macOS built-in      a formant synthesiser; the weakest option
//
// No dependencies: node built-ins only.

import { mkdir, writeFile, stat, rm, open as openFile } from 'node:fs/promises';
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

const MODELS = join(ROOT, 'models');
const KOKORO_FILES = [
  { name: 'kokoro-v1.0.onnx', url: 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx' },
  { name: 'voices-v1.0.bin', url: 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin' },
];

const exists = async (p) => { try { return (await stat(p)).size > 1024; } catch { return false; } };

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const total = Number(res.headers.get('content-length') || 0);
  const fh = await openFile(dest, 'w');
  let got = 0;
  for await (const chunk of res.body) {
    await fh.write(chunk);
    got += chunk.length;
    if (total) process.stdout.write(`\r    ${(got / 1e6).toFixed(0)}/${(total / 1e6).toFixed(0)} MB   `);
  }
  await fh.close();
  process.stdout.write('\n');
}

const ENGINES = {
  elevenlabs: {
    defaultVoice: 'onwK4e9ZLuTAKqWW03F9',
    format: 'mp3',
    detect: () => !!process.env.ELEVENLABS_API_KEY,
    // A low, unhurried voice suits the material; override with --voice=<id>.
    describe: () => `ElevenLabs (${flag('voice', ENGINES.elevenlabs.defaultVoice)})`,
    async render(text, file) {
      const id = flag('voice', ENGINES.elevenlabs.defaultVoice);
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
    defaultVoice: 'onyx',
    format: 'mp3',
    detect: () => !!process.env.OPENAI_API_KEY,
    describe: () => `OpenAI TTS (${flag('voice', ENGINES.openai.defaultVoice)})`,
    async render(text, file) {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: flag('model', 'gpt-4o-mini-tts'),
          voice: flag('voice', ENGINES.openai.defaultVoice),
          input: text,
          instructions: 'Read as a weary 1940s film-noir narrator. Low, unhurried, matter of fact. No theatrics.',
          response_format: 'mp3',
        }),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
    },
  },

  // A real neural model, running locally on the CPU. Free, offline, and the
  // best option that does not involve an account. Batched deliberately: the
  // model takes seconds to load and milliseconds to run, so it is loaded once
  // for the whole script rather than once per line.
  kokoro: {
    defaultVoice: 'bm_george',
    format: 'wav',
    batch: true,
    async detect() {
      if (!(await has('python3'))) return false;
      try { await run('python3', ['-c', 'import kokoro_onnx, soundfile']); } catch { return false; }
      for (const f of KOKORO_FILES) if (!(await exists(join(MODELS, f.name)))) return false;
      return true;
    },
    describe: () => `Kokoro, local neural model (${flag('voice', ENGINES.kokoro.defaultVoice)})`,
    async renderAll(lines, outDir, onProgress) {
      const args = [
        join(ROOT, 'tools', 'kokoro_render.py'),
        '--model', join(MODELS, KOKORO_FILES[0].name),
        '--voices', join(MODELS, KOKORO_FILES[1].name),
        '--voice', String(flag('voice', ENGINES.kokoro.defaultVoice)),
        '--speed', String(flag('speed', '0.95')),
        '--out', outDir,
      ];
      if (flag('force')) args.push('--force');
      if (flag('lang')) args.push('--lang', String(flag('lang')));

      return new Promise((resolve, reject) => {
        const ch = spawn('python3', args, { stdio: ['pipe', 'pipe', 'inherit'] });
        let tail = '';
        let last = { done: 0, skipped: 0, failed: 0 };
        ch.stdout.on('data', (d) => {
          tail += d;
          const rows = tail.split('\n');
          tail = rows.pop();
          for (const row of rows) {
            if (!row.trim()) continue;
            let msg; try { msg = JSON.parse(row); } catch { continue; }
            if (msg.event === 'progress') { last = msg; onProgress(msg); }
            if (msg.event === 'clip-failed') console.log(`\n  clip ${msg.id}: ${msg.message}`);
            if (msg.event === 'error') reject(new Error(msg.message));
          }
        });
        ch.on('error', reject);
        ch.on('close', (code) => (code === 0 ? resolve(last) : reject(new Error(`kokoro_render.py exited ${code}`))));
        ch.stdin.write(JSON.stringify(lines));
        ch.stdin.end();
      });
    },
  },

  piper: {
    defaultVoice: 'en_GB-alan-medium',
    format: 'wav',
    detect: () => has('piper'),
    describe: () => `Piper (${flag('voice', ENGINES.piper.defaultVoice)})`,
    async render(text, file) {
      await run('piper', ['-m', flag('voice', ENGINES.piper.defaultVoice), '-f', file], { input: text });
    },
  },

  say: {
    defaultVoice: 'Daniel',
    format: 'wav',
    detect: async () => platform() === 'darwin' && has('say'),
    describe: () => `macOS say (${flag('voice', ENGINES.say.defaultVoice)})`,
    async render(text, file) {
      // Premium/Enhanced voices are a large step up and are free to install:
      // System Settings > Accessibility > Spoken Content > Manage Voices.
      await run('say', [
        '-v', flag('voice', ENGINES.say.defaultVoice),
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
  for (const name of ['elevenlabs', 'openai', 'kokoro', 'piper', 'say']) {
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

// One command to get the local neural model working from nothing.
if (flag('setup')) {
  console.log('\nSetting up Kokoro, a local neural voice. Nothing leaves this machine after this.\n');
  console.log('  1/2  python packages');
  try {
    await run('python3', ['-m', 'pip', 'install', '--quiet', 'kokoro-onnx', 'soundfile'], { stdio: 'inherit' });
    console.log('       kokoro-onnx, soundfile installed');
  } catch (e) {
    console.error(`       pip install failed: ${e.message}`);
    console.error('       try:  python3 -m pip install --user kokoro-onnx soundfile');
    process.exit(1);
  }
  console.log('  2/2  model files (about 340 MB, once)');
  await mkdir(MODELS, { recursive: true });
  for (const f of KOKORO_FILES) {
    const dest = join(MODELS, f.name);
    if (await exists(dest)) { console.log(`       ${f.name} already here`); continue; }
    console.log(`       ${f.name}`);
    try {
      await download(f.url, dest);
    } catch (e) {
      console.error(`\n       could not download ${f.name}: ${e.message}`);
      console.error(`       fetch it by hand into models/ from:\n         ${f.url}`);
      process.exit(1);
    }
  }
  console.log('\nReady. Now run:  npm run voices\n');
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
No text-to-speech engine is set up on this machine yet.

  Recommended -- a real neural model, free, local, nothing sent anywhere:

      npm run voices -- --setup     (installs two python packages and
                                     downloads ~340 MB of model, once)
      npm run voices

  Other options:

      export OPENAI_API_KEY=...     then: npm run voices
      export ELEVENLABS_API_KEY=... then: npm run voices     (best, paid)
      npm run voices -- --engine=piper --voice=/path/to/en_GB-alan-medium.onnx
      npm run voices -- --engine=say --voice="Daniel (Premium)"   (macOS only,
                                     a formant synthesiser, the weakest option)

Without any of these the game still narrates using the browser's own speech
synthesis. It just will not sound as good.`);
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

// A clip that was already compressed to mp3 has no wav left on disk, so the
// engines' own wav check would render it again. Take those out up front.
let pending = lines;
if (!force) {
  pending = [];
  for (const l of lines) {
    if (await exists(join(OUT, `${l.id}.mp3`))) skipped++;
    else pending.push(l);
  }
}

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

if (spec.batch) {
  // The engine renders the whole script itself, in one process.
  try {
    const reused = skipped;
    const res = pending.length
      ? await spec.renderAll(pending, OUT, (m) => {
        const n = reused + m.done + m.skipped + m.failed;
        process.stdout.write(`\r  ${n}/${lines.length}  rendered ${m.done}  reused ${reused + m.skipped}  failed ${m.failed}   `);
      })
      : { done: 0, skipped: 0, failed: 0 };
    done = res.done ?? 0; skipped = reused + (res.skipped ?? 0); failed = res.failed ?? 0;
  } catch (e) {
    // A missing model or package is the normal way this fails, and the
    // message already says how to fix it. No stack trace required.
    console.error(`\n${e.message}\n`);
    console.error('Run `npm run voices -- --setup` to install and download everything.\n');
    process.exit(1);
  }
} else {
  const queue = pending.slice();
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await renderOne(queue.shift());
  }));
}
process.stdout.write(`\r  ${done + skipped + failed}/${lines.length}  rendered ${done}  reused ${skipped}  failed ${failed}   \n`);

if (failures.length) {
  console.log(`\n  ${failures.length} failed:`);
  failures.slice(0, 8).forEach((f) => console.log(`    ${f}`));
}

// WAV from a local model is about 46 MB for the whole script. If ffmpeg is
// around, squeeze it to mp3 -- a seventh of the size, no audible cost for
// speech, and much quicker to load. Entirely optional.
let format = spec.format;
if (spec.format === 'wav' && !flag('no-mp3') && (await has('ffmpeg'))) {
  console.log('\n  ffmpeg found -- compressing to mp3');
  const todo = lines.slice();
  let conv = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (todo.length) {
      const l = todo.shift();
      const wav = join(OUT, `${l.id}.wav`);
      const mp3 = join(OUT, `${l.id}.mp3`);
      if (!(await exists(wav))) { if (await exists(mp3)) conv++; continue; }
      // A wav next to an mp3 is newer -- a forced re-render, or a run that was
      // cut off between rendering and compressing -- so it always wins.
      try {
        await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav,
          '-codec:a', 'libmp3lame', '-b:a', '64k', '-ac', '1', mp3]);
        await rm(wav, { force: true });
        conv++;
      } catch { /* keep the wav; the manifest below follows what is on disk */ }
      if (conv % 20 === 0) process.stdout.write(`\r  ${conv}/${lines.length}   `);
    }
  }));
  process.stdout.write('\n');
  // Only claim mp3 if effectively everything converted.
  if (conv >= lines.length - 2) format = 'mp3';
  else console.log('  some clips stayed as wav; keeping wav in the manifest');
}

// The manifest is what the game reads; without it the clips are ignored.
const manifest = {
  version: 1,
  engine,
  voice: String(flag('voice', ENGINES[engine].defaultVoice)),
  format,
  generated: new Date().toISOString().slice(0, 10),
  clips: lines.map((l) => ({ id: l.id, group: l.group, text: l.text })),
};
await writeFile(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 1)}\n`);

let bytes = 0;
for (const l of lines) {
  try { bytes += (await stat(join(OUT, `${l.id}.${format}`))).size; } catch { /* missing */ }
}
console.log(`\n  Wrote voice/manifest.json -- ${(bytes / 1e6).toFixed(1)} MB of audio.`);
console.log('  Reload the game; it will use these instead of the browser voice.\n');
