import {test} from 'node:test';
import assert from 'node:assert/strict';
import {watchFreshness} from '../src/lib/freshness-view.ts';
test('freshness recalculates on visibility, pageshow and hourly checks and tears down',()=>{
  const previous={window:globalThis.window,document:globalThis.document};
  const win=new Map(),doc=new Map();let timer,cleared=false,updates=0;
  const eventTarget=map=>({
    addEventListener:(name,fn)=>map.set(name,fn),
    removeEventListener:(name,fn)=>{if(map.get(name)===fn)map.delete(name)}
  });
  globalThis.window={...eventTarget(win),setInterval(fn,ms){assert.equal(ms,3600000);timer=fn;return 1},
    clearInterval(id){assert.equal(id,1);cleared=true}};
  globalThis.document={...eventTarget(doc),hidden:false};
  try{
    const stop=watchFreshness(()=>updates++);
    assert.equal(updates,1);
    win.get('pageshow')();assert.equal(updates,2);
    document.hidden=true;doc.get('visibilitychange')();assert.equal(updates,2);
    document.hidden=false;doc.get('visibilitychange')();assert.equal(updates,3);
    timer();assert.equal(updates,4);
    stop();stop();
    assert.equal(cleared,true);
    assert.equal(win.size,0);assert.equal(doc.size,0);
    timer();assert.equal(updates,4);
  }finally{Object.assign(globalThis,previous)}
});
