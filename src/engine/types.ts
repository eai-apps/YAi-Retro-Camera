import { CameraFilterConfig } from '../cameras/types';

export interface RetroEngineConfig {
  filter: CameraFilterConfig;
  previewWidth: number;
  previewHeight: number;
}

export interface PreviewShaderUniforms {
  time: number;
  warmth: number;
  contrast: number;
  saturation: number;
  grainIntensity: number;
  grainScale: number;
  grainSpeed: number;
}
