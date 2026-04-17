'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import StatCard from '@/components/StatCard'
import { 
  BarChart3, 
  Users, 
  FileText, 
  TrendingUp, 
  Menu,
  Activity,
  Hash,
  Download,
  Loader2
} from 'lucide-react'
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

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [growthData, setGrowthData] = useState<any[]>([])
  const [hashtagData, setHashtagData] = useState<any[]>([])
  
  const [stats, setStats] = useState({
    userGrowth: 0,
    postGrowth: 0,
    avgEngagement: 0,
    totalEngagement: 0
  })

  useEffect(() => {
    setIsMounted(true)
    fetchAnalyticsData()
  }, [])

  async function fetchAnalyticsData() {
    setLoading(true)
    try {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString()
      const sevenDaysAgo = subDays(new Date(), 7).toISOString()

      const [
        usersData,
        postsData,
        likesData,
        commentsData,
        trendingData
      ] = await Promise.all([
        supabase.from('profiles').select('created_at').gte('created_at', thirtyDaysAgo),
        supabase.from('posts').select('created_at').gte('created_at', thirtyDaysAgo),
        supabase.from('post_likes').select('created_at').gte('created_at', sevenDaysAgo),
        supabase.from('comments').select('created_at').gte('created_at', sevenDaysAgo),
        supabase.from('trending').select('hashtag, post_count').order('post_count', { ascending: false }).limit(6)
      ])

      const last14Days = Array.from({ length: 14 }).map((_, i) => {
        const date = subDays(new Date(), 13 - i)
        const dateString = format(date, 'yyyy-MM-dd')
        
        const dayUsers = usersData.data?.filter(u => 
          format(new Date(u.created_at), 'yyyy-MM-dd') === dateString
        ).length || 0
        
        return {
          name: format(date, 'MMM dd'),
          Users: dayUsers
        }
      })

      setGrowthData(last14Days)
      setHashtagData(trendingData.data || [])

      const totalLikes = likesData.data?.length || 0
      const totalComments = commentsData.data?.length || 0
      setStats({
        userGrowth: usersData.data?.length || 0,
        postGrowth: postsData.data?.length || 0,
        totalEngagement: totalLikes + totalComments,
        avgEngagement: (totalLikes + totalComments) / Math.max(1, postsData.data?.length || 1)
      })

    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }

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
            <h1 className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Analytics & Insights</h1>
          </div>
          <button className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded text-[10px] font-medium uppercase tracking-widest hover:bg-orange-600 transition-all">
            <Download className="w-3 h-3" />
            Export Data
          </button>
        </header>

        <div className="p-10 space-y-12 overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <StatCard name="Monthly Growth" value={`+${stats.userGrowth}`} icon={Users} />
            <StatCard name="Index Velocity" value={stats.postGrowth} icon={FileText} />
            <StatCard name="Engagement Rate" value={stats.totalEngagement} icon={Activity} />
            <StatCard name="Conversion" value={stats.avgEngagement.toFixed(1)} icon={TrendingUp} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                  <h3 className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Performance Metrics</h3>
               </div>
              <div className="h-[350px] w-full min-w-0 relative">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthData}>
                      <defs>
                        <linearGradient id="colorUsersAn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f36c1e" stopOpacity={0.05}/>
                          <stop offset="95%" stopColor="#f36c1e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px'}} />
                      <Area type="monotone" dataKey="Users" stroke="#f36c1e" strokeWidth={2} fillOpacity={1} fill="url(#colorUsersAn)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="flex flex-col space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                  <h3 className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Global Hashtags</h3>
               </div>
              <div className="space-y-6">
                {hashtagData.map((tag, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-medium text-gray-300">0{i + 1}</span>
                      <p className="text-[12px] font-medium text-gray-700">#{tag.hashtag}</p>
                    </div>
                    <span className="text-[11px] font-normal text-gray-400">{tag.post_count} Yaps</span>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-orange-50/50 border border-orange-100/50 rounded mt-auto">
                 <p className="text-[10px] font-medium text-orange-600 uppercase tracking-widest mb-2">Platform Insight</p>
                 <p className="text-[11px] text-orange-800 leading-relaxed font-normal italic">
                   "User retention is increasing during late hours. Recommend boosting server resources around 9 PM."
                 </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
