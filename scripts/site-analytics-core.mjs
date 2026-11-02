export const ANALYTICS_HOST = 'hilt21.github.io';
export const ANALYTICS_PATH = '/aboutMe/';
export const WINDOW_DAYS = 30;
export const RECENT_DAYS = 3;
export const RECOVERY_DAYS = 7;
const DAY_MS = 86400000;
const API = 'https://api.cloudflare.com/client/v4/graphql';
const QUERY = [
  'query DailySiteTraffic($accountTag:string!, $siteTag:string!, $host:string!, $path:string!, $day:Date!) {',
  'viewer { accounts(filter:{accountTag:$accountTag}) {',
  'rumPageloadEventsAdaptiveGroups(limit:2,',
  'filter:{siteTag:$siteTag,requestHost:$host,requestPath:$path,date_geq:$day,date_leq:$day}) {',
  'count sum{visits} avg{sampleInterval} dimensions{date requestHost requestPath}',
  '} } } }'
].join(' ');

export function utcDay(now = new Date()) {
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid date');
  return now.toISOString().slice(0, 10);
}
const ms = day => Date.parse(day + 'T00:00:00Z');
const dateAt = timestamp => new Date(timestamp).toISOString().slice(0, 10);
export const windowDates = (now = new Date()) => {
  const today = ms(utcDay(now));
  return Array.from({length:WINDOW_DAYS},(_,i)=>dateAt(today-(WINDOW_DAYS-i)*DAY_MS));
};
function daysAgo(date, now) { return Math.round((ms(utcDay(now)) - ms(date))/DAY_MS); }
function count(value) {
  if (!Number.isSafeInteger(value) || value<0) throw new Error('Invalid count');
  return value;
}
export function assertHistory(history) {
  if (history.schemaVersion!==1 || history.source!=='cloudflare-web-analytics' ||
    history.host!==ANALYTICS_HOST || history.path!==ANALYTICS_PATH ||
    !/^\d{4}-\d{2}-\d{2}$/.test(history.telemetryStartedAt) ||
    !Array.isArray(history.records)) throw new Error('Invalid history header');
  let prev='';
  for (const r of history.records) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date) || r.date<=prev || r.date<history.telemetryStartedAt ||
      count(r.pageViews)<0 || count(r.visits)<0 || r.sampleInterval!==1 ||
      !['final','provisional'].includes(r.state) ||
      typeof r.observedAt!=='string' || !Number.isFinite(Date.parse(r.observedAt)) ||
      !['archived-snapshot','cloudflare-rum'].includes(r.origin) ||
      (r.origin==='archived-snapshot' && !/^[a-f0-9]{40}$/.test(r.evidenceCommit||'')))
      throw new Error('Invalid or unordered verified daily history');
    prev=r.date;
  }
  return history;
}

export function mergeHistory(history, observations, now = new Date()) {
  assertHistory(history);
  const today = utcDay(now);
  const entries = new Map(history.records.map(x=>[x.date,{...x}]));
  const incoming = new Set();
  for (const observation of observations) {
    const {date,pageViews,visits,sampleInterval} = observation;
    if (incoming.has(date)) throw new Error('Duplicate Cloudflare date');
    incoming.add(date);
    if (date>=today || date<history.telemetryStartedAt || daysAgo(date,now)>RECOVERY_DAYS)
      throw new Error('Cloudflare observation outside allowed window');
    const previous = entries.get(date);
    if (previous?.state==='final') continue;
    // Sampling can produce estimates and zero-looking gaps. Never replace an unsampled record with one.
    if (sampleInterval!==1) continue;
    entries.set(date,{
      date,pageViews:count(pageViews),visits:count(visits),sampleInterval:1,
      state:daysAgo(date,now)>RECENT_DAYS?'final':'provisional',
      observedAt:now.toISOString(),origin:'cloudflare-rum'
    });
  }
  for (const record of entries.values()) {
    if (record.state==='provisional' && daysAgo(record.date,now)>RECENT_DAYS)
      record.state='final';
  }
  const next={...history,records:[...entries.values()].sort((a,b)=>a.date.localeCompare(b.date))};
  return assertHistory(next);
}

export function buildSnapshot(history, now = new Date(), {status='ok', lastAttemptAt=now.toISOString(), error=null} = {}) {
  assertHistory(history);
  const dates=windowDates(now), recordMap=new Map(history.records.map(x=>[x.date,x]));
  const daily=dates.map(date=>{
    const r=recordMap.get(date);
    return r
      ? {date,pageViews:r.pageViews,visits:r.visits,sampleInterval:1,state:r.state}
      : {date,pageViews:null,visits:null,sampleInterval:null,state:date<history.telemetryStartedAt?'outside':'missing'};
  });
  const eligible=daily.filter(x=>x.state!=='outside');
  const known=eligible.filter(x=>x.pageViews!==null);
  const totals=known.length ? {
    pageViews:known.reduce((sum,r)=>sum+r.pageViews,0),
    visits:known.reduce((sum,r)=>sum+r.visits,0)
  }:null;
  const coverage={from:eligible[0]?.date||null,expectedDays:eligible.length,knownDays:known.length,missingDays:eligible.length-known.length,complete:eligible.length>0&&known.length===eligible.length};
  return {
    schemaVersion:2,source:history.source,status,updatedAt:now.toISOString(),lastAttemptAt,error,
    host:ANALYTICS_HOST,path:ANALYTICS_PATH,
    period:{from:dates[0],to:dates.at(-1),timeZone:'UTC'},
    totals,coverage,sampled:false,daily
  };
}

export async function collectDailyObservations({token,accountTag,siteTag,fetchImpl=fetch,now=new Date()}) {
  if (!token || !accountTag || !siteTag) throw new Error('Cloudflare analytics credentials are not configured');
  const dates=windowDates(now).slice(-RECOVERY_DAYS);
  const observations=[];
  for (const date of dates) {
    const response=await fetchImpl(API,{
      method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({query:QUERY,variables:{accountTag,siteTag,host:ANALYTICS_HOST,path:ANALYTICS_PATH,day:date}}),
      signal:AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error('Cloudflare GraphQL HTTP '+response.status);
    const body=await response.json();
    if (body.errors?.length) throw new Error('Cloudflare GraphQL returned errors');
    const accounts=body.data?.viewer?.accounts;
    if (!Array.isArray(accounts) || accounts.length!==1) throw new Error('Unexpected Cloudflare accounts');
    const rows=accounts[0].rumPageloadEventsAdaptiveGroups;
    if (!Array.isArray(rows) || rows.length>1) throw new Error('Unexpected Cloudflare daily groups');
    if (rows.length===0) continue; // Missing is unknown; never turn an omitted group into a verified zero.
    const row=rows[0],d=row.dimensions;
    if (d?.date!==date || d.requestHost!==ANALYTICS_HOST || d.requestPath!==ANALYTICS_PATH ||
      !Number.isFinite(row.avg?.sampleInterval) || row.avg.sampleInterval<1) throw new Error('Untrusted Cloudflare row');
    observations.push({date,pageViews:count(row.count),visits:count(row.sum?.visits),sampleInterval:row.avg.sampleInterval});
  }
  return observations;
}

export async function refreshSiteAnalytics({history,token,accountTag,siteTag,fetchImpl=fetch,now=new Date()}) {
  const observations=await collectDailyObservations({token,accountTag,siteTag,fetchImpl,now});
  const next=mergeHistory(history,observations,now);
  return {history:next,snapshot:buildSnapshot(next,now),observations};
}
