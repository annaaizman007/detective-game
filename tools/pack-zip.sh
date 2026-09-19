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
# Serves the game folder on localhost and opens it. Nothing leaves this Mac.
cd "$(dirname "$0")/game"
PORT=8765
echo "The Ashgrave Files — http://localhost:$PORT  (close this window to stop)"
( sleep 1; open "http://localhost:$PORT" ) &
if command -v python3 >/dev/null 2>&1 && python3 -c 'import http.server' >/dev/null 2>&1; then
  exec python3 -m http.server $PORT --bind 127.0.0.1
else
  exec ruby -run -e httpd . -p $PORT -b 127.0.0.1
fi
SH
chmod +x "build/$NAME/Play on Mac.command"

# The same launcher as an AppleScript document: Script Editor opens it as a
# text document, not as an app, so Gatekeeper never objects. Press Run.
cat > "build/$NAME/Play on Mac (no security warning).applescript" <<'AS'
-- The Ashgrave Files. Press the Run button (the triangle) at the top of this window.
-- It opens a Terminal window that serves the game from this folder, then opens
-- the game in your browser. Close that Terminal window when you are done.
set here to POSIX path of ((path to me as text) & "::")
set gameDir to quoted form of (here & "game")
set serve to "cd " & gameDir & " && echo 'The Ashgrave Files - http://localhost:8765  (close this window to stop)' && (python3 -c 'import http.server' 2>/dev/null && python3 -m http.server 8765 --bind 127.0.0.1 || ruby -run -e httpd . -p 8765 -b 127.0.0.1)"
tell application "Terminal"
	activate
	do script serve
end tell
delay 2
open location "http://localhost:8765/"
AS

cat > "build/$NAME/Play on Windows.bat" <<'BAT'
@echo off
cd /d "%~dp0game"
echo The Ashgrave Files - http://localhost:8765  (close this window to stop)
start "" http://localhost:8765
where python >nul 2>nul && (python -m http.server 8765 --bind 127.0.0.1 & goto :eof)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$l=New-Object System.Net.HttpListener;$l.Prefixes.Add('http://localhost:8765/');$l.Start();$m=@{'.html'='text/html';'.js'='text/javascript';'.css'='text/css';'.json'='application/json';'.mp3'='audio/mpeg';'.mp4'='video/mp4';'.jpg'='image/jpeg';'.png'='image/png';'.svg'='image/svg+xml';'.webmanifest'='application/manifest+json'};while($true){$c=$l.GetContext();$p=[uri]::UnescapeDataString($c.Request.Url.AbsolutePath);if($p -eq '/'){$p='/index.html'};$f=Join-Path (Get-Location) $p.TrimStart('/');if(Test-Path $f -PathType Leaf){$b=[IO.File]::ReadAllBytes($f);$e=[IO.Path]::GetExtension($f);$c.Response.ContentType=$(if($m[$e]){$m[$e]}else{'application/octet-stream'});$c.Response.ContentLength64=$b.Length;$c.Response.OutputStream.Write($b,0,$b.Length)}else{$c.Response.StatusCode=404};$c.Response.Close()}"
BAT

cat > "build/$NAME/READ ME.txt" <<'TXT'
THE ASHGRAVE FILES — offline copy
=================================

The easiest way to play is the web link, which needs none of this:
    https://annaaizman007.github.io/detective-game/

This folder is for playing with no internet. A browser will not run the game
straight from a double-clicked HTML file, so a launcher starts a tiny web
server inside this folder and opens http://localhost:8765. Nothing leaves your
computer.

MAC
---
Option A (no security dialog): double-click
    "Play on Mac (no security warning).applescript"
It opens in Script Editor. Press the Run button (the triangle at the top).
The game opens in your browser.

Option B: double-click "Play on Mac.command". macOS will say it "could not
verify" it, because it was downloaded. Click Done, then:
    System Settings > Privacy & Security > scroll down > "Open Anyway"
You only do that once. (Or: open Terminal, drag "Play on Mac.command" into
the Terminal window, press Return.)

WINDOWS
-------
Double-click "Play on Windows.bat". Windows asks "The publisher could not be
verified — are you sure you want to run?" Click Run. If SmartScreen shows
"Windows protected your PC", click "More info", then "Run anyway".

Close the black window when you are done playing.

Everything (the opening film, the narrator's voice, the paintings) is inside
the "game" folder. Best with the sound up. Pass one device around the table.
TXT

( cd build && zip -qr "$NAME.zip" "$NAME" -x '*.DS_Store' )
ls -la "build/$NAME.zip" | awk '{print $5/1e6 " MB  " $9}'
