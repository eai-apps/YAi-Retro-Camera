import { VideoRecordingDriver } from '../VideoRecordingDriver';
import type { Camera, RecordVideoOptions } from 'react-native-vision-camera';

const video={uri:'file:///private/a.mp4', durationMs:1500, sizeBytes:1000};
describe('VisionCamera callback boundary',()=>{
  let options: RecordVideoOptions;
  let camera: {startRecording:jest.Mock; stopRecording:jest.Mock};
  let commit: jest.Mock;
  let onFinish: jest.Mock;
  let onError: jest.Mock;
  let driver: VideoRecordingDriver;
  beforeEach(()=>{
    camera={startRecording:jest.fn(o=>{options=o;}),stopRecording:jest.fn().mockResolvedValue(undefined)};
    commit=jest.fn().mockResolvedValue(video); onFinish=jest.fn(); onError=jest.fn();
    driver=new VideoRecordingDriver(()=>camera as unknown as Camera,()=>true,commit,onFinish,onError);
  });
  test('stop waits for the completion callback and permanent-file commit',async()=>{
    let finishCommit!: (value:typeof video)=>void;
    commit.mockReturnValue(new Promise(resolve=>{finishCommit=resolve;}));
    await driver.startRecording();
    let resolved=false;
    const result=driver.stopRecording().then(v=>{resolved=true; return v;});
    await Promise.resolve(); expect(resolved).toBe(false);
    options.onRecordingFinished({path:'/cache/a.mp4',duration:1.5,width:1280,height:720});
    await Promise.resolve(); expect(resolved).toBe(false);
    finishCommit(video); expect(await result).toEqual(video); expect(onFinish).not.toHaveBeenCalled();
    expect(options.videoCodec).toBe('h264'); expect(options.fileType).toBe('mp4');
  });
  test('an error before STOP is surfaced and does not leave an unhandled promise',async()=>{
    await driver.startRecording(); const error=new Error('microphone lost');
    options.onRecordingError(error as never);
    expect(onError).toHaveBeenCalledWith(error); expect(driver.isRecording()).toBe(false);
    await expect(driver.startRecording()).resolves.toBeUndefined();
  });
  test('spontaneous native completion is preserved without a STOP click',async()=>{
    await driver.startRecording();
    options.onRecordingFinished({path:'/cache/a.mp4',duration:1.5,width:1280,height:720});
    await Promise.resolve(); expect(onFinish).toHaveBeenCalledWith(video);
  });
  test('failed stop request can be retried without starting a second recording',async()=>{
    await driver.startRecording(); camera.stopRecording.mockRejectedValueOnce(new Error('try again'));
    await expect(driver.stopRecording()).rejects.toThrow('try again');
    expect(driver.isRecording()).toBe(true);
    await expect(driver.startRecording()).rejects.toThrow('Предыдущая');
    const retry=driver.stopRecording();
    options.onRecordingFinished({path:'/cache/a.mp4',duration:1.5,width:1280,height:720});
    expect(await retry).toEqual(video);
  });
  test('does not start before camera initialization and both permissions',async()=>{
    const unready=new VideoRecordingDriver(()=>camera as unknown as Camera,()=>false,commit,onFinish,onError);
    await expect(unready.startRecording()).rejects.toThrow('Дождитесь'); expect(camera.startRecording).not.toHaveBeenCalled();
  });
});
