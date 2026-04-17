'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import Avatar from '@/components/Avatar'
import { Search, MoreVertical, Shield, UserX, Menu, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

const USERS_PER_PAGE = 12

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [currentPage, searchTerm])

  async function fetchUsers() {
    setLoading(true)
    const from = (currentPage - 1) * USERS_PER_PAGE
    const to = from + USERS_PER_PAGE - 1

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    
    if (searchTerm) {
      query = query.or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
    }

    const { data, count } = await query
    
    setUsers(data || [])
    setTotalCount(count || 0)
    setLoading(false)
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 min-w-0 flex flex-col border-l border-gray-100">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-400"><Menu className="w-5 h-5" /></button>
            <h1 className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Community Management</h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center font-bold text-[10px]">AD</div>
          </div>
        </header>

        <div className="p-10 space-y-12 overflow-y-auto no-scrollbar">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-gray-50 pb-8">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
              <input 
                type="text" 
                placeholder="Search users..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border-none py-2 pl-8 pr-4 text-sm font-normal focus:outline-none placeholder-gray-300 transition-all font-medium"
              />
            </div>
            <div className="flex items-center gap-4 text-[11px] font-medium text-gray-400 uppercase tracking-widest">
               <span>{totalCount} Total Entries</span>
               {loading && <Loader2 className="w-3 h-3 text-orange-500 animate-spin" />}
            </div>
          </div>

          <div className="animate-in fade-in duration-300">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="py-4 text-[10px] font-medium text-gray-400 uppercase tracking-widest">Profile</th>
                  <th className="py-4 text-[10px] font-medium text-gray-400 uppercase tracking-widest">Privacy</th>
                  <th className="py-4 text-[10px] font-medium text-gray-400 uppercase tracking-widest">Join Date</th>
                  <th className="py-4 text-[10px] font-medium text-gray-400 uppercase tracking-widest text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50/50">
                {users.map((u) => (
                  <tr key={u.id} className="group hover:bg-gray-50/40 transition-all">
                    <td className="py-5 pr-4">
                      <div className="flex items-center gap-4">
                        <Avatar url={u.avatar_url} username={u.username} size="sm" />
                        <div>
                          <p className="text-[13px] font-medium text-gray-700">{u.full_name || u.username}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5 font-normal">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 text-[10px] font-medium uppercase tracking-widest text-gray-400">
                      {u.is_private ? 'Private' : 'Public'}
                    </td>
                    <td className="py-5 text-[11px] font-normal text-gray-400">
                      {format(new Date(u.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button className="p-2 text-gray-300 hover:text-orange-500 transition-colors"><Shield className="w-4 h-4" /></button>
                         <button className="p-2 text-gray-300 hover:text-orange-500 transition-colors"><UserX className="w-4 h-4" /></button>
                         <button className="p-2 text-gray-300 hover:text-orange-500 transition-colors"><MoreVertical className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-12 pt-10 border-t border-gray-50 flex items-center justify-between">
              <span className="text-[10px] text-gray-300 uppercase tracking-widest font-medium">Page {currentPage} of {Math.ceil(totalCount / USERS_PER_PAGE)}</span>
              <div className="flex gap-4">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="bg-orange-500 text-white px-5 py-2 rounded text-[10px] font-medium uppercase tracking-widest hover:bg-orange-600 disabled:opacity-30 transition-all"
                >
                  Previous
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => (prev * USERS_PER_PAGE < totalCount ? prev + 1 : prev))}
                  disabled={currentPage * USERS_PER_PAGE >= totalCount}
                  className="bg-orange-500 text-white px-5 py-2 rounded text-[10px] font-medium uppercase tracking-widest hover:bg-orange-600 disabled:opacity-30 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
