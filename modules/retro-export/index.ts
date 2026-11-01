import { requireNativeModule } from 'expo-modules-core';
import { CameraFilterConfig } from '../../src/cameras/types';
import { ExportResult } from '../../src/recorder/types';

export interface VideoInfo { uri: string; durationMs: number; sizeBytes: number }
interface NativeExporter {
  exportSession(options: Record<string, unknown>): Promise<ExportResult>;
  commitRecording(path: string): Promise<VideoInfo>;
  inspectVideo(uri: string): Promise<VideoInfo>;
  saveCatalog(json: string): Promise<void>;
  loadCatalog(): Promise<string | null>;
  openVideo(uri: string): Promise<void>;
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
  async exportSession(options: {inputUris: string[]; filterConfig: CameraFilterConfig; saveToGallery?: boolean}): Promise<ExportResult> {
    const result = await native().exportSession({ inputUris: options.inputUris, ...options.filterConfig });
    if (!result.success || !result.outputUri.startsWith('content://') || result.durationMs <= 0) {
      throw new Error('Обработка не вернула сохранённый ролик. Исходные куски оставлены.');
    }
    return result;
  },
};
