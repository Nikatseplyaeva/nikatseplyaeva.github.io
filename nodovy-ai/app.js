import {go, initStory} from './story.mjs';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const imagePrompt=$('#image-prompt'),motionPrompt=$('#motion-prompt'),video=$('#result-video'),terms=$('#terms-dialog');
const defaultPrompt=imagePrompt.value;
const durationInput=$('#video-duration');let durationSeconds=6;
const motions={push:'Плавный медленный наезд камеры. Сохраняй форму кресла и исходную сцену.',pan:'Медленное движение камеры слева направо. Сохраняй форму кресла и исходную сцену.'};
let imageReady=false,imageSent=false,videoReady=false,motion='push',imageJob=null,videoJob=null;
let currentStep=0,completed=false,autoTask=null,autoEpoch=0,autoSuspended=false,autoTimer,toastTimer,imageFailed=false,videoFailed=false;
function notify(text){$('#toast').textContent=text;$('#toast').classList.add('shown');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('shown'),3000)}
function status(selector,text){const el=selector&&$(selector);if(el&&el.textContent!==text)el.textContent=text}
function link(index,on){$(`[data-link="${index}"]`).classList.toggle('connected',on)}
function buttonText(selector,label,mark='↗'){const button=$(selector);button.replaceChildren(document.createTextNode(label+' '));const icon=document.createElement('span');icon.textContent=mark;button.append(icon)}
function updateCompletion(){if(videoReady&&currentStep===4)completed=true;$('#restart-button').classList.toggle('is-complete',completed);$('#restart-button').dataset.complete=String(completed)}
function updatePlayback(){if(videoReady&&currentStep===4&&!terms.open&&!reduced)video.play().catch(()=>{});else video.pause()}
function invalidateVideo(message='Видео появится автоматически на следующем шаге'){
 if(videoJob){videoJob.abort();videoJob=null}
 videoReady=false;videoFailed=false;completed=false;updateCompletion();video.pause();video.hidden=true;video.removeAttribute('src');video.load();
 $('#video-placeholder').hidden=false;$('#video-placeholder').classList.remove('is-loading');$('#download-video').hidden=true;
 $('#video-model').classList.remove('is-running');$('[data-link="3"]').classList.remove('running');link(3,false);
 buttonText('#generate-video','Создать видео');$('#generate-video').removeAttribute('aria-busy');$('#generate-video').disabled=!imageSent;
 
 $('#video-placeholder strong').textContent='Видео появится автоматически';$('#video-placeholder p').textContent='Сначала создадим кадр, затем добавим движение';
}
function invalidateImage(){
 if(imageJob){imageJob.abort();imageJob=null}
 imageReady=false;imageSent=false;imageFailed=false;
 $('#generated-image').hidden=true;$('#image-placeholder').hidden=false;$('#image-placeholder').classList.remove('is-loading');$('#send-image').disabled=true;
 $('#image-model').classList.remove('is-running');$('[data-link="1"]').classList.remove('running');link(0,false);link(1,false);link(2,false);
 $('#video-input-image').hidden=true;$('#empty-input').hidden=false;status('#image-input-status','Ждём готовый кадр');status('#image-connection','○');$('#image-connection').setAttribute('aria-label','Изображение не подключено');
 buttonText('#generate-image','Создать изображение');$('#generate-image').removeAttribute('aria-busy');$('#generate-image').disabled=!imagePrompt.value.trim();
 status('#image-status','Нода запустится автоматически при прокрутке');status('#prompt-status','Готов к передаче');$('#image-placeholder strong').textContent='Изображение появится автоматически';$('#image-placeholder p').textContent='Нода запускается при прокрутке';invalidateVideo();
}
function validatePrompt(announce=true){const valid=!!imagePrompt.value.trim();imagePrompt.setAttribute('aria-invalid',String(!valid));if(!valid){status('#image-status','Добавь описание в первую ноду');if(announce){go(0);imagePrompt.focus({preventScroll:true});notify('Добавь описание изображения')}}return valid}
function connectPrompt(advance=false){if(!validatePrompt(advance))return false;$('#prompt-preview').textContent=imagePrompt.value.trim();status('#prompt-status','Подключён');link(0,true);if(advance)go(1);return true}
function connectImage(advance=false){if(!imageReady)return false;imageSent=true;$('#video-input-image').hidden=false;$('#empty-input').hidden=true;status('#image-input-status','Кадр подключён');status('#image-connection','✓');$('#image-connection').setAttribute('aria-label','Изображение подключено');$('#generate-video').disabled=videoReady||!!videoJob;link(2,true);if(advance)go(3);return true}
function progressRun(controller,duration,statusSelector,messages,buttonSelector){return new Promise(resolve=>{
 const start=performance.now();let timer;const finish=result=>{clearInterval(timer);controller.signal.removeEventListener('abort',abort);resolve(result)};const abort=()=>finish(false);controller.signal.addEventListener('abort',abort,{once:true});
 timer=setInterval(()=>{const p=Math.min(1,(performance.now()-start)/duration);status(statusSelector,messages[Math.min(messages.length-1,Math.floor(p*messages.length))]);$(buttonSelector).lastElementChild.textContent=Math.round(p*100)+'%';if(p===1)finish(true)},40);
})}
async function generateImage(advance=true){
 if(imageJob||!validatePrompt(advance))return false;
 imageReady=false;imageSent=false;imageFailed=false;$('#generated-image').hidden=true;$('#image-placeholder').hidden=false;$('#image-placeholder').classList.add('is-loading');$('#send-image').disabled=true;link(1,false);invalidateVideo();$('#video-input-image').hidden=true;$('#empty-input').hidden=false;status('#image-input-status','Ждём готовый кадр');status('#image-connection','○');$('#image-connection').setAttribute('aria-label','Изображение не подключено');link(2,false);
 $('#image-placeholder strong').textContent='Создаём изображение';$('#image-placeholder p').textContent='Читаем промпт и собираем кадр';
 const controller=new AbortController();imageJob=controller;connectPrompt(false);$('#generate-image').disabled=true;$('#generate-image').setAttribute('aria-busy','true');buttonText('#generate-image','Создаём изображение','0%');$('#image-model').classList.add('is-running');$('[data-link="1"]').classList.add('running');
 const done=await progressRun(controller,1800,'#image-status',['Читаем промпт','Формируем сцену','Проявляем детали'],'#generate-image');if(!done||controller.signal.aborted)return false;
 try{await $('#generated-image').decode();if(controller.signal.aborted)return false;imageReady=true;$('#generated-image').hidden=false;$('#image-placeholder').hidden=true;$('#send-image').disabled=false;link(1,true);status('#image-status','Кадр готов. Он станет входом следующей ноды.');buttonText('#generate-image','Готово','✓');if(advance)go(2)}
 catch{imageFailed=true;status('#image-status','Не удалось загрузить кадр. Можно повторить запуск.');$('#image-placeholder strong').textContent='Не удалось загрузить изображение';$('#image-placeholder p').textContent='Повтори запуск в ноде генерации';notify('Не удалось загрузить демонстрационное изображение')}
 if(imageJob===controller){imageJob=null;$('#generate-image').disabled=imageReady;$('#generate-image').removeAttribute('aria-busy');$('#image-model').classList.remove('is-running');$('#image-placeholder').classList.remove('is-loading');$('[data-link="1"]').classList.remove('running')}
 queueMicrotask(scheduleAuto);return imageReady;
}
function loadVideo(url,controller){return new Promise((resolve,reject)=>{
 const clean=()=>{video.removeEventListener('loadeddata',loaded);video.removeEventListener('error',failed);controller.signal.removeEventListener('abort',aborted)};const loaded=()=>{clean();resolve()};const failed=()=>{clean();reject(new Error('video unavailable'))};const aborted=()=>{clean();reject(new DOMException('Aborted','AbortError'))};
 video.addEventListener('loadeddata',loaded,{once:true});video.addEventListener('error',failed,{once:true});controller.signal.addEventListener('abort',aborted,{once:true});video.src=url;video.preload='auto';video.load();
})}
async function generateVideo(advance=true){
 if(videoJob)return false;if(!imageSent&&!connectImage(false)){if(advance)go(imageReady?2:1);return false}
 if(!motionPrompt.value.trim()){motionPrompt.setAttribute('aria-invalid','true');if(advance){motionPrompt.focus();notify('Опиши движение камеры')}return false}
 invalidateVideo();videoFailed=false;const controller=new AbortController();videoJob=controller;$('#video-placeholder').classList.add('is-loading');$('#video-placeholder strong').textContent='Создаём видео';$('#video-placeholder p').textContent='Добавляем движение к готовому кадру';
 $('#generate-video').disabled=true;$('#generate-video').setAttribute('aria-busy','true');buttonText('#generate-video','Создаём видео','0%');$('#video-model').classList.add('is-running');$('[data-link="3"]').classList.add('running');
 const done=await progressRun(controller,2300,null,['Получаем изображение','Добавляем движение','Собираем ролик'],'#generate-video');if(!done||controller.signal.aborted)return false;
 const seconds=durationSeconds;const url=`assets/pipeline-${motion}${seconds===6?'':`-${seconds}s`}.mp4`;
 try{await loadVideo(url,controller);if(controller.signal.aborted)return false;videoReady=true;video.hidden=false;$('#video-placeholder').hidden=true;$('#download-video').href=url;$('#download-video').download=`nodovy-ai-${seconds}s.mp4`;$('#video-format').textContent=`MP4 · ${seconds} сек`;$('#download-video').hidden=false;link(3,true);buttonText('#generate-video','Готово','✓');if(advance)go(4);updateCompletion();updatePlayback()}
 catch(error){if(error.name!=='AbortError'){videoFailed=true;buttonText('#generate-video','Повторить');$('#video-placeholder strong').textContent='Не удалось загрузить видео';$('#video-placeholder p').textContent='Повтори запуск в ноде анимации';notify('Не удалось загрузить демонстрационный ролик')}}
 if(videoJob===controller){videoJob=null;$('#generate-video').disabled=videoReady;$('#generate-video').removeAttribute('aria-busy');$('#video-model').classList.remove('is-running');$('#video-placeholder').classList.remove('is-loading');$('[data-link="3"]').classList.remove('running')}
 return videoReady;
}
// Catch up dependencies when a visitor scrolls directly to a later step.
// Automatic jobs never change the visitor's scroll position.
function scheduleAuto(){
 if(autoTask||autoSuspended||currentStep<1||terms.open)return;
 const epoch=autoEpoch;
 const task=(async()=>{
  if(!connectPrompt(false))return;
  if(!imageReady&&!imageFailed)await generateImage(false);
  if(epoch!==autoEpoch||autoSuspended)return;
  if(currentStep>=3&&imageReady){connectImage(false);if(!videoReady&&!videoFailed)await generateVideo(false)}
  updateCompletion();updatePlayback();
 })();
 autoTask=task;const finish=()=>{if(autoTask===task)autoTask=null};task.then(finish,finish);
}
function queueAuto(){clearTimeout(autoTimer);autoTimer=setTimeout(scheduleAuto,650)}
function updateDuration(){const value=durationSeconds+' сек';$('#duration-value').textContent=value;durationInput.setAttribute('aria-valuetext',value);durationInput.style.setProperty('--fill',((durationSeconds-3)/7*100)+'%')}
durationInput.addEventListener('input',()=>{durationSeconds=Number(durationInput.value);updateDuration();autoEpoch++;invalidateVideo();queueAuto()});updateDuration();
$('#send-prompt').addEventListener('click',()=>connectPrompt(true));$('#send-image').addEventListener('click',()=>connectImage(true));$('#generate-image').addEventListener('click',()=>generateImage(true));$('#generate-video').addEventListener('click',()=>generateVideo(true));
imagePrompt.addEventListener('input',()=>{autoEpoch++;invalidateImage();$('#prompt-preview').textContent=imagePrompt.value.trim();imagePrompt.removeAttribute('aria-invalid');queueAuto()});
function setMotion(value){autoEpoch++;motion=value;motionPrompt.value=motions[value];$$('[data-motion]').forEach(button=>{const selected=button.dataset.motion===value;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected))});invalidateVideo('Движение выбрано. Ролик обновится автоматически.');motionPrompt.removeAttribute('aria-invalid');queueAuto()}
$$('[data-motion]').forEach(button=>button.addEventListener('click',()=>setMotion(button.dataset.motion)));
motionPrompt.addEventListener('input',()=>{autoEpoch++;invalidateVideo('Инструкция изменена. Ролик обновится автоматически.');motionPrompt.removeAttribute('aria-invalid');queueAuto()});
function reset(){autoEpoch++;autoSuspended=currentStep!==0;autoTask=null;clearTimeout(autoTimer);if(imageJob)imageJob.abort();if(videoJob)videoJob.abort();imageJob=null;videoJob=null;imagePrompt.value=defaultPrompt;motionPrompt.value=motions.push;motion='push';durationSeconds=6;durationInput.value='6';updateDuration();invalidateImage();$$('[data-motion]').forEach(button=>{const selected=button.dataset.motion==='push';button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected))});$('#prompt-preview').textContent=defaultPrompt;imagePrompt.removeAttribute('aria-invalid');motionPrompt.removeAttribute('aria-invalid');go(0)}
$('#restart-button').addEventListener('click',reset);$('.brand').addEventListener('click',event=>{event.preventDefault();go(0)});
$('#terms-button').addEventListener('click',()=>{video.pause();terms.showModal()});$('#close-terms').addEventListener('click',()=>terms.close());$('#terms-done').addEventListener('click',()=>terms.close());terms.addEventListener('close',()=>{updatePlayback();scheduleAuto()});
$('#prompt-preview').textContent=defaultPrompt;status('#prompt-status','Готов к передаче');status('#image-status','Нода запустится автоматически при прокрутке');
initStory({onStep:step=>{currentStep=step;if(step===0)autoSuspended=false;updateCompletion();updatePlayback();scheduleAuto()}});
