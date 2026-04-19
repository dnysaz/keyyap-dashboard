'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import StatCard from '@/components/StatCard'
import { 
  Database, 
  HardDrive, 
  Activity, 
  Menu,
  Server,
  Loader2,
  RefreshCw,
  Box,
  Globe
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
import { format, subDays } from 'date-fns'

export default function SupabaseMonitorPage() {
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [chartData, setChartData] = useState<any[]>([])
  
  const [dbMetrics, setDbMetrics] = useState({
    userCount: 0,
    postCount: 0,
    commentCount: 0,
    likeCount: 0,
    bucketSizeMap: {} as Record<string, string>,
    estimatedDbSize: "Calculating...",
  })

  const [platformMetrics, setPlatformMetrics] = useState<any>(null)
  const [platformLoading, setPlatformLoading] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    fetchMetrics()
    fetchPlatformMetrics()
    fetchChartData()
  }, [])

  async function fetchMetrics() {
    setLoading(true)
    try {
      // 1. Fetch rough table rows to estimate impact
      const [
        usersData,
        postsData,
        commentsData,
        likesData
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('comments').select('id', { count: 'exact', head: true }),
        supabase.from('post_likes').select('id', { count: 'exact', head: true }),
      ])

      // 2. Fetch buckets info via standard JS Client
      // Note: Full bucket size tracking usually requires a DB function or Management API.
      // We will mock the sizing for the display until token is integrated.
      const { data: buckets } = await supabase.storage.listBuckets()
      
      const bucketInfo: Record<string, string> = {}
      if (buckets) {
        for (const bucket of buckets) {
          bucketInfo[bucket.name] = "Active"
        }
      }

      setDbMetrics({
        userCount: usersData.count || 0,
        postCount: postsData.count || 0,
        commentCount: commentsData.count || 0,
        likeCount: likesData.count || 0,
        bucketSizeMap: bucketInfo,
        estimatedDbSize: `${(((postsData.count || 0) + (commentsData.count || 0)) * 0.05).toFixed(2)} MB` // rough estimation for display
      })

    } catch (err) {
      console.error('Error fetching supabase metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchChartData() {
    try {
      const [postsRes, likesRes, commentsRes, usersRes] = await Promise.all([
        supabase.from('posts').select('created_at').gte('created_at', subDays(new Date(), 14).toISOString()),
        supabase.from('post_likes').select('created_at').gte('created_at', subDays(new Date(), 14).toISOString()),
        supabase.from('comments').select('created_at').gte('created_at', subDays(new Date(), 14).toISOString()),
        supabase.from('profiles').select('created_at').gte('created_at', subDays(new Date(), 14).toISOString()),
      ])

      const last14Days = Array.from({ length: 14 }).map((_, i) => {
        const date = subDays(new Date(), 13 - i)
        const dateStr = format(date, 'yyyy-MM-dd')
        const label = format(date, 'MMM dd')

        const posts = postsRes.data?.filter(d => format(new Date(d.created_at), 'yyyy-MM-dd') === dateStr).length || 0
        const likes = likesRes.data?.filter(d => format(new Date(d.created_at), 'yyyy-MM-dd') === dateStr).length || 0
        const comments = commentsRes.data?.filter(d => format(new Date(d.created_at), 'yyyy-MM-dd') === dateStr).length || 0
        const users = usersRes.data?.filter(d => format(new Date(d.created_at), 'yyyy-MM-dd') === dateStr).length || 0

        return { name: label, Activity: posts + likes + comments, Users: users }
      })

      setChartData(last14Days)
    } catch (err) {
      console.error('Chart data error:', err)
    }
  }

  async function fetchPlatformMetrics() {
    setPlatformLoading(true)
    try {
      const res = await fetch('/api/supabase-metrics')
      if (res.ok) {
        const data = await res.json()
        setPlatformMetrics(data)
      }
    } catch {
      // Keep null to show locked state if it fails
    } finally {
      setPlatformLoading(false)
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
            <h1 className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Supabase Monitoring</h1>
          </div>
          <button onClick={() => { fetchMetrics(); fetchPlatformMetrics() }} className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded text-[10px] font-medium uppercase tracking-widest hover:bg-orange-600 transition-all">
            <RefreshCw className="w-3 h-3" />
            Refresh Data
          </button>
        </header>

        <div className="p-10 space-y-12 overflow-y-auto no-scrollbar">

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Activity Chart */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <h3 className="text-[11px] font-medium uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-orange-500" />
                  Platform Activity (14 Days)
                </h3>
              </div>
              <div className="h-[220px] w-full">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f36c1e" stopOpacity={0.08}/>
                          <stop offset="95%" stopColor="#f36c1e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px'}} />
                      <Area type="monotone" dataKey="Activity" stroke="#f36c1e" strokeWidth={2} fillOpacity={1} fill="url(#colorActivity)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* User Growth Chart */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <h3 className="text-[11px] font-medium uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <Server className="w-4 h-4 text-sky-500" />
                  New Registrations (14 Days)
                </h3>
              </div>
              <div className="h-[220px] w-full">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.08}/>
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px'}} />
                      <Area type="monotone" dataKey="Users" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
          
          {/* Main Database Stats */}
          <div>
            <div className="flex items-center justify-between border-b border-gray-50 pb-4 mb-8">
              <h3 className="text-[11px] font-medium uppercase tracking-widest text-gray-500 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                Database Engine Status
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Online</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <StatCard name="Profile Records" value={dbMetrics.userCount} icon={Server} />
              <StatCard name="Total Posts" value={dbMetrics.postCount} icon={Database} />
              <StatCard name="Comments" value={dbMetrics.commentCount} icon={Activity} />
              <StatCard name="Estimated DB Size" value={dbMetrics.estimatedDbSize} icon={HardDrive} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* Storage Buckets Panel */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                  <h3 className="text-[11px] font-medium uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Box className="w-4 h-4 text-orange-500" />
                    Storage Buckets
                  </h3>
               </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(platformMetrics?.buckets?.length > 0 ? platformMetrics.buckets : Object.entries(dbMetrics.bucketSizeMap).map(([name, status]) => ({ name, public: true, file_size_limit: null, allowed_mime_types: null }))).map((bucket: any) => (
                  <div key={bucket.name} className="p-5 border border-gray-100 rounded-xl bg-gray-50/50 flex flex-col gap-2 relative overflow-hidden group">
                    <div className="w-1 absolute left-0 top-0 bottom-0 bg-orange-400" />
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-bold text-gray-800 capitalize">{bucket.name}</span>
                      <span className="text-[10px] text-green-600 font-bold tracking-widest uppercase bg-green-50 px-2 py-0.5 rounded">
                        {bucket.public ? 'Public' : 'Private'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Max upload: {bucket.file_size_limit ? `${(bucket.file_size_limit / (1024 * 1024)).toFixed(0)} MB` : 'Unlimited'}
                    </p>
                    {bucket.allowed_mime_types && (
                      <p className="text-[10px] text-gray-400 truncate">{bucket.allowed_mime_types.join(', ')}</p>
                    )}
                  </div>
                ))}
                {!platformMetrics?.buckets && Object.keys(dbMetrics.bucketSizeMap).length === 0 && (
                  <div className="p-6 border border-dashed border-gray-200 rounded text-center col-span-2">
                    <p className="text-sm text-gray-400">No buckets found or restricted access.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Management API Integration Notice */}
            <div className="flex flex-col space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                  <h3 className="text-[11px] font-medium uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-500" />
                    Platform Traffic
                  </h3>
               </div>
              
              {platformLoading ? (
                <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl flex-1 flex items-center justify-center">
                  <div className="spinner border-orange-500/20 border-t-orange-500 w-6 h-6" />
                </div>
              ) : platformMetrics ? (
                <div className="p-6 border border-sky-100 bg-sky-50/20 rounded-xl flex-1 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Server Status</p>
                      <p className="text-[13px] font-bold text-gray-800">{platformMetrics.activeStatus}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Region</p>
                      <p className="text-[13px] font-bold text-gray-800">{platformMetrics.region}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Database Engine</p>
                      <p className="text-[13px] font-bold text-gray-800">PostgreSQL {platformMetrics.database?.postgres_engine || '15'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Release Channel</p>
                      <p className="text-[13px] font-bold text-gray-800 uppercase">{platformMetrics.database?.release_channel}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-sky-100/50 flex items-center justify-between">
                     <span className="text-[11px] text-sky-600 font-medium">Management API Connected</span>
                     <div className="flex gap-1.5">
                       <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
                       <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping animation-delay-500" />
                     </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl flex-1 flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-sky-500 to-purple-500" />
                  <LockIcon className="w-8 h-8 text-gray-600" />
                  <div>
                    <h4 className="text-white text-[13px] font-bold mb-1">Advanced Cloud Metrics</h4>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      Authenticate with a Supabase Personal Access Token to unlock real-time Server and Database engine stats.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* New: Quota & Usage Section */}
          {platformMetrics?.usage && (
            <div>
              <div className="flex items-center justify-between border-b border-gray-50 pb-4 mb-8">
                <h3 className="text-[11px] font-medium uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-orange-500" />
                  Resource Usage & Quotas
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="p-6 border border-gray-100 rounded-xl bg-white shadow-sm">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3">Database Egress (Bandwidth)</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {(platformMetrics.usage.db_egress?.usage / (1024 * 1024)).toFixed(2)} <span className="text-sm font-normal text-gray-400">MB</span>
                  </p>
                  <div className="w-full h-1 bg-gray-100 rounded-full mt-4 overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (platformMetrics.usage.db_egress?.usage / platformMetrics.usage.db_egress?.limit) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-6 border border-gray-100 rounded-xl bg-white shadow-sm">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3">Storage Egress</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {(platformMetrics.usage.storage_egress?.usage / (1024 * 1024)).toFixed(2)} <span className="text-sm font-normal text-gray-400">MB</span>
                  </p>
                  <div className="w-full h-1 bg-gray-100 rounded-full mt-4 overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (platformMetrics.usage.storage_egress?.usage / platformMetrics.usage.storage_egress?.limit) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-6 border border-gray-100 rounded-xl bg-white shadow-sm">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3">Monthly Active Users</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {platformMetrics.usage.monthly_active_users?.usage} <span className="text-sm font-normal text-gray-400">/ {platformMetrics.usage.monthly_active_users?.limit}</span>
                  </p>
                  <div className="w-full h-1 bg-gray-100 rounded-full mt-4 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (platformMetrics.usage.monthly_active_users?.usage / platformMetrics.usage.monthly_active_users?.limit) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* New: Auth Configuration Section */}
          {platformMetrics?.auth && (
            <div>
              <div className="flex items-center justify-between border-b border-gray-50 pb-4 mb-8">
                <h3 className="text-[11px] font-medium uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <Server className="w-4 h-4 text-sky-500" />
                  Auth Configuration
                </h3>
              </div>
              <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {platformMetrics.auth.external_providers.map((provider: any) => (
                    <div key={provider.name} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${provider.enabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300'}`} />
                      <span className="text-sm font-bold text-gray-700 capitalize">{provider.name} Login</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
        </div>
      </main>
    </div>
  )
}

function LockIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
