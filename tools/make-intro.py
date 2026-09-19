#!/usr/bin/env python3
"""Cut the opening film from the painted stills in tools/intro/.

  python3 tools/render-portraits.py --dir tools/intro --size 896x512 --steps 32
  python3 tools/make-intro.py

Five paintings (window, corridor, door, desk, phone) become a nineteen
second film: slow pushes on each, crossfades between, the desk lamp clicking
on, the telephone shaking on its cradle when it rings, film grain and a
vignette over everything, and a foley track (rain is the room's job) made
from noise and sine waves. Output: public/assets/video/intro.mp4 and a
poster frame.
"""
import math, os, subprocess, sys, wave, struct
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'intro')
OUT_DIR = os.path.join(HERE, '..', 'public', 'assets', 'video')
os.makedirs(OUT_DIR, exist_ok=True)
FPS = 30
W, H = 1280, 720

# ---- the cut: (still, seconds, zoom-in per frame)
SHOTS = [
    ('window', 3.2, 0.0010),
    ('corridor', 4.2, 0.0016),
    ('door', 1.6, 0.0022),
    ('desk', 5.2, 0.0007),
    ('phone', 4.6, 0.0009),
]
XF = 0.55  # crossfade seconds
TOTAL = sum(s[1] for s in SHOTS) - XF * (len(SHOTS) - 1)

# ---- when things happen, in film seconds
def start_of(name):
    t = 0.0
    for i, (n, d, _) in enumerate(SHOTS):
        if n == name: return t
        t += d - XF
    raise KeyError(name)

T_STEPS = start_of('corridor') + 0.25
T_DOOR = start_of('door') + 0.9
T_LAMP = start_of('desk') + 1.1
T_RINGS = [start_of('desk') + 2.2, start_of('phone') + 0.2, start_of('phone') + 2.1]
RING_ON = 1.1
T_PICKUP = start_of('phone') + 3.2

# ---------------------------------------------------------------- audio
SR = 44100
def seconds(n): return int(n * SR)
audio = np.zeros((seconds(TOTAL + 1.0), 2), dtype=np.float64)

def add(at, mono, pan=0.0, level=1.0):
    i = seconds(at)
    n = min(len(mono), len(audio) - i)
    if n <= 0: return
    l = math.cos((pan + 1) * math.pi / 4); r = math.sin((pan + 1) * math.pi / 4)
    audio[i:i + n, 0] += mono[:n] * level * l
    audio[i:i + n, 1] += mono[:n] * level * r

def env(n, attack, decay):
    t = np.arange(n) / SR
    return np.minimum(t / max(attack, 1e-4), 1.0) * np.exp(-t / decay)

def noise(n): return np.random.uniform(-1, 1, n)

def bandpass(x, lo, hi):
    spec = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(spec, len(x))

def step(level):
    n = seconds(0.22)
    t = np.arange(n) / SR
    thump = np.sin(2 * math.pi * (140 * np.exp(-t * 9) + 50) * t) * env(n, 0.003, 0.05)
    heel = bandpass(noise(n), 900, 2400) * env(n, 0.001, 0.012) * 0.5
    return (thump + heel) * level

def click(freq, level, dur=0.05):
    n = seconds(dur)
    return bandpass(noise(n), freq * 0.6, freq * 1.6) * env(n, 0.0005, 0.012) * level

def bell(dur):
    n = seconds(dur + 0.3)
    t = np.arange(n) / SR
    trem = 0.5 + 0.5 * np.sign(np.sin(2 * math.pi * 20 * t))
    tone = 0.5 * np.sin(2 * math.pi * 1040 * t) + 0.5 * np.sin(2 * math.pi * 1385 * t) + 0.15 * np.sin(2 * math.pi * 2080 * t)
    gate = np.ones(n); gate[seconds(dur):] = np.exp(-(t[seconds(dur):] - dur) / 0.08)
    return tone * trem * gate * 0.22

def hum(dur):
    n = seconds(dur)
    t = np.arange(n) / SR
    return (np.sin(2 * math.pi * 60 * t) + 0.3 * np.sin(2 * math.pi * 120 * t)) * np.minimum(t / 0.2, 1) * np.maximum(1 - t / dur, 0) * 0.03

# footsteps coming closer
for i in range(7):
    add(T_STEPS + i * 0.56 + np.random.uniform(0, 0.04), step(0.12 + 0.55 * i / 6), pan=(0.2 if i % 2 else -0.2) * (1 - i / 7))
add(T_DOOR, click(1500, 0.5, 0.08)); add(T_DOOR + 0.12, click(700, 0.35, 0.1))
add(T_LAMP, click(2600, 0.6)); add(T_LAMP + 0.045, click(1200, 0.4))
for r in T_RINGS:
    add(r, bell(RING_ON), level=1.0)
add(T_PICKUP, click(900, 0.7, 0.06)); add(T_PICKUP + 0.06, click(2200, 0.35))
add(T_PICKUP + 0.1, hum(1.6))

# ring three is cut short by the pickup
cut = seconds(T_PICKUP)
ring3_end = seconds(T_RINGS[2] + RING_ON + 0.3)
if cut < ring3_end:
    # nothing to do: the bell array was already added; fade it by re-adding the inverse tail
    n = ring3_end - cut
    fade = np.linspace(1, 0, n)
    audio[cut:ring3_end] *= fade[:, None]

peak = np.max(np.abs(audio)) or 1.0
audio = np.clip(audio / peak * 0.85, -1, 1)
wav_path = os.path.join(OUT_DIR, 'intro-foley.wav')
with wave.open(wav_path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((audio * 32767).astype('<i2').tobytes())

# ---------------------------------------------------------------- picture
def seg_filter(idx, name, dur, zrate):
    frames = int(dur * FPS)
    f = (f"[{idx}:v]scale=2560:-2,setsar=1,"
         f"zoompan=z='min(zoom+{zrate},1.35)':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},"
         f"format=yuv420p")
    if name == 'desk':
        # dark until the lamp clicks on, with two flickers
        tl = 1.1
        f += (f",eq=brightness='if(lt(t,{tl}),-0.42,if(lt(t,{tl + 0.08}),-0.08,if(lt(t,{tl + 0.16}),-0.3,0)))'"
              f":saturation='if(lt(t,{tl}),0.35,1)':eval=frame")
    if name == 'phone':
        # the handset rattles while the bell rings
        on = f"(between(t,0.2,{0.2 + RING_ON})+between(t,2.1,{2.1 + RING_ON}))"
        f += (f",pad={W + 40}:{H + 40}:20:20,"
              f"crop={W}:{H}:x='20+{on}*5*sin(t*140)':y='20+{on}*3*sin(t*95)'")
    return f + f"[v{idx}]"

filters = [seg_filter(i, n, d, z) for i, (n, d, z) in enumerate(SHOTS)]
# chain the crossfades
prev = '[v0]'; offset = 0.0
for i in range(1, len(SHOTS)):
    offset += SHOTS[i - 1][1] - XF
    out = f'[x{i}]' if i < len(SHOTS) - 1 else '[xf]'
    filters.append(f"{prev}[v{i}]xfade=transition=fade:duration={XF}:offset={offset:.3f}{out}")
    prev = out
filters.append(f"[xf]noise=alls=9:allf=t+u,vignette=PI/4.2,fade=t=in:st=0:d=0.9,fade=t=out:st={TOTAL - 0.9:.2f}:d=0.9[vout]")

cmd = ['ffmpeg', '-y']
for n, _, _ in SHOTS:
    cmd += ['-loop', '1', '-i', os.path.join(SRC, f'{n}.jpg')]
cmd += ['-i', wav_path, '-filter_complex', ';'.join(filters), '-map', '[vout]', '-map', f'{len(SHOTS)}:a',
        '-t', f'{TOTAL:.2f}', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', os.path.join(OUT_DIR, 'intro.mp4')]
print(' '.join(cmd)[:400], '...')
subprocess.run(cmd, check=True)
subprocess.run(['ffmpeg', '-y', '-ss', f'{start_of("desk") + 2.0:.2f}', '-i', os.path.join(OUT_DIR, 'intro.mp4'), '-frames:v', '1', '-q:v', '3',
                os.path.join(OUT_DIR, 'intro-poster.jpg')], check=True)
os.remove(wav_path)
print(f'wrote intro.mp4 ({TOTAL:.1f}s) and intro-poster.jpg')
