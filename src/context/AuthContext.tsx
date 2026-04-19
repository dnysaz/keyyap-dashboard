'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  isAuthenticated: boolean
  user: any
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Initial session check
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      handleAuthChange(session)
      setIsLoading(false)
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthChange = (session: any) => {
    if (session?.user) {
      // If admin email is set in env, verify it
      if (ADMIN_EMAIL && session.user.email !== ADMIN_EMAIL) {
        supabase.auth.signOut()
        setUser(null)
        setIsAuthenticated(false)
        return
      }
      setUser(session.user)
      setIsAuthenticated(true)
    } else {
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && pathname !== '/login') {
        router.push('/login')
      } else if (isAuthenticated && pathname === '/login') {
        router.push('/')
      }
    }
  }, [isAuthenticated, pathname, isLoading, router])

  const login = async (email: string, pass: string) => {
    // 1. Check if email matches admin email (optional client side check)
    if (ADMIN_EMAIL && email !== ADMIN_EMAIL) {
      return { success: false, error: 'Access denied: You are not authorized to access this dashboard.' }
    }

    // 2. Perform Supabase Login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass
    })

    if (error) {
      return { success: false, error: error.message }
    }

    if (data.user) {
      return { success: true }
    }
    
    return { success: false, error: 'Login failed' }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

