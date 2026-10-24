import {test} from 'node:test';import assert from 'node:assert/strict';import {advancePosition,baseSpeed,createScrollMotion} from '../src/lib/train/TrainAnimator.ts';
test('60 Hz and 144 Hz cover the same distance',()=>{const run=hz=>{let x=0;for(let i=0;i<hz*3;i++)x=advancePosition(x,1/hz,1000,90);return x};assert.ok(Math.abs(run(60)-run(144))<1e-8);assert.ok(Math.abs(run(60)-354)<1e-8)});
test('desktop and mobile complete a cruise cycle in ten seconds',()=>{for(const width of [320,1064]){const half=74;let x=-half;for(let i=0;i<600;i++)x=advancePosition(x,1/60,width,half);assert.ok(Math.abs(x-(width+half))<1e-7||Math.abs(x+half)<1e-7);assert.equal(baseSpeed(width,half)*10,width+2*half)}});
test('reset preserves overshoot after the full envelope leaves',()=>{assert.equal(advancePosition(1080,0,1000,90),1080);assert.equal(advancePosition(1091,0,1000,90),-89)});

test('scroll speeds up, slows down without reversing, settles, and cleans up',()=>{
 const oldWindow=globalThis.window,oldPerformance=globalThis.performance;let now=0;const listeners=new Map();
 globalThis.performance={now:()=>now};globalThis.window={scrollY:0,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name)}};
 try{const motion=createScrollMotion();const step=()=>{now+=1000/60;return motion.step(1/60,1000,90)};
 now=16;window.scrollY=200;listeners.get('scroll')();let fast;for(let i=0;i<6;i++)fast=step();assert.ok(fast.multiplier>1);
 now+=16;window.scrollY=0;listeners.get('scroll')();let slow;for(let i=0;i<35;i++)slow=step();assert.ok(slow.multiplier<1);assert.ok(slow.speed>0);assert.ok(slow.min>=.25);assert.ok(slow.max<=3);
 let settled;for(let i=0;i<300;i++)settled=step();assert.ok(Math.abs(settled.multiplier-1)<.001);motion.dispose();assert.equal(listeners.size,0);
 }finally{globalThis.window=oldWindow;globalThis.performance=oldPerformance}
});

test('mouse and touch each accelerate once, stack within cap, and recover',()=>{
 const oldWindow=globalThis.window,oldPerformance=globalThis.performance;let now=0;const listeners=new Map();
 globalThis.performance={now:()=>now};globalThis.window={scrollY:0,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 try{const motion=createScrollMotion();const step=()=>{now+=1000/60;return motion.step(1/60,375,60)};const pointer=listeners.get('pointerdown');
 pointer({button:2,isPrimary:true,pointerType:'mouse'});assert.equal(step().multiplier,1);
 pointer({button:0,isPrimary:true,pointerType:'mouse'});let fast;for(let i=0;i<15;i++)fast=step();assert.ok(fast.multiplier>1.5);
 pointer({button:0,isPrimary:true,pointerType:'touch'});window.scrollY=100;listeners.get('scroll')();for(let i=0;i<15;i++)fast=step();assert.ok(fast.multiplier>1.5);assert.ok(fast.max<=3);
 let settled;for(let i=0;i<360;i++)settled=step();assert.ok(Math.abs(settled.multiplier-1)<.001);motion.dispose();assert.equal(listeners.size,0);
 }finally{globalThis.window=oldWindow;globalThis.performance=oldPerformance}
});
