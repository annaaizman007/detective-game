#!/usr/bin/env bash
# Packs dist/ into a zip that plays offline: unzip, double-click
# "Play on Mac.command" or "Play on Windows.bat", and the game opens in the
# browser with everything (voice, film, paintings) inside the folder.
# A browser will not run a modern web app straight from a file, so each
# launcher starts a tiny local server (Python on Mac, PowerShell on Windows).
set -euo pipefail
cd "$(dirname "$0")/.."
NAME="the-ashgrave-files"
rm -rf "build/$NAME" "build/$NAME.zip"
mkdir -p "build/$NAME"
cp -R dist/. "build/$NAME/game"

cat > "build/$NAME/Play on Mac.command" <<'SH'
#!/bin/bash
cd "$(dirname "$0")/game"
PORT=8765
echo "The Ashgrave Files — serving on http://localhost:$PORT (close this window to stop)"
( sleep 1; open "http://localhost:$PORT" ) &
python3 -m http.server $PORT --bind 127.0.0.1
SH
chmod +x "build/$NAME/Play on Mac.command"

cat > "build/$NAME/Play on Windows.bat" <<'BAT'
@echo off
cd /d "%~dp0game"
echo The Ashgrave Files - serving on http://localhost:8765 (close this window to stop)
start "" http://localhost:8765
where python >nul 2>nul && (python -m http.server 8765 --bind 127.0.0.1 & goto :eof)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$l=New-Object System.Net.HttpListener;$l.Prefixes.Add('http://localhost:8765/');$l.Start();$m=@{'.html'='text/html';'.js'='text/javascript';'.css'='text/css';'.json'='application/json';'.mp3'='audio/mpeg';'.mp4'='video/mp4';'.jpg'='image/jpeg';'.png'='image/png';'.svg'='image/svg+xml';'.webmanifest'='application/manifest+json'};while($true){$c=$l.GetContext();$p=[uri]::UnescapeDataString($c.Request.Url.AbsolutePath);if($p -eq '/'){$p='/index.html'};$f=Join-Path (Get-Location) $p.TrimStart('/');if(Test-Path $f -PathType Leaf){$b=[IO.File]::ReadAllBytes($f);$e=[IO.Path]::GetExtension($f);$c.Response.ContentType=$(if($m[$e]){$m[$e]}else{'application/octet-stream'});$c.Response.ContentLength64=$b.Length;$c.Response.OutputStream.Write($b,0,$b.Length)}else{$c.Response.StatusCode=404};$c.Response.Close()}"
BAT

cat > "build/$NAME/READ ME.txt" <<'TXT'
THE ASHGRAVE FILES — offline copy

Mac:      double-click "Play on Mac.command". If macOS says it is from an
          unidentified developer, right-click it, choose Open, then Open again.
Windows:  double-click "Play on Windows.bat".

Either one starts a tiny local server and opens the game in your browser at
http://localhost:8765 — nothing leaves your computer. Close the black window
to stop. Everything (the film, the narrator's voice, the paintings) is inside
the "game" folder; no internet needed.

Best with the sound up. Pass one device around the table.
TXT

( cd build && zip -qr "$NAME.zip" "$NAME" -x '*.DS_Store' )
ls -la "build/$NAME.zip" | awk '{print $5/1e6 " MB  " $9}'
