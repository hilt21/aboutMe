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
