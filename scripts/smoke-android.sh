#!/usr/bin/env bash
set -euo pipefail
mkdir -p smoke-output
adb install -r release-apk/YAi-Retro-Camera-0.2.0.apk
adb shell pm grant com.eai.retrocamera android.permission.CAMERA
adb shell pm grant com.eai.retrocamera android.permission.RECORD_AUDIO
if [ "$(adb shell getprop ro.build.version.sdk | tr -d '\r')" -le 28 ]; then
  adb shell pm grant com.eai.retrocamera android.permission.READ_EXTERNAL_STORAGE
  adb shell pm grant com.eai.retrocamera android.permission.WRITE_EXTERNAL_STORAGE
fi
trap 'adb logcat -d > smoke-output/logcat.txt || true; adb exec-out screencap -p > smoke-output/failure-screen.png || true' EXIT
adb logcat -c || true
adb shell am start -W -n com.eai.retrocamera/.MainActivity
sleep 15
adb shell pidof com.eai.retrocamera
python3 scripts/smoke-ui.py
app_pid=$(adb shell pidof com.eai.retrocamera | tr -d '\r')
adb logcat -d --pid="$app_pid" > smoke-output/app-logcat.txt
adb logcat -d > smoke-output/logcat.txt
adb exec-out screencap -p > smoke-output/screen.png
adb shell uiautomator dump /sdcard/retro-window.xml
adb pull /sdcard/retro-window.xml smoke-output/window.xml
if grep -E 'FATAL EXCEPTION|JavascriptException|Unable to load script|ReanimatedError|WorkletsError' smoke-output/app-logcat.txt; then
  exit 1
fi
grep -q 'com.eai.retrocamera' smoke-output/window.xml
grep -Eq 'Фото|YAi|RETRO|Настройки' smoke-output/window.xml
