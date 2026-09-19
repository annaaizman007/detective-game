#!/usr/bin/env python3
"""Paint the cast -- or the city -- with a local diffusion model.

Reads public/assets/images/people/prompts.json (from tools/portrait-prompts.mjs)
and writes one PNG per character next to it, plus people.json listing what
exists so the game knows which faces are painted. Skips anything already
rendered unless --force. Runs on Apple silicon through MPS.

    python3 tools/render-portraits.py            # everything missing
    python3 tools/render-portraits.py --only vera,hale --force
"""
import argparse, json, os, sys, time

ap = argparse.ArgumentParser()
ap.add_argument('--model', default='Lykon/dreamshaper-8')
ap.add_argument('--steps', type=int, default=28)
ap.add_argument('--size', default='512x640')
ap.add_argument('--only', default='')
ap.add_argument('--force', action='store_true')
ap.add_argument('--guidance', type=float, default=7.0)
ap.add_argument('--dir', default='public/assets/images/people', help='folder with prompts.json; manifest.json lists what exists')
args = ap.parse_args()

OUT = args.dir
prompts = json.load(open(os.path.join(OUT, 'prompts.json')))
only = set(filter(None, args.only.split(',')))
todo = [p for p in prompts if (not only or p['id'] in only) and (args.force or not os.path.exists(os.path.join(OUT, p['id'] + '.png')))]
print(f'{len(todo)} to render', flush=True)

def write_manifest():
    have = sorted(p['id'] for p in prompts if os.path.exists(os.path.join(OUT, p['id'] + '.png')))
    name = 'people.json' if OUT.endswith('people') else 'manifest.json'
    json.dump({'people': have, 'ids': have}, open(os.path.join(OUT, name), 'w'))

if not todo:
    write_manifest(); sys.exit(0)

import torch
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler

device = 'mps' if torch.backends.mps.is_available() else 'cpu'
pipe = StableDiffusionPipeline.from_pretrained(args.model, torch_dtype=torch.float16 if device == 'mps' else torch.float32, safety_checker=None)
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, algorithm_type='dpmsolver++', use_karras_sigmas=True, final_sigmas_type='sigma_min')
pipe = pipe.to(device)
pipe.set_progress_bar_config(disable=True)
w, h = (int(x) for x in args.size.split('x'))

for i, p in enumerate(todo):
    t = time.time()
    g = torch.Generator(device='cpu').manual_seed(p['seed'])
    img = pipe(p['prompt'], negative_prompt=p['negative'], num_inference_steps=args.steps, guidance_scale=args.guidance, width=w, height=h, generator=g).images[0]
    img.save(os.path.join(OUT, p['id'] + '.png'))
    write_manifest()
    print(f'{i + 1}/{len(todo)}  {p["id"]:<10} {time.time() - t:5.1f}s', flush=True)
print('done')
