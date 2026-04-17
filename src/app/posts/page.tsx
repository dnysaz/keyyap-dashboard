'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import Avatar from '@/components/Avatar'
import { 
  FileText, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  MessageCircle,
  Heart,
  Menu,
  Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format, subDays, isSameDay } from 'date-fns'
import { getSlug } from '@/lib/utils'
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area 
} from 'recharts'

const POSTS_PER_PAGE = 12

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPosts, setTotalPosts] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    fetchPostsData()
    fetchChartData()
  }, [currentPage])

  async function fetchChartData() {
    try {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString()
      const { data: postsHistory } = await supabase
        .from('posts')
        .select('created_at')
        .gte('created_at', sevenDaysAgo)

      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const date = subDays(new Date(), 6 - i)
        const count = postsHistory?.filter(p => isSameDay(new Date(p.created_at), date)).length || 0
        
        return {
          name: format(date, 'EEE'),
          posts: count
        }
      })
      setChartData(last7Days)
    } catch (err) {
      console.error('Error fetching chart data:', err)
    }
  }

  async function fetchPostsData() {
    setLoading(true)
    try {
      const from = (currentPage - 1) * POSTS_PER_PAGE
      const to = from + POSTS_PER_PAGE - 1

      let query = supabase
        .from('posts')
        .select('*, profiles(username, full_name, avatar_url)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (searchQuery) {
        query = query.ilike('content', `%${searchQuery}%`)
      }

      const { data, count, error } = await query
      if (error) throw error

      setPosts(data || [])
      setTotalPosts(count || 0)
    } catch (err) {
      console.error('Error fetching posts:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchPostsData()
  }

  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE)

  return (
    <div className="flex min-h-screen bg-white text-[#444]">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 min-w-0 flex flex-col border-l border-gray-100">
        {/* Unified Quiet Header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-10 sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-gray-400"><Menu className="w-5 h-5" /></button>
            <h1 className="text-[11px] font-medium uppercase tracking-widest text-gray-400">Content Management</h1>
            <form onSubmit={handleSearch} className="relative max-w-xs w-full ml-6 hidden sm:block">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
              <input 
                type="text" 
                placeholder="Search yaps..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none py-2 pl-6 pr-4 text-[13px] font-medium focus:outline-none placeholder-gray-300 transition-all font-medium"
              />
            </form>
          </div>
          <div className="w-8 h-8 rounded bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center font-bold text-[10px]">AD</div>
        </header>

        <div className="p-10 space-y-12 overflow-y-auto no-scrollbar">
          {/* Subtle Chart */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
               <h3 className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Post Velocity</h3>
               <span className="text-[10px] text-gray-400 uppercase font-medium">Last 7 Cycles</span>
            </div>
            <div className="h-[200px] w-full min-w-0 relative">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%" minHeight={200} debounce={100}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPostsP" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f36c1e" stopOpacity={0.05}/>
                      <stop offset="95%" stopColor="#f36c1e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px'}} />
                  <Area type="monotone" dataKey="posts" stroke="#f36c1e" strokeWidth={2} fillOpacity={1} fill="url(#colorPostsP)" />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Clean Posts Table */}
          <div className="animate-in fade-in duration-300">
            <table className="w-full text-left order-collapse">
              <thead>
                <tr className="border-b border-gray-50 text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                  <th className="py-4">Author</th>
                  <th className="py-4 w-1/3">Content Entry</th>
                  <th className="py-4">Location</th>
                  <th className="py-4">Activity</th>
                  <th className="py-4 text-right">Published At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-[11px] text-gray-300 uppercase tracking-widest">Synchronizing Feed...</td>
                  </tr>
                ) : posts.length > 0 ? (
                  posts.map((post) => (
                    <tr key={post.id} className="group hover:bg-gray-50/30 transition-all">
                      <td className="py-5">
                        <div className="flex items-center gap-3">
                          <Avatar url={post.profiles?.avatar_url} username={post.profiles?.username} size="sm" />
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-gray-700 truncate max-w-[120px]">
                              {post.profiles?.full_name || post.profiles?.username}
                            </p>
                            <p className="text-[11px] text-gray-400 font-normal">@{post.profiles?.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5">
                        <a 
                          href={`${process.env.NEXT_PUBLIC_APP_URL}/u/${post.profiles?.username}/${getSlug(post.id, post.content)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[13px] text-gray-600 line-clamp-2 leading-relaxed hover:text-orange-500 transition-colors font-normal"
                        >
                          {post.content}
                        </a>
                      </td>
                      <td className="py-5 text-[11px] text-gray-400 font-normal">
                        {post.location_name ? (
                          <div className="flex items-center gap-1.5 opacity-70">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[100px]">{post.location_name.split(',')[0]}</span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="py-5">
                        <div className="flex items-center gap-4 text-gray-300">
                           <div className="flex items-center gap-1.5 text-[11px]">
                             <Heart className="w-3.5 h-3.5" />
                             {post.likes_count || 0}
                           </div>
                           <div className="flex items-center gap-1.5 text-[11px]">
                             <MessageCircle className="w-3.5 h-3.5" />
                             {post.comments_count || 0}
                           </div>
                        </div>
                      </td>
                      <td className="py-5 text-right">
                        <p className="text-[11px] text-gray-700 font-medium">{format(new Date(post.created_at), 'MMM dd, yyyy')}</p>
                        <p className="text-[10px] text-gray-400 font-normal mt-0.5">{format(new Date(post.created_at), 'HH:mm')}</p>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-gray-300 text-[11px] uppercase tracking-widest">No entries found</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Style Sync */}
            <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] text-gray-300 uppercase tracking-widest font-medium">Cycle {currentPage} of {totalPages}</span>
              <div className="flex gap-4">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="bg-orange-500 text-white px-6 py-2 rounded text-[10px] font-medium uppercase tracking-widest hover:bg-orange-600 disabled:opacity-30 transition-all shadow-sm"
                >
                  Back
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-orange-500 text-white px-6 py-2 rounded text-[10px] font-medium uppercase tracking-widest hover:bg-orange-600 disabled:opacity-30 transition-all shadow-sm"
                >
                  Forward
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
