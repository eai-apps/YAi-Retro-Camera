#!/usr/bin/env bash
set -euo pipefail
mkdir -p smoke-output
adb install -r release-apk/YAi-Retro-Camera-0.2.0.apk
helper=$(find ui-dump-helper -name '*.apk' -print -quit)
test -n "$helper"
adb install -r "$helper"
adb shell pm grant com.eai.retrocamera android.permission.CAMERA
# Microphone permission is granted through the real system dialog in smoke-ui.py.
trap 'timeout 15s adb logcat -d > smoke-output/logcat.txt || true; timeout 15s adb exec-out screencap -p > smoke-output/failure-screen.png || true' EXIT
timeout 15s adb logcat -c || true
timeout 30s adb shell am start -W -n com.eai.retrocamera/.MainActivity
sleep 15
timeout 15s adb shell pidof com.eai.retrocamera
python3 -u scripts/smoke-ui.py
app_pid=$(timeout 15s adb shell pidof com.eai.retrocamera | tr -d '\r')
timeout 15s adb logcat -d --pid="$app_pid" > smoke-output/app-logcat.txt
timeout 15s adb logcat -d > smoke-output/logcat.txt
timeout 15s adb exec-out screencap -p > smoke-output/screen.png
cp smoke-output/last-state.xml smoke-output/window.xml
if grep -E 'FATAL EXCEPTION|JavascriptException|Unable to load script|ReanimatedError|WorkletsError' smoke-output/app-logcat.txt; then
  exit 1
fi
grep -q 'com.eai.retrocamera' smoke-output/window.xml
# The header may be scrolled off-screen after video export on small displays.
grep -Eq 'Сделать фото|Начать запись' smoke-output/window.xml
