#!/usr/bin/env bash
# Cut a seamless loop out of a recording.
#
#   tools/loop-audio.sh in.mp3 out.mp3 [start] [length] [crossfade]
#
# Takes `length + crossfade` seconds from `start`, then crossfades the first
# `crossfade` seconds over the tail, so the end of the file runs straight
# into its own beginning with no click. Loudness-normalised to -18 LUFS and
# encoded as mp3, which every browser decodes (this ffmpeg has no Vorbis).
set -euo pipefail
in=$1; out=$2; start=${3:-10}; len=${4:-60}; xf=${5:-3}
ffmpeg -hide_banner -loglevel error -y -ss "$start" -t "$((len + xf))" -i "$in" \
  -filter_complex "[0:a]asplit=2[a][b];[a]atrim=start=${xf},asetpts=PTS-STARTPTS[main];[b]atrim=end=${xf},asetpts=PTS-STARTPTS[head];[main][head]acrossfade=d=${xf}:curve1=tri:curve2=tri[loop];[loop]loudnorm=I=-18:TP=-2:LRA=9,aformat=sample_rates=44100:channel_layouts=stereo[out]" \
  -map "[out]" -c:a libmp3lame -q:a 3 "$out"
echo "wrote $out ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out")s)"
