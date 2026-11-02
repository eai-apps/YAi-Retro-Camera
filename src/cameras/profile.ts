import { CameraFilterConfig, CameraProfile } from './types';
export function profile(id:string,name:string,description:string,accent:string,filter:Partial<CameraFilterConfig>):CameraProfile {
  return {id,name,description,accent,isPaid:false,modes:['photo','video'],filterConfig:{warmth:0,contrast:1,saturation:1,grainIntensity:0.03,grainScale:1.3,grainSpeed:24,...filter}};
}
