import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSlug(id: string, content: string): string {
  if (!id) return ''
  const base = (content || '')
    .replace(/[*_`]/g, '')
    .split(/\s+/)
    .slice(0, 5)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
  const idPart = id.substring(0, 6)
  return `${base || 'post'}-${idPart}`
}
