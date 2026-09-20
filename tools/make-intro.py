#!/usr/bin/env python3
"""Cut the opening film from the painted stills in tools/intro2/ and, for any
shot that tools/anim/render.py has animated, from that moving clip instead.

  python3 tools/render-portraits.py --dir tools/intro --size 896x512 --steps 32
  python3 tools/make-intro.py

Five paintings (window, corridor, door, desk, phone) become a nineteen
second film: slow pushes on each, crossfades between, the desk lamp clicking
on, the telephone shaking on its cradle when it rings, film grain and a
vignette over everything, and a foley track (rain is the room's job) made
from noise and sine waves. Output: public/assets/video/intro.mp4 and a
poster frame.
"""
import math, os, subprocess, sys, wave, struct, argparse
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('--case', default='', help="case id: picks tools/intro2/tell-<case>.jpg and writes intro-<case>.mp4")
ap.add_argument('--squad', default='squad2')
args = ap.parse_args()

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'intro2')
OUT_DIR = os.path.join(HERE, '..', 'public', 'assets', 'video')
os.makedirs(OUT_DIR, exist_ok=True)
FPS = 30
W, H = 1280, 720

# ---- the cut: (still, seconds, zoom-in per frame)
# The squad room: the detectives at the table, a man running the corridor,
# the door bursting open, the sergeant leaning in to tell it.
TELL = f'tell-{args.case}' if args.case else 'tell'
SQUAD = 'squad' if os.path.exists(os.path.join(HERE, 'anim', 'squad.mp4')) else args.squad
SHOTS = [
    (SQUAD, 4.0, 0.0009),
    ('run', 2.6, 0.0040),
    ('burst', 1.8, 0.0030),
    (TELL, 3.6, 0.0012),
]
OUT_NAME = f'intro-{args.case}.mp4' if args.case else 'intro.mp4'
XF = 0.4  # crossfade seconds
TOTAL = sum(s[1] for s in SHOTS) - XF * (len(SHOTS) - 1)

# ---- when things happen, in film seconds
def start_of(name):
    t = 0.0
    for i, (n, d, _) in enumerate(SHOTS):
        if n == name: return t
        t += d - XF
    raise KeyError(name)

T_STEPS = start_of('run') - 0.6
T_DOOR = start_of('burst') + 0.25
T_CHAIR = start_of(TELL) + 0.2

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

# running footsteps, far to near, fast
for i in range(11):
    add(T_STEPS + i * 0.30 + np.random.uniform(0, 0.02), step(0.10 + 0.55 * i / 10), pan=(0.15 if i % 2 else -0.15) * (1 - i / 11))
# the door flung open: a bang, a rattle of the handle
add(T_DOOR, click(300, 1.2, 0.16)); add(T_DOOR + 0.05, click(900, 0.6, 0.08)); add(T_DOOR + 0.3, click(1600, 0.3, 0.05))
# a chair scrapes as somebody stands
add(T_CHAIR, bandpass(noise(seconds(0.35)), 200, 900) * env(seconds(0.35), 0.02, 0.2) * 0.35)

peak = np.max(np.abs(audio)) or 1.0
audio = np.clip(audio / peak * 0.85, -1, 1)
wav_path = os.path.join(OUT_DIR, f'intro-foley-{args.case or "x"}.wav')
with wave.open(wav_path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((audio * 32767).astype('<i2').tobytes())

# ---------------------------------------------------------------- picture
ANIM = os.path.join(HERE, 'anim')
def clip_of(name):
    """An animated shot from tools/anim/render.py, if it has been rendered."""
    p = os.path.join(ANIM, f'{name}.mp4')
    return p if os.path.exists(p) else None

def clip_seconds(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True)
    return float(out.stdout.strip() or 2.0)

def seg_filter(idx, name, dur, zrate):
    frames = int(dur * FPS)
    clip = clip_of(name)
    if clip:
        # A moving shot: stretch its two seconds over the shot's length (so
        # the motion reads as slow and deliberate), then a gentle push in.
        k = dur / clip_seconds(clip)
        f = (f"[{idx}:v]setpts={k:.4f}*PTS,fps={FPS},scale=1408:792:flags=lanczos,"
             f"crop={W}:{H}:x='(iw-ow)/2*(1+0.6*sin(t*0.5))':y='(ih-oh)/2',setsar=1,format=yuv420p")
    else:
        f = (f"[{idx}:v]scale=2560:-2,crop=2560:1440,setsar=1,"
             f"zoompan=z='min(zoom+{zrate},1.6)':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},"
             f"format=yuv420p")
    if name == 'run':
        # a hand-held shake while he runs
        f += (f",pad={W + 40}:{H + 40}:20:20,"
              f"crop={W}:{H}:x='20+6*sin(t*31)':y='20+4*sin(t*23)'")
    return f + f"[v{idx}]"

filters = [seg_filter(i, n, d, z) for i, (n, d, z) in enumerate(SHOTS)]
# chain the crossfades
prev = '[v0]'; offset = 0.0
for i in range(1, len(SHOTS)):
    offset += SHOTS[i - 1][1] - XF
    out = f'[x{i}]' if i < len(SHOTS) - 1 else '[xf]'
    filters.append(f"{prev}[v{i}]xfade=transition=fade:duration={XF}:offset={offset:.3f}{out}")
    prev = out
# one grade over every shot, so the painted frames and the darker ones read as one film
filters.append(f"[xf]eq=saturation=0.78:contrast=1.06:brightness=-0.02,noise=alls=9:allf=t+u,vignette=PI/4.2,fade=t=in:st=0:d=0.9,fade=t=out:st={TOTAL - 0.9:.2f}:d=0.9[vout]")

cmd = ['ffmpeg', '-y']
for n, _, _ in SHOTS:
    clip = clip_of(n)
    cmd += ['-i', clip] if clip else ['-loop', '1', '-i', os.path.join(SRC, f'{n}.jpg')]
cmd += ['-i', wav_path, '-filter_complex', ';'.join(filters), '-map', '[vout]', '-map', f'{len(SHOTS)}:a',
        '-t', f'{TOTAL:.2f}', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', os.path.join(OUT_DIR, OUT_NAME)]
print(' '.join(cmd)[:400], '...')
subprocess.run(cmd, check=True)
subprocess.run(['ffmpeg', '-y', '-ss', f'{start_of(SQUAD) + 1.0:.2f}', '-i', os.path.join(OUT_DIR, OUT_NAME), '-frames:v', '1', '-q:v', '3',
                os.path.join(OUT_DIR, 'intro-poster.jpg')], check=True)
os.remove(wav_path)
print(f'wrote {OUT_NAME} ({TOTAL:.1f}s) and intro-poster.jpg')
