jest.mock('../../../modules/retro-export',()=>({RetroExport:{}}));
import {parseSettings} from '../settings';
test('defaults use Full HD and live microphone rather than a noisy vintage soundtrack',()=>{expect(parseSettings(null)).toMatchObject({quality:'1080',audioMode:'live',theme:'modern',photoDraft:[]})});
test('invalid stored settings do not feed NaN or unknown modes to native code',()=>{expect(parseSettings({strength:NaN,quality:'bad',audioMode:'bad',photoDraft:['https://foreign','file:///ours']})).toMatchObject({strength:1,quality:'1080',audioMode:'live',photoDraft:['file:///ours']})});
