#!/usr/bin/env python3
"""Render narration clips with Kokoro, a local neural TTS model.

Reads a JSON array of {"id": ..., "text": ...} on stdin and writes one WAV per
clip into --out. The model is loaded once for the whole batch, which is the
entire reason this is a batch script and not a per-clip call: loading is by far
the slowest part.

Kokoro runs on the CPU, needs no API key and never leaves the machine. It is
an actual neural model, not a formant synthesiser, which is the difference
being chased here.

Driven by tools/render-voices.mjs; usable on its own:

    echo '[{"id":"test","text":"Two in the morning, and it is still raining."}]' \
      | python3 tools/kokoro_render.py --out voice --voice bm_george
"""

import argparse
import json
import os
import sys

MODEL_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx"
VOICES_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"


def fail(msg, code=2):
    print(json.dumps({"event": "error", "message": msg}), flush=True)
    sys.exit(code)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="models/kokoro-v1.0.onnx")
    ap.add_argument("--voices", default="models/voices-v1.0.bin")
    ap.add_argument("--voice", default="bm_george")
    ap.add_argument("--speed", type=float, default=0.95)
    ap.add_argument("--lang", default=None, help="defaults from the voice prefix")
    ap.add_argument("--out", default="voice")
    ap.add_argument("--list-voices", action="store_true")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    try:
        from kokoro_onnx import Kokoro
        import soundfile as sf
    except ImportError as e:
        fail(
            f"missing python package ({e.name}). Install them with:\n"
            "    pip3 install kokoro-onnx soundfile"
        )

    for path, url, what in ((args.model, MODEL_URL, "model"), (args.voices, VOICES_URL, "voice pack")):
        if not os.path.exists(path):
            fail(
                f"Kokoro {what} not found at {path}. Download it once:\n"
                f"    mkdir -p {os.path.dirname(path) or '.'}\n"
                f"    curl -L -o {path} {url}"
            )

    try:
        kokoro = Kokoro(args.model, args.voices)
    except Exception as e:  # noqa: BLE001 - surface whatever onnxruntime says
        fail(f"could not load Kokoro: {e}")

    if args.list_voices:
        print(json.dumps({"event": "voices", "voices": sorted(kokoro.get_voices())}), flush=True)
        return

    available = set(kokoro.get_voices())
    if args.voice not in available:
        fail(f"unknown voice '{args.voice}'. Available: {', '.join(sorted(available))}")

    # Kokoro's British voices are prefixed bm_/bf_; giving them en-us
    # phonemisation is what makes them sound like an American doing an accent.
    lang = args.lang or ("en-gb" if args.voice.startswith(("bm_", "bf_")) else "en-us")

    lines = json.load(sys.stdin)
    os.makedirs(args.out, exist_ok=True)
    done = skipped = failed = 0

    for item in lines:
        path = os.path.join(args.out, f"{item['id']}.wav")
        if not args.force and os.path.exists(path) and os.path.getsize(path) > 256:
            skipped += 1
        else:
            try:
                samples, rate = kokoro.create(item["text"], voice=args.voice, speed=args.speed, lang=lang)
                # 16-bit rather than the float default: half the size, and no
                # audible difference for speech played through a web page.
                sf.write(path, samples, rate, subtype="PCM_16")
                done += 1
            except Exception as e:  # noqa: BLE001
                failed += 1
                print(json.dumps({"event": "clip-failed", "id": item["id"], "message": str(e)[:200]}), flush=True)
        n = done + skipped + failed
        if n % 5 == 0 or n == len(lines):
            print(json.dumps({"event": "progress", "done": done, "skipped": skipped, "failed": failed,
                              "total": len(lines)}), flush=True)

    print(json.dumps({"event": "done", "done": done, "skipped": skipped, "failed": failed}), flush=True)


if __name__ == "__main__":
    main()
