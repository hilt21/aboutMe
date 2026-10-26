import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
// Only initialize and account/usage/read. No login, thread access or credential handling.
export function readAccountUsage(timeoutMs = 30000, spawnImpl: typeof spawn = spawn): Promise<unknown> {
  return new Promise((resolve,reject) => {
    const child = spawnImpl('codex',['app-server','--stdio'],{stdio:['pipe','pipe','ignore']});
    const lines = createInterface({input:child.stdout});
    let done = false;
    const finish = (error: Error | null, result?: unknown) => {
      if(done) return; done=true; clearTimeout(timer); lines.close(); child.kill();
      if(error) reject(error); else resolve(result);
    };
    const timer = setTimeout(()=>finish(new Error('App Server timed out; previous snapshot retained')),timeoutMs);
    child.on('error',()=>finish(new Error('Codex executable unavailable')));
    child.on('exit',()=>finish(new Error('App Server exited before usage response')));
    const send = (value:unknown) => child.stdin.write(JSON.stringify(value)+'\n');
    child.stdin.on('error',()=>finish(new Error('App Server transport failed')));
    lines.on('line',line=>{
      let response; try{response=JSON.parse(line);}catch{return;}
      if(response.id===1){
        if(response.error){finish(new Error('App Server initialization rejected'));return;}
        send({method:'initialized'}); send({id:2,method:'account/usage/read'});
      }
      if(response.id===2) finish(response.error?new Error('Account usage unavailable (authentication/access/network)'):null,response.result);
    });
    send({id:1,method:'initialize',params:{clientInfo:{name:'aboutme_activity',version:'1.0'},capabilities:{experimentalApi:true}}});
  });
}
