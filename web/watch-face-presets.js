/* Watch Face Studio hybrid presets.
 * Decorative artwork is rendered to a 480x480 browser bitmap; live time/date
 * remain native WFS elements so the watch never displays a frozen clock.
 */
(function(root){
'use strict';
const SPECS=[
{id:'motorsport',category:'analog',name:'Motorsport M-Sport',bg:'#08101e',accent:'#38bdf8',secondary:'#ef4444',style:'racing'},
{id:'gmt24',category:'analog',name:'Tactical GMT 24H',bg:'#08090c',accent:'#dc2626',secondary:'#f8fafc',style:'tactical'},
{id:'rosegold',category:'analog',name:'Classic Rose Gold',bg:'#0b0b0d',accent:'#e5b869',secondary:'#f3d193',style:'gold'},
{id:'stacked-split',category:'digital',name:'Stacked Split (12 / 00)',bg:'#06070a',accent:'#e2e8f0',secondary:'#94a3b8',style:'stacked'},
{id:'dual-tone',category:'digital',name:'Dual-Tone Bold Blocks',bg:'#0c0806',accent:'#f59e0b',secondary:'#e07a38',style:'dual'},
{id:'tall-vertical',category:'digital',name:'Tall Vertical Split (:MM)',bg:'#120714',accent:'#f9a8d4',secondary:'#fda4af',style:'tall'},
{id:'thin-outline',category:'digital',name:'Thin Outline Wide (09 07)',bg:'#070a08',accent:'#a3e635',secondary:'#bef264',style:'outline'},
{id:'angled-tech',category:'digital',name:'Angled Tech Strip',bg:'#07080c',accent:'#38bdf8',secondary:'#f43f5e',style:'angled'}
];
function renderArtworkCanvas(spec){
 const canvas=document.createElement('canvas');canvas.width=480;canvas.height=480;
 const c=canvas.getContext('2d');const {bg,accent,secondary,style}=spec;
 const grad=c.createRadialGradient(240,205,25,240,240,270);grad.addColorStop(0,lighten(bg,20));grad.addColorStop(1,bg);c.fillStyle=grad;c.fillRect(0,0,480,480);
 c.save();c.beginPath();c.arc(240,240,232,0,Math.PI*2);c.clip();
 const line=(x1,y1,x2,y2,color=accent,w=2)=>{c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()};
 const ring=(r,color,w)=>{c.beginPath();c.arc(240,240,r,0,Math.PI*2);c.strokeStyle=color;c.lineWidth=w;c.stroke()};
 const txt=(s,x,y,size,color,weight=600,font='Arial')=>{c.font=weight+' '+size+'px '+font;c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(s,x,y)};
 if(['racing','tactical','gold'].includes(style)){
  ring(452/2,style==='gold'?'rgba(229,184,105,.25)':'rgba(255,255,255,.12)',8);
  for(let i=0;i<60;i++){const a=(i*6-90)*Math.PI/180,major=i%5===0;const r1=style==='racing'?206:205,r2=r1-(major?18:9);line(240+Math.cos(a)*r1,240+Math.sin(a)*r1,240+Math.cos(a)*r2,240+Math.sin(a)*r2,major?'rgba(255,255,255,.8)':'rgba(255,255,255,.3)',major?4:2)}
 }
 if(style==='racing'){
  c.lineWidth=22;c.strokeStyle='rgba(185,28,28,.75)';c.beginPath();c.arc(240,240,218,-Math.PI/2,0);c.stroke();c.strokeStyle='rgba(29,78,216,.75)';c.beginPath();c.arc(240,240,218,0,Math.PI/2);c.stroke();
  for(let i=0;i<12;i++){const a=(i*30-90)*Math.PI/180; c.save();c.translate(240,240);c.rotate(a);c.fillStyle='#cbd5e1';c.fillRect(190,-8,22,16);c.restore()}
  txt('12',240,62,36,'#f1f5f9',700);txt('6',240,418,36,'#f1f5f9',700);txt('3',418,242,30,'#f1f5f9',700);txt('9',62,242,30,'#f1f5f9',700);
  c.beginPath();c.arc(240,145,24,0,Math.PI*2);c.fillStyle='#0f172a';c.fill();c.strokeStyle='#e2e8f0';c.lineWidth=3;c.stroke();txt('M',240,145,22,'#38bdf8',700);
  txt('MOTORSPORT',240,185,13,'#94a3b8',700);
 }else if(style==='tactical'){
  line(54,54,426,426,'rgba(153,27,27,.18)',26);line(426,54,54,426,'rgba(153,27,27,.18)',26);
  for(let h=2;h<=24;h+=2){const a=((h%24)*15-90)*Math.PI/180;txt(String(h),240+Math.cos(a)*150,240+Math.sin(a)*150,22,'#f8fafc',600)}
  txt('TACTICAL',240,156,22,'#f8fafc',700);txt('GMT',240,184,18,'#dc2626',700);txt('WATER RESISTANT',240,378,12,'#cbd5e1',600);txt('660ft - 200m',240,402,12,'#cbd5e1',600);
 }else if(style==='gold'){
  ring(212,'rgba(255,255,255,.12)',26);ring(230,'rgba(255,255,255,.2)',3);
  for(let h=0;h<12;h++){const a=(h*30-90)*Math.PI/180;const r=184;line(240+Math.cos(a)*r,240+Math.sin(a)*r,240+Math.cos(a)*(r-18),240+Math.sin(a)*(r-18),'#d49b4b',7)}
  txt('12',240,66,36,'#e5b869',700);
 }else if(style==='stacked'){
  for(let i=0;i<60;i++){const a=(i*6-90)*Math.PI/180;line(240+Math.cos(a)*218,240+Math.sin(a)*218,240+Math.cos(a)*207,240+Math.sin(a)*207,i%5===0?'rgba(248,250,252,.55)':'rgba(148,163,184,.22)',2)}
  c.strokeStyle='rgba(148,163,184,.55)';c.lineWidth=3;c.strokeRect(310,210,96,44);
 }else if(style==='dual'){
  for(let i=0;i<48;i++){const a=(i*7.5-90)*Math.PI/180;line(240+Math.cos(a)*216,240+Math.sin(a)*216,240+Math.cos(a)*198,240+Math.sin(a)*198,'rgba(245,158,11,.28)',7)}

 }else if(style==='tall'){
  line(52,80,428,80,'rgba(249,168,212,.28)',2);line(52,400,428,400,'rgba(249,168,212,.28)',2);

 }else if(style==='outline'){
  ring(220,'rgba(163,230,53,.22)',2);
 }else if(style==='angled'){
  line(64,420,64,56,'rgba(248,250,252,.35)',3);line(64,56,445,275,'rgba(248,250,252,.35)',3);line(118,126,450,315,'rgba(248,250,252,.35)',3);
  c.save();c.translate(286,236);c.rotate(29*Math.PI/180);c.fillStyle='rgba(15,23,42,.82)';c.fillRect(-126,-24,252,48);c.strokeStyle='rgba(248,250,252,.45)';c.lineWidth=2;c.strokeRect(-126,-24,252,48);
  const days=['M','T','W','T','F','S','S'];days.forEach((day,index)=>{c.font='700 22px Arial';c.textAlign='center';c.textBaseline='middle';c.fillStyle=index===4?'#38bdf8':'#f1f5f9';c.fillText(day,-96+index*32,0)});c.restore();
 }
 c.restore();return canvas;
}
function renderBackground(spec){return renderArtworkCanvas(spec).toDataURL('image/png')}
function renderThumbnail(spec){
 const canvas=renderArtworkCanvas(spec),c=canvas.getContext('2d');
 const text=(value,x,y,size,color,weight=600)=>{c.font=weight+' '+size+'px system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(value,x,y)};
 if(spec.category==='analog'){
  const colors=spec.style==='gold'?['#e5b869','#e5b869','#f3d193']:spec.style==='tactical'?['#ffffff','#ffffff','#dc2626']:['#f8fafc','#f8fafc','#ef4444'];
  const angles=[-Math.PI/2-0.42,-Math.PI/2+0.9,-Math.PI/2+1.65],lengths=[116,151,166],widths=[9,6,3];
  for(let i=0;i<3;i++){const x=240+Math.cos(angles[i])*lengths[i],y=240+Math.sin(angles[i])*lengths[i];c.strokeStyle=colors[i];c.lineWidth=widths[i];c.lineCap='round';c.beginPath();c.moveTo(240,240);c.lineTo(x,y);c.stroke()}
  c.fillStyle=colors[2];c.beginPath();c.arc(240,240,7,0,Math.PI*2);c.fill();
 }else{
  const style=spec.style;
  if(style==='stacked'){text('12',240,190,100,'#f8fafc',600);text('00',240,292,100,'#f8fafc',600);text('38',358,232,27,'#94a3b8',600)}
  if(style==='dual'){text('12',240,200,112,'#f7dfb8',600);text('00',240,314,112,'#e07a38',600);text('38',240,388,25,'#fbbf24',600)}
  if(style==='tall'){text('12',240,222,132,'#f9a8d4',600);text(':00',240,350,118,'#f9a8d4',600)}
  if(style==='outline'){text('09',142,260,92,'#bef264',400);text('07',338,260,92,'#bef264',400);text('38',240,350,30,'#bef264',600)}
  if(style==='angled'){text('09:07',286,265,64,'#f8fafc',600);text('38',340,328,28,'#38bdf8',600);text('FRI, 07 NOV',240,392,20,'#cbd5e1',600)}
  if(style!=='angled')text('FRI, 07 NOV',240,414,19,style==='dual'?'#e7b887':'#cbd5e1',600);
 }
 return canvas.toDataURL('image/png');
}
function lighten(hex,delta){const n=parseInt(hex.slice(1),16);const f=v=>Math.max(0,Math.min(255,v+delta));return '#'+[f(n>>16),f((n>>8)&255),f(n&255)].map(v=>v.toString(16).padStart(2,'0')).join('')}
function createObjects(spec,assetId){
 const objects=[{id:'preset_bg_'+spec.id,type:'image',name:'Preset artwork',assetId,visible:true,locked:true,transform:{x:0,y:0,width:240,height:240,anchor:'top-left',rotation:0,opacity:1,zIndex:0}}];
 const add=(type,name,x,y,w,h,extra,z)=>objects.push({id:'preset_'+spec.id+'_'+z,type,name,visible:true,locked:false,transform:{x,y,width:w,height:h,anchor:'top-left',rotation:0,opacity:1,zIndex:z},...extra});
 if(spec.category==='analog'){
  const colors=spec.style==='gold'?{hour:'#e5b869',minute:'#e5b869',second:'#f3d193'}:spec.style==='tactical'?{hour:'#ffffff',minute:'#ffffff',second:'#dc2626'}:{hour:'#f8fafc',minute:'#f8fafc',second:'#ef4444'};
  add('analog-clock','Live analog hands',40,40,160,160,{clockMode:'analog',textStyle:{fontSize:12,fontWeight:400,fill:colors.hour,fontFamily:'system-ui'},handConfig:{hour:{length:58,width:5,tail:5,color:colors.hour},minute:{length:82,width:3,tail:6,color:colors.minute},second:{length:92,width:1.5,tail:18,color:colors.second},centerColor:colors.second,centerRadius:3}},1);
 }else{
  const style=spec.style;
  if(style==='stacked'){add('digital-clock','Hours',52,68,136,52,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH'},textStyle:{fontSize:49,fontWeight:600,fill:'#f8fafc',fontFamily:'system-ui'}},1);add('digital-clock','Minutes',52,119,136,52,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'mm'},textStyle:{fontSize:49,fontWeight:600,fill:'#f8fafc',fontFamily:'system-ui'}},2);add('digital-clock','Seconds',155,105,48,22,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'ss'},textStyle:{fontSize:13,fontWeight:600,fill:'#94a3b8',fontFamily:'system-ui'}},3)}
  if(style==='dual'){add('digital-clock','Hours',30,70,180,60,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH'},textStyle:{fontSize:58,fontWeight:600,fill:'#f7dfb8',fontFamily:'system-ui'}},1);add('digital-clock','Minutes',30,127,180,60,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'mm'},textStyle:{fontSize:58,fontWeight:600,fill:'#e07a38',fontFamily:'system-ui'}},2);add('digital-clock','Seconds',76,183,88,20,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'ss'},textStyle:{fontSize:12,fontWeight:600,fill:'#fbbf24',fontFamily:'system-ui'}},3)}
  if(style==='tall'){add('digital-clock','Hours',38,76,164,75,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH'},textStyle:{fontSize:76,fontWeight:600,fill:'#f9a8d4',fontFamily:'system-ui'}},1);add('digital-clock','Minutes',48,145,154,75,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:':mm'},textStyle:{fontSize:68,fontWeight:600,fill:'#f9a8d4',fontFamily:'system-ui'}},2)}
  if(style==='outline'){add('digital-clock','Hours',26,90,92,76,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH'},textStyle:{fontSize:48,fontWeight:400,fill:'#bef264',fontFamily:'system-ui'}},1);add('digital-clock','Minutes',122,90,92,76,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'mm'},textStyle:{fontSize:48,fontWeight:400,fill:'#bef264',fontFamily:'system-ui'}},2);add('digital-clock','Seconds',78,158,84,25,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'ss'},textStyle:{fontSize:15,fontWeight:600,fill:'#bef264',fontFamily:'system-ui'}},3)}
  if(style==='angled'){/* The 252×48 strip rotates 29° around (143,118) in logical 240px coordinates; vertical bounds are approximately y=77..159. */add('digital-clock','Time',82,34,116,40,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'HH:mm'},textStyle:{fontSize:31,fontWeight:600,fill:'#f8fafc',fontFamily:'system-ui'}},1);add('digital-clock','Seconds',132,164,76,20,{clockMode:'digital',timeFormat:'24h',dataBinding:{source:'time',format:'ss'},textStyle:{fontSize:13,fontWeight:600,fill:'#38bdf8',fontFamily:'system-ui'}},2)}
  const dateY=style==='tall'?220:style==='dual'?207:190;
  const dateSize=style==='tall'||style==='dual'?8:10;
  add('date','Date',45,dateY,150,style==='tall'||style==='dual'?12:18,{dataBinding:{source:'date',format:'ddd, DD MMM YYYY'},textStyle:{fontSize:dateSize,fontWeight:400,fill:spec.style==='dual'?'#e7b887':'#cbd5e1',fontFamily:'system-ui'}},4);
 }
 return objects;
}
root.WfsWatchFacePresets=Object.freeze({SPECS,renderBackground,renderThumbnail,createObjects});
})(typeof globalThis!=='undefined'?globalThis:this);
