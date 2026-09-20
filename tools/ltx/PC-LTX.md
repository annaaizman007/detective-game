# LTX-2.3 on the PC, for the video toolkit

For a Claude Code session on `anna-pc` (the RTX 5080). Goal: make this PC
the LTX-2.3 endpoint that `claude-code-video-toolkit` on the Mac calls
instead of Modal. ComfyUI portable is already installed at
`C:\ComfyUI_windows_portable` from `tools/wan/PC-SETUP.md`; keep it. Work
in order, run every check.

```powershell
cd $HOME\Desktop\detective-game
git pull origin master
```

## 1. Models (~40 GB, all into `C:\ComfyUI_windows_portable\ComfyUI\models\`)

These are the exact files ComfyUI's own "LTX-2.3: Image to Video" template
asks for; the names must match. `curl.exe -L -o` is faster than
`Invoke-WebRequest` on files this size.

```powershell
$m = "C:\ComfyUI_windows_portable\ComfyUI\models"
curl.exe -L -o "$m\checkpoints\ltx-2.3-22b-dev-fp8.safetensors" https://huggingface.co/Lightricks/LTX-2.3-fp8/resolve/main/ltx-2.3-22b-dev-fp8.safetensors
curl.exe -L -o "$m\loras\ltx_2.3_22b_distilled_1.1_lora_dynamic_fro09_avg_rank_111_bf16.safetensors" https://huggingface.co/Comfy-Org/ltx-2.3/resolve/main/split_files/loras/ltx_2.3_22b_distilled_1.1_lora_dynamic_fro09_avg_rank_111_bf16.safetensors
curl.exe -L -o "$m\loras\gemma-3-12b-it-abliterated_lora_rank64_bf16.safetensors" https://huggingface.co/Comfy-Org/ltx-2/resolve/main/split_files/loras/gemma-3-12b-it-abliterated_lora_rank64_bf16.safetensors
curl.exe -L -o "$m\text_encoders\gemma_3_12B_it_fp4_mixed.safetensors" https://huggingface.co/Comfy-Org/ltx-2/resolve/main/split_files/text_encoders/gemma_3_12B_it_fp4_mixed.safetensors
New-Item -ItemType Directory -Force "$m\latent_upscale_models" | Out-Null
curl.exe -L -o "$m\latent_upscale_models\ltx-2.3-spatial-upscaler-x2-1.1.safetensors" https://huggingface.co/Lightricks/LTX-2.3/resolve/main/ltx-2.3-spatial-upscaler-x2-1.1.safetensors
```

Check sizes (a short file is a failed download, and it fails silently later):

```powershell
Get-ChildItem "$m\checkpoints\ltx-2.3-22b-dev-fp8.safetensors","$m\loras\ltx_2.3_22b_distilled_1.1_lora_dynamic_fro09_avg_rank_111_bf16.safetensors","$m\loras\gemma-3-12b-it-abliterated_lora_rank64_bf16.safetensors","$m\text_encoders\gemma_3_12B_it_fp4_mixed.safetensors","$m\latent_upscale_models\ltx-2.3-spatial-upscaler-x2-1.1.safetensors" | Select-Object Name,@{n='GB';e={[math]::Round($_.Length/1GB,2)}}
```

Expect about 27.1, 2.6, 0.6, 8.8 and 0.9 GB.

## 2. ComfyUI

It must be running (the `run_nvidia_gpu.bat` window from the Wan setup,
with `--listen 0.0.0.0`). ComfyUI 0.36 has every node the template uses
built in; no custom nodes. Restart it after the downloads so it rescans the
model folders, then in the browser at http://localhost:8188 open
Templates → Video → "LTX-2.3: Image to Video" and press Run once with the
sample image. That first run loads ~37 GB of weights through 16 GB of VRAM
and 31 GB of RAM; it is slow (several minutes) and that is expected. If it
finishes with a clip, the models are right.

If it runs out of memory: Settings → search "offload" → enable sequential
offloading, or start ComfyUI with `--lowvram`, and lower the template's
Width/Height to 768×512 before trying again.

## 3. The endpoint

In a second PowerShell window, leave running:

```powershell
cd $HOME\Desktop\detective-game
python tools\ltx\server.py
```

It prints the GPU name and `listening on 0.0.0.0:8000`. Open the firewall
for it (admin PowerShell, once):

```powershell
netsh advfirewall firewall add rule name="LTX endpoint" dir=in action=allow protocol=TCP localport=8000
```

Check from this PC:

```powershell
Invoke-RestMethod http://localhost:8000/
```

Expect `ok: True` with the 5080's name. The Mac then checks
`curl http://100.119.40.107:8000/` and drives it through the toolkit.

## What the server does

`tools/ltx/server.py` implements the toolkit's Modal endpoint contract
(POST JSON, base64 video back) over the local ComfyUI. The graph it runs is
`tools/ltx/graph-i2v.json`, ComfyUI's own LTX-2.3 image-to-video template
exported to API form: a first pass at half resolution, a 2× latent
upscale, a refinement pass with the distilled LoRA, tiled decode, and
audio generated with the picture. The server only patches prompt, image,
size, frame count, fps and seed.

## Sizes that fit

The 5080 has 16 GB and the checkpoint alone is 27 GB, so ComfyUI streams
weights from RAM. Start requests at 768×512 and 97 frames (4 s); go to
1024×576 once that works. 1280×720 × 121 frames is what the template
defaults to and may not fit — if the server logs a ComfyUI memory error,
the Mac side lowers `--width/--height/--num-frames`.
