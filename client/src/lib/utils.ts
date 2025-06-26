import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hours ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} weeks ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} months ago`;
}

export function formatTargetDate(targetDate: string | undefined): string {
  if (!targetDate) {
    return 'Unknown date';
  }
  
  try {
    // 如果是YYYY-MM-DD格式的字符串，直接解析以避免时区问题
    if (targetDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = targetDate.split('-').map(Number);
      const date = new Date(year, month - 1, day); // month - 1 因为月份是0-indexed
      return format(date, 'MMM dd, yyyy');
    } else {
      // 其他格式的日期字符串
      const date = new Date(targetDate);
      return format(date, 'MMM dd, yyyy');
    }
  } catch {
    return 'Invalid date';
  }
}
