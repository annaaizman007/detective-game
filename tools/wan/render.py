#!/usr/bin/env python3
"""Animate the opening film's painted stills with Wan 2.2 on the PC.

ComfyUI runs on the RTX 5080 machine (see README.md beside this file); this
script talks to it over the tailnet with ComfyUI's own HTTP API. Each shot
starts from the painting in tools/intro2/ so the film keeps the game's hand,
and Wan gives it five seconds of real motion. The clips land in tools/anim/,
where make-intro.py already prefers a clip to a still.

  python3 tools/wan/render.py --host 100.119.40.107            # every shot
  python3 tools/wan/render.py --only run,burst --force
  python3 tools/wan/render.py --case salt                       # squad, run, burst, tell-salt
"""
import argparse, json, os, sys, time, urllib.parse, urllib.request, uuid
import mimetypes

ap = argparse.ArgumentParser()
ap.add_argument('--host', default=os.environ.get('COMFY_HOST', '100.119.40.107'))
ap.add_argument('--port', type=int, default=int(os.environ.get('COMFY_PORT', '8188')))
ap.add_argument('--only', default='')
ap.add_argument('--case', default='', help='render the four shots one case needs')
ap.add_argument('--force', action='store_true')
ap.add_argument('--steps', type=int, default=20)
ap.add_argument('--width', type=int, default=1280)
ap.add_argument('--height', type=int, default=704)
args = ap.parse_args()

HERE = os.path.dirname(os.path.abspath(__file__))
STILLS = os.path.join(HERE, '..', 'intro2')
OUT = os.path.join(HERE, '..', 'anim')
os.makedirs(OUT, exist_ok=True)
BASE = f'http://{args.host}:{args.port}'

STYLE = 'Painted 1940s film noir, oil on canvas, muted earthy palette, deep shadows, soft film grain, steady cinematic camera.'
NEG = ('色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，'
       '多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，'
       '背景人很多，倒着走, text, watermark, bright daylight, cartoon, anime')

# shot -> (still, seconds, what moves)
SHOTS = {
  'squad': ('squad3.jpg', 5, 'The detectives sit at the table under the lamp, cigarette smoke drifting slowly up, one of them turns a page, another looks up toward the door, rain streaks the window behind. The camera pushes in very slowly.'),
  'run':   ('run.jpg', 3, 'The man in the wet raincoat sprints down the corridor toward the camera, coat flying, hat held on with one hand, shoes splashing on the wet tiles, the bare bulb swinging as he passes. Hand-held camera.'),
  'burst': ('burst.jpg', 3, 'The door is flung open and the sergeant bursts through into the smoky room, breathless, hat in hand, light from the corridor spilling across the floor behind him. The camera holds.'),
  'tell-orchid': ('tell-orchid.jpg', 5, 'The sergeant leans on the table and talks urgently, out of breath, moustache moving, eyes on the viewer, one hand gesturing, the lamp light on his face, rain on the window behind. The camera holds steady.'),
  'tell-salt':   ('tell-salt.jpg', 5, 'The woman sergeant leans on the table and talks urgently, out of breath, eyes on the viewer, one hand gesturing, the lamp light on her face, rain on the window behind. The camera holds steady.'),
  'tell-bell':   ('tell-bell.jpg', 5, 'The young constable leans on the table and talks urgently, out of breath, eyes on the viewer, one hand gesturing, wet hair, the lamp light on his face, rain on the window behind. The camera holds steady.'),
  'tell-lamp':   ('tell-lamp.jpg', 5, 'The woman sergeant leans on the table and talks urgently, out of breath, eyes on the viewer, one hand gesturing, the lamp light on her face, rain on the window behind. The camera holds steady.'),
}

def graph(image_name, prompt, frames, seed):
    """The Wan 2.2 5B text+image-to-video template, in API form."""
    return {
      '37': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'wan2.2_ti2v_5B_fp16.safetensors', 'weight_dtype': 'default'}},
      '38': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'umt5_xxl_fp8_e4m3fn_scaled.safetensors', 'type': 'wan', 'device': 'default'}},
      '39': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'wan2.2_vae.safetensors'}},
      '48': {'class_type': 'ModelSamplingSD3', 'inputs': {'shift': 8, 'model': ['37', 0]}},
      '6':  {'class_type': 'CLIPTextEncode', 'inputs': {'text': f'{prompt} {STYLE}', 'clip': ['38', 0]}},
      '7':  {'class_type': 'CLIPTextEncode', 'inputs': {'text': NEG, 'clip': ['38', 0]}},
      '56': {'class_type': 'LoadImage', 'inputs': {'image': image_name}},
      '55': {'class_type': 'Wan22ImageToVideoLatent', 'inputs': {'width': args.width, 'height': args.height, 'length': frames, 'batch_size': 1, 'vae': ['39', 0], 'start_image': ['56', 0]}},
      '3':  {'class_type': 'KSampler', 'inputs': {'seed': seed, 'steps': args.steps, 'cfg': 5, 'sampler_name': 'uni_pc', 'scheduler': 'simple', 'denoise': 1,
                                                  'model': ['48', 0], 'positive': ['6', 0], 'negative': ['7', 0], 'latent_image': ['55', 0]}},
      '8':  {'class_type': 'VAEDecode', 'inputs': {'samples': ['3', 0], 'vae': ['39', 0]}},
      '57': {'class_type': 'CreateVideo', 'inputs': {'fps': 24, 'images': ['8', 0]}},
      '58': {'class_type': 'SaveVideo', 'inputs': {'filename_prefix': 'ashgrave/shot', 'format': 'mp4', 'codec': 'h264', 'video': ['57', 0]}},
    }

def get(path):
    with urllib.request.urlopen(f'{BASE}{path}', timeout=60) as r: return r.read()

def post_json(path, body):
    req = urllib.request.Request(f'{BASE}{path}', data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r: return json.loads(r.read())

def upload(path):
    """POST /upload/image as multipart; ComfyUI answers with the stored name."""
    boundary = uuid.uuid4().hex
    name = os.path.basename(path)
    mime = mimetypes.guess_type(path)[0] or 'application/octet-stream'
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{name}"\r\nContent-Type: {mime}\r\n\r\n').encode()
    body += open(path, 'rb').read()
    body += f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n--{boundary}--\r\n'.encode()
    req = urllib.request.Request(f'{BASE}/upload/image', data=body, headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
    with urllib.request.urlopen(req, timeout=120) as r: return json.loads(r.read())['name']

def wait(prompt_id):
    while True:
        h = json.loads(get(f'/history/{prompt_id}'))
        if prompt_id in h:
            entry = h[prompt_id]
            if entry.get('status', {}).get('status_str') == 'error':
                sys.exit(f'ComfyUI reported an error: {json.dumps(entry["status"], indent=1)[:2000]}')
            return entry['outputs']
        time.sleep(5)

def download(outputs, dest):
    for node in outputs.values():
        for key in ('images', 'gifs', 'videos'):
            for f in node.get(key, []):
                if str(f.get('filename', '')).endswith('.mp4'):
                    q = urllib.parse.urlencode({'filename': f['filename'], 'subfolder': f.get('subfolder', ''), 'type': f.get('type', 'output')})
                    open(dest, 'wb').write(get(f'/view?{q}'))
                    return True
    return False

try:
    stats = json.loads(get('/system_stats'))
    dev = stats['devices'][0]
    print(f"ComfyUI on {args.host}: {dev['name']}, {dev['vram_free'] / 2**30:.1f} GB free", flush=True)
except Exception as e:
    sys.exit(f'No ComfyUI at {BASE} ({e}). Start it on the PC with --listen 0.0.0.0 (see tools/wan/README.md).')

want = list(SHOTS)
if args.case: want = ['squad', 'run', 'burst', f'tell-{args.case}']
if args.only: want = args.only.split(',')
want = [w for w in want if args.force or not os.path.exists(os.path.join(OUT, f'{w}.mp4'))]
if not want: print('nothing to do'); sys.exit()

for i, name in enumerate(want):
    still, seconds, motion = SHOTS[name]
    frames = seconds * 24 + 1  # Wan wants 4k+1
    t = time.time()
    img = upload(os.path.join(STILLS, still))
    seed = sum(ord(c) for c in name) * 7919
    pid = post_json('/prompt', {'prompt': graph(img, motion, frames, seed), 'client_id': 'ashgrave'})['prompt_id']
    outputs = wait(pid)
    dest = os.path.join(OUT, f'{name}.mp4')
    if not download(outputs, dest): sys.exit(f'{name}: no mp4 in outputs: {json.dumps(outputs)[:500]}')
    print(f'{i + 1}/{len(want)}  {name:12s} {seconds}s  {time.time() - t:.0f}s', flush=True)
print('done -- now: for c in orchid salt bell lamp; do python3 tools/make-intro.py --case $c; done')
