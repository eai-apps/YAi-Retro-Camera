#!/usr/bin/env bash
set -euo pipefail
folder="modules/retro-export/android/src/androidTest/assets"
mkdir -p "$folder"
for n in 1 2 3; do
  ffmpeg -hide_banner -loglevel error -y -f lavfi -i "color=c=gray:s=160x284:r=30:d=0.5" -f lavfi -i "sine=frequency=$((330+n*110)):sample_rate=48000:duration=0.5" -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 128k -shortest "$folder/clip-$n.mp4"
done
