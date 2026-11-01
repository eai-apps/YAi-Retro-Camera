import { SessionManager, CameraDriver, StorageAdapter, NativeExporterAdapter } from '../SessionManager';
import { warmFilmCamera } from '../../cameras/warmFilm';
import { SessionCatalog } from '../types';

function setup() {
  const camera: jest.Mocked<CameraDriver>={startRecording:jest.fn().mockResolvedValue(undefined),stopRecording:jest.fn().mockResolvedValue({uri:'file:///private/c1.mp4',durationMs:4000,sizeBytes:2000})};
  const storage: jest.Mocked<StorageAdapter>={saveSession:jest.fn().mockResolvedValue(undefined),loadSession:jest.fn().mockResolvedValue(null),loadCurrentSession:jest.fn().mockResolvedValue(null),verifyFile:jest.fn().mockResolvedValue({exists:true,sizeBytes:2000})};
  const exporter: jest.Mocked<NativeExporterAdapter>={exportChunks:jest.fn().mockResolvedValue({success:true,outputUri:'content://media/video/1',durationMs:4000})};
  const manager=new SessionManager(warmFilmCamera,{storage,cameraDriver:camera,nativeExporter:exporter});
  return {camera,storage,exporter,manager};
}
test('session cannot be exported while pause is still waiting for native finalization',async()=>{
  const {camera,manager,exporter}=setup();
  let complete!: (video:{uri:string;durationMs:number;sizeBytes:number})=>void;
  camera.stopRecording.mockReturnValue(new Promise(resolve=>{complete=resolve;}));
  await manager.startRecording(); const pause=manager.pauseRecording();
  expect(manager.getState()).toBe('finalizing'); expect(manager.getChunks()).toHaveLength(0);
  expect((await manager.exportAndStitch()).success).toBe(false); expect(exporter.exportChunks).not.toHaveBeenCalled();
  complete({uri:'file:///private/c1.mp4',durationMs:4000,sizeBytes:2000});
  expect(await pause).toBe(true); expect(manager.getChunks()).toHaveLength(1);
});
test.each([0,-1,NaN])('rejects a file with invalid duration %s even when size is positive',async durationMs=>{
  const {camera,manager}=setup(); camera.stopRecording.mockResolvedValue({uri:'file:///private/c1.mp4',durationMs,sizeBytes:2000});
  await manager.startRecording(); expect(await manager.pauseRecording()).toBe(false); expect(manager.getChunks()).toHaveLength(0);
});
test('catalog write failure is reported while keeping the finalized chunk for retry',async()=>{
  const {storage,manager}=setup(); await manager.startRecording();
  storage.saveSession.mockRejectedValueOnce(new Error('disk full'));
  expect(await manager.pauseRecording()).toBe(false); expect(manager.getErrorMessage()).toContain('disk full'); expect(manager.getChunks()).toHaveLength(1);
  expect((await manager.exportAndStitch()).success).toBe(true); expect(manager.getChunks()).toHaveLength(1);
});
test('failed native result is an error and preserves all source clips',async()=>{
  const {exporter,manager}=setup(); await manager.startRecording(); await manager.pauseRecording();
  exporter.exportChunks.mockResolvedValueOnce({success:false,outputUri:'',durationMs:0,error:'codec failed'});
  expect((await manager.exportAndStitch()).success).toBe(false); expect(manager.getState()).toBe('paused'); expect(manager.getChunks()).toHaveLength(1);
});
test('cold start verifies disk files and excludes unfinished clips without deleting them',async()=>{
  const {storage,manager}=setup();
  const catalog: SessionCatalog={sessionId:'saved_session',createdAt:123,cameraProfileId:warmFilmCamera.id,totalDurationMs:8000,chunks:[
    {id:'c1',uri:'file:///private/c1.mp4',durationMs:4000,fileSizeBytes:2000,createdAt:123},
    {id:'c2',uri:'file:///private/c2.mp4',durationMs:4000,fileSizeBytes:2000,createdAt:124}]};
  (storage.loadCurrentSession as jest.Mock).mockResolvedValue(catalog);
  storage.verifyFile.mockResolvedValueOnce({exists:true,sizeBytes:2100,durationMs:4050}).mockResolvedValueOnce({exists:false,sizeBytes:0});
  expect(await manager.initialize()).toBe(true); expect(manager.getChunks()).toHaveLength(1); expect(manager.getTotalDurationMs()).toBe(4050);
  expect(manager.getSessionId()).toBe('saved_session'); expect(manager.exportCatalog().createdAt).toBe(123);
  expect(storage.saveSession).not.toHaveBeenCalled();
});
test('two concurrent export requests do not launch two native exports',async()=>{
  const {manager,exporter}=setup(); await manager.startRecording(); await manager.pauseRecording();
  const first=manager.exportAndStitch(); const second=await manager.exportAndStitch();
  expect(second.success).toBe(false); expect((await first).success).toBe(true); expect(exporter.exportChunks).toHaveBeenCalledTimes(1);
});
