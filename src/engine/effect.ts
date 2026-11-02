import parameters from '../../effects/parameters.json';
import { CameraFilterConfig } from '../cameras/types';
export const effectKeys=parameters.map(p=>String(p[0]));
export function resolveEffect(config:CameraFilterConfig,strength=1):CameraFilterConfig {
  const s=Math.max(0,Math.min(1,strength));const result:CameraFilterConfig={...config};
  const neutral:Record<string,number>={contrast:1,saturation:1,red:1,green:1,blue:1,lut0:0,lut1:.25,lut2:.5,lut3:.75,lut4:1};
  for(const [raw,def,min,max] of parameters){const key=String(raw);const value=Number(config[key]??def);const bounded=Number.isFinite(value)?Math.max(Number(min),Math.min(Number(max),value)):Number(def);
    result[key]=['grainScale','grainSpeed','frame'].includes(key)?bounded:(neutral[key]??0)+(bounded-(neutral[key]??0))*s;}
  return result;
}
