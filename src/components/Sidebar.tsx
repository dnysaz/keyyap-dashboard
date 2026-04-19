'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  BarChart3, 
  Settings, 
  Megaphone,
  LogOut,
  X,
  Database
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Posts', href: '/posts', icon: FileText },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Ads Manager', href: '/ads', icon: Megaphone },
  { name: 'Supabase', href: '/supabase', icon: Database },
]

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { logout } = useAuth()

  const SidebarContent = (
    <>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            K
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">KeyYap <span className="text-orange-500 text-xs font-black uppercase ml-1">Admin</span></span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => onClose?.()}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-orange-50 text-orange-600" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-orange-600" : "text-gray-400")} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-gray-100">
        <button 
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
          <aside className="fixed inset-y-0 left-0 w-full max-w-xs bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            {SidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
