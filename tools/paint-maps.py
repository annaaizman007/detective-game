#!/usr/bin/env python3
"""Paint each city's map.

  npx vite-node tools/map-geometry.ts        # geometry → tools/maps/<case>.json
  python3 tools/paint-maps.py [--only salt] [--strength 0.45] [--steps 28]

The vector map the board draws (blocks, streets, water, parks, the El, the
playable roads) is rasterised with Pillow, then handed to Stable Diffusion as
an image-to-image pass at low strength, so the painting keeps every street and
shoreline where the board expects them and gains rooftops, water, trees and a
painted 1940s-atlas look. Output: public/assets/images/maps/<case>.jpg plus a
manifest the board reads. Facades, pins, labels and roads are still drawn on
top by the board.
"""
import argparse, json, os, sys, time
from PIL import Image, ImageDraw, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument('--only', default='')
ap.add_argument('--strength', type=float, default=0.42)
ap.add_argument('--steps', type=int, default=30)
ap.add_argument('--guidance', type=float, default=6.5)
ap.add_argument('--width', type=int, default=1152)
ap.add_argument('--seed', type=int, default=7)
ap.add_argument('--base-only', action='store_true', help='write the rasterised base and stop')
args = ap.parse_args()

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'public', 'assets', 'images', 'maps')
os.makedirs(OUT, exist_ok=True)

PAPER = (233, 223, 200); PAPER_DARK = (217, 205, 178); INK = (42, 33, 24)
WATER = (185, 199, 196); WATER_INK = (111, 140, 138); PARK = (201, 207, 174); PARK_INK = (138, 154, 106)
BLOCK = (211, 198, 168); STREET = (196, 181, 150); ROAD = (244, 238, 224); ROAD_CASE = (90, 74, 56)

def raster(g, W, H):
    sx = W / g['w']; sy = H / g['h']
    P = lambda p: (p[0] * sx, p[1] * sy)
    im = Image.new('RGB', (W, H), PAPER)
    d = ImageDraw.Draw(im)
    # blocks with a hairline
    for b in g['blocks']:
        x, y, w, h = b['x'] * sx, b['y'] * sy, b['w'] * sx, b['h'] * sy
        d.rectangle([x, y, x + w, y + h], fill=BLOCK, outline=(150, 135, 110))
    for a, b in g['streets']:
        d.line([P(a), P(b)], fill=STREET, width=max(2, int(4 * sx)))
    for a, b in g['avenues']:
        d.line([P(a), P(b)], fill=PAPER, width=max(6, int(26 * sx)))
        d.line([P(a), P(b)], fill=(120, 105, 85), width=1)
    def water(pts):
        d.polygon([P(p) for p in pts], fill=WATER, outline=WATER_INK)
    if g.get('sea'): water(g['sea'])
    if g.get('river'): water(g['river']['band'])
    if g.get('lake'): water(g['lake'])
    for br in g.get('bridges', []):
        import math
        dx = math.cos(br['angle']) * br['len'] / 2 * sx; dy = math.sin(br['angle']) * br['len'] / 2 * sy
        x, y = br['x'] * sx, br['y'] * sy
        d.line([(x - dx, y - dy), (x + dx, y + dy)], fill=ROAD_CASE, width=max(6, int(20 * sx)))
        d.line([(x - dx, y - dy), (x + dx, y + dy)], fill=ROAD, width=max(4, int(12 * sx)))
    if g.get('rail'):
        line = [P(p) for p in g['rail']['line']]
        if len(line) > 1:
            d.line(line, fill=INK, width=max(3, int(9 * sx)))
            d.line(line, fill=PAPER, width=max(1, int(3 * sx)))
    for pk in g['parks']:
        d.polygon([P(p) for p in pk['pts']], fill=PARK, outline=PARK_INK)
    for a, b in g['roads']:
        d.line([P(a), P(b)], fill=ROAD_CASE, width=max(5, int(14 * sx)))
    for a, b in g['roads']:
        d.line([P(a), P(b)], fill=ROAD, width=max(3, int(9 * sx)))
    # a light plate where each building will stand, so the painting leaves room
    for l in g['locations']:
        if l['hidden']: continue
        x, y = l['x'] * sx, l['y'] * sy
        d.rectangle([x - 40 * sx, y - 70 * sy, x + 40 * sx, y + 8 * sy], fill=PAPER_DARK)
    return im

cases = [f[:-5] for f in sorted(os.listdir(os.path.join(HERE, 'maps'))) if f.endswith('.json')]
only = set(filter(None, args.only.split(',')))
cases = [c for c in cases if not only or c in only]

PROMPT = ('hand-painted vintage 1940s city map, bird\'s-eye view, watercolor and ink on aged paper, tiled rooftops and chimneys on the city blocks, '
          'streets and avenues, harbour water with small boats and waves, trees in the parks, elevated railway, warm lamplight, film noir atmosphere, '
          'muted colours, highly detailed, atlas illustration')
NEGATIVE = 'text, letters, words, labels, numbers, watermark, people, faces, cars, photograph, satellite photo, blurry, low quality, frame, border, modern'

if not args.base_only:
    import torch
    from diffusers import StableDiffusionImg2ImgPipeline, DPMSolverMultistepScheduler
    device = 'mps' if torch.backends.mps.is_available() else 'cpu'
    pipe = StableDiffusionImg2ImgPipeline.from_pretrained('Lykon/dreamshaper-8', torch_dtype=torch.float16 if device == 'mps' else torch.float32, safety_checker=None).to(device)
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, algorithm_type='dpmsolver++', use_karras_sigmas=True, final_sigmas_type='sigma_min')
    pipe.set_progress_bar_config(disable=True)

manifest = {'ids': []}
for c in cases:
    g = json.load(open(os.path.join(HERE, 'maps', f'{c}.json')))
    W = args.width; H = int(round(W * g['h'] / g['w'] / 8)) * 8
    base = raster(g, W, H)
    base.save(os.path.join(OUT, f'{c}-base.jpg'), quality=88)
    if args.base_only:
        print(c, 'base written'); continue
    t0 = time.time()
    gen = torch.Generator(device='cpu').manual_seed(args.seed)
    img = pipe(PROMPT, negative_prompt=NEGATIVE, image=base, strength=args.strength, num_inference_steps=args.steps,
               guidance_scale=args.guidance, generator=gen).images[0]
    img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60))
    img.save(os.path.join(OUT, f'{c}.jpg'), quality=90, optimize=True)
    print(f'{c}  {W}x{H}  {time.time() - t0:.0f}s', flush=True)

manifest['ids'] = [f[:-4] for f in sorted(os.listdir(OUT)) if f.endswith('.jpg') and not f.endswith('-base.jpg')]
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'))
print('manifest:', manifest['ids'])
