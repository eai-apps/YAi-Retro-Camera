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
// Photo mode with a frame processor needs ImageCapture + ImageAnalysis only.
// Upstream enables a third VideoCapture surface even when video={false}.
const viewFile=path.join(root,'android/src/main/java/com/mrousavy/camera/react/CameraView.kt');
let view=fs.readFileSync(viewFile,'utf8');
const before='if (video || enableFrameProcessor) {';
const after='if (video) { // YAi: frame processing has its own ImageAnalysis output.';
if(!view.includes(after)){
  if(!view.includes(before))throw Error('Review camera photo surface patch');
  fs.writeFileSync(viewFile,view.replace(before,after));
}

// Expose a snapshot so JS can recover even when the initialization event was missed.
code=fs.readFileSync(file,'utf8');
if(!code.includes('fun getCurrentDevices(')){
  const point='  // Required for NativeEventEmitter, this is just a dummy implementation:';
  if(!code.includes(point))throw Error('Review camera snapshot patch');
  const method='  @ReactMethod\n  fun getCurrentDevices(promise: com.facebook.react.bridge.Promise) {\n    coroutineScope.launch { promise.resolve(getDevicesJson()) }\n  }\n\n';
  fs.writeFileSync(file,code.replace(point,method+point));
}

// Bound only the analysis/preview stream to the screen's preview budget.
// Recording retains the selected resolution. Two maximum-size camera streams
// cannot be combined on many devices (and on small-screen emulators).
const configurationFile=path.join(root,'android/src/main/java/com/mrousavy/camera/core/CameraSession+Configuration.kt');
let configuration=fs.readFileSync(configurationFile,'utf8').replace(/\r\n/g,'\n');
if(!configuration.includes('// YAi: bound analysis to the display preview budget.')){
  const marker='        Log.i(CameraSession.TAG, "Frame Processor size: ${format.videoSize}")';
  const start=configuration.indexOf(marker);
  if(start<0)throw Error('Review frame analysis resolution patch');
  const end=configuration.indexOf('        analysis.setResolutionSelector(resolutionSelector)',start);
  if(end<0)throw Error('Missing analysis resolution selector');
  const replacement=`        // YAi: bound analysis to the display preview budget.
        val displaySize = android.graphics.Point()
        val windows = context.getSystemService(android.content.Context.WINDOW_SERVICE) as android.view.WindowManager
        windows.defaultDisplay.getRealSize(displaySize)
        val previewArea = maxOf(640L * 480, minOf(1920L * 1080, displaySize.x.toLong() * displaySize.y))
        Log.i(CameraSession.TAG, "Frame Processor preview pixel budget: $previewArea")
        val resolutionSelector = ResolutionSelector.Builder()
          .forSize(format.videoSize)
          .setAllowedResolutionMode(ResolutionSelector.PREFER_CAPTURE_RATE_OVER_HIGHER_RESOLUTION)
          .setResolutionFilter { sizes, _ ->
            sizes.filter { it.width.toLong() * it.height <= previewArea }
              .ifEmpty { sizes.sortedBy { it.width.toLong() * it.height }.take(1) }
          }
          .build()
`;
  configuration=configuration.slice(0,start)+replacement+configuration.slice(end);
  fs.writeFileSync(configurationFile,configuration);
}
