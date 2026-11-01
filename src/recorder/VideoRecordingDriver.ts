import type { Camera, VideoFile } from 'react-native-vision-camera';
import type { CameraDriver, FinalizedVideo } from './SessionManager';

export class VideoRecordingDriver implements CameraDriver {
  private completion: Promise<FinalizedVideo> | null = null;
  private stopping = false;
  private nativeFinished = false;
  constructor(private camera: () => Camera | null, private isReady: () => boolean,
    private commit: (path: string) => Promise<FinalizedVideo>,
    private onFinished: (video: FinalizedVideo) => void, private onError: (error: unknown) => void) {}
  async startRecording(): Promise<void> {
    const camera = this.camera();
    if (!camera || !this.isReady()) throw new Error('Дождитесь готовности камеры и разрешите микрофон');
    if (this.completion) throw new Error('Предыдущая запись ещё не завершена');
    this.stopping=false; this.nativeFinished=false;
    let resolve!: (video: FinalizedVideo) => void;
    let reject!: (error: unknown) => void;
    this.completion = new Promise((ok, fail) => {resolve=ok; reject=fail;});
    void this.completion.catch(() => {}); // Errors can arrive before the user presses STOP.
    const failed = (error: unknown) => {
      this.nativeFinished=true; reject(error);
      if (!this.stopping) {this.completion=null; this.onError(error);}
    };
    try {
      camera.startRecording({fileType:'mp4', videoCodec:'h264', onRecordingError:failed,
        onRecordingFinished: (video: VideoFile) => {
          this.nativeFinished=true;
          void this.commit(video.path).then(result => {
            resolve(result);
            if (!this.stopping) {this.completion=null; this.onFinished(result);}
          }, failed);
        }});
    } catch (e) {failed(e); throw e;}
  }
  async stopRecording(): Promise<FinalizedVideo> {
    const completion=this.completion;
    const camera=this.camera();
    if (!completion || !camera) throw new Error('Нет активной записи');
    this.stopping=true;
    try {
      if (!this.nativeFinished) await camera.stopRecording();
      return await completion; // stopRecording() itself does not mean the MP4 is finalized.
    } finally {
      // A failed stop request may leave the camera running. Keep it available for a retry.
      if (this.nativeFinished) this.completion=null;
      this.stopping=false;
    }
  }
  isRecording() {return this.completion !== null && !this.nativeFinished;}
}
