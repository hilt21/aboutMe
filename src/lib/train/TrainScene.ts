import {reducedMotion} from './MotionPreference';
import * as T from 'three';
import {mountFallback} from './TrainFallback';
import {createTrain} from './TrainModel';
import {advancePosition,createScrollMotion} from './TrainAnimator';
export function mountTrain(host:HTMLElement){
 const target=host.querySelector<HTMLElement>('.train-canvas')!;
 const probe=document.createElement('canvas').getContext('webgl2');
 if(!probe)return mountFallback(host);
 probe.getExtension('WEBGL_lose_context')?.loseContext();
 let renderer:T.WebGLRenderer;
 try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return mountFallback(host);}
 host.dataset.renderer='webgl';
 renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;target.append(renderer.domElement);
 const scene=new T.Scene();const camera=new T.OrthographicCamera(0,100,80,-12,.1,1000);camera.position.set(0,0,200);
 scene.add(new T.AmbientLight(0xffffff,2.2));const light=new T.DirectionalLight(0xfff5df,3);light.position.set(-30,80,100);scene.add(light);
 const train=createTrain();scene.add(train.root);
 let width=host.clientWidth,scale=width<600?.66:.82,x=width*.29,frame=0,last=0,time=0,distance=0,visible=false,disposed=false;
 const motion=createScrollMotion();
 const media=matchMedia('(prefers-reduced-motion: reduce)');
 function resize(){width=host.clientWidth;scale=width<600?.66:.82;renderer.setSize(width,92);camera.right=width;camera.updateProjectionMatrix();train.root.scale.setScalar(scale);x=Math.min(x,width+80);render(0);}
 function render(dt:number){
  const movement=motion.step(dt,width,90*scale);const travel=reducedMotion(media)?0:movement.speed*dt;
  if(!reducedMotion(media)){time+=dt;distance+=travel;x=advancePosition(x,dt,width,90*scale,movement.speed);}
  host.dataset.trainSpeed=movement.speed.toFixed(2);host.dataset.trainMultiplier=movement.multiplier.toFixed(3);host.dataset.trainMin=movement.min.toFixed(3);host.dataset.trainMax=movement.max.toFixed(3);
  train.root.position.x=x;
  train.body.position.y=reducedMotion(media)?0:Math.sin(time*16)*.22;
  train.wheels.forEach(w=>{if(!reducedMotion(media))w.rotation.z-=travel/(w.userData.radius*scale);});
  train.rod.position.y=9+(reducedMotion(media)?0:Math.sin(distance/(9*scale))*1.5);
  train.smoke.forEach((s,i)=>{const p=(time*.5+i/4)%1;s.visible=!reducedMotion(media)&&width>500;s.position.set(51-p*31,60+p*23,0);s.scale.setScalar(.4+p*1.2);(s.material as T.MeshBasicMaterial).opacity=(1-p)*.2;});
  renderer.render(scene,camera);host.dataset.trainX=x.toFixed(2);host.dataset.trainTime=time.toFixed(2);
 }
 function tick(now:number){if(disposed)return;const dt=last?Math.min((now-last)/1000,.1):0;last=now;render(dt);frame=requestAnimationFrame(tick);}
 function update(){cancelAnimationFrame(frame);frame=0;last=0;const active=visible&&!document.hidden&&!reducedMotion(media)&&!disposed;host.dataset.train=disposed?'disposed':active?'running':reducedMotion(media)?'reduced':'paused';if(active)frame=requestAnimationFrame(tick);else if(!disposed)render(0);}
 const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update();});intersection.observe(host);
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
 media.addEventListener('change',update);document.addEventListener('visibilitychange',update);
 const lost=(e:Event)=>{e.preventDefault();cancelAnimationFrame(frame);host.dataset.train='fallback';renderer.domElement.style.visibility='hidden';};renderer.domElement.addEventListener('webglcontextlost',lost);
 const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();
 function dispose(){if(disposed)return;disposed=true;motion.dispose();cancelAnimationFrame(frame);intersection.disconnect();resizeObserver.disconnect();media.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);renderer.domElement.removeEventListener('webglcontextlost',lost);scene.traverse(obj=>{if(obj instanceof T.Mesh){geometries.add(obj.geometry);(Array.isArray(obj.material)?obj.material:[obj.material]).forEach(m=>materials.add(m));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();host.dataset.train='disposed';window.removeEventListener('pagehide',dispose);document.removeEventListener('astro:before-swap',dispose);}
 window.addEventListener('pagehide',dispose);document.addEventListener('astro:before-swap',dispose);resize();update();return dispose;
}
