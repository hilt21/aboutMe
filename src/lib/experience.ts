// Calendar-year estimates anchored to user-confirmed values, not employment dates.
export function experienceYears(baseYears:number,baselineYear:number,currentYear:number){return Math.max(0,baseYears+currentYear-baselineYear);}
export function profileYear(now=new Date()){return Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Shanghai'}).format(now));}
