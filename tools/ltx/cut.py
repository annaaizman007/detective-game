#!/usr/bin/env python3
"""Cut the opening film of each case from the LTX-2.3 shots in tools/anim/.

The shots are one continuous scene -- each was rendered from the last frame
of the one before -- and carry their own sound (room tone, the lines spoken
in English), so nothing is stretched or re-timed: each clip plays whole,
with a short crossfade over the join, one grade over the lot, a fade in and
out. Output: public/assets/video/intro-<case>.mp4 and
intro-poster.jpg; intro.mp4 is a copy of Orchid's for the no-case path.

  python3 tools/ltx/cut.py            # all four cases
  python3 tools/ltx/cut.py --case bell
"""
import argparse, os, shutil, subprocess, sys

ap = argparse.ArgumentParser()
ap.add_argument('--case', default='')
args = ap.parse_args()

HERE = os.path.dirname(os.path.abspath(__file__))
ANIM = os.path.join(HERE, '..', 'anim')
OUT = os.path.join(HERE, '..', '..', 'public', 'assets', 'video')
os.makedirs(OUT, exist_ok=True)
ORDER = ['a-room', 'b', 'c', 'd', 'e']  # one continuous scene; b..e are per case
XF = 0.2  # seconds of crossfade; shots continue from each other's last frame, so this only smooths the join
W, H, FPS = 1280, 720, 24


def seconds(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True)
    return float(out.stdout.strip())


def cut(case):
    # A single take, when there is one, is the whole film.
    names = [f'one-{case}'] if os.path.exists(os.path.join(ANIM, f'one-{case}.mp4')) else [n if n == 'a-room' else f'{n}-{case}' for n in ORDER]
    paths = [os.path.join(ANIM, f'{n}.mp4') for n in names]
    missing = [p for p in paths if not os.path.exists(p)]
    if missing: sys.exit(f'{case}: missing shots: {", ".join(os.path.basename(m) for m in missing)} -- run tools/ltx/render.py --case {case}')
    durs = [seconds(p) for p in paths]
    n = len(paths)
    f = []
    for i in range(n):
        f.append(f'[{i}:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},setsar=1,format=yuv420p[v{i}]')
        f.append(f'[{i}:a]aformat=sample_rates=48000:channel_layouts=stereo[a{i}]')
    pv, pa, offset = '[v0]', '[a0]', 0.0
    if n == 1: pv, pa = '[v0]', '[a0]'
    for i in range(1, n):
        offset += durs[i - 1] - XF
        ov = f'[xv{i}]' if i < n - 1 else '[xv]'
        oa = f'[xa{i}]' if i < n - 1 else '[xa]'
        f.append(f'{pv}[v{i}]xfade=transition=fade:duration={XF}:offset={offset:.3f}{ov}')
        f.append(f'{pa}[a{i}]acrossfade=d={XF}{oa}')
        pv, pa = ov, oa
    total = sum(durs) - XF * (n - 1)
    # one grade over every shot, film grain, a vignette, fades
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
    print(f'wrote intro-{case}.mp4 ({total:.1f}s: ' + ' + '.join(f'{d:.1f}' for d in durs) + ')')


for case in ([args.case] if args.case else ['orchid', 'salt', 'bell', 'lamp']): cut(case)
if not args.case or args.case == 'orchid':
    shutil.copyfile(os.path.join(OUT, 'intro-orchid.mp4'), os.path.join(OUT, 'intro.mp4'))
