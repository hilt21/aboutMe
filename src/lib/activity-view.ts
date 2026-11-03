import { windowDates } from './chatgpt-activity.ts';

export const ACTIVITY_DAYS = 183;
export type CalendarDay = { date: string; value: number | null; level: number | null };

export function activityCalendar(observations: CalendarDay[], end: string): CalendarDay[] {
  const dates = new Map(observations.map(day => [day.date, day]));
  return windowDates(end, ACTIVITY_DAYS).map(date => dates.get(date) ?? { date, value: null, level: null });
}

export function formatTokenBillions(value: number | null): string {
  return value === null ? '—' : `${(value / 1e9).toFixed(1)}B`;
}

export function calendarDayTitle(day: CalendarDay, metric: string, locale: 'en' | 'zh', displayEnd: string): string {
  const metricLabel = locale === 'zh' ? (metric === 'tokens' ? 'Token' : metric === 'contributions' ? '贡献' : metric) : metric;
  if (day.value !== null) return `${day.date}: ${day.value.toLocaleString('en-US')} ${metricLabel}`;
  if (metric !== 'tokens') return `${day.date}: ${locale === 'zh' ? '未知' : 'Unknown'}`;
  const missing = day.date === displayEnd
    ? (locale === 'zh' ? '来源尚未提供每日 Token' : 'Daily tokens not yet provided by source')
    : (locale === 'zh' ? '来源未提供每日 Token' : 'Daily tokens not provided by source');
  return `${day.date}: ${missing}`;
}
