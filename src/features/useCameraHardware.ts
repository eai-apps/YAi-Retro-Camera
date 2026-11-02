import {useEffect,useMemo,useState} from 'react';
import {NativeModules} from 'react-native';
import {Camera,CameraDevice,getCameraDevice} from 'react-native-vision-camera';

// The native provider may finish before JS has subscribed to its first event.
// Read a snapshot as well as listening; retry only while initialization is empty.
export function useCameraHardware(position:'front'|'back'){
  const [devices,setDevices]=useState<CameraDevice[]>(()=>Camera.getAvailableCameraDevices());
  useEffect(()=>{
    let alive=true;let timer:ReturnType<typeof setTimeout>|undefined;
    const listener=Camera.addCameraDevicesChangedListener(list=>{if(alive)setDevices(current=>list.length||!current.length?list:current)});
    const refresh=async()=>{
      try{
        const list:CameraDevice[]=await NativeModules.CameraDevices.getCurrentDevices();
        if(!alive)return;
        setDevices(list);
        if(!list.length)timer=setTimeout(()=>{void refresh()},300);
      }catch{if(alive)timer=setTimeout(()=>{void refresh()},600)}
    };
    void refresh();
    return()=>{alive=false;if(timer)clearTimeout(timer);listener.remove()};
  },[]);
  return useMemo(()=>getCameraDevice(devices,position),[devices,position]);
}
