#!/usr/bin/env python3
"""Render the opening film's shots with LTX-2.3 through the video toolkit.

Runs claude-code-video-toolkit's `tools/ltx2.py` (image-to-video) once per
shot, starting from the painted stills in tools/intro2/, against the
endpoint in the toolkit's .env — which is the PC's `tools/ltx/server.py`.
Clips land in tools/anim/, where make-intro.py prefers a clip to a still.

  python3 tools/ltx/render.py                       # every shot
  python3 tools/ltx/render.py --case salt           # squad, run, burst, tell-salt
  python3 tools/ltx/render.py --only run --force --width 1024 --height 576
"""
import argparse, os, subprocess, sys, time

ap = argparse.ArgumentParser()
ap.add_argument('--toolkit', default=os.path.expanduser('~/Desktop/claude-code-video-toolkit'))
ap.add_argument('--only', default='')
ap.add_argument('--case', default='')
ap.add_argument('--force', action='store_true')
ap.add_argument('--width', type=int, default=768)
ap.add_argument('--height', type=int, default=512)
ap.add_argument('--quality', default='standard')
args = ap.parse_args()

HERE = os.path.dirname(os.path.abspath(__file__))
STILLS = os.path.join(HERE, '..', 'intro2')
OUT = os.path.join(HERE, '..', 'anim')
os.makedirs(OUT, exist_ok=True)

STYLE = 'Painted 1940s film noir, oil on canvas, muted earthy palette, deep shadows, soft film grain.'
# shot -> (still, frames, what moves). (n-1) % 8 == 0: 73 = 3 s, 121 = 5 s at 24 fps.
SHOTS = {
  'squad': ('squad3.jpg', 121, 'The detectives sit at the table under the lamp. Cigarette smoke drifts slowly upward. One of them turns a page; another looks up toward the door. Rain streaks the window behind. The camera pushes in very slowly and holds.'),
  'run':   ('run.jpg', 73, 'The man in the wet raincoat sprints down the corridor toward the camera, coat flying, one hand holding his hat on, shoes splashing on the wet tiles, the bare bulb swinging as he passes. Hand-held tracking shot.'),
  'burst': ('burst.jpg', 73, 'The door is flung open and the sergeant bursts through into the smoky room, breathless, hat in hand, light from the corridor spilling across the floor behind him. Static camera.'),
  'tell-orchid': ('tell-orchid.jpg', 121, 'The sergeant leans on the table and talks urgently, out of breath, his moustache moving as he speaks, eyes on the viewer, one hand gesturing, green lamp light on his face, rain on the window behind. Static medium close-up.'),
  'tell-salt':   ('tell-salt.jpg', 121, 'The woman sergeant leans on the table and talks urgently, out of breath, eyes on the viewer, one hand gesturing as she speaks, lamp light on her face, rain on the window behind. Static medium close-up.'),
  'tell-bell':   ('tell-bell.jpg', 121, 'The young constable leans on the table and talks urgently, out of breath, wet hair, eyes on the viewer, one hand gesturing as he speaks, lamp light on his face, rain on the window behind. Static medium close-up.'),
  'tell-lamp':   ('tell-lamp.jpg', 121, 'The woman sergeant stands leaning on the table and talks urgently, out of breath, eyes on the viewer, one hand gesturing as she speaks, lamp light on her face, rain on the window behind. Static medium close-up.'),
}
NEG = 'pc game, console game, video game, cartoon, childish, ugly, text, watermark, bright daylight, extra people, morphing face'

tool = os.path.join(args.toolkit, 'tools', 'ltx2.py')
if not os.path.exists(tool): sys.exit(f'toolkit not found at {args.toolkit} (clone claude-code-video-toolkit there or pass --toolkit)')

want = list(SHOTS)
if args.case: want = ['squad', 'run', 'burst', f'tell-{args.case}']
if args.only: want = args.only.split(',')
want = [w for w in want if args.force or not os.path.exists(os.path.join(OUT, f'{w}.mp4'))]
if not want: print('nothing to do'); sys.exit()

for i, name in enumerate(want):
    still, frames, motion = SHOTS[name]
    seed = sum(ord(c) for c in name) * 7919
    dest = os.path.abspath(os.path.join(OUT, f'{name}.mp4'))
    t = time.time()
    cmd = ['uv', 'run', 'tools/ltx2.py', '--input', os.path.abspath(os.path.join(STILLS, still)),
           '--prompt', f'{motion} {STYLE}', '--negative-prompt', NEG,
           '--width', str(args.width), '--height', str(args.height), '--num-frames', str(frames), '--fps', '24',
           '--quality', args.quality, '--seed', str(seed), '--output', dest]
    r = subprocess.run(cmd, cwd=args.toolkit)
    if r.returncode or not os.path.exists(dest): sys.exit(f'{name}: ltx2.py failed (exit {r.returncode})')
    print(f'{i + 1}/{len(want)}  {name:12s} {frames}f  {time.time() - t:.0f}s', flush=True)
print('done -- now: for c in orchid salt bell lamp; do python3 tools/make-intro.py --case $c; done')
