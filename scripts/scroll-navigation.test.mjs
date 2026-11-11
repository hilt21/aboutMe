import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dockPinned,navigationVisible,mountScrollNavigation} from '../src/lib/scroll-navigation.ts';

test('pin threshold respects crossing direction and the configured sticky offset',()=>{
  assert.equal(dockPinned(true,0,64),false);
  assert.equal(dockPinned(false,65,64),false);
  assert.equal(dockPinned(false,64,64),true);
  assert.equal(dockPinned(false,-10,64),true);
});
test('focus can keep the compact navigation visible after the rail unpins',()=>{
  assert.equal(navigationVisible(false,false),false);
  assert.equal(navigationVisible(true,false),true);
  assert.equal(navigationVisible(false,true),true);
});

test('observer, focus and teardown drive the same DOM projection',async()=>{
  const original={window:globalThis.window,document:globalThis.document,IntersectionObserver:globalThis.IntersectionObserver,getComputedStyle:globalThis.getComputedStyle};
  const makeTarget=()=>{
    const listeners=new Map(),classes=new Set(),attributes=new Map();
    return {
      hidden:true,inert:true,listeners,classes,attributes,
      addEventListener:(name,handler)=>listeners.set(name,handler),
      removeEventListener:(name,handler)=>{if(listeners.get(name)===handler)listeners.delete(name)},
      classList:{toggle:(name,enabled)=>enabled?classes.add(name):classes.delete(name)},
      contains:target=>target?.inNav===true,
      setAttribute:(name,value)=>attributes.set(name,value),
    };
  };
  const nav=makeTarget(),dock=makeTarget(),sentinel={};
  let observed,rootMargin,disconnected=false;
  const docListeners=new Map();
  globalThis.document={activeElement:null,addEventListener:(name,cb)=>docListeners.set(name,cb),removeEventListener:(name,cb)=>{if(docListeners.get(name)===cb)docListeners.delete(name)}};
  globalThis.getComputedStyle=()=>({top:'64px'});
  globalThis.IntersectionObserver=class {
    constructor(cb,options){this.cb=cb;observed=this;rootMargin=options.rootMargin;}
    observe(el){assert.equal(el,sentinel);}
    disconnect(){disconnected=true;}
    notify(isIntersecting,bottom){this.cb([{isIntersecting,boundingClientRect:{bottom}}]);}
  };
  try{
    const dispose=mountScrollNavigation(nav,dock,sentinel);
    assert.equal(rootMargin,'-64px 0px 0px 0px');
    assert.equal(nav.hidden,false);assert.equal(nav.inert,true);
    assert.equal(nav.attributes.get('aria-hidden'),'true');
    observed.notify(false,20);
    assert.equal(nav.inert,false);assert.equal(nav.classes.has('is-visible'),true);
    assert.equal(dock.classes.has('is-pinned'),true);
    document.activeElement={inNav:true};
    observed.notify(true,200);
    assert.equal(nav.inert,false);assert.equal(dock.classes.has('is-pinned'),false);
    document.activeElement=null;
    nav.listeners.get('focusout')();
    await Promise.resolve();
    assert.equal(nav.inert,true);assert.equal(nav.attributes.get('aria-hidden'),'true');
    assert.equal(nav.classes.has('is-visible'),false);
    observed.notify(false,10);
    dispose();dispose();
    assert.equal(disconnected,true);assert.equal(nav.listeners.size,0);assert.equal(docListeners.size,0);
    const prior=nav.inert;observed.notify(false,10);assert.equal(nav.inert,prior);
  } finally{Object.assign(globalThis,original)}
});
