#!/usr/bin/env python3
"""Reject APKs advertising a native ABI without the complete camera runtime."""
import sys
import zipfile

expected = {'arm64-v8a', 'armeabi-v7a', 'x86_64'}
required = {'libVisionCamera.so', 'librnskia.so', 'libexpo-modules-core.so',
            'libreactnative.so', 'libhermes.so', 'libreanimated.so',
            'libworklets.so', 'librnworklets.so'}
with zipfile.ZipFile(sys.argv[1]) as apk:
    libraries = {}
    for name in apk.namelist():
        parts = name.split('/')
        if len(parts) == 3 and parts[0] == 'lib' and parts[2].endswith('.so'):
            libraries.setdefault(parts[1], set()).add(parts[2])
    assert set(libraries) == expected, f'Unexpected APK architectures: {sorted(libraries)}'
    for abi, names in libraries.items():
        assert required <= names, f'Incomplete {abi}: missing {sorted(required - names)}'
print('APK contains complete ARM64, ARMv7 and x86_64 camera runtimes.')
