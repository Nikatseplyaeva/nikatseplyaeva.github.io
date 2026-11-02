import {fitLayout, orbitPose} from './layout.mjs';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const story=$('#story'),scene=$('#scene'),copy=$('#lesson-copy'),graph=$('#lesson-graph');
const chapters=$$('.chapter'),nodes=[$('.prompt-node'),$('#image-model'),$('#image-card'),$('#video-model'),$('#video-card')],wires=$$('.wire');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=v=>Math.min(1,Math.max(0,v)),mix=(a,b,t)=>a+(b-a)*t,ease=t=>t*t*(3-2*t);
let progress=0,shown=0,active=-1,frame=0,started=false,overview=false,onStep=()=>{};
// The same five nodes remain on the canvas; scrolling moves the focus along it.
const desktop=[
[[.50,.43,1.15,1],[.73,.50,.25,0],[.60,.50,.18,0],[.75,.50,.18,0],[.75,.50,.15,0]],
[[.23,.50,.78,1],[.73,.50,1.05,1],[.70,.50,.20,0],[.75,.50,.18,0],[.75,.50,.15,0]],
[[.14,.70,.20,.18],[.25,.50,.60,.8],[.65,.50,.95,1],[.80,.50,.20,0],[.85,.50,.15,0]],
[[.08,.82,.13,.07],[.15,.72,.30,.30],[.35,.50,.60,1],[.76,.50,.95,1],[.86,.50,.15,0]],
[[.17,.90,.10,0],[.08,.84,.14,.02],[.14,.73,.24,.12],[.23,.50,.68,.9],[.72,.50,.95,1]]
];
const mobile=[
[[.50,.50,1,1],[.50,.50,.20,0],[.50,.50,.15,0],[.50,.50,.15,0],[.50,.50,.15,0]],
[[.16,.50,.28,.4],[.65,.50,1,1],[.50,.50,.15,0],[.50,.50,.15,0],[.50,.50,.15,0]],
[[.14,.76,.12,.06],[.15,.70,.14,.10],[.50,.50,1,1],[.50,.50,.15,0],[.50,.50,.15,0]],
[[.10,.86,.10,0],[.13,.76,.12,.05],[.16,.16,.18,.4],[.50,.52,.92,1],[.50,.50,.15,0]],
[[.17,.90,.10,0],[.08,.84,.10,0],[.14,.78,.13,.07],[.17,.12,.15,.3],[.50,.57,.95,1]]
];
const allDesktop=[[.08,.5,.28,1],[.26,.5,.42,1],[.43,.5,.38,1],[.64,.5,.50,1],[.85,.5,.42,1]];
const allMobile=[[.17,.25,.40,1],[.50,.25,.45,1],[.83,.25,.30,1],[.30,.72,.45,1],[.74,.72,.32,1]];
function scrollRange(){return story.offsetHeight-innerHeight+$('.header').offsetHeight}
export function go(index){overview=false;$('#overview-button').setAttribute('aria-pressed','false');scrollTo({top:story.offsetTop-$('.header').offsetHeight+(index+.035)/5*scrollRange(),behavior:reduced?'instant':'smooth'});requestRender()}
function measureCopy(){copy.style.height=Math.ceil(Math.max(...chapters.map(el=>el.offsetHeight))+22)+'px'}
function requestRender(){if(started&&!frame)frame=requestAnimationFrame(render)}
function onScroll(){progress=clamp((scrollY-story.offsetTop+$('.header').offsetHeight)/scrollRange());requestRender()}
function setActive(index){if(active===index)return;active=index;scene.dataset.step=index;chapters.forEach((el,i)=>{el.inert=i!==index;el.setAttribute('aria-hidden',String(i!==index))});$$('.header [data-step]').forEach((el,i)=>{el.classList.toggle('active',i===index);if(i===index)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current')});onStep(index)}
function render(){frame=0;shown=reduced?progress:mix(shown,progress,.18);if(Math.abs(shown-progress)<.00005)shown=progress;
 const w=graph.clientWidth,h=graph.clientHeight,small=innerWidth<=700,frames=small?mobile:desktop,q=Math.min(4,shown*5),a=Math.floor(q),b=Math.min(4,a+1),t=ease(clamp((q-a-.45)/.55));setActive(t>.5?b:a);
 const dimensions=nodes.map(el=>({width:el.offsetWidth,height:el.offsetHeight}));
 const bounds={width:w,height:h,padding:small?12:22,maxScale:small?Math.min(1,w/370):Math.min(1.15,w/1280)};
 const from=fitLayout(overview?(small?allMobile:allDesktop):frames[a],dimensions,bounds),to=fitLayout(overview?(small?allMobile:allDesktop):frames[b],dimensions,bounds),positions=[];
 nodes.forEach((el,i)=>{const pose=orbitPose(from[i],to[i],t,{width:w,height:h,nodeWidth:el.offsetWidth,nodeHeight:el.offsetHeight,padding:bounds.padding,depthFrom:overview?0:Math.max(0,a-i-1),depthTo:overview?0:Math.max(0,b-i-1)});const {x,y,s,o,angle}=pose;el.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%) rotate(${angle}deg) scale(${s})`;el.style.opacity=o;el.style.pointerEvents=o>.7?'auto':'none';el.inert=o<=.7;el.setAttribute('aria-hidden',String(o<=.7));positions.push({...pose,w:el.offsetWidth*s,h:el.offsetHeight*s})});
 chapters.forEach((el,i)=>{const o=a===b?(i===a?1:0):i===a?clamp(1-t*2.4):i===b?clamp((t-.58)/.42):0;el.style.opacity=o;el.style.visibility=o>.001?'visible':'hidden';el.style.translate=`0 ${i===a?-12*t:12*(1-t)}px`});
 wires.forEach((wire,i)=>{const p=positions[i],n=positions[i+1],r1=p.angle*Math.PI/180,r2=n.angle*Math.PI/180,x1=p.x+(p.w/2+7)*Math.cos(r1),y1=p.y+(p.w/2+7)*Math.sin(r1),x2=n.x-(n.w/2+10)*Math.cos(r2),y2=n.y-(n.w/2+10)*Math.sin(r2),dx=Math.max(30,Math.abs(x2-x1)*.45);wire.setAttribute('d',`M${x1} ${y1} C${x1+dx} ${y1} ${x2-dx} ${y2} ${x2} ${y2}`);const opacity=Math.min(p.o,n.o);wire.style.opacity=opacity*.9;wire.style.strokeDashoffset=String(1-Math.min(1,opacity*1.8));});
 $('.reading-progress i').style.width=Math.min(100,shown*100)+'%';
 if(Math.abs(shown-progress)>.00005)requestRender();
}
export async function initStory(options={}){onStep=options.onStep||(()=>{});await Promise.all([document.fonts.ready,$('#generated-image').decode().catch(()=>{})]);measureCopy();onScroll();shown=progress;started=true;render();document.documentElement.dataset.ready='true';
 const observer=new ResizeObserver(()=>{measureCopy();requestRender()});chapters.forEach(el=>observer.observe(el));nodes.forEach(el=>observer.observe(el));
}
addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',()=>{measureCopy();requestRender()});
$$('.header [data-step]').forEach(button=>button.addEventListener('click',()=>go(+button.dataset.step)));
$('#overview-button').addEventListener('click',()=>{overview=!overview;$('#overview-button').setAttribute('aria-pressed',String(overview));requestRender()});
document.addEventListener('keydown',event=>{if(event.target.matches('textarea,input')||$('#terms-dialog').open||event.altKey||event.ctrlKey||event.metaKey)return;if(event.key==='ArrowRight'){event.preventDefault();go(Math.min(4,active+1))}if(event.key==='ArrowLeft'){event.preventDefault();go(Math.max(0,active-1))}});
