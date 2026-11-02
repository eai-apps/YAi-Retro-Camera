// VisionCamera 4.7.3: publish devices after its asynchronous CameraX init.
// Without this event slow initialization can leave the JS device cache empty.
const fs=require('fs');
const path=require('path');
const root=path.dirname(require.resolve('react-native-vision-camera/package.json'));
if(require(path.join(root,'package.json')).version!=='4.7.3')throw Error('Review camera readiness patch for the new version');
const file=path.join(root,'android/src/main/java/com/mrousavy/camera/react/CameraDevicesManager.kt');
let code=fs.readFileSync(file,'utf8');
const anchor='Log.i(TAG, "Successfully initialized!")';
const addition='\n        // YAi: refresh the JS cache after asynchronous provider initialization.\n        if (reactContext.hasActiveReactInstance()) sendAvailableDevicesChangedEvent()';
if(!code.includes('// YAi: refresh the JS cache')){
  if(!code.includes(anchor))throw Error('Camera readiness patch no longer matches');
  fs.writeFileSync(file,code.replace(anchor,anchor+addition));
}
console.log('Applied VisionCamera asynchronous device readiness fix.');