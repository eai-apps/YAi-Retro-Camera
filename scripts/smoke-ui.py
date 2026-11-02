#!/usr/bin/env python3
"""Black-box APK smoke: launch, capture, save, gallery delete and settings."""
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

OUT = Path('smoke-output')

def adb(*args):
    return subprocess.check_output(['adb', *args], timeout=40)

def window():
    for _ in range(3):
        try:
            adb('shell', 'uiautomator', 'dump', '/sdcard/retro-window.xml')
            return ET.fromstring(adb('shell', 'cat', '/sdcard/retro-window.xml'))
        except (ET.ParseError, subprocess.SubprocessError):
            time.sleep(1)
    raise AssertionError('Cannot inspect Android UI')

def nodes(label):
    return [n for n in window().iter('node') if label in (n.get('text'), n.get('content-desc'))]

def wait_text(label, timeout=40, contains=False):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        root = window()
        if any(label in n.get('text', '') if contains else label in (n.get('text'), n.get('content-desc')) for n in root.iter('node')):
            return
        time.sleep(1)
    raise AssertionError(f'Missing UI: {label}')

def tap(label, last=False):
    for _ in range(4):
        matches = [n for n in nodes(label) if n.get('enabled') == 'true']
        for n in reversed(matches) if last else matches:
            coords = list(map(int, re.findall(r'\d+', n.get('bounds', ''))))
            if len(coords) == 4 and coords[2] > coords[0] and coords[3] > coords[1]:
                adb('shell', 'input', 'tap', str((coords[0]+coords[2])//2), str((coords[1]+coords[3])//2))
                time.sleep(1)
                return
        size = list(map(int, re.findall(r'\d+', adb('shell', 'wm', 'size').decode())[-2:]))
        adb('shell', 'input', 'swipe', str(size[0]//2), str(size[1]*4//5), str(size[0]//2), str(size[1]//3), '400')
    raise AssertionError(f'No enabled control: {label}')

def shot(name):
    (OUT / f'{name}.png').write_bytes(adb('exec-out', 'screencap', '-p'))
    ET.ElementTree(window()).write(OUT / f'{name}.xml', encoding='utf-8')

try:
    wait_text('Сделать фото', timeout=60)
    # Capture is enabled only after native camera readiness.
    for _ in range(40):
        if any(n.get('enabled') == 'true' for n in nodes('Сделать фото')):
            break
        time.sleep(1)
    else:
        raise AssertionError('Camera did not become ready')
    shot('01-photo-camera')
    tap('Сделать фото')
    wait_text('Фото · выбрано 1')
    tap('Сохранить фото')
    wait_text('Фото сохранено', timeout=90)
    shot('02-photo-saved')
    tap('Готово')
    tap('Мои работы')
    wait_text('МБ', contains=True)
    shot('03-saved-gallery')
    tap('Удалить')
    wait_text('Удалить сохранённую работу?')
    tap('Удалить', last=True)
    wait_text('Пока нет сохранённых работ.')
    tap('Готово')
    # Return the scroll to the header on short screens.
    size = list(map(int, re.findall(r'\d+', adb('shell', 'wm', 'size').decode())[-2:]))
    adb('shell', 'input', 'swipe', str(size[0]//2), str(size[1]//3), str(size[0]//2), str(size[1]*4//5), '400')
    tap('Настройки')
    wait_text('Настройки съёмки')
    shot('04-settings')
    tap('Ретро-камера')
    tap('Готово')
    shot('05-retro-interface')
    print('APK UI: camera capture, real photo save, own gallery delete, settings and theme passed.')
finally:
    (OUT / 'logcat.txt').write_bytes(adb('logcat', '-d'))
    shot('last-state')