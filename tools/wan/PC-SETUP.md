# Rendering the opening film on the Windows PC (RTX 5080)

Instructions for a Claude Code session running on `anna-pc`. The goal: get
ComfyUI + Wan 2.2 5B running on this machine, render the seven animated
shots of the opening film from the painted stills in `tools/intro2/`, and
push the clips to the repo. Work through the steps in order; each has a
check. Do not skip the checks — a wrong model path fails silently at the
end, not at the start.

Repo: https://github.com/annaaizman007/detective-game (branch `master`).
If it is not on this machine yet:

```powershell
cd $HOME\Desktop
git clone https://github.com/annaaizman007/detective-game.git
cd detective-game
```

Python 3.10+ is needed for the driver script only (`python --version`;
`winget install Python.Python.3.12` if missing). ComfyUI brings its own.

## 1. ComfyUI portable

```powershell
cd C:\
Invoke-WebRequest -Uri https://github.com/comfyanonymous/ComfyUI/releases/latest/download/ComfyUI_windows_portable_nvidia.7z -OutFile ComfyUI_windows_portable_nvidia.7z
```

If `7z` is not on the PATH: `winget install 7zip.7zip`, then

```powershell
& "C:\Program Files\7-Zip\7z.exe" x C:\ComfyUI_windows_portable_nvidia.7z -oC:\
```

Result: `C:\ComfyUI_windows_portable\` with `run_nvidia_gpu.bat` and a
`ComfyUI\` folder inside. The 5080 (Blackwell) needs a CUDA 12.8+ torch;
the current portable build ships one. Check:

```powershell
C:\ComfyUI_windows_portable\python_embeded\python.exe -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

Expect `True` and `NVIDIA GeForce RTX 5080`. If `is_available()` is False,
update the driver (https://www.nvidia.com/drivers) and re-check.

## 2. The Wan 2.2 5B models (~16 GB)

```powershell
$m = "C:\ComfyUI_windows_portable\ComfyUI\models"
$hf = "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files"
Invoke-WebRequest -Uri "$hf/diffusion_models/wan2.2_ti2v_5B_fp16.safetensors" -OutFile "$m\diffusion_models\wan2.2_ti2v_5B_fp16.safetensors"
Invoke-WebRequest -Uri "$hf/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors" -OutFile "$m\text_encoders\umt5_xxl_fp8_e4m3fn_scaled.safetensors"
Invoke-WebRequest -Uri "$hf/vae/wan2.2_vae.safetensors" -OutFile "$m\vae\wan2.2_vae.safetensors"
```

(`Invoke-WebRequest` is slow on big files; `curl.exe -L -o <file> <url>`
is faster and is on every Windows 10/11.)

Check the sizes — a partial download is the usual failure:

```powershell
Get-ChildItem "$m\diffusion_models\wan2.2_ti2v_5B_fp16.safetensors", "$m\text_encoders\umt5_xxl_fp8_e4m3fn_scaled.safetensors", "$m\vae\wan2.2_vae.safetensors" | Select-Object Name, @{n='GB';e={[math]::Round($_.Length/1GB,2)}}
```

Expect roughly 10.0, 6.7 and 1.4 GB. The file names must be exactly these;
the driver script asks for them by name.

## 3. Start ComfyUI, listening on the network

Edit `C:\ComfyUI_windows_portable\run_nvidia_gpu.bat` so the python line
has `--listen 0.0.0.0` after `main.py`:

```
.\python_embeded\python.exe -s ComfyUI\main.py --listen 0.0.0.0 --windows-standalone-build
```

Open the firewall port (PowerShell **as Administrator**):

```powershell
netsh advfirewall firewall add rule name="ComfyUI" dir=in action=allow protocol=TCP localport=8188
```

Start it in its own window and leave that window open:

```powershell
Start-Process -FilePath "C:\ComfyUI_windows_portable\run_nvidia_gpu.bat" -WorkingDirectory "C:\ComfyUI_windows_portable"
```

Check (wait for the window to say `To see the GUI go to`):

```powershell
Invoke-RestMethod http://localhost:8188/system_stats | ConvertTo-Json -Depth 3
```

Expect the 5080 under `devices` with ~15 GB `vram_free`. Also confirm the
tailnet address the Mac has for this PC:

```powershell
tailscale ip -4
```

Expect `100.119.40.107`. If it differs, note the number for the Mac side
(`tools/wan/README.md`).

## 4. Render the seven shots

From the repo folder, against the local ComfyUI:

```powershell
cd $HOME\Desktop\detective-game
python tools\wan\render.py --host 127.0.0.1
```

It uploads each still from `tools\intro2\`, queues the Wan 2.2 5B
image-to-video graph, waits, and saves `tools\anim\<shot>.mp4`. Seven
shots: `squad`, `run`, `burst`, `tell-orchid`, `tell-salt`, `tell-bell`,
`tell-lamp`. Expect two to four minutes each at 1280×704.

If ComfyUI reports an error on the first shot, it is almost always a node
or input name that has changed since the graph in `render.py` was written.
Open http://localhost:8188, load Templates → Video → "Wan2.2 5B video
generation", and compare its nodes with `graph()` in `render.py`
(`class_type` and the input keys). Fix the script, not the template.

Look at each clip (`tools\anim\*.mp4`) before moving on. What matters: the
person or scene from the still is still recognisable, the motion is what
the prompt asked for (running, a door flung open, a sergeant talking), no
extra people appear, nothing turns into text. A shot that misfires gets a
new seed: change the number in `seed = sum(ord(c) for c in name) * 7919`
for that shot or bump the prompt in `SHOTS`, then

```powershell
python tools\wan\render.py --host 127.0.0.1 --only tell-salt --force
```

## 5. Push the clips

```powershell
git add tools\anim\*.mp4 tools\wan\render.py
git commit -m "Wan 2.2 shots for the opening film, rendered on the 5080"
git push origin master
```

Push **only** those paths. Other sessions edit case files and voice packs
in this repo; do not `git add -A`.

The Mac cuts the four films from these clips (`tools/make-intro.py` needs
ffmpeg and numpy, which are set up there), rebuilds and ships. If ffmpeg is
on this PC (`winget install Gyan.FFmpeg`, then `pip install numpy`), the cut
can be done here too:

```powershell
foreach ($c in "orchid","salt","bell","lamp") { python tools\make-intro.py --case $c }
git add public\assets\video\*.mp4 public\assets\video\intro-poster.jpg
git commit -m "Opening films cut from the Wan shots"
git push origin master
```

## If it wants more

The 14B I2V model is a step up in motion and faces. It needs the GGUF
builds (Q5 or Q6 of both `wan2.2_i2v_high_noise_14B` and `low_noise`) plus
the ComfyUI-GGUF custom node to fit in 16 GB, and is two to three times
slower. Get the 5B pipeline through end to end first.
