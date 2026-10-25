import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'No date'
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'Invalid date'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'No date'
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'Invalid date'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return 'No date'
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'Invalid date'
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) {
    const absDays = Math.abs(diffDays)
    if (absDays === 1) return 'Yesterday'
    if (absDays < 7) return `${absDays} days ago`
    return formatDate(date)
  }
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays < 7) return `In ${diffDays} days`
  if (diffDays < 14) return 'Next week'
  return formatDate(date)
}

export function getInitials(name: string): string {
  if (!name) return 'SO'
  return name
    .split(' ')
    .filter(Boolean)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(str: string, length: number): string {
  if (!str) return ''
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'NOT_STARTED': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    case 'READY_TO_SUBMIT': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    case 'SUBMITTED': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
    case 'COMPLETED': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    case 'CANCELLED': return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }
}

export function getStatusLabel(status: string): string {
  if (!status) return ''
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'URGENT': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200'
    case 'HIGH': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200'
    case 'MEDIUM': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200'
    case 'LOW': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200'
    default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }
}

export function isOverdue(deadline: Date | string | null | undefined, status: string): boolean {
  if (!deadline) return false
  if (['SUBMITTED', 'COMPLETED', 'CANCELLED'].includes(status)) return false
  return new Date(deadline) < new Date()
}
