import { readFile, mkdir, open, rename, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { activitySchema, adaptOfficial, adaptAnalytics, emptyActivity, mergeActivity } from '../../src/lib/chatgpt-activity.ts';
import { readAccountUsage } from './app-server.ts';

export async function atomicSnapshot(path: string, value: unknown) {
  const validated = activitySchema.parse(value);
  await mkdir(dirname(path),{recursive:true});
  const temp=path+'.'+process.pid+'.tmp';
  try {
    const file=await open(temp,'wx',0o600);
    try{await file.writeFile(JSON.stringify(validated,null,2)+'\n'); await file.sync();}finally{await file.close();}
    await rename(temp,path);
  } finally {await unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
}
export async function syncActivity(args = process.argv.slice(2), readUsage = readAccountUsage) {
  if (args.some(x=>!['--analytics','--allow-analytics','--input','--output'].includes(x) && x.startsWith('--'))) throw new Error('Unknown option');
  const value=(key:string)=>{const i=args.indexOf(key);if(i<0)return null;if(!args[i+1] || args[i+1].startsWith('--'))throw new Error('Missing option value');return args[i+1];};
  const analytics=args.includes('--analytics');
  if (analytics && !args.includes('--allow-analytics')) throw new Error('Analytics opt-in required');
  const input=value('--input');
  if(analytics && !input) throw new Error('Analytics requires a local aggregate export');
  const target=resolve(value('--output')??`src/data/${analytics?'chatgpt-analytics':'chatgpt-activity'}.json`);
  // Lock across the entire read/merge/write transaction; never publish raw input.
  await mkdir(dirname(target),{recursive:true});
  const lock=await open(target+'.lock','wx',0o600);
  try {
    const raw=input?JSON.parse(await readFile(resolve(input),'utf8')):await readUsage();
    const now=new Date().toISOString();
    const incoming=analytics?adaptAnalytics(raw,now,true):adaptOfficial(raw,now);
    let previous=emptyActivity(analytics?'workspace-turns':'tokens');
    try{previous=activitySchema.parse(JSON.parse(await readFile(target,'utf8')));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
    const end=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const result=mergeActivity(previous,incoming,end);
    await atomicSnapshot(target,result);
    console.log(JSON.stringify({status:'synced',source:result.source,days:result.daily.length,stats_as_of:result.stats_as_of,last_synced_at:result.last_synced_at}));
    return result;
  } finally {await lock.close();await unlink(target+'.lock');}
}
if(process.argv[1] && resolve(process.argv[1])===resolve(import.meta.filename)) syncActivity().catch(()=>{console.error('Activity sync failed: access, input validation, or lock error. Previous snapshot retained.');process.exitCode=1;});
