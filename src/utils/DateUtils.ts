export function isConsecutiveDays(date1: Date, date2: Date, tolerance: number = 1.1): boolean {
  const daysDiff = (date2.valueOf() - date1.valueOf()) / (24 * 60 * 60 * 1000);
  return daysDiff <= tolerance;
}

export function formatDate(date: Date): string {
  return date.toISOString();
}

export function getDateRange(dates: Date[]): { min: Date; max: Date } {
  return {
    min: new Date(Math.min(...dates.map(d => d.valueOf()))),
    max: new Date(Math.max(...dates.map(d => d.valueOf())))
  };
}
