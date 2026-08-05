import { format, formatDistanceToNow, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date, formatStr: string = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy h:mm a');
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'h:mm a');
}

export function getRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function isUpcoming(date: string | Date): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isAfter(d, new Date());
}

export function isPast(date: string | Date): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isBefore(d, new Date());
}

export function getEventStatus(start_time: string, end_time: string): 'upcoming' | 'ongoing' | 'completed' {
  const now = new Date();
  const start = parseISO(start_time);
  const end = parseISO(end_time);

  if (isBefore(now, start)) return 'upcoming';
  if (isAfter(now, end)) return 'completed';
  return 'ongoing';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getDaysUntil(date: string | Date): number {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function generateDateRange(days: number): Date[] {
  return Array.from({ length: days }, (_, i) => addDays(new Date(), i));
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), wait);
  };
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-gray-100 text-gray-800',
    banned: 'bg-red-100 text-red-800',
    published: 'bg-green-100 text-green-800',
    draft: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
    registered: 'bg-blue-100 text-blue-800',
    attended: 'bg-green-100 text-green-800',
    absent: 'bg-red-100 text-red-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    upcoming: 'bg-blue-100 text-blue-800',
    ongoing: 'bg-green-100 text-green-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800',
    manager: 'bg-blue-100 text-blue-800',
    president: 'bg-amber-100 text-amber-800',
    vice_president: 'bg-orange-100 text-orange-800',
    treasurer: 'bg-emerald-100 text-emerald-800',
    secretary: 'bg-cyan-100 text-cyan-800',
    member: 'bg-gray-100 text-gray-800',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}

export function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    meeting: 'Meeting',
    workshop: 'Workshop',
    social: 'Social Event',
    competition: 'Competition',
    fundraiser: 'Fundraiser',
    other: 'Other',
  };
  return labels[type] || type;
}

export function getMembershipRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    president: 'President',
    vice_president: 'Vice President',
    treasurer: 'Treasurer',
    secretary: 'Secretary',
    manager: 'Manager',
    member: 'Member',
  };
  return labels[role] || role;
}
