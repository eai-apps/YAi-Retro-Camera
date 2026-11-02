import { requireNativeModule } from 'expo-modules-core';
import { CameraFilterConfig } from '../../src/cameras/types';
import { ExportResult } from '../../src/recorder/types';

export interface VideoInfo { uri: string; durationMs: number; sizeBytes: number; width?:number; height?:number; thumbnailUri?:string; hasAudio?:boolean }
export interface PhotoInfo {uri:string;width:number;height:number;sizeBytes:number}
export interface SavedMedia {uri:string;name:string;type:'photo'|'video';createdAt:number;sizeBytes:number}
export interface AudioInfo {hasAudio:boolean;rmsDb:number;peakDb:number;sampleRate?:number;channels?:number;secondsAnalyzed?:number}
interface NativeExporter {
  exportSession(options: Record<string, unknown>): Promise<ExportResult>;
  commitRecording(path: string): Promise<VideoInfo>;
  inspectVideo(uri: string): Promise<VideoInfo>;
  saveCatalog(json: string): Promise<void>;
  loadCatalog(): Promise<string | null>;
  openVideo(uri: string): Promise<void>;
  importMedia(uri:string,type:string):Promise<VideoInfo & PhotoInfo>;
  deleteSource(uri:string):Promise<void>;
  listMedia():Promise<SavedMedia[]>;
  deleteMedia(uri:string):Promise<void>;
  analyzeAudio(uri:string):Promise<AudioInfo>;
  renderPhoto(options:Record<string,unknown>):Promise<{success:boolean;outputUri:string;width:number;height:number}>;
  loadSettings():Promise<string|null>;
  saveSettings(json:string):Promise<void>;
}
function native(): NativeExporter {
  try { return requireNativeModule<NativeExporter>('RetroExport'); }
  catch { throw new Error('Модуль обработки видео не подключён. Установите APK из проверенной сборки.'); }
}
export const RetroExport = {
  commitRecording: (path: string) => native().commitRecording(path),
  inspectVideo: (uri: string) => native().inspectVideo(uri),
  saveCatalog: (json: string) => native().saveCatalog(json),
  loadCatalog: () => native().loadCatalog(),
  openVideo: (uri: string) => native().openVideo(uri),
  importMedia:(uri:string,type:'photo'|'video')=>native().importMedia(uri,type),
  deleteSource:(uri:string)=>native().deleteSource(uri),
  listMedia:()=>native().listMedia(),
  deleteMedia:(uri:string)=>native().deleteMedia(uri),
  analyzeAudio:(uri:string)=>native().analyzeAudio(uri),
  loadSettings:()=>native().loadSettings(),
  saveSettings:(json:string)=>native().saveSettings(json),
  renderPhoto:(options:Record<string,unknown>)=>native().renderPhoto(options),
  async exportSession(options: {inputUris: string[]; filterConfig: CameraFilterConfig; saveToGallery?: boolean; settings?:Record<string,unknown>}): Promise<ExportResult> {
    const result = await native().exportSession({ inputUris: options.inputUris, ...options.filterConfig,...options.settings });
    if (!result.success || !result.outputUri.startsWith('content://') || result.durationMs <= 0) {
      throw new Error('Обработка не вернула сохранённый ролик. Исходные куски оставлены.');
    }
    return result;
  },
};
