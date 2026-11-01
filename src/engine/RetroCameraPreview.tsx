import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, useCameraDevice, useCameraFormat, useSkiaFrameProcessor } from 'react-native-vision-camera';
import { Skia } from '@shopify/react-native-skia';
import { CameraProfile } from '../cameras/types';
import { WARM_FILM_SKSL_SHADER } from './RetroSkiaShader';

interface Props {
  cameraProfile: CameraProfile;
  cameraRef: React.RefObject<Camera>;
  isActive: boolean;
  onReady: (ready: boolean) => void;
  onError: (error: Error) => void;
}
export function RetroCameraPreview({ cameraProfile, cameraRef, isActive, onReady, onError }: Props) {
  const device = useCameraDevice('back');
  const format = useCameraFormat(device, [{videoResolution: {width: 1280, height: 720}}, {fps: 30}]);
  const [permission, setPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState('');
  const [initialized, setInitialized] = useState(false);
  const paintAndBuilder = useMemo(() => {
    const effect = Skia.RuntimeEffect.Make(WARM_FILM_SKSL_SHADER);
    if (!effect) throw new Error('Не удалось создать эффект камеры');
    const builder = Skia.RuntimeShaderBuilder(effect);
    const f = cameraProfile.filterConfig;
    for (const [name, value] of Object.entries({Warmth:f.warmth, Contrast:f.contrast, Saturation:f.saturation,
      GrainIntensity:f.grainIntensity, GrainScale:f.grainScale, GrainSpeed:f.grainSpeed})) builder.setUniform('u' + name, [value]);
    return {builder, paint: Skia.Paint()};
  }, [cameraProfile]);
  const {builder, paint} = paintAndBuilder;
  const processor = useSkiaFrameProcessor(frame => {
    'worklet';
    builder.setUniform('uTime', [(frame.timestamp / 1e9) % 4096]);
    // Runtime image filters use the input frame as their child shader.
    paint.setImageFilter(Skia.ImageFilter.MakeRuntimeShader(builder, 'image', null));
    frame.render(paint);
  }, [builder, paint]);

  useEffect(() => {
    let alive = true;
    const request = async () => {
      try {
        let camera = Camera.getCameraPermissionStatus();
        let microphone = Camera.getMicrophonePermissionStatus();
        if (camera === 'not-determined') camera = await Camera.requestCameraPermission();
        if (microphone === 'not-determined') microphone = await Camera.requestMicrophonePermission();
        if (alive) setPermission(camera === 'granted' && microphone === 'granted');
      } catch (e) { if (alive) {setPermission(false); setPermissionError(String(e));} }
    };
    void request();
    const subscription = AppState.addEventListener('change', state => {if (state === 'active') void request();});
    return () => { alive = false; subscription.remove(); };
  }, []);
  useEffect(() => { onReady(permission === true && initialized && isActive); }, [permission, initialized, isActive, onReady]);
  if (permission === null) return <View style={styles.center}><ActivityIndicator /><Text style={styles.text}>Проверка камеры и микрофона…</Text></View>;
  if (!permission) return <View style={styles.center}>
    <Text style={styles.text}>Для записи со звуком разрешите камеру и микрофон в настройках приложения.{permissionError}</Text>
    <TouchableOpacity onPress={() => void Linking.openSettings()}><Text style={styles.action}>Открыть настройки</Text></TouchableOpacity>
  </View>;
  if (!device || !format) return <View style={styles.center}><Text style={styles.text}>Подходящая задняя камера не найдена.</Text></View>;
  return <Camera ref={cameraRef} style={StyleSheet.absoluteFill} device={device} format={format}
    fps={Math.max(format.minFps, Math.min(30, format.maxFps))} videoHdr={false} photoHdr={false}
    isActive={isActive} video audio frameProcessor={processor} pixelFormat="yuv" outputOrientation="preview"
    onInitialized={() => setInitialized(true)} onError={error => {setInitialized(false); onError(error);}} />;
}
const styles = StyleSheet.create({center:{flex:1,alignItems:'center',justifyContent:'center',padding:24,backgroundColor:'#111'},
  text:{color:'#eee',textAlign:'center',margin:12},action:{color:'#ffb300',padding:12}});
