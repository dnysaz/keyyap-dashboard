'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps {
  url?: string
  username?: string
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const isEmoji = (str: string | undefined) => {
  if (!str) return false
  // Basic emoji detection: not URL and short length
  return !str.startsWith('http') && str.length < 5
}

export default function Avatar({ url, username, className = "", size = 'md' }: AvatarProps) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-sm',
    sm: 'w-8 h-8 text-xl',
    md: 'w-10 h-10 text-2xl',
    lg: 'w-24 h-24 text-5xl',
    xl: 'w-28 h-28 text-6xl'
  }

  const containerClass = cn(
    "rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-orange-50",
    sizeClasses[size],
    className
  )

  if (url && isEmoji(url)) {
    return (
      <div className={containerClass}>
        {url}
      </div>
    )
  }

  if (url) {
    return (
      <img 
        src={url} 
        alt={username || 'Avatar'} 
        className={cn(containerClass, "object-cover")}
      />
    )
  }

  return (
    <div className={cn(containerClass, "bg-orange-100/50 text-orange-600 font-bold")}>
      {username?.[0]?.toUpperCase() || '?'}
    </div>
  )
}
