#!/usr/bin/env python3
"""LTX-2.3 on the PC, behind the video toolkit's endpoint contract.

claude-code-video-toolkit's `tools/ltx2.py` POSTs one JSON body to whatever
URL is in MODAL_LTX2_ENDPOINT_URL and expects the clip back as base64. This
is that endpoint, run on the RTX 5080 machine instead of Modal: it takes the
same request, drives the LTX-2.3 image-to-video graph in the local ComfyUI
(graph-i2v.json, exported from ComfyUI's own template), and answers with
the same fields the Modal app would.

On the PC (ComfyUI already running on 127.0.0.1:8188):

    python tools\\ltx\\server.py            # listens on 0.0.0.0:8000

On the Mac, in the toolkit's .env:

    MODAL_LTX2_ENDPOINT_URL=http://100.119.40.107:8000/generate

Standard library only, so it runs on any Python 3.10+ the PC has.

Request (all optional but prompt):
  prompt, negative_prompt, image_base64 (or none for text-to-video),
  width, height (multiples of 32; 1280x720 default like the template),
  num_frames ((n-1) % 8 == 0), fps, seed, quality ("fast" skips the
  second-stage refinement).
Response:
  {success, seed, width, height, num_frames, fps, duration,
   inference_time_ms, video_base64}
"""
import base64, json, os, sys, time, uuid, urllib.request, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

COMFY = os.environ.get('COMFY_URL', 'http://127.0.0.1:8188')
PORT = int(os.environ.get('LTX_PORT', '8000'))
HERE = os.path.dirname(os.path.abspath(__file__))
GRAPH = json.load(open(os.path.join(HERE, 'graph-i2v.json')))

# Node ids inside the exported graph. The template keeps its knobs in
# primitive nodes, which is what makes patching it safe.
N_IMAGE, N_PROMPT, N_NEG = '269', '320:319', '320:313'
N_WIDTH, N_HEIGHT, N_FPS, N_LENGTH = '320:312', '320:299', '320:300', '320:323'
N_SEED1, N_SEED2, N_T2V = '320:277', '320:276', '320:302'
N_SAVE = '75'


def comfy(path, data=None, headers=None):
    req = urllib.request.Request(f'{COMFY}{path}', data=data, headers=headers or {})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def upload_image(raw, name):
    boundary = uuid.uuid4().hex
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{name}"\r\n'
            f'Content-Type: image/png\r\n\r\n').encode() + raw + \
           f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n--{boundary}--\r\n'.encode()
    out = comfy('/upload/image', body, {'Content-Type': f'multipart/form-data; boundary={boundary}'})
    return json.loads(out)['name']


def build(req):
    g = json.loads(json.dumps(GRAPH))  # deep copy
    width = int(req.get('width', 1280)); height = int(req.get('height', 720))
    fps = int(req.get('fps', 24)); frames = int(req.get('num_frames', 121))
    if (frames - 1) % 8: frames = ((frames - 1) // 8) * 8 + 1
    seed = int(req.get('seed') or int.from_bytes(os.urandom(4), 'big'))
    g[N_PROMPT]['inputs']['value'] = req['prompt']
    if req.get('negative_prompt'): g[N_NEG]['inputs']['text'] = req['negative_prompt']
    g[N_WIDTH]['inputs']['value'] = width - width % 32
    g[N_HEIGHT]['inputs']['value'] = height - height % 32
    g[N_FPS]['inputs']['value'] = fps
    # The template derives length from duration x fps; pin the frame count instead.
    g[N_LENGTH]['inputs']['expression'] = f'a * 0 + b * 0 + {frames}'
    g[N_SEED1]['inputs']['noise_seed'] = seed
    g[N_SEED2]['inputs']['noise_seed'] = seed + 1
    g[N_SAVE]['inputs']['filename_prefix'] = 'ltx/clip'
    if req.get('image_base64'):
        g[N_IMAGE]['inputs']['image'] = upload_image(base64.b64decode(req['image_base64']), f'ltx-{uuid.uuid4().hex[:8]}.png')
        g[N_T2V]['inputs']['value'] = False
    else:
        # The template's image loader must still validate; feed it a black frame
        # and let the "text to video" switch bypass the image conditioning.
        import zlib, struct
        def png(w, h):
            raw = b''.join(b'\x00' + b'\x00' * (w * 3) for _ in range(h))
            def chunk(t, b): return struct.pack('>I', len(b)) + t + b + struct.pack('>I', zlib.crc32(t + b) & 0xffffffff)
            return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
        g[N_IMAGE]['inputs']['image'] = upload_image(png(64, 64), 'ltx-blank.png')
        g[N_T2V]['inputs']['value'] = True
    return g, dict(seed=seed, width=width - width % 32, height=height - height % 32, num_frames=frames, fps=fps)


def run(graph):
    pid = json.loads(comfy('/prompt', json.dumps({'prompt': graph, 'client_id': 'ltx-server'}).encode(), {'Content-Type': 'application/json'}))
    if 'prompt_id' not in pid:
        raise RuntimeError(f'ComfyUI rejected the graph: {json.dumps(pid)[:1500]}')
    pid = pid['prompt_id']
    while True:
        h = json.loads(comfy(f'/history/{pid}'))
        if pid in h:
            entry = h[pid]
            if entry.get('status', {}).get('status_str') == 'error':
                msgs = [m for m in entry['status'].get('messages', []) if m[0] == 'execution_error']
                raise RuntimeError(f'ComfyUI error: {json.dumps(msgs)[:1500]}')
            for node in entry['outputs'].values():
                for key in ('images', 'gifs', 'videos'):
                    for f in node.get(key, []):
                        if str(f.get('filename', '')).endswith('.mp4'):
                            q = urllib.parse.urlencode({'filename': f['filename'], 'subfolder': f.get('subfolder', ''), 'type': f.get('type', 'output')})
                            return comfy(f'/view?{q}')
            raise RuntimeError('finished without an mp4 in the outputs')
        time.sleep(3)


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body))); self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        try:
            stats = json.loads(comfy('/system_stats'))
            self._json(200, {'ok': True, 'comfyui': COMFY, 'device': stats['devices'][0]['name']})
        except Exception as e:
            self._json(503, {'ok': False, 'error': f'ComfyUI not reachable at {COMFY}: {e}'})

    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0))
        try:
            req = json.loads(self.rfile.read(n))
            req = req.get('input', req)  # accept RunPod-style wrapping too
            if not req.get('prompt'): return self._json(400, {'error': 'prompt is required'})
            t = time.time()
            graph, meta = build(req)
            print(f"[{time.strftime('%H:%M:%S')}] {meta['width']}x{meta['height']} {meta['num_frames']}f seed {meta['seed']}: {req['prompt'][:70]}...", flush=True)
            video = run(graph)
            ms = int((time.time() - t) * 1000)
            print(f'   done in {ms / 1000:.0f}s, {len(video) / 2 ** 20:.1f} MB', flush=True)
            self._json(200, {'success': True, **meta, 'duration': (meta['num_frames'] - 1) / meta['fps'],
                             'inference_time_ms': ms, 'video_base64': base64.b64encode(video).decode()})
        except Exception as e:
            print(f'   failed: {e}', flush=True)
            self._json(500, {'error': str(e)})

    def log_message(self, *a): pass


if __name__ == '__main__':
    try:
        stats = json.loads(comfy('/system_stats'))
        print(f"ComfyUI at {COMFY}: {stats['devices'][0]['name']}")
    except Exception as e:
        sys.exit(f'ComfyUI is not answering at {COMFY} ({e}). Start it first.')
    print(f'LTX-2.3 endpoint listening on 0.0.0.0:{PORT}  (POST /generate)')
    ThreadingHTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
