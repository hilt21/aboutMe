import { windowDates } from './chatgpt-activity.ts';

export const ACTIVITY_DAYS = 183;
export type CalendarDay = { date: string; value: number | null; level: number | null };

export function activityCalendar(observations: CalendarDay[], end: string): CalendarDay[] {
  const dates = new Map(observations.map(day => [day.date, day]));
  return windowDates(end, ACTIVITY_DAYS).map(date => dates.get(date) ?? { date, value: null, level: null });
}

// Missing observations break the line; they are never drawn as zero or interpolated.
export function activityTrend(days: CalendarDay[]) {
  const peak = Math.max(1, ...days.map(day => day.value ?? 0));
  const segments: { x: number; y: number; date: string; value: number }[][] = [];
  let current: typeof segments[number] = [];
  for (const [i, day] of days.entries()) {
    if (day.value === null) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push({x: i * 400 / Math.max(1, days.length - 1), y: 94 - day.value / peak * 84, date: day.date, value: day.value});
    }
  }
  if (current.length) segments.push(current);
  return segments.map(points => ({
    points,
    line: points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' '),
    area: `M${points[0].x},100 ${points.map(p => `L${p.x},${p.y}`).join(' ')} L${points.at(-1)!.x},100 Z`
  }));
}
