#!/usr/bin/env python3
"""Render the opening film of a case with LTX-2.3: one fixed world, a
different arrival per case, the whole briefing.

Everything that must not change is written once, below, and repeated word
for word in every prompt: the office, the light, the four detectives, the
camera. Every take starts from the same photoreal frame of that scene, so
the people and the light cannot drift between takes; only the action and
the words differ. Each take is ten seconds; a line in quotes is spoken in
English, in sync. The briefing is the case's own call, split into takes.

  python3 tools/ltx/render.py --case bell           # the whole film for Bell
  python3 tools/ltx/render.py --case salt --from 4  # redo take 4 onward

Takes are named <case>-NN-<label>.mp4 in tools/anim/; tools/ltx/cut.py
joins them in order.
"""
import argparse, os, re, subprocess, sys, time

ap = argparse.ArgumentParser()
ap.add_argument('--toolkit', default=os.path.expanduser('~/Desktop/claude-code-video-toolkit'))
ap.add_argument('--case', required=True, choices=['salt', 'bell', 'lamp'])
ap.add_argument('--from', dest='start', type=int, default=1, help='first take number to (re)render; earlier takes are kept')
ap.add_argument('--width', type=int, default=1024)
ap.add_argument('--height', type=int, default=576)
ap.add_argument('--frames', type=int, default=241, help='(n-1) %% 8 == 0; 241 = 10 s at 24 fps')
ap.add_argument('--reseed', type=int, default=0)
ap.add_argument('--upto', type=int, default=0, help='stop after this take number (a test of the start of a film)')
ap.add_argument('--only', type=int, default=0, help='re-render just this take number (the scene frame comes from the existing arrival take)')
args = ap.parse_args()

HERE = os.path.dirname(os.path.abspath(__file__))
STILLS = os.path.join(HERE, '..', 'intro2')
OUT = os.path.join(HERE, '..', 'anim')
os.makedirs(OUT, exist_ok=True)

# ----------------------------------------------------------- the bible
# Word for word in every prompt. Do not vary it between takes.
OFFICE = ('A detectives\' squad room in an English police station, 1947, at night. Dark wood-panelled walls, a long plain '
          'wooden table covered in papers and files, wooden chairs, a tall window on the left with rain running down it, '
          'a closed wooden door in the back wall, a coat stand by the door, a black telephone on the table.')
LIGHT = ('Lighting: one green-shaded lamp hangs low over the table and lights the papers and the faces from above in warm '
         'yellow; cold blue-grey rain light comes in from the window on the left; everything else is in shadow; cigarette '
         'smoke drifts through the lamplight. Muted colour, film noir, 35mm film grain.')
CAST = ('The four detectives at the table, always the same: Chief Inspector Hale, a heavy man of sixty with a grey moustache, '
        'a dark hat and a dark overcoat, at the right end; Dr. Imogen Vale, a woman of forty with dark hair pinned up, in a '
        'grey wool coat, seated centre-left reading; Detective Mara Quist, a young woman in a dark green police tunic and '
        'a green hat, seated centre-right; Silas Crane, a lean man in a grey coat and a dark hat, at the left end.')
CAMERA = ('The camera is fixed at eye level at the near end of the table, looking down its length toward the door; it never '
          'moves and never cuts. One unbroken shot. The same people, the same table, the same room and the same light from '
          'the first frame to the last. The dialogue is spoken clearly in English; nobody else speaks.')
BIBLE = f'{OFFICE} {LIGHT} {CAST} {CAMERA}'
NEG = ('cartoon, anime, painting, pc game, video game, text, subtitles, captions, watermark, bright daylight, foreign language, '
       'gibberish, mumbling, scene change, jump cut, cut to another room, camera move, camera pan, montage, multiple shots, '
       'extra people appearing, people vanishing, faces changing, lighting change')

# ------------------------------------------------------- the arrivals
# Per case: who brings the news, how they arrive, and how the briefing takes
# are framed. Each case's call lines come from the game.
CASES = {
  'bell': {
    'who': 'Constable Ned Pardoe, a young policeman of twenty in a long wet black raincoat and a dark hat, out of breath',
    'arrive': [
      ('run', 'corridor-real.png',
       'A dark police station corridor at night, wet floor tiles, one bare bulb. Constable Ned Pardoe, a young policeman of twenty in a long '
       'wet black raincoat and a dark hat, sprints down the corridor toward the camera, out of breath, and shouts: "Inspector!" '
       'One unbroken shot from a fixed camera; the dialogue is spoken clearly in English.'),
      ('in', 'room-real.png',
       '{bible} The door in the back wall bursts open and {who} runs in, comes the length of the table straight toward the camera and '
       'stops close in front of it, his face and shoulders filling the frame, the table and the detectives behind him, and says: "{first}"'),
    ],
    'brief': 'Medium close-up, fixed camera: {who} stands close in front of the camera, face and shoulders filling the frame, the lamplit table and the detectives out of focus behind him, and says, still catching his breath: "{line}" {light} The camera never moves and never cuts; the same face, the same room and the same light from the first frame to the last. The dialogue is spoken clearly in English; nobody else speaks.',
    'out': 'Medium close-up, fixed camera: {who} stands close in front of the camera, face and shoulders filling the frame, the lamplit table and the detectives out of focus behind him. He looks over his shoulder as chairs scrape behind him and a man\'s voice says: "Get your coats." {light} The camera never moves and never cuts. The dialogue is spoken clearly in English.',
    'lines': [
      'Inspector. Everyone. I came up the hill at a run. The verger at St. Ordell\'s found a nun dead at the bottom of the tower stairs an hour ago.',
      'Sister Constance Ayre. Forty-four. She rang the cathedral bell at midnight every night for twenty years. Twelve strokes, never one more.',
      'Last night the bell rang nine times, not twelve, and badly. Whoever rang it did not know how. By six this morning she was dead on the stairs with the back of her head broken and her keys still in her hand.',
      'She did not fall. Somebody hit her from behind. The bell rope was cut on the ringing floor, and the person who did it did not come down the stairs. There are old iron rungs on the outside of the tower.',
      'Her sister Beatrix has been a patient at Marrow House asylum for nine years, and the gate there was logged open at twenty to midnight. The Canon says the diocese would like discretion.',
      'Note what the Canon wants, and then ignore it. You have two days. Start at the tower, and talk to the verger. He washed the stairs before we got there.',
    ],
  },
  'salt': {
    'first_words': 0,
    'who': 'Sergeant Ruth Dunmore, a woman\'s voice on the telephone, tinny and urgent',
    'arrive': [
      ('ring', 'room-real.png',
       '{bible} The black telephone on the table rings. Chief Inspector Hale, at the right end nearest the camera, reaches over, lifts the receiver to his ear, '
       'turns toward the camera so his face and the receiver fill the frame, says: "Hale." and listens. Nobody else speaks.'),
    ],
    'brief': 'Medium close-up, fixed camera: Chief Inspector Hale, a heavy man of sixty with a grey moustache in a dark hat and overcoat, holds the telephone receiver to his ear and listens, his face filling the frame, the lamplit table out of focus behind him. A woman\'s voice on the telephone, tinny and urgent, says: "{line}" {light} The camera never moves and never cuts; the same face, the same room and the same light from the first frame to the last. The dialogue is spoken clearly in English; nobody else in the room speaks.',
    'out': 'Medium close-up, fixed camera: Chief Inspector Hale, a heavy man of sixty with a grey moustache in a dark hat and overcoat, the telephone receiver at his ear, says into it: "We are on our way." He lowers the receiver, looks past the camera at the others and says: "Get your coats." {light} The camera never moves and never cuts. The dialogue is spoken clearly in English.',
    'lines': [
      'Inspector. Everyone. Forgive me, I ran. A fisherman found a body under Pier Nine at low water this morning, about ten to five.',
      'It is Aurel Bask. Head of the longshoremen\'s union for twenty years. Every docker in this harbour knew him, and most of them were afraid of him.',
      'He was stabbed once, under the ribs, from below. Then somebody sewed his coat pockets shut, filled them with rock salt, and put him in the water. His watch stopped at twenty to midnight.',
      'The salt is a message. In this harbour it means: this is what happens to a man who talks. Bask was going to make a speech on Thursday about the trawler berths and the smuggling everybody pretends not to see.',
      'The union votes for a new boss on Thursday. Customs has been sitting on a ship\'s manifest for six weeks. A trawler called the Marie-Louise went out last night with no cargo and came back heavy.',
      'Nobody down there talks to police. Do not go to Pier Nine alone and do not go in uniform. You have until the vote. Start with the body at the morgue, or with the people who saw him last.',
    ],
  },
  'lamp': {
    'first_words': 0,
    'who': 'Sergeant Ada Kilbride, a stout woman of fifty with grey hair pinned back, in a soaked dark police raincoat, her cap in her hand',
    'arrive': [
      ('in', 'room-real.png',
       '{bible} The door in the back wall opens and {who} comes in slowly, water dripping from her coat, walks the length of the table toward the camera, '
       'takes off her cap and sits down on the chair nearest the camera, her face and shoulders filling the frame, the table and the detectives behind her, and looks at them, catching her breath. Nobody speaks; the telephone does not ring.'),
    ],
    'brief': 'Medium close-up, fixed camera: {who} sits close in front of the camera, face and shoulders filling the frame, her cap in her hands, the lamplit table and the detectives out of focus behind her, and says, tired and steady: "{line}" {light} The camera never moves and never cuts; the same face, the same room and the same light from the first frame to the last. The dialogue is spoken clearly in English; nobody else speaks.',
    'out': 'Medium close-up, fixed camera: {who} sits close in front of the camera, face and shoulders filling the frame, the lamplit table and the detectives out of focus behind her. She puts her cap back on as chairs scrape behind her and a man\'s voice says: "Get your coats." {light} The camera never moves and never cuts. The dialogue is spoken clearly in English.',
    'lines': [
      'Inspector. All of you. It has happened again. A woman under a gas lamp on Gasworks Lane, found at ten to six this morning by a man on his way to the gasworks. I ran here from the lane.',
      'Her name is Miriam Weiss. Thirty-one. A night nurse at the Ward Infirmary. She lodged at Crowe\'s boarding house on Wick Street. She was strangled with a cord.',
      'This is the third one. Ada Brill in November, under Lamp 17. Nora Pask on the twentieth, under Lamp 29. Now Lamp 41. Every time, the lamp above her had been turned off before she got there, and the lamp\'s number is written on the pavement in blue chalk.',
      'The newspaper has been calling him the Lamplighter for a month, and half the ward thinks it is Cyrus Vane, who actually lights the lamps. He was drunk in a pub last night. That may or may not be the same thing as innocent.',
      'We have eight names. A doctor, a landlady, a dancer\'s husband, a printer, a constable, a nun, the music hall man and Vane. I do not think it is any of them, and I cannot tell you why. Something about these three women connects them, and nobody has found it.',
      'Start under the lamp. Then find out what the three of them had in common. If the answer is not on your list, the list is wrong, and you will have to find the man the ward forgot. You have two days.',
    ],
  },
}
MAX_WORDS = 22  # what fits, spoken, in a ten-second take


FIRST_WORDS = 4  # the arrival take has an entrance to perform; the walk to camera takes the time
ABBR = ('St.', 'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Insp.', 'Sgt.', 'Fr.', 'No.')


def sentences(text):
    """Split on sentence ends, but never after an abbreviation like St."""
    out, cur = [], ''
    for tok in text.split():
        cur = (cur + ' ' + tok).strip()
        if tok[-1] in '.!?' and tok not in ABBR and not (tok.endswith('.') and len(tok) <= 3 and tok[0].isupper()):
            out.append(cur); cur = ''
    if cur: out.append(cur)
    return out


def clauses(sentence):
    """A sentence too long for one take is broken at its commas."""
    if len(sentence.split()) <= MAX_WORDS: return [sentence]
    parts, cur = [], ''
    for tok in sentence.split():
        cur = (cur + ' ' + tok).strip()
        if tok.endswith((',', ';', ':')) and len(cur.split()) >= 6: parts.append(cur); cur = ''
    if cur: parts.append(cur)
    return parts


def chunks(lines, first_words=FIRST_WORDS):
    """Sentences of the call, packed into takes: a short first one (if the arrival speaks), then at most MAX_WORDS each."""
    sents = [c for line in lines for s in sentences(line) for c in clauses(s)]
    out, cur = [], ''
    for s in sents:
        limit = first_words if (not out and first_words) else MAX_WORDS
        if cur and len((cur + ' ' + s).split()) > limit: out.append(cur); cur = s
        else: cur = (cur + ' ' + s).strip()
    if cur: out.append(cur)
    return out


def last_frame(clip, at=-0.2):
    png = clip[:-4] + '-last.png'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-sseof', str(at), '-i', clip, '-frames:v', '1', '-update', '1', png], check=True)
    return png


FRAMES_FOR = {'run': 121}  # a moving subject drifts over ten seconds; the sprint is five


def render(name, start_image, text, frames=None):
    frames = frames or args.frames
    dest = os.path.abspath(os.path.join(OUT, f'{name}.mp4'))
    seed = sum(ord(c) for c in name) * 7919 + args.reseed
    t = time.time()
    cmd = ['uv', 'run', 'tools/ltx2.py', '--prompt', text, '--negative-prompt', NEG,
           '--width', str(args.width), '--height', str(args.height), '--num-frames', str(frames), '--fps', '24',
           '--seed', str(seed), '--output', dest, '--input', start_image]
    r = subprocess.run(cmd, cwd=args.toolkit)
    if r.returncode or not os.path.exists(dest): sys.exit(f'{name}: ltx2.py failed (exit {r.returncode})')
    print(f'  {name:18s} {time.time() - t:.0f}s', flush=True)
    return dest


tool = os.path.join(args.toolkit, 'tools', 'ltx2.py')
if not os.path.exists(tool): sys.exit(f'toolkit not found at {args.toolkit}')
case = args.case; k = CASES[case]
pieces = chunks(k['lines'], k.get('first_words', FIRST_WORDS))
if k.get('first_words', FIRST_WORDS): first, rest = pieces[0], pieces[1:]
else: first, rest = '', pieces  # a silent arrival; every piece is a close take
plan = []  # (label, start still or None=scene frame, prompt)
for label, still, text in k['arrive']:
    plan.append((label, still, text.format(bible=BIBLE, who=k['who'], first=first)))
for i, line in enumerate(rest, 1):
    plan.append((f'brief{i}', None, k['brief'].format(bible=BIBLE, who=k['who'], line=line, light=LIGHT)))
plan.append(('out', None, k['out'].format(bible=BIBLE, who=k['who'], light=LIGHT)))
print(f'== {case}: {len(plan)} takes, {sum(len(p.split()) for p in pieces)} words of briefing in {len(pieces)} pieces', flush=True)

scene = None  # the one frame every briefing take starts from: the end of the arrival
for n, (label, still, text) in enumerate(plan, 1):
    if args.upto and n > args.upto: break
    name = f'{case}-{n:02d}-{label}'
    dest = os.path.abspath(os.path.join(OUT, f'{name}.mp4'))
    keep = (n < args.start or (args.only and n != args.only)) and os.path.exists(dest)
    if keep:
        print(f'  {name:18s} kept', flush=True)
        if label == k['arrive'][-1][0]: scene = last_frame(dest)
        continue
    if still: start = os.path.abspath(os.path.join(STILLS, still))
    else:
        if scene is None: sys.exit('no scene frame: the arrival take must exist first (use --from 1)')
        start = scene
    clip = render(name, start, text, FRAMES_FOR.get(label))
    if label == k['arrive'][-1][0]: scene = last_frame(clip)
print('done -- now: python3 tools/ltx/cut.py --case', case)
