#!/usr/bin/env python3
"""Reject APKs advertising a native ABI without the complete camera runtime."""
import sys
import struct
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
    # Inspect the merged binary manifest, not the prebuild configuration.
    data=apk.read('AndroidManifest.xml')
    def u16(pos): return struct.unpack_from('<H',data,pos)[0]
    def u32(pos): return struct.unpack_from('<I',data,pos)[0]
    strings=[]
    permissions=set()
    minimum=None
    pos=u16(2)
    while pos<len(data):
        kind,header,size=u16(pos),u16(pos+2),u32(pos+4)
        assert size>=8 and pos+size<=len(data), 'Invalid manifest chunk'
        if kind==1:
            utf8=bool(u32(pos+16)&256)
            pool=pos+u32(pos+20)
            def read_string(offset):
                cursor=pool+offset
                def length():
                    nonlocal cursor
                    if utf8:
                        n=data[cursor];cursor+=1
                        if n&128: n=((n&127)<<8)|data[cursor];cursor+=1
                    else:
                        n=u16(cursor);cursor+=2
                        if n&32768: n=((n&32767)<<16)|u16(cursor);cursor+=2
                    return n
                if utf8: length()
                count=length()
                return data[cursor:cursor+count*(1 if utf8 else 2)].decode('utf-8' if utf8 else 'utf-16le')
            strings=[read_string(u32(pos+header+i*4)) for i in range(u32(pos+8))]
        elif kind==258:
            element=strings[u32(pos+20)]
            attrs={}
            for i in range(u16(pos+28)):
                attribute=pos+16+u16(pos+24)+i*u16(pos+26)
                value=u32(attribute+16)
                attrs[strings[u32(attribute+4)]]=strings[value] if data[attribute+15]==3 else value
            if element=='uses-sdk': minimum=attrs.get('minSdkVersion')
            if element in ('uses-permission','uses-permission-sdk-23'): permissions.add(attrs.get('name',''))
        pos+=size
    assert minimum==29, f'Expected minimum Android 10 (29), got {minimum}'
    forbidden={p for p in permissions if p in ('android.permission.READ_EXTERNAL_STORAGE','android.permission.WRITE_EXTERNAL_STORAGE') or p.startswith('android.permission.READ_MEDIA_')}
    assert not forbidden, f'Unexpected broad storage permissions: {sorted(forbidden)}'
print('APK contains complete ARM64, ARMv7 and x86_64 camera runtimes.')
print('Merged APK manifest requires Android 10+ without broad storage permissions.')
