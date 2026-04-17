'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import StatCard from '@/components/StatCard'
import Avatar from '@/components/Avatar'
import { Users, FileText, Heart, TrendingUp, Search, Menu, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area 
} from 'recharts'
import { format, subDays, isSameDay } from 'date-fns'
import { getSlug } from '@/lib/utils'

export default function OverviewPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    totalLikes: 0,
    todayPosts: 0,
  })
  const [recentPosts, setRecentPosts] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const sevenDaysAgo = subDays(new Date(), 7).toISOString()

        const [
          usersCount, 
          postsCount, 
          likesCount, 
          todayPostsCount,
          usersHistory,
          postsHistory
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('posts').select('*', { count: 'exact', head: true }),
          supabase.from('post_likes').select('*', { count: 'exact', head: true }),
          supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', subDays(new Date(), 1).toISOString()),
          supabase.from('profiles').select('created_at').gte('created_at', sevenDaysAgo),
          supabase.from('posts').select('created_at').gte('created_at', sevenDaysAgo)
        ])

        const { data: latestPosts } = await supabase
          .from('posts')
          .select('*, profiles(username, full_name, avatar_url)')
          .order('created_at', { ascending: false })
          .limit(5)

        const last7Days = Array.from({ length: 7 }).map((_, i) => {
          const date = subDays(new Date(), 6 - i)
          const usersOnDay = usersHistory.data?.filter(u => isSameDay(new Date(u.created_at), date)).length || 0
          const postsOnDay = postsHistory.data?.filter(p => isSameDay(new Date(p.created_at), date)).length || 0
          
          return {
            name: format(date, 'EEE'),
            users: usersOnDay,
            posts: postsOnDay
          }
        })

        setStats({
          totalUsers: usersCount.count || 0,
          totalPosts: postsCount.count || 0,
          totalLikes: likesCount.count || 0,
          todayPosts: todayPostsCount.count || 0
        })
        setRecentPosts(latestPosts || [])
        setChartData(last7Days)
      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-white text-[#444]">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 min-w-0 flex flex-col border-l border-gray-100">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-10">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-gray-400"><Menu className="w-5 h-5" /></button>
            <h1 className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Platform Overview</h1>
            <div className="relative max-w-xs w-full ml-6 hidden sm:block">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
              <input 
                type="text" 
                placeholder="Search command..." 
                className="w-full bg-transparent border-none py-2 pl-6 pr-4 text-[13px] font-medium focus:outline-none placeholder-gray-300"
              />
            </div>
          </div>
          <div className="w-8 h-8 rounded bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center font-bold text-[10px]">AD</div>
        </header>

        <div className="p-10 space-y-12 overflow-y-auto no-scrollbar">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <StatCard name="User Base" value={stats.totalUsers.toLocaleString()} icon={Users} />
            <StatCard name="Total Yaps" value={stats.totalPosts.toLocaleString()} icon={FileText} />
            <StatCard name="Daily Yaps" value={stats.todayPosts.toLocaleString()} icon={TrendingUp} />
            <StatCard name="Appreciations" value={stats.totalLikes.toLocaleString()} icon={Heart} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-6">
               <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                  <h3 className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Activity Trends</h3>
                  <span className="text-[10px] text-gray-400 uppercase font-medium">Last 7 Cycles</span>
               </div>
               <div className="h-[350px] w-full min-w-0 relative">
                 {isMounted && (
                   <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.05}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px'}} />
                    <Area type="monotone" dataKey="users" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" name="Active Users" />
                    <Area type="monotone" dataKey="posts" stroke="#cbd5e1" strokeWidth={2} fillOpacity={0} name="Total Posts" />
                  </AreaChart>
                </ResponsiveContainer>
                 )}
              </div>
            </div>

            <div className="flex flex-col space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                  <h3 className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Live Feed</h3>
               </div>
              <div className="space-y-6 flex-1 overflow-y-auto max-h-[400px] no-scrollbar">
                {recentPosts.map((post) => (
                  <div key={post.id} className="flex gap-4 group">
                    <Avatar url={post.profiles?.avatar_url} username={post.profiles?.username} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-gray-700 group-hover:text-orange-600 transition-colors">@{post.profiles?.username}</p>
                      <p className="text-[11px] text-gray-400 line-clamp-2 mt-1 font-normal leading-relaxed">{post.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full py-3 bg-orange-500 text-white rounded text-[10px] font-medium uppercase tracking-widest hover:bg-orange-600 transition-all">
                Synchronize Data
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
