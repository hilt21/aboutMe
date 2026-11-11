import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mountLazyTrain} from '../src/lib/train/TrainBootstrap.ts';

function environment() {
  const previous={window:globalThis.window,document:globalThis.document,IntersectionObserver:globalThis.IntersectionObserver};
  let observer;
  const listeners=new Map();
  const makeTarget=()=>({dataset:{},isConnected:true});
  const mk=(name)=>({addEventListener:(event,fn)=>listeners.set(name+event,fn),removeEventListener:(event,fn)=>{if(listeners.get(name+event)===fn)listeners.delete(name+event)}});
  globalThis.window=mk('window:');globalThis.document=mk('document:');
  globalThis.IntersectionObserver=class {
    constructor(callback){this.callback=callback;observer=this;this.disconnected=false;}
    observe(){this.observed=true;}
    disconnect(){this.disconnected=true;}
    trigger(visible=true){this.callback([{isIntersecting:visible}]);}
  };
  return {target:makeTarget(),observer:()=>observer,listeners,restore(){Object.assign(globalThis,previous)}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('loader mounts exactly once on intersection and releases on pagehide',async()=>{
 const e=environment();
 try{
  let primary=0,svg=0,disposed=0;
  const leave=mountLazyTrain(e.target,async()=>{primary++;return host=>{host.dataset.renderer='webgl';return()=>{disposed++}}},async()=>{svg++;return()=>()=>{}});
  e.observer().trigger(false);assert.equal(primary,0);
  e.observer().trigger(true);e.observer().trigger(true);await flush();
  assert.equal(primary,1);assert.equal(svg,0);assert.equal(e.target.dataset.renderer,'webgl');
  e.listeners.get('window:pagehide')();
  assert.equal(disposed,1);assert.equal(e.listeners.size,0);leave();assert.equal(disposed,1);
 }finally{e.restore()}
});

test('failed primary import or mount uses SVG without duplicate installation',async()=>{
 const e=environment();
 try{
  let svg=0;
  mountLazyTrain(e.target,async()=>{throw Error('chunk unavailable')},async()=>host=>{svg++;host.dataset.renderer='svg-fallback';return()=>{}});
  e.observer().trigger();await flush();
  assert.equal(svg,1);assert.equal(e.target.dataset.renderer,'svg-fallback');
 }finally{e.restore()}
});

test('pending import cannot mount after page navigation',async()=>{
 const e=environment();
 try{
  let resolve, mounted=0,svg=0;
  const pending=new Promise(r=>{resolve=r});
  mountLazyTrain(e.target,()=>pending,async()=>{svg++;return()=>()=>{}});
  e.observer().trigger();e.target.isConnected=false;
  e.listeners.get('document:astro:before-swap')();
  resolve(()=>{mounted++;return()=>{}});
  await flush();
  assert.equal(mounted,0);assert.equal(svg,0);assert.equal(e.listeners.size,0);
 }finally{e.restore()}
});

test('failed primary and SVG loaders leave explicit unavailable state',async()=>{
 const e=environment();
 try{
  mountLazyTrain(e.target,async()=>{throw Error('webgl')},async()=>{throw Error('svg')});
  e.observer().trigger();await flush();
  assert.equal(e.target.dataset.train,'unavailable');
 }finally{e.restore()}
});
