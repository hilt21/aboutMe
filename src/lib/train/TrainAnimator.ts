export const CYCLE_SECONDS=10;
export function baseSpeed(width:number,halfWidth:number){return (width+2*halfWidth)/CYCLE_SECONDS;}
export function advancePosition(x:number,dt:number,width:number,halfWidth:number,speed=baseSpeed(width,halfWidth)){
 const next=x+speed*dt,span=width+2*halfWidth;
 return next-halfWidth>width?((next+halfWidth)%span)-halfWidth:next;
}
// One motion controller shared by WebGL and SVG. Actual scroll, including touch
// and keyboard scrolling, changes speed. Scroll stops decay back to cruise.
export function createScrollMotion(){
 let previousY=window.scrollY,previousTime=performance.now(),input=0,multiplier=1,min=1,max=1,boost=0;
 const onScroll=()=>{const now=performance.now(),y=window.scrollY;const velocity=(y-previousY)/Math.max((now-previousTime)/1000,1/120);previousY=y;previousTime=now;input=Math.max(-.75,Math.min(2,velocity/850));};
 const onPointer=(event:PointerEvent)=>{if(event.isPrimary===false||event.button!==0)return;boost=Math.min(2,boost+1.25);};
 window.addEventListener('scroll',onScroll,{passive:true});
 window.addEventListener('pointerdown',onPointer,{passive:true});
 return {step(dt:number,width:number,halfWidth:number){
  if(performance.now()-previousTime>120)input*=Math.exp(-dt*5);
  const target=Math.max(.25,Math.min(3,1+input+boost));boost*=Math.exp(-dt*2.2);multiplier+=(target-multiplier)*(1-Math.exp(-dt*9));
  min=Math.min(min,multiplier);max=Math.max(max,multiplier);
  return {speed:baseSpeed(width,halfWidth)*multiplier,multiplier,min,max};
 },dispose(){window.removeEventListener('scroll',onScroll);window.removeEventListener('pointerdown',onPointer)}};
}
