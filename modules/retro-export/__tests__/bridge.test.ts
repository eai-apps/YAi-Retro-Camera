jest.mock('expo-modules-core',()=>({requireNativeModule:jest.fn()}));
import { requireNativeModule } from 'expo-modules-core';
import { RetroExport } from '../index';
import { warmFilmCamera } from '../../../src/cameras/warmFilm';
const getNative=requireNativeModule as jest.Mock;
test('missing native exporter rejects rather than claiming the first source is a saved movie',async()=>{
  getNative.mockImplementation(()=>{throw new Error('missing');});
  await expect(RetroExport.exportSession({inputUris:['file:///source.mp4'],filterConfig:warmFilmCamera.filterConfig})).rejects.toThrow('не подключён');
});
test('invalid native result is not reported as gallery success',async()=>{
  getNative.mockReturnValue({exportSession:jest.fn().mockResolvedValue({success:true,outputUri:'file:///source.mp4',durationMs:10000})});
  await expect(RetroExport.exportSession({inputUris:['file:///source.mp4'],filterConfig:warmFilmCamera.filterConfig})).rejects.toThrow('не вернула');
});
