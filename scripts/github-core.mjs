export function parseCalendar(html){
 const counts = new Map([...html.matchAll(/<tool-tip[^>]*for="([^"]+)"[^>]*>([\s\S]*?)<\/tool-tip>/g)].map(m=>[m[1],Number(m[2].replace(/<[^>]*>/g,'').trim().match(/^(\d+) contribution/)?.[1]||0)]));
 const cells=[...html.matchAll(/<td\b([^>]*data-date="[^\"]+"[^>]*)>/g)];
 const calendar=cells.map(m=>{const a=m[1];return {date:a.match(/data-date="([^"]+)"/)[1],level:Number(a.match(/data-level="(\d)"/)?.[1]||0),count:counts.get(a.match(/id="([^"]+)"/)?.[1])||0}}).sort((a,b)=>a.date.localeCompare(b.date));
 if(calendar.length<300 || calendar.some(d=>d.level>0&&d.count===0)) throw Error('Contribution calendar markup changed');
 const total=Number(html.match(/([\d,]+)\s+contributions\s+in the last year/)?.[1]?.replaceAll(',',''));
 if(!Number.isFinite(total))throw Error('Contribution total unavailable');
 return {calendar,total};
}
export function failedSnapshot(previous,error,now){return {...previous,lastAttemptAt:now,status:previous.updatedAt?'stale':'unavailable',error};}
