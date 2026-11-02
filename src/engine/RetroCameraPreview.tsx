import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, useCameraFormat, useSkiaFrameProcessor } from 'react-native-vision-camera';
import {useCameraHardware} from '../features/useCameraHardware';
import { Skia } from '@shopify/react-native-skia';
import { CameraProfile } from '../cameras/types';
import { WARM_FILM_SKSL_SHADER } from './RetroSkiaShader';
import { effectKeys } from './effect';
import { Quality } from '../features/settings';

interface Props {
  cameraProfile: CameraProfile;
  cameraRef: React.RefObject<Camera>;
  isActive: boolean;
  onReady: (ready: boolean) => void;
  onError: (error: Error) => void;
  quality?:Quality;position?:'front'|'back';mode?:'photo'|'video';audio?:boolean;
  onFormat?:(width:number,height:number)=>void;
}
export function RetroCameraPreview({ cameraProfile, cameraRef, isActive, onReady, onError,quality='1080',position='back',mode='video',audio=true,onFormat }: Props) {
  const device = useCameraHardware(position);
  const width=quality==='4k'?3840:quality==='720'?1280:1920;
  const format = useCameraFormat(device?.formats.length?device:undefined, [{videoResolution: {width, height:width*9/16}}, {fps: 30},{photoResolution:'max'}]);
  const [permission, setPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState('');
  const [compatiblePreview,setCompatiblePreview]=useState(false);
  useEffect(()=>{setCompatiblePreview(false)},[mode,quality,position]);
  const configurationKey=[device?.id,mode,format?.videoWidth,format?.videoHeight,format?.photoWidth,format?.photoHeight,compatiblePreview?'native':'skia'].join(':');
  const [initializedFor,setInitializedFor]=useState('');
  const paintAndBuilder = useMemo(() => {
    const effect = Skia.RuntimeEffect.Make(WARM_FILM_SKSL_SHADER);
    if (!effect) throw new Error('Не удалось создать эффект камеры');
    const builder = Skia.RuntimeShaderBuilder(effect);
    const f = cameraProfile.filterConfig;
    for(const name of effectKeys)builder.setUniform('u'+name[0].toUpperCase()+name.slice(1),[Number(f[name])]);
    return {builder, paint: Skia.Paint()};
  }, [cameraProfile]);
  const {builder, paint} = paintAndBuilder;
  const processor = useSkiaFrameProcessor(frame => {
    'worklet';
    builder.setUniform('uTime', [(frame.timestamp / 1e9) % 4096]);
    builder.setUniform('uResolution',[frame.width,frame.height]);
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
        if (audio && mode==='video' && microphone === 'not-determined') microphone = await Camera.requestMicrophonePermission();
        if (alive) setPermission(camera === 'granted' && (!audio||mode==='photo'||microphone === 'granted'));
      } catch (e) { if (alive) {setPermission(false); setPermissionError(String(e));} }
    };
    void request();
    const subscription = AppState.addEventListener('change', state => {if (state === 'active') void request();});
    return () => { alive = false; subscription.remove(); };
  }, [audio,mode]);
  useEffect(()=>{if(format)onFormat?.(mode==='photo'?format.photoWidth:format.videoWidth,mode==='photo'?format.photoHeight:format.videoHeight);else onFormat?.(0,0)},[format,mode,onFormat]);
  useEffect(() => { onReady(permission === true && initializedFor === configurationKey && isActive && (mode==='photo'||!!format)); }, [permission, initializedFor, configurationKey, isActive, mode, format, onReady]);
  if (permission === null) return <View style={styles.center}><ActivityIndicator /><Text style={styles.text}>Проверка камеры и микрофона…</Text></View>;
  if (!permission) return <View style={styles.center}>
    <Text style={styles.text}>Для записи со звуком разрешите камеру и микрофон в настройках приложения.{permissionError}</Text>
    <TouchableOpacity onPress={() => void Linking.openSettings()}><Text style={styles.action}>Открыть настройки</Text></TouchableOpacity>
  </View>;
  if (!device) return <View style={styles.center}><Text style={styles.text}>Подходящая камера не найдена.</Text></View>;
  if(mode==='video'&&!format)return <View style={styles.center}><Text style={styles.text}>Эта камера не предоставляет поддерживаемые видеорежимы. Переключите камеру или выберите «Фото».</Text></View>;
  return <><Camera ref={cameraRef} style={StyleSheet.absoluteFill} device={device} format={format}
    fps={format?Math.max(format.minFps, Math.min(30, format.maxFps)):undefined} videoHdr={false} photoHdr={false}
    isActive={isActive} video={mode==='video'} photo={mode==='photo'} audio={mode==='video'&&audio} frameProcessor={compatiblePreview?undefined:processor} pixelFormat="yuv" outputOrientation="preview" resizeMode="contain"
    videoBitRate={quality==='4k'?40:quality==='1080'?18:8}
    onInitialized={() => setInitializedFor(configurationKey)} onStarted={()=>setInitializedFor(configurationKey)} onError={error => {
      setInitializedFor('');
      if(mode==='video'&&!compatiblePreview&&/No supported surface combination|too many use cases/i.test(error.message)){
        setCompatiblePreview(true);return;
      }
      onError(error);
    }} />
    {compatiblePreview&&<View pointerEvents="none" style={styles.compatibility}><Text style={styles.compatibilityText}>Эффект — при сохранении · совместимый режим камеры</Text></View>}
  </>;
}
const styles = StyleSheet.create({center:{flex:1,alignItems:'center',justifyContent:'center',padding:24,backgroundColor:'#111'},
  text:{color:'#eee',textAlign:'center',margin:12},action:{color:'#ffb300',padding:12},
  compatibility:{position:'absolute',top:52,left:12,right:12,backgroundColor:'#151515bf',borderRadius:7,padding:7},
  compatibilityText:{color:'#f0d0a5',fontSize:10,textAlign:'center'}});
