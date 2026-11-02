#!/usr/bin/env bash
set -euo pipefail
mkdir -p smoke-output
adb install -r release-apk/YAi-Retro-Camera-0.2.0.apk
adb shell pm grant com.eai.retrocamera android.permission.CAMERA
adb shell pm grant com.eai.retrocamera android.permission.RECORD_AUDIO
adb logcat -c
adb shell am start -W -n com.eai.retrocamera/.MainActivity
sleep 15
adb shell pidof com.eai.retrocamera
adb logcat -d > smoke-output/logcat.txt
adb exec-out screencap -p > smoke-output/screen.png
adb shell uiautomator dump /sdcard/retro-window.xml
adb pull /sdcard/retro-window.xml smoke-output/window.xml
if grep -E 'FATAL EXCEPTION|JavascriptException|Unable to load script|ReanimatedError|WorkletsError' smoke-output/logcat.txt; then
  exit 1
fi
grep -q 'com.eai.retrocamera' smoke-output/window.xml
grep -Eq 'Фото|YAi|RETRO|Настройки' smoke-output/window.xml
