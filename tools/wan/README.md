# The opening film on the 5080

The M1 Max can paint stills (DreamShaper, ~20 s each) but not video worth
watching: AnimateDiff gives sixteen soft frames in five minutes. The Windows
PC with the RTX 5080 (`anna-pc`, `100.119.40.107` on the tailnet) can run
Wan 2.2, which turns each painted still into five seconds of real motion at
1280×704. ComfyUI runs there; `tools/wan/render.py` drives it from the Mac
over the tailnet and drops the clips into `tools/anim/`, which
`make-intro.py` cuts into the four films.

## One-time setup on the PC

1. Install ComfyUI. The Desktop app from https://www.comfy.org/download is
   the least fuss; the portable zip from the ComfyUI GitHub releases also
   works (it bundles Python and a CUDA torch).
2. Put the three Wan 2.2 5B files in place (all from
   https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/tree/main/split_files):

   | file | folder |
   |---|---|
   | `diffusion_models/wan2.2_ti2v_5B_fp16.safetensors` (~10 GB) | `ComfyUI/models/diffusion_models/` |
   | `text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors` (~6 GB) | `ComfyUI/models/text_encoders/` |
   | `vae/wan2.2_vae.safetensors` | `ComfyUI/models/vae/` |

   Quickest check: open ComfyUI, Templates → Video → "Wan2.2 5B video
   generation", press Run once. If it renders, the files are right.
3. Let the Mac reach it. ComfyUI must listen on all interfaces, not just
   localhost:
   - Desktop app: Settings → Server config → *Host* `0.0.0.0`, port `8188`,
     restart.
   - Portable: edit `run_nvidia_gpu.bat` and add `--listen 0.0.0.0` after
     `main.py`.

   Then allow port 8188 through Windows Defender Firewall for private
   networks (Tailscale counts as one), or when Windows asks the first time,
   tick both boxes. Tailscale itself needs nothing: both machines are on the
   same tailnet already.
4. From the Mac, confirm:

   ```bash
   curl -s http://100.119.40.107:8188/system_stats | head -c 300
   ```

## Rendering

```bash
python3 tools/wan/render.py                 # all seven shots
python3 tools/wan/render.py --case salt     # just what one case needs
python3 tools/wan/render.py --only tell-bell --force
```

Expect two to four minutes a shot on the 5080 at 1280×704 (the 5B model in
fp16 is ~10 GB, so it sits in VRAM whole). Then cut the films and ship:

```bash
for c in orchid salt bell lamp; do python3 tools/make-intro.py --case $c; done
npm run build && bash tools/pack-zip.sh
```

## If it wants more

- The 14B I2V model is a step up in motion and faces but needs the GGUF
  builds (Q5 or Q6 of both the high- and low-noise halves) to fit 16 GB, and
  the ComfyUI-GGUF custom node. Two to three times slower. Try it once the
  5B pipeline works end to end.
- Prompts in `render.py` say what *moves*; the still says what it looks
  like. Keep the motion sentences short and physical.
- Wan reads the negative prompt in Chinese better than in English; the one
  in the script is the official one, with a few English words on the end.

## The MCP question

ComfyUI's own `comfy-mcp` only drives a ComfyUI on the same machine, so it
would mean running Claude Code on the PC. Third-party ones
(`artokun/comfyui-mcp`) do talk to a LAN host, but for seven fixed shots the
script above is simpler and lives in the repo. If the workflow starts
changing every session, that is the moment to add one.
