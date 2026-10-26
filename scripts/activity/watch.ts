import { setTimeout as delay } from 'node:timers/promises';
import { syncActivity } from './sync.ts';
const args=process.argv.slice(2);
const once=args.includes('--once');
const intervalIndex=args.indexOf('--interval-minutes');
const minutes=intervalIndex<0?360:Number(args[intervalIndex+1]);
if(!Number.isFinite(minutes)||minutes<1) throw new Error('Interval must be at least one minute');
let stopping=false;
const controller=new AbortController();
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{stopping=true;controller.abort();});
do {
  try {await syncActivity([]);}catch {console.error('Activity refresh failed; retained last valid snapshot.');if(once)process.exitCode=1;}
  if(once||stopping)break;
  await delay(minutes*60000, undefined, {signal:controller.signal}).catch(error=>{if(error.name!=='AbortError')throw error;});
}while(!stopping);
