import film8 from './film8';
import vhs from './vhs';
import compact from './compact';
import disposable from './disposable';
import ccd from './ccd';
import polaroid from './polaroid';
export const cameras=[film8,vhs,compact,disposable,ccd,polaroid];
export const cameraById=(id:string)=>cameras.find(c=>c.id===id)??compact;
