// Original vector drawing; reproducible launcher assets, no downloaded artwork.
const fs=require('node:fs'),path=require('node:path');
const Init=require('canvaskit-wasm');
(async()=>{const k=await Init({wasmBinary:fs.readFileSync(require.resolve('canvaskit-wasm/bin/canvaskit.wasm'))});const folder=path.resolve(__dirname,'../assets/brand');fs.mkdirSync(folder,{recursive:true});
for(const transparent of [false,true]){const surface=k.MakeSurface(1024,1024);if(!surface)throw Error('Cannot create icon surface');const c=surface.getCanvas();c.clear(transparent?k.TRANSPARENT:k.Color(20,23,30,1));
const p=new k.Paint();p.setAntiAlias(true);function color(r,g,b){p.setColor(k.Color(r,g,b,1));p.setStyle(k.PaintStyle.Fill)}
color(222,175,116);c.drawRRect(k.RRectXY(k.LTRBRect(302,287,492,375),30,30),p);
color(66,70,79);c.drawRRect(k.RRectXY(k.LTRBRect(192,341,832,726),66,66),p);
color(33,37,45);c.drawRRect(k.RRectXY(k.LTRBRect(208,357,816,710),52,52),p);
color(227,183,127);c.drawCircle(512,535,172,p);color(21,25,33);c.drawCircle(512,535,151,p);
const palette=[[207,155,97],[116,154,161],[81,107,144],[188,140,113],[143,158,142],[221,193,148]];
for(let i=0;i<6;i++){const a=i*Math.PI/3;const q=new k.Path();q.moveTo(512+Math.cos(a)*129,535+Math.sin(a)*129);q.lineTo(512+Math.cos(a+.93)*129,535+Math.sin(a+.93)*129);q.lineTo(512+Math.cos(a+1.4)*51,535+Math.sin(a+1.4)*51);q.close();color(...palette[i]);c.drawPath(q,p);q.delete()}
color(13,18,27);c.drawCircle(512,535,54,p);color(238,229,206);c.drawRRect(k.RRectXY(k.LTRBRect(716,386,773,419),9,9),p);c.drawCircle(459,481,16,p);
surface.flush();const image=surface.makeImageSnapshot();const bytes=image.encodeToBytes(k.ImageFormat.PNG,100);if(!bytes)throw Error('PNG encoding failed');fs.writeFileSync(path.join(folder,transparent?'adaptive.png':'icon.png'),Buffer.from(bytes));image.delete();p.delete();surface.delete();}
console.log('Generated original 1024px launcher/adaptive icons');})().catch(e=>{console.error(e);process.exitCode=1});
