import { RecordingState, RecordedChunk, SessionCatalog, ExportResult } from './types';
import { CameraProfile } from '../cameras/types';

export interface StorageAdapter {
  saveSession(catalog: SessionCatalog): Promise<void>;
  loadSession(sessionId: string): Promise<SessionCatalog | null>;
  loadCurrentSession?(): Promise<SessionCatalog | null>;
  verifyFile(uri: string): Promise<{exists: boolean; sizeBytes: number; durationMs?: number}>;
}
export interface NativeExporterAdapter {
  exportChunks(options: {inputUris: string[]; filterConfig: CameraProfile['filterConfig']; saveToGallery: boolean}): Promise<ExportResult>;
}
export interface FinalizedVideo {uri: string; durationMs: number; sizeBytes: number}
export interface CameraDriver {startRecording(): Promise<void>; stopRecording(): Promise<FinalizedVideo>; isRecording?(): boolean}
const message = (e: unknown) => e instanceof Error ? e.message : String(e);

export class SessionManager {
  private state: RecordingState = 'idle';
  private currentSessionId: string;
  private createdAt = Date.now();
  private chunks: RecordedChunk[] = [];
  private isTransitioning = false;
  private errorMessage: string | null = null;
  private cameraProfile: CameraProfile;
  private storage?: StorageAdapter;
  private cameraDriver?: CameraDriver;
  private nativeExporter?: NativeExporterAdapter;
  private onStateChange?: (state: RecordingState) => void;
  constructor(profile: CameraProfile, options?: {
    sessionId?: string; storage?: StorageAdapter; cameraDriver?: CameraDriver;
    nativeExporter?: NativeExporterAdapter; onStateChange?: (state: RecordingState) => void;
  }) {
    this.cameraProfile = profile;
    this.currentSessionId = options?.sessionId || this.newId();
    this.storage = options?.storage; this.cameraDriver = options?.cameraDriver;
    this.nativeExporter = options?.nativeExporter; this.onStateChange = options?.onStateChange;
  }
  private newId() {return `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;}
  getState() {return this.state;}
  getChunks() {return this.chunks.map(c => ({...c}));}
  getTotalDurationMs() {return this.chunks.reduce((sum, c) => sum + c.durationMs, 0);}
  getSessionId() {return this.currentSessionId;}
  getErrorMessage() {return this.errorMessage;}
  private setState(state: RecordingState) {this.state = state; this.onStateChange?.(state);}
  private async persist() {if (this.storage) await this.storage.saveSession(this.exportCatalog());}
  async initialize(): Promise<boolean> {
    if (this.isTransitioning || !['idle','error'].includes(this.state)) return false;
    this.isTransitioning = true;
    try {
      const catalog = await this.storage?.loadCurrentSession?.();
      if (catalog) {
        if (!this.validCatalog(catalog)) throw new Error('Каталог съёмки повреждён. Исходники оставлены.');
        const valid: RecordedChunk[] = [];
        for (const chunk of catalog.chunks) {
          const check = await this.storage!.verifyFile(chunk.uri);
          if (check.exists && check.sizeBytes > 0 && (check.durationMs ?? chunk.durationMs) > 0) {
            valid.push({...chunk, fileSizeBytes:check.sizeBytes, durationMs:check.durationMs ?? chunk.durationMs});
          }
        }
        this.currentSessionId = catalog.sessionId; this.createdAt = catalog.createdAt; this.chunks = valid;
        this.errorMessage = valid.length < catalog.chunks.length ? 'Незавершённые или недоступные куски исключены из ленты; файлы не удалены.' : null;
      }
      this.setState(this.chunks.length ? 'stopped' : 'idle');
      return true;
    } catch (e) {this.errorMessage = message(e); this.setState('error'); return false;}
    finally {this.isTransitioning = false;}
  }
  async startRecording(): Promise<boolean> {
    if (this.isTransitioning || !['idle','paused','stopped','error'].includes(this.state)) return false;
    this.isTransitioning = true; this.errorMessage = null; this.setState('starting');
    try {
      if (!this.cameraDriver) throw new Error('Камера не подключена');
      await this.persist(); // Also retries a previous catalog write failure before any new capture.
      await this.cameraDriver.startRecording();
      if (this.state as RecordingState === 'error') return false;
      this.setState('recording'); return true;
    } catch (e) {this.errorMessage = message(e); this.setState('error'); return false;}
    finally {this.isTransitioning = false;}
  }
  continueRecording() {return this.startRecording();}
  pauseRecording() {return this.finishRecording('paused');}
  async stopRecording(): Promise<boolean> {
    if (!this.isTransitioning && ['idle','paused'].includes(this.state)) {this.setState('stopped'); return true;}
    return this.finishRecording('stopped');
  }
  private async finishRecording(next: 'paused' | 'stopped'): Promise<boolean> {
    if (this.isTransitioning || (this.state !== 'recording' && !(this.state === 'error' && this.cameraDriver?.isRecording?.()))) return false;
    this.isTransitioning = true; this.setState('finalizing');
    try {
      if (!this.cameraDriver) throw new Error('Камера не подключена');
      await this.handleFinalizedChunk(await this.cameraDriver.stopRecording());
      this.setState(next); return true;
    } catch (e) {this.errorMessage = message(e); this.setState('error'); return false;}
    finally {this.isTransitioning = false;}
  }
  async recordingFinished(video: FinalizedVideo): Promise<void> {
    // Unrequested native completion (interruption), rather than a pause/stop callback.
    if (this.isTransitioning || !['recording','error'].includes(this.state)) return;
    this.isTransitioning = true; this.setState('finalizing');
    try {await this.handleFinalizedChunk(video); this.setState('stopped');}
    catch (e) {this.errorMessage = message(e); this.setState('error');}
    finally {this.isTransitioning = false;}
  }
  recordingFailed(error: unknown) {this.errorMessage = message(error); this.setState('error');}
  private async handleFinalizedChunk(video: FinalizedVideo) {
    const check = this.storage ? await this.storage.verifyFile(video.uri) : {exists:true, sizeBytes:video.sizeBytes};
    const duration = 'durationMs' in check ? check.durationMs ?? video.durationMs : video.durationMs;
    if (!check.exists || !Number.isFinite(check.sizeBytes) || check.sizeBytes <= 0 || !Number.isFinite(duration) || duration <= 0) {
      throw new Error('Файл куска пуст, не завершён или имеет некорректную длительность');
    }
    if (this.chunks.some(c => c.uri === video.uri)) throw new Error('Повторное завершение одного куска');
    this.chunks.push({id:`chunk_${Date.now()}_${this.chunks.length}`, uri:video.uri,
      durationMs:duration, fileSizeBytes:check.sizeBytes, createdAt:Date.now()});
    await this.persist(); // Keep the in-memory chunk if persistence fails; never pretend it was saved.
  }
  async exportAndStitch(): Promise<ExportResult> {
    const fail = (error: string): ExportResult => ({success:false, outputUri:'', durationMs:0, error});
    if (this.isTransitioning || ['recording','starting','finalizing','exporting'].includes(this.state)) return fail('Запись или обработка ещё выполняется');
    if (!this.chunks.length) return fail('Нет записанных кусков для склейки');
    this.isTransitioning = true;
    const previous = this.state;
    this.errorMessage = null; this.setState('exporting');
    try {
      if (!this.nativeExporter) throw new Error('Нативный экспортер не подключён');
      await this.persist();
      const result = await this.nativeExporter.exportChunks({inputUris:this.chunks.map(c => c.uri), filterConfig:this.cameraProfile.filterConfig, saveToGallery:true});
      if (!result.success || !result.outputUri.startsWith('content://') || result.durationMs <= 0) throw new Error(result.error || 'Готовый ролик не сохранён');
      this.setState('stopped'); return result;
    } catch (e) {this.errorMessage = message(e); this.setState(previous === 'paused' ? 'paused' : 'stopped'); return fail(this.errorMessage);}
    finally {this.isTransitioning = false;}
  }
  async resetSession(): Promise<boolean> {
    if (this.isTransitioning || this.cameraDriver?.isRecording?.() || ['recording','starting','finalizing','exporting'].includes(this.state)) return false;
    this.isTransitioning = true;
    try {
      await this.persist(); // Archive the old catalog and keep its source files.
      const catalog: SessionCatalog = {sessionId:this.newId(), createdAt:Date.now(), cameraProfileId:this.cameraProfile.id, chunks:[], totalDurationMs:0};
      await this.storage?.saveSession(catalog);
      this.currentSessionId = catalog.sessionId; this.createdAt = catalog.createdAt; this.chunks=[];
      this.errorMessage=null; this.setState('idle'); return true;
    } catch (e) {this.errorMessage=message(e); this.setState('error'); return false;}
    finally {this.isTransitioning=false;}
  }
  exportCatalog(): SessionCatalog {return {sessionId:this.currentSessionId, createdAt:this.createdAt, cameraProfileId:this.cameraProfile.id, chunks:this.getChunks(), totalDurationMs:this.getTotalDurationMs()};}
  private validCatalog(c: SessionCatalog): boolean {
    return !!c && typeof c.sessionId === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(c.sessionId) && Number.isFinite(c.createdAt)
      && c.cameraProfileId === this.cameraProfile.id && Array.isArray(c.chunks) && c.chunks.every(v =>
        typeof v.id === 'string' && typeof v.uri === 'string' && v.uri.startsWith('file://') && Number.isFinite(v.durationMs) && v.durationMs > 0 && Number.isFinite(v.fileSizeBytes) && v.fileSizeBytes > 0);
  }
  restoreFromCatalog(catalog: SessionCatalog): boolean {
    if (this.isTransitioning || ['recording','starting','finalizing','exporting'].includes(this.state) || !this.validCatalog(catalog)) return false;
    this.currentSessionId=catalog.sessionId; this.createdAt=catalog.createdAt; this.chunks=catalog.chunks.map(c=>({...c}));
    this.setState(this.chunks.length ? 'stopped' : 'idle'); return true;
  }
}
