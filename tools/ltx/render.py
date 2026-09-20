#!/usr/bin/env python3
"""Render the opening film as one continuous scene with LTX-2.3.

Five shots of eight seconds, all in the squad room. The first starts from
the painted still of the room; every shot after it starts from the LAST
FRAME of the shot before, so the room, the light, the detectives and the
messenger carry over and nothing jumps. Each shot's description says what
happens and what is said; LTX-2.3 generates picture and sound together, so
a line in quotes is spoken, in English, in sync.

  a-room        shared   the detectives waiting
  b-<case>      per case the door opens, the case's messenger comes in
  c-<case>      per case the briefing, first two sentences
  d-<case>      per case the briefing, next two sentences
  e-<case>      per case they stand and go

Runs claude-code-video-toolkit's `tools/ltx2.py` against the endpoint in
the toolkit's .env (the PC's `tools/ltx/server.py`). Clips land in
tools/anim/; tools/ltx/cut.py joins them.

  python3 tools/ltx/render.py --case orchid          # the chain for one case
  python3 tools/ltx/render.py                        # every case
  python3 tools/ltx/render.py --case salt --from c   # redo c, d, e for Salt (c starts from b's last frame)
"""
import argparse, os, subprocess, sys, time

ap = argparse.ArgumentParser()
ap.add_argument('--toolkit', default=os.path.expanduser('~/Desktop/claude-code-video-toolkit'))
ap.add_argument('--case', default='', help='one case id; default all four')
ap.add_argument('--from', dest='start', default='b', help='first shot letter to (re)render; earlier shots are reused (the shared a-room is kept unless --from a)')
ap.add_argument('--width', type=int, default=1280)
ap.add_argument('--height', type=int, default=704)
ap.add_argument('--frames', type=int, default=193, help='(n-1) %% 8 == 0; 193 = 8 s at 24 fps')
ap.add_argument('--quality', default='standard')
ap.add_argument('--reseed', type=int, default=0, help='add to every seed (a fresh roll)')
ap.add_argument('--one', action='store_true', help='one continuous take per case (one-<case>.mp4) instead of the five-shot chain')
args = ap.parse_args()

HERE = os.path.dirname(os.path.abspath(__file__))
STILLS = os.path.join(HERE, '..', 'intro2')
OUT = os.path.join(HERE, '..', 'anim')
os.makedirs(OUT, exist_ok=True)

ROOM = ('A police squad room at night in the 1940s: a long wooden table with papers, a green desk lamp, cigarette smoke, '
        'rain on a tall dark window, a closed wooden door at the back. Five detectives in hats and coats sit around the table. '
        'Film noir lighting, muted colour.')
RULES = ('The dialogue is spoken clearly in English. Nobody else speaks. Single continuous take, no cuts, the same room and the '
         'same people throughout, static camera, the action finishes within the shot.')

# Who comes through the door in each case, and what they say. Two sentences
# per shot, short enough to be said in eight seconds.
CASES = {
  'orchid': {
    'who': 'a middle-aged police sergeant with a grey moustache, in a wet tweed jacket and felt hat',
    'he': 'he',
    'c': 'We have a dead woman at the Gilded Hotel, up on the Heights. Her name is Lillian Voss, twenty-six.',
    'd': 'Somebody hit her on the head. The door was on the chain from the inside. You have two days.',
  },
  'salt': {
    'who': 'a stern woman police sergeant of forty-five, dark hair in a bun, in a wet dark uniform jacket',
    'he': 'she',
    'c': "A fisherman found a body under Pier Nine this morning. It is Aurel Bask, head of the dockers' union.",
    'd': 'Stabbed once, then his pockets were sewn shut and filled with salt. You have until Thursday.',
  },
  'bell': {
    'who': 'a young police constable of twenty, short dark hair wet from the rain, in a dark tunic',
    'he': 'he',
    'c': 'The verger found a nun dead at the foot of the tower stairs. Sister Constance Ayre, forty-four.',
    'd': 'Last night the bell rang nine times, not twelve. Somebody hit her from behind. You have two days.',
  },
  'lamp': {
    'who': 'a stout woman police sergeant of fifty, grey hair pinned back, in a wet dark uniform jacket',
    'he': 'she',
    'c': 'It has happened again. A woman under a gas lamp on Gasworks Lane, strangled with a cord.',
    'd': 'This is the third one. The newspaper calls him the Lamplighter. You have two days.',
  },
}


def shots(case):
    k = CASES[case]; who, he = k['who'], k['he']
    He = he.capitalize()
    return [
      ('a-room', 'squad3.jpg',
       f'{ROOM} They are waiting. The older man with the grey moustache looks at his watch and says: "Nothing since midnight." '
       f'The woman across from him turns a page. The others sit still. {RULES}'),
      (f'b-{case}', None,
       f'{ROOM} The door at the back opens and {who} hurries in, out of breath, rain on the shoulders, and stops at the end of the table. '
       f'The detectives look up. {He} takes a breath and says: "Sir. There has been a murder." {RULES}'),
      (f'c-{case}', None,
       f'{ROOM} {who.capitalize()} stands at the end of the table, leaning on it with both hands, and tells the detectives: '
       f'"{k["c"]}" The detectives listen. {RULES}'),
      (f'd-{case}', None,
       f'{ROOM} {who.capitalize()} stands at the end of the table and goes on, urgently: "{k["d"]}" '
       f'The older man with the grey moustache nods. {RULES}'),
      (f'e-{case}', None,
       f'{ROOM} The five detectives stand up, pick up their hats and coats from the chairs and turn toward the door. '
       f'The older man with the grey moustache says: "Get your coats." {He} steps aside to let them pass. {RULES}'),
    ]


NEG = ('pc game, console game, video game, cartoon, childish, ugly, text, subtitles, captions, watermark, bright daylight, '
       'foreign language, gibberish, mumbling, scene change, jump cut, cut to another room, new location, camera pan away, '
       'extra people appearing, people vanishing, cut, edit, montage, multiple shots, shot change, camera move')

tool = os.path.join(args.toolkit, 'tools', 'ltx2.py')
if not os.path.exists(tool): sys.exit(f'toolkit not found at {args.toolkit} (clone claude-code-video-toolkit there or pass --toolkit)')


def last_frame(clip):
    png = clip[:-4] + '-last.png'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-sseof', '-0.05', '-i', clip, '-frames:v', '1', '-update', '1', png], check=True)
    return png


def render(name, start_image, text):
    dest = os.path.abspath(os.path.join(OUT, f'{name}.mp4'))
    seed = sum(ord(c) for c in name) * 7919 + args.reseed
    t = time.time()
    cmd = ['uv', 'run', 'tools/ltx2.py', '--prompt', text, '--negative-prompt', NEG,
           '--width', str(args.width), '--height', str(args.height), '--num-frames', str(args.frames), '--fps', '24',
           '--quality', args.quality, '--seed', str(seed), '--output', dest, '--input', start_image]
    r = subprocess.run(cmd, cwd=args.toolkit)
    if r.returncode or not os.path.exists(dest): sys.exit(f'{name}: ltx2.py failed (exit {r.returncode})')
    print(f'  {name:12s} {args.frames}f  {time.time() - t:.0f}s', flush=True)
    return dest


def one_take(case):
    """The whole beat in a single take: the door, the messenger, the line."""
    k = CASES[case]; who = k['who']
    first = k['c'].split('. ')[0] + '.'
    return (f'{ROOM} One unbroken shot from a fixed camera. The detectives sit at the table. The door at the back opens and {who} '
            f'hurries in, out of breath, rain on the shoulders, stops at the end of the table and says: '
            f'"Sir. There has been a murder. {first}" The detectives look at {k["he"] == "she" and "her" or "him"}. '
            f'The dialogue is spoken clearly in English. Nobody else speaks. The camera never moves and never cuts; '
            f'the same people, the same table and the same room from the first frame to the last.')


if args.one:
    for case in ([args.case] if args.case else list(CASES)):
        render(f'one-{case}', os.path.abspath(os.path.join(STILLS, 'room-real.png')), one_take(case))
    print('done -- now: python3 tools/ltx/cut.py'); sys.exit()

for case in ([args.case] if args.case else list(CASES)):
    print(f'== {case}', flush=True)
    prev = None
    for name, still, text in shots(case):
        dest = os.path.abspath(os.path.join(OUT, f'{name}.mp4'))
        if (name[0] < args.start or name == 'a-room' and args.start != 'a') and os.path.exists(dest):
            print(f'  {name:12s} kept', flush=True); prev = dest; continue
        start = os.path.abspath(os.path.join(STILLS, still)) if still else last_frame(prev)
        prev = render(name, start, text)
print('done -- now: python3 tools/ltx/cut.py')
