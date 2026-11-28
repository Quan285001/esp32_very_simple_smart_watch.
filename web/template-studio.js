(function(){
'use strict';
const $=s=>document.querySelector(s);
const presetPreviewImages=new Map();
const faces=()=>{
 const original=(window.WfsTemplateFaces?.faces||[]).map(face=>({...face,uploadSupported:true}));
 const extended=(window.WfsExtendedTemplateFaces?.faces||[]).map(face=>({...face,uploadSupported:!!presets()?.SPECS?.some(spec=>spec.id===face.id)}));
 const references=(window.WfsWatchFacePresets?.SPECS||[]).filter(spec=>spec.id.startsWith('ref-')).map(spec=>({
  id:spec.id,category:spec.category,title:spec.name,subtitle:spec.description||'Reference-aligned design',
  defaultBg:spec.bg,uploadSupported:true
 }));
 return [...original,...extended,...references];
};
const presets=()=>window.WfsWatchFacePresets;
let selectedId=null,filter='all',frameTimer=null;
const bg={color:null,sunburst:true,vignette:true,image:null,dim:40,offsetX:0,offsetY:0,scale:1};
function faceById(id){return faces().find(face=>face.id===id)||null}
function renderFace(canvas,id,now){
 if(!canvas||!id)return;
 if(id.startsWith('ref-')){
  const module=presets(),spec=module?.SPECS?.find(item=>item.id===id);if(!spec)return;
  if(typeof module.renderLivePreview==='function'){
   module.renderLivePreview(spec,canvas,now||new Date(),{
    image:bg.image,color:bg.color||spec.bg,dim:bg.dim,sunburst:bg.sunburst,
    vignette:bg.vignette,offsetX:bg.offsetX,offsetY:bg.offsetY,scale:bg.scale
   });
  }else{
   let image=presetPreviewImages.get(id);
   if(!image){image=new Image();image.src=module.renderThumbnail(spec,{image:bg.image,dim:bg.dim,color:bg.color||spec.bg,offsetX:bg.offsetX,offsetY:bg.offsetY,scale:bg.scale});presetPreviewImages.set(id,image)}
   const ctx=canvas.getContext('2d');if(ctx){ctx.clearRect(0,0,canvas.width,canvas.height);if(image.complete&&image.naturalWidth)ctx.drawImage(image,0,0,canvas.width,canvas.height)}
  }
  return;
 }
 const api=id.length===3&&id[0]==='m'&&id.slice(1).split('').every(ch=>ch>='0'&&ch<='9')?window.WfsExtendedTemplateFaces:window.WfsTemplateFaces;
 if(api)api.renderFace(id,canvas,now||new Date());
}
function drawGallery(now){document.querySelectorAll('[data-face-canvas]').forEach(canvas=>{const rect=canvas.getBoundingClientRect();if(rect.bottom>=0&&rect.top<=window.innerHeight&&rect.right>=0&&rect.left<=window.innerWidth)renderFace(canvas,canvas.dataset.faceCanvas,now)})}
function buildGallery(){
 const host=$('#studioFaceGrid');if(!host)return;host.innerHTML='';
 const all=faces(),counts={all:all.length,analog:all.filter(face=>face.category==='analog').length,digital:all.filter(face=>face.category==='digital').length};
 document.querySelectorAll('[data-face-filter]').forEach(button=>{const key=button.dataset.faceFilter;const label=key==='all'?'Tất cả':key==='analog'?'Analog':'Digital';button.textContent=label+' · '+(counts[key]||0)});
 all.forEach(face=>{
  if(filter!=='all'&&face.category!==filter)return;
  const button=document.createElement('button');button.type='button';button.className='studio-face-card';button.setAttribute('aria-label','Tùy chỉnh '+face.title);
  const frame=document.createElement('span');frame.className='studio-face-preview';
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=480;canvas.dataset.faceCanvas=face.id;canvas.setAttribute('aria-hidden','true');frame.append(canvas);
  const meta=document.createElement('span');meta.className='studio-face-meta';const title=document.createElement('strong');title.textContent=face.title.replace(/^\d+\.\s*/,'');const subtitle=document.createElement('small');subtitle.textContent=face.subtitle;
  meta.append(title,subtitle);button.append(frame,meta);button.addEventListener('click',()=>openCustomizer(face.id));host.append(button);
 });drawGallery(new Date());
}
function setFilter(next){filter=next;document.querySelectorAll('[data-face-filter]').forEach(button=>button.classList.toggle('active',button.dataset.faceFilter===filter));buildGallery()}
function applyBackgroundSettings(){[window.WfsTemplateFaces,window.WfsExtendedTemplateFaces].filter(Boolean).forEach(api=>{api.setBackgroundColor(bg.color);api.setSunburst(bg.sunburst);api.setVignette(bg.vignette);api.setDim(bg.dim);api.setBackgroundImage(bg.image);api.setBackgroundPosition(bg.offsetX,bg.offsetY);api.setBackgroundScale?.(bg.scale)})}
function updateImageSelectionBounds(){const selection=$('.studio-image-selection'),preview=$('#studioSelectedCanvas'),bezel=$('.studio-large-bezel');if(!selection||!preview||!bezel)return;selection.hidden=!bg.image;if(!bg.image)return;const width=bg.image.naturalWidth||bg.image.width,height=bg.image.naturalHeight||bg.image.height;if(!width||!height)return;const rect=preview.getBoundingClientRect(),host=bezel.getBoundingClientRect(),cover=Math.max(480/width,480/height)*bg.scale,drawW=width*cover,drawH=height*cover;selection.style.left=(rect.left-host.left+rect.width/2+(bg.offsetX-drawW/2)*rect.width/480)+'px';selection.style.top=(rect.top-host.top+rect.height/2+(bg.offsetY-drawH/2)*rect.height/480)+'px';selection.style.width=(drawW*rect.width/480)+'px';selection.style.height=(drawH*rect.height/480)+'px'}
function renderSettings(){applyBackgroundSettings();$('#studioBgColor').value=bg.color||faceById(selectedId)?.defaultBg||'#08101e';$('#studioSunburst').classList.toggle('active',bg.sunburst);$('#studioVignette').classList.toggle('active',bg.vignette);$('#studioSunburst').textContent='Sunburst: '+(bg.sunburst?'ON':'OFF');$('#studioVignette').textContent='Vignette: '+(bg.vignette?'ON':'OFF');$('#studioDim').value=String(bg.dim);$('#studioDimValue').textContent=bg.dim+'%';const panel=$('#studioImagePanel');if(panel)panel.hidden=!bg.image;const controls=$('#studioImageControls');if(controls)controls.hidden=!bg.image;const scale=$('#studioImageScale');if(scale)scale.value=String(Math.round(bg.scale*100));const scaleValue=$('#studioScaleValue');if(scaleValue)scaleValue.textContent=Math.round(bg.scale*100)+'%';updateImageSelectionBounds()}
function updateSelectedPreview(){renderFace($('#studioSelectedCanvas'),selectedId,new Date())}
function openCustomizer(id){const face=faceById(id);if(!face)return;selectedId=id;$('#studioGallery').hidden=true;$('#studioCustomizer').hidden=false;$('#studioSelectedTitle').textContent=face.title.replace(/^\d+\.\s*/,'');$('#studioSelectedSubtitle').textContent=face.subtitle;$('#studioSelectedCategory').textContent=face.category==='analog'?'ANALOG DIAL':'DIGITAL FACE';const supported=face.uploadSupported;$('#templateCompatibilityNote').hidden=supported;$('#templateSaveBtn').disabled=!supported;$('#templateUploadBtn').disabled=!supported;renderSettings();updateSelectedPreview();scheduleFrame();window.scrollTo({top:0,behavior:'smooth'})}
function showGallery(){selectedId=null;$('#studioCustomizer').hidden=true;$('#studioGallery').hidden=false;window.scrollTo({top:0,behavior:'smooth'});drawGallery(new Date());scheduleFrame()}
function openDevicePage(){
 const workspace=$('.workspace'),studio=$('#templateStudio'),device=$('.studio-device-page');
 if(workspace)workspace.hidden=true;
 if(studio)studio.hidden=false;
 $('#studioGallery').hidden=true;$('#studioCustomizer').hidden=true;
 if(device){device.classList.remove('hidden');device.hidden=false;}
 document.body.dataset.view='device';
 window.scrollTo({top:0,behavior:'smooth'});
}
function returnToTemplateStudio(){
 const device=$('.studio-device-page');
 if(device){device.hidden=true;device.classList.add('hidden');}
 $('#studioGallery').hidden=false;
 if(selectedId)$('#studioCustomizer').hidden=false;
 scheduleFrame();
 const workspace=$('.workspace'),studio=$('#templateStudio');
 if(workspace)workspace.hidden=true;
 if(studio)studio.hidden=false;
 document.body.dataset.view='template-studio';
 window.scrollTo({top:0,behavior:'smooth'});
}
function updateBackground(){presetPreviewImages.clear();applyBackgroundSettings();drawGallery(new Date());updateSelectedPreview();updateImageSelectionBounds()}
function updateDraggedBackground(){applyBackgroundSettings();if(selectedId?.startsWith('ref-'))presetPreviewImages.delete(selectedId);updateSelectedPreview();updateImageSelectionBounds()}
function getPackageSpec(){const spec=presets()?.SPECS?.find(item=>item.id===selectedId);if(!spec)throw Error('Không tìm thấy preset tương ứng trong bộ xuất WFS.');return spec}
async function prepareCurrentDesign(){
 const face=faceById(selectedId);if(!face?.uploadSupported)throw Error('Mẫu này hiện mới có renderer xem trước. Cần bộ chuyển đổi WFS1 và renderer firmware tương ứng trước khi lưu hoặc upload lên đồng hồ.');const spec=getPackageSpec(),module=presets();if(!face||!module?.renderBackground||!module?.createObjects)throw Error('Template renderer hoặc package adapter chưa sẵn sàng.');
 const data=module.renderBackground(spec,{color:bg.color||spec.bg,image:bg.image,dim:bg.dim,sunburst:bg.sunburst,vignette:bg.vignette,offsetX:bg.offsetX,offsetY:bg.offsetY,scale:bg.scale});if(typeof data!=='string'||!data.startsWith('data:image/png'))throw Error('Không thể tạo ảnh nền cho gói WFS.');
 const assetId='template_art_'+selectedId,asset={id:assetId,name:face.title+' artwork.png',data};await saveAsset(asset);const merged=new Map((state.images||[]).map(item=>[item.id,item]));merged.set(assetId,asset);state.images=[...merged.values()];
 const design=blankDesign();design.name=face.title.replace(/^\d+\.\s*/,'');design.canvas.backgroundColor=bg.color||spec.bg;design.metadata={templateId:selectedId,background:{color:bg.color,sunburst:bg.sunburst,vignette:bg.vignette,dim:bg.dim,hasImage:!!bg.image,offsetX:bg.offsetX,offsetY:bg.offsetY,scale:bg.scale}};design.objects=module.createObjects(spec,assetId);
 state.design=design;state.selected=design.objects[1]?.id||design.objects[0]?.id||null;state.history=[];state.future=[];state.lastSnapshot=historySnapshot();saveDraft();return design;
}
async function saveTemplate(){const button=$('#templateSaveBtn');button.disabled=true;try{await prepareCurrentDesign();persistDesign()}catch(error){toast('Không thể lưu: '+error.message)}finally{button.disabled=false}}
async function uploadTemplate(){const button=$('#templateUploadBtn');button.disabled=true;const label=button.textContent;button.textContent='Đang chuẩn bị…';try{await prepareCurrentDesign();button.textContent='Đang tải lên…';await uploadCurrentDesign()}catch(error){toast('Không thể chuẩn bị mặt đồng hồ: '+error.message)}finally{button.disabled=false;button.textContent=label}}
function bind(){
 document.querySelectorAll('[data-face-filter]').forEach(button=>button.addEventListener('click',()=>setFilter(button.dataset.faceFilter)));
 $('#studioBackBtn').addEventListener('click',showGallery);
 $('#studioDeviceNav').onclick=openDevicePage;$('#studioDeviceMobileNav').onclick=openDevicePage;
 $('#backToStudio').addEventListener('click',returnToTemplateStudio);
 document.querySelectorAll('[data-bg]').forEach(button=>button.addEventListener('click',()=>{bg.color=button.dataset.bg;updateBackground();$('#studioBgColor').value=bg.color}));
 $('#studioBgColor').addEventListener('input',event=>{bg.color=event.target.value;updateBackground()});
 $('#studioSunburst').addEventListener('click',()=>{bg.sunburst=!bg.sunburst;renderSettings();updateBackground()});$('#studioVignette').addEventListener('click',()=>{bg.vignette=!bg.vignette;renderSettings();updateBackground()});
 $('#studioImageInput').addEventListener('change',event=>{const file=event.target.files?.[0];if(!file)return;if(file.size>8*1024*1024){toast('Ảnh nền vượt quá giới hạn 8 MB');event.target.value='';return}const reader=new FileReader();reader.onload=()=>{const image=new Image();image.onload=()=>{bg.image=image;bg.offsetX=0;bg.offsetY=0;bg.scale=1;renderSettings();updateBackground()};image.onerror=()=>toast('Không thể đọc ảnh này');image.src=reader.result};reader.onerror=()=>toast('Không thể đọc tệp ảnh');reader.readAsDataURL(file)});
 $('#studioDim').addEventListener('input',event=>{bg.dim=Number(event.target.value);$('#studioDimValue').textContent=bg.dim+'%';updateBackground()});
 $('#studioImageScale').addEventListener('input',event=>{bg.scale=Number(event.target.value)/100;$('#studioScaleValue').textContent=event.target.value+'%';updateBackground()});
 const preview=$('#studioSelectedCanvas'),bezel=$('.studio-large-bezel');let drag=null,resizeDrag=null;
 const selection=document.createElement('div');selection.className='studio-image-selection';selection.hidden=true;selection.setAttribute('aria-label','Image background selection and resize handles');
 ['nw','ne','sw','se'].forEach(corner=>{const handle=document.createElement('button');handle.type='button';handle.className='studio-image-handle handle-'+corner;handle.dataset.imageResize=corner;handle.setAttribute('aria-label','Resize background image '+corner.toUpperCase());selection.append(handle)});bezel.append(selection);
 const finishResize=event=>{if(resizeDrag&&resizeDrag.pointerId===event.pointerId){resizeDrag=null;updateBackground()}};
 selection.querySelectorAll('[data-image-resize]').forEach(handle=>{
  handle.addEventListener('pointerdown',event=>{if(!bg.image)return;event.preventDefault();event.stopPropagation();const rect=preview.getBoundingClientRect(),cx=rect.left+rect.width/2+bg.offsetX*rect.width/480,cy=rect.top+rect.height/2+bg.offsetY*rect.height/480;resizeDrag={pointerId:event.pointerId,centerX:cx,centerY:cy,startDistance:Math.max(1,Math.hypot(event.clientX-cx,event.clientY-cy)),baseScale:bg.scale};handle.setPointerCapture(event.pointerId)});
  handle.addEventListener('pointermove',event=>{if(!resizeDrag||resizeDrag.pointerId!==event.pointerId)return;const distance=Math.hypot(event.clientX-resizeDrag.centerX,event.clientY-resizeDrag.centerY);bg.scale=Math.max(.5,Math.min(3,resizeDrag.baseScale*distance/resizeDrag.startDistance));updateDraggedBackground();renderSettings()});
  handle.addEventListener('pointerup',finishResize);handle.addEventListener('pointercancel',finishResize);handle.addEventListener('lostpointercapture',finishResize);
 });

 preview.addEventListener('pointerdown',event=>{if(!bg.image||event.target.closest('[data-image-resize]'))return;event.preventDefault();const rect=preview.getBoundingClientRect();drag={pointerId:event.pointerId,x:event.clientX,y:event.clientY,baseX:bg.offsetX,baseY:bg.offsetY,width:rect.width,height:rect.height};preview.setPointerCapture(event.pointerId)});
 preview.addEventListener('pointermove',event=>{if(!drag||drag.pointerId!==event.pointerId)return;bg.offsetX=Math.max(-180,Math.min(180,drag.baseX+(event.clientX-drag.x)*480/drag.width));bg.offsetY=Math.max(-180,Math.min(180,drag.baseY+(event.clientY-drag.y)*480/drag.height));updateDraggedBackground()});
 const endDrag=event=>{if(drag&&drag.pointerId===event.pointerId){drag=null;updateBackground()}};
 preview.addEventListener('pointerup',endDrag);preview.addEventListener('pointercancel',endDrag);preview.addEventListener('lostpointercapture',endDrag);
 $('#studioClearImage').addEventListener('click',()=>{bg.image=null;bg.offsetX=0;bg.offsetY=0;bg.scale=1;$('#studioImageInput').value='';renderSettings();updateBackground()});
 $('#studioResetBg').addEventListener('click',()=>{bg.color=null;bg.image=null;bg.offsetX=0;bg.offsetY=0;bg.scale=1;$('#studioImageInput').value='';renderSettings();updateBackground()});
 $('#templateSaveBtn').addEventListener('click',saveTemplate);$('#templateUploadBtn').addEventListener('click',uploadTemplate);
}
function studioViewIsActive(){return !$('#studioGallery').hidden||!$('#studioCustomizer').hidden}
function scheduleFrame(){if(frameTimer!==null||document.visibilityState!=='visible'||!studioViewIsActive())return;const delay=selectedId==='m11'&&!$('#studioCustomizer').hidden?100:($('#studioCustomizer').hidden?66:33);frameTimer=window.setTimeout(()=>{frameTimer=null;if(document.visibilityState!=='visible'||!studioViewIsActive())return;const now=new Date();if(!$('#studioGallery').hidden)drawGallery(now);else if(selectedId&&!$('#studioCustomizer').hidden)updateSelectedPreview();scheduleFrame()},delay)}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){if(frameTimer!==null)window.clearTimeout(frameTimer);frameTimer=null}else scheduleFrame()});
function init(){if(!window.WfsTemplateFaces||!window.WfsExtendedTemplateFaces||!window.WfsWatchFacePresets)return;document.body.dataset.view='template-studio';bind();buildGallery();scheduleFrame()}
window.addEventListener('wfs:ready',init,{once:true});
})();
