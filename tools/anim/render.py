#!/usr/bin/env python3
# Animated shots for the opening film: AnimateDiff on the same DreamShaper
# model the portraits use, so the moving frames and the still ones share a
# hand. Each shot is 16 frames at 512x288, upscaled and interpolated by
# ffmpeg into a short mp4 that make-intro.py cuts in place of the still.
#
#   python3 tools/anim/render.py            # every shot not yet rendered
#   python3 tools/anim/render.py --only run,burst --force
import argparse, json, os, subprocess, time
import torch
from diffusers import AnimateDiffPipeline, MotionAdapter, DDIMScheduler

ap = argparse.ArgumentParser()
ap.add_argument('--only', default='')
ap.add_argument('--force', action='store_true')
ap.add_argument('--steps', type=int, default=22)
args = ap.parse_args()

HERE = os.path.dirname(__file__)
STYLE = ('1940s film noir, painted illustration, oil on canvas, visible brushwork, pulp paperback cover art, '
         'chiaroscuro, deep shadows, muted earthy palette, cinematic, highly detailed')
NEG = ('text, letters, watermark, blurry, deformed, disfigured, extra limbs, bad anatomy, bad hands, cartoon, anime, '
       '3d render, glossy, modern, daytime, bright, low quality, frame, border, flicker, jitter, young, pretty, glamour, lipstick, chin resting on hand, sitting')
TELL = 'leaning on a wooden table and talking urgently toward the viewer, mouth moving, green desk lamp light on the face, rain on the dark window behind, in a smoky police squad room at night'
SHOTS = {
  'squad': ('medium shot, five 1940s detectives in hats and coats seated close around a wooden table that fills the frame, faces lit by a green desk lamp, cigarette smoke drifting slowly, one turning a page, smoky police squad room at night, rain on the window behind, calm, waiting', 1209),
  'run': ('a man in a wet raincoat and fedora running down a dark police station corridor toward the camera, one bare bulb, wet floor tiles, urgent', 9),
  'burst': ('a door flung open into a smoky police squad room at night, a breathless police sergeant in a wet overcoat and hat stepping through, backlit from the bright corridor behind, seen from inside the room', 41),
  'tell-orchid': (f'close-up of one plain-clothes police sergeant of fifty, heavy tired face, grey moustache, rumpled tweed jacket, wet felt hat pushed back, {TELL}', 170),
  'tell-salt': (f'close-up of one stern hard-faced older woman police sergeant of fifty-five, grey hair scraped into a tight bun, deep lines, jowls, no makeup, plain dark wool uniform jacket with sergeant stripes, standing and {TELL}', 323),
  'tell-bell': (f'close-up of one breathless bare-headed young British police constable of twenty, short dark hair wet from rain, plain dark wool tunic with a high collar and silver buttons, {TELL}', 530),
  'tell-lamp': (f'close-up of one stout stern woman police sergeant of fifty, grey hair pinned back, weathered face, no makeup, plain dark wool jacket with sergeant stripes, {TELL}', 717),
}
want = [s for s in SHOTS if (not args.only or s in args.only.split(',')) and (args.force or not os.path.exists(os.path.join(HERE, f'{s}.mp4')))]
if not want:
    print('nothing to do'); raise SystemExit

t = time.time()
adapter = MotionAdapter.from_pretrained('guoyww/animatediff-motion-adapter-v1-5-3', torch_dtype=torch.float16)
pipe = AnimateDiffPipeline.from_pretrained('Lykon/dreamshaper-8', motion_adapter=adapter, torch_dtype=torch.float16)
pipe.scheduler = DDIMScheduler.from_pretrained('Lykon/dreamshaper-8', subfolder='scheduler', clip_sample=False, timestep_spacing='linspace', beta_schedule='linear', steps_offset=1)
pipe.set_progress_bar_config(disable=True)
pipe.to('mps')
print(f'loaded in {time.time() - t:.0f}s', flush=True)

for i, name in enumerate(want):
    prompt, seed = SHOTS[name]
    t = time.time()
    out = pipe(prompt=f'{prompt}, {STYLE}', negative_prompt=NEG, num_frames=16, height=288, width=512,
               guidance_scale=7.0, num_inference_steps=args.steps, generator=torch.Generator('cpu').manual_seed(seed))
    frames_dir = os.path.join(HERE, f'.{name}-frames'); os.makedirs(frames_dir, exist_ok=True)
    for k, im in enumerate(out.frames[0]): im.save(os.path.join(frames_dir, f'{k:03d}.png'))
    # 8 fps of drawn frames -> 24 fps with motion interpolation, up to 1280x720
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '8', '-i', os.path.join(frames_dir, '%03d.png'),
                    '-vf', "minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:vsbmc=1,scale=1280:720:flags=lanczos,unsharp=5:5:0.4",
                    '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', os.path.join(HERE, f'{name}.mp4')], check=True)
    for f in os.listdir(frames_dir): os.remove(os.path.join(frames_dir, f))
    os.rmdir(frames_dir)
    print(f'{i + 1}/{len(want)}  {name:12s} {time.time() - t:.0f}s', flush=True)
print('done')
