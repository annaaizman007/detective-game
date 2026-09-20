#!/usr/bin/env python3
"""Cut the opening film of each case from the LTX-2.3 takes in tools/anim/.

A case's takes are <case>-NN-<label>.mp4, played whole in order (they all
start from the same frame of the scene, so a short crossfade is all the
join needs), one grade over the lot, a fade in and out. A case with a
single one-<case>.mp4 (Orchid) is that clip alone. Output:
public/assets/video/intro-<case>.mp4 and intro-poster.jpg; intro.mp4 is a
copy of Orchid's for the no-case path.

  python3 tools/ltx/cut.py            # every case that has takes
  python3 tools/ltx/cut.py --case bell
"""
import argparse, glob, os, shutil, subprocess, sys

ap = argparse.ArgumentParser()
ap.add_argument('--case', default='')
args = ap.parse_args()

HERE = os.path.dirname(os.path.abspath(__file__))
ANIM = os.path.join(HERE, '..', 'anim')
OUT = os.path.join(HERE, '..', '..', 'public', 'assets', 'video')
os.makedirs(OUT, exist_ok=True)
XF = 0.25
W, H, FPS = 1280, 720, 24


def seconds(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True)
    return float(out.stdout.strip())


def takes(case):
    seq = sorted(glob.glob(os.path.join(ANIM, f'{case}-[0-9][0-9]-*.mp4')))
    if seq: return seq
    one = os.path.join(ANIM, f'one-{case}.mp4')
    return [one] if os.path.exists(one) else []


def cut(case):
    paths = takes(case)
    if not paths: sys.exit(f'{case}: no takes in tools/anim -- run tools/ltx/render.py --case {case}')
    durs = [seconds(p) for p in paths]
    n = len(paths)
    f = []
    for i in range(n):
        f.append(f'[{i}:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},setsar=1,format=yuv420p[v{i}]')
        f.append(f'[{i}:a]aformat=sample_rates=48000:channel_layouts=stereo[a{i}]')
    pv, pa, offset = '[v0]', '[a0]', 0.0
    for i in range(1, n):
        offset += durs[i - 1] - XF
        ov = f'[xv{i}]' if i < n - 1 else '[xv]'
        oa = f'[xa{i}]' if i < n - 1 else '[xa]'
        f.append(f'{pv}[v{i}]xfade=transition=fade:duration={XF}:offset={offset:.3f}{ov}')
        f.append(f'{pa}[a{i}]acrossfade=d={XF}{oa}')
        pv, pa = ov, oa
    total = sum(durs) - XF * (n - 1)
    f.append(f'{pv}eq=saturation=0.8:contrast=1.06:brightness=-0.02,noise=alls=7:allf=t+u,vignette=PI/4.4,'
             f'fade=t=in:st=0:d=0.8,fade=t=out:st={total - 0.8:.2f}:d=0.8[vout]')
    f.append(f'{pa}afade=t=in:st=0:d=0.5,afade=t=out:st={total - 0.8:.2f}:d=0.8,loudnorm=I=-18:TP=-1.5:LRA=9[aout]')
    dest = os.path.join(OUT, f'intro-{case}.mp4')
    cmd = ['ffmpeg', '-y', '-loglevel', 'error']
    for p in paths: cmd += ['-i', p]
    cmd += ['-filter_complex', ';'.join(f), '-map', '[vout]', '-map', '[aout]', '-t', f'{total:.2f}',
            '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', dest]
    subprocess.run(cmd, check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '1.0', '-i', dest, '-frames:v', '1', '-q:v', '3', os.path.join(OUT, 'intro-poster.jpg')], check=True)
    print(f'wrote intro-{case}.mp4 ({total:.1f}s, {n} takes)')


cases = [args.case] if args.case else [c for c in ['orchid', 'salt', 'bell', 'lamp'] if takes(c)]
for case in cases: cut(case)
if os.path.exists(os.path.join(OUT, 'intro-orchid.mp4')):
    shutil.copyfile(os.path.join(OUT, 'intro-orchid.mp4'), os.path.join(OUT, 'intro.mp4'))
