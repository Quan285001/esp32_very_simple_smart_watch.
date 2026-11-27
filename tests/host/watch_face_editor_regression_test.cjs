const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const appSource = fs.readFileSync('web/app.js', 'utf8');
assert.doesNotMatch(appSource, /function designCompatibilityErrors|function advancedFeatureErrors/, 'app must not duplicate firmware validators');
const p0=appSource.indexOf('async function buildWfsPackage('),p1=appSource.indexOf('async function sendWfsChunkWithRetry(',p0);
const packageBuilder=appSource.slice(p0,p1);
assert.match(packageBuilder,/Schema validation failed/);
assert.match(packageBuilder,/Firmware compatibility validation failed/);
assert.match(packageBuilder,/packageAssets\.length>maxAssets/);
assert.match(packageBuilder,/payloadLength\+64>maxStageBytes/);
const u0=appSource.indexOf('async function uploadCurrentDesign('),u1=appSource.indexOf('async function connectBLE(',u0);
assert.match(appSource.slice(u0,u1),/pack\.hasPreviewOnlyClockForm&&!confirm\(/);

const resizeStart=appSource.indexOf('function startResize('),resizeEnd=appSource.indexOf('\nfunction moveLayer(',resizeStart);
assert.ok(resizeStart>=0&&resizeEnd>resizeStart);
const resizeSource=appSource.slice(resizeStart,resizeEnd);
const handles={nw:{dx:-10,dy:-10,x:0,y:10},ne:{dx:10,dy:-10,x:10,y:10},sw:{dx:-10,dy:10,x:0,y:20},se:{dx:10,dy:10,x:10,y:20}};
for(const [corner,expected] of Object.entries(handles)){
 const handlers={},object={id:corner,type:'digital-clock',locked:false,transform:{x:10,y:20,width:40,height:30},textStyle:{scaleX:1,scaleY:1}};
 const sandbox={state:{design:{canvas:{width:240,height:240},objects:[object]}},$:()=>({clientWidth:240,clientHeight:240}),window:{addEventListener(n,fn){handlers[n]=fn},removeEventListener(n,fn){if(handlers[n]===fn)delete handlers[n]}},renderCanvas(){},saveDraft(){},render(){}};
 vm.runInNewContext(resizeSource+'\nglobalThis.runStartResize=startResize;',sandbox);
 sandbox.runStartResize({clientX:0,clientY:0,preventDefault(){},stopPropagation(){}},object.id,corner);
 handlers.pointermove({clientX:expected.dx,clientY:expected.dy});
 assert.deepEqual([object.transform.x,object.transform.y,object.transform.width,object.transform.height],[expected.x,expected.y,50,40],corner+' anchor');
 assert.ok(Number.isFinite(object.textStyle.scaleX)&&Number.isFinite(object.textStyle.scaleY));
 handlers.pointerup();
}
for(const invalid of [0,-5,'bad',NaN,Infinity,undefined]){
 for(const [field,other] of [['width','height'],['height','width']]){
  const handlers={},transform={x:NaN,y:Infinity,width:40,height:30};transform[field]=invalid;transform[other]=30;
  const object={id:'bad-'+field,type:'digital-clock',locked:false,transform,textStyle:{scaleX:NaN,scaleY:Infinity}};
  const sandbox={state:{design:{canvas:{width:240,height:240},objects:[object]}},$:()=>({clientWidth:240,clientHeight:240}),window:{addEventListener(n,fn){handlers[n]=fn},removeEventListener(n,fn){if(handlers[n]===fn)delete handlers[n]}},renderCanvas(){},saveDraft(){},render(){}};
  vm.runInNewContext(resizeSource+'\nglobalThis.runStartResize=startResize;',sandbox);
  sandbox.runStartResize({clientX:0,clientY:0,preventDefault(){},stopPropagation(){}},object.id,'se');
  assert.equal(object.transform[field],4);assert.equal(object.transform.x,0);assert.equal(object.transform.y,0);
  handlers.pointermove({clientX:8,clientY:8});
  for(const value of Object.values(object.transform))if(typeof value==='number')assert.ok(Number.isFinite(value));
  assert.ok(Number.isFinite(object.textStyle.scaleX)&&Number.isFinite(object.textStyle.scaleY));
  handlers.pointerup();
 }
}
const presetSource=fs.readFileSync('web/watch-face-presets.js','utf8');require('../../web/watch-face-presets.js');
const api=globalThis.WfsWatchFacePresets,angled=api.SPECS.find(s=>s.id==='angled-tech');
const objects=api.createObjects(angled,'artwork'),time=objects.find(o=>o.name==='Time'),seconds=objects.find(o=>o.name==='Seconds'),date=objects.find(o=>o.name==='Date');
const radians=29*Math.PI/180,halfBoundsY=Math.sin(radians)*63+Math.cos(radians)*12;
const stripTop=118-halfBoundsY,stripBottom=118+halfBoundsY;
assert.ok(time.transform.y+time.transform.height<stripTop);
assert.ok(seconds.transform.y>stripBottom);
assert.ok(seconds.transform.y+seconds.transform.height<date.transform.y);
assert.match(presetSource,/canvas\.width=480;canvas\.height=480;/);
assert.match(presetSource,/c\.translate\(286,236\);c\.rotate\(29\*Math\.PI\/180\)/);
console.log('WFS editor validation, resize recovery and angled-tech regression tests passed.');
