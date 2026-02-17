
import { format, parse, isValid, differenceInDays, isBefore, isAfter, addDays, startOfDay } from 'date-fns';

const JS_FORMAT = 'dd.MM.yyyy';

export const toSwissDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return format(date, JS_FORMAT);
  } catch {
    return '-';
  }
};

export const fromSwissDate = (swissString: string): string => {
  try {
    const parsed = parse(swissString, JS_FORMAT, new Date());
    if (!isValid(parsed)) return '';
    return format(parsed, 'yyyy-MM-dd');
  } catch {
    return '';
  }
};

export const getDaysUntil = (dateString: string): number => {
  const target = startOfDay(new Date(dateString));
  const today = startOfDay(new Date());
  return differenceInDays(target, today);
};

export const isExpired = (dateString: string): boolean => {
  const target = startOfDay(new Date(dateString));
  const today = startOfDay(new Date());
  return isBefore(target, today);
};

export const isExpiringIn = (dateString: string, days: number): boolean => {
  const target = startOfDay(new Date(dateString));
  const today = startOfDay(new Date());
  const threshold = addDays(today, days);
  return isAfter(target, today) && isBefore(target, threshold);
};
