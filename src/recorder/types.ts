import { CameraFilterConfig } from '../cameras/types';

export type RecordingState =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'finalizing'
  | 'paused'
  | 'stopped'
  | 'exporting'
  | 'error';

export interface RecordedChunk {
  thumbnailUri?:string;
  hasAudio?:boolean;
  width?:number;
  height?:number;
  id: string;
  uri: string;
  durationMs: number;
  fileSizeBytes: number;
  createdAt: number;
}

export interface SessionCatalog {
  sessionId: string;
  createdAt: number;
  cameraProfileId: string;
  chunks: RecordedChunk[];
  totalDurationMs: number;
}

export interface ExportOptions {
  chunks: RecordedChunk[];
  filterConfig: CameraFilterConfig;
  saveToGallery?: boolean;
}

export interface ExportResult {
  success: boolean;
  outputUri: string;
  durationMs: number;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
  hasAudio?: boolean;
  error?: string;
}
