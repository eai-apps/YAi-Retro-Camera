import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { Camera } from 'react-native-vision-camera';
import { SessionManager, StorageAdapter } from './SessionManager';
import { CameraProfile } from '../cameras/types';
import { SessionCatalog } from './types';
import { RetroExport } from '../../modules/retro-export';
import { VideoRecordingDriver } from './VideoRecordingDriver';

export function useRecorderSession(profile: CameraProfile, cameraRef: React.RefObject<Camera>,exportSettings:Record<string,unknown>={}) {
  const exportRef=useRef(exportSettings);exportRef.current=exportSettings;
  const [, render] = useState(0);
  const [ready, setReady] = useState(false);
  const [restored, setRestored] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [currentRecordingTimeMs, setTime] = useState(0);
  const readyRef = useRef(false);
  const mounted = useRef(true);
  const managerRef = useRef<SessionManager | null>(null);
  if (!managerRef.current) {
    const sync = () => {if (mounted.current) render(v=>v+1);};
    const storage: StorageAdapter = {
      saveSession: catalog => RetroExport.saveCatalog(JSON.stringify(catalog)),
      deleteFile:uri=>RetroExport.deleteSource(uri),
      loadSession: async () => null,
      loadCurrentSession: async () => {const json=await RetroExport.loadCatalog(); return json ? JSON.parse(json) as SessionCatalog : null;},
      verifyFile: async uri => {
        try {const info=await RetroExport.inspectVideo(uri); return {exists:true, sizeBytes:info.sizeBytes, durationMs:info.durationMs,hasAudio:info.hasAudio,thumbnailUri:info.thumbnailUri};}
        catch {return {exists:false, sizeBytes:0};}
      },
    };
    const driver = new VideoRecordingDriver(()=>cameraRef.current, ()=>readyRef.current,
      path=>RetroExport.commitRecording(path),
      video=>{void managerRef.current!.recordingFinished(video).finally(sync);},
      error=>{managerRef.current!.recordingFailed(error); sync();});
    managerRef.current = new SessionManager(profile, {storage, cameraDriver:driver,
      nativeExporter:{exportChunks:options=>RetroExport.exportSession({...options,settings:exportRef.current})}, onStateChange:sync});
  }
  const manager=managerRef.current;
  const sync=useCallback(()=>{if (mounted.current) render(v=>v+1);},[]);
  const initialize=useCallback(async()=>{const ok=await manager.initialize(); if(mounted.current) setRestored(ok); sync();},[manager,sync]);
  useEffect(()=>{mounted.current=true; void initialize(); return()=>{mounted.current=false; void manager.stopRecording();};},[initialize,manager]);
  useEffect(()=>{
    const sub=AppState.addEventListener('change', state=>{
      if(state!=='active') {
        readyRef.current=false; setReady(false);
        // Deactivate the camera only after finishing the file, when the OS allows it.
        void manager.stopRecording().finally(()=>{if(mounted.current) {setForeground(AppState.currentState === 'active'); sync();}});
      } else {setForeground(true);}
    });
    return()=>sub.remove();
  },[manager,sync]);
  const state=manager.getState();
  useEffect(()=>{manager.configure(profile)},[manager,profile,state]);
  useEffect(()=>{
    if(state!=='recording') {setTime(0); return;}
    const start=Date.now(); const timer=setInterval(()=>setTime(Date.now()-start),100);
    return()=>clearInterval(timer);
  },[state]);
  const onCameraReady=useCallback((value:boolean)=>{readyRef.current=value; setReady(value);},[]);
  const onCameraError=useCallback((error:Error)=>{readyRef.current=false; setReady(false); manager.recordingFailed(error); sync();},[manager,sync]);
  const invoke=useCallback(async(action:()=>Promise<boolean>)=>{const ok=await action(); sync(); return ok;},[sync]);
  return {state, chunks:manager.getChunks(), currentRecordingTimeMs, totalDurationMs:manager.getTotalDurationMs(),
    errorMessage:manager.getErrorMessage(), ready:ready&&restored, restored, foreground, initialize, onCameraReady, onCameraError,
    start:()=>invoke(()=>manager.startRecording()), pause:()=>invoke(()=>manager.pauseRecording()),
    continueRec:()=>invoke(()=>manager.continueRecording()), stop:()=>invoke(()=>manager.stopRecording()),
    reset:()=>invoke(()=>manager.resetSession()),
    importClip:(clip:import('./SessionManager').FinalizedVideo)=>invoke(()=>manager.importChunk(clip)),
    deleteChunk:(id:string)=>invoke(()=>manager.editChunks('delete',id)),
    moveChunk:(id:string,direction:number)=>invoke(()=>manager.editChunks('move',id,direction)),
    clear:()=>invoke(()=>manager.editChunks('clear')),
    exportAndStitch:async()=>{const result=await manager.exportAndStitch(); sync(); return result;}};
}
