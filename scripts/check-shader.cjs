const fs = require('node:fs');
const CanvasKitInit = require('canvaskit-wasm');
const { sksl } = require('./generate-shaders.cjs');
(async () => {
  const kit = await CanvasKitInit({ wasmBinary:fs.readFileSync(require.resolve('canvaskit-wasm/bin/canvaskit.wasm')) });
  const effect = kit.RuntimeEffect.Make(sksl);
  if (!effect) throw Error('SkSL camera shader did not compile');
  effect.delete();
  console.log('SkSL shader compiled by Skia/CanvasKit. Android GPU verification still requires a device.');
})().catch(error=>{console.error(error);process.exitCode=1;});
