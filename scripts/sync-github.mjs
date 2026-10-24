import {readFile,writeFile,rename} from 'node:fs/promises';
import {parseCalendar,failedSnapshot} from './github-core.mjs';
const path=new URL('../src/data/github.json',import.meta.url);
let previous={schemaVersion:1,source:'github-public',updatedAt:null,lastAttemptAt:new Date().toISOString(),status:'unavailable',error:null,calendar:[],totalContributions:null,repositories:null};
try{previous=JSON.parse(await readFile(path,'utf8'));}catch{}
const get=async(url,json=true)=>{const r=await fetch(url,{headers:{'User-Agent':'hilt21-aboutMe',...(json?{Accept:'application/vnd.github+json'}:{})},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`Source returned HTTP ${r.status}`);return json?r.json():r.text()};
const now=new Date().toISOString();let result;
try{const [html,user]=await Promise.all([get('https://github.com/users/hilt21/contributions',false),get('https://api.github.com/users/hilt21')]);const {calendar,total}=parseCalendar(html);result={schemaVersion:1,source:'github-public',updatedAt:now,lastAttemptAt:now,status:'ok',error:null,calendar,totalContributions:total,repositories:user.public_repos};}
catch(e){result=failedSnapshot(previous,e.message,now);console.error('Refresh failed; retained last valid snapshot.');process.exitCode=1;}
await writeFile(new URL('github.json.tmp',path),JSON.stringify(result,null,2)+'\n');await rename(new URL('github.json.tmp',path),path);
console.log(JSON.stringify({status:result.status,days:result.calendar.length,updatedAt:result.updatedAt}));
