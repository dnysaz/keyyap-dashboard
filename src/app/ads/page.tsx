'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { 
  Megaphone, 
  Plus, 
  Search, 
  MoreVertical, 
  Eye, 
  MousePointerClick, 
  Play, 
  Pause, 
  Trash2,
  Menu,
  Loader2,
  Check,
  ExternalLink,
  Image as ImageIcon,
  X,
  BarChart3,
  Monitor,
  Layout,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

const DRAFT_KEY = 'keyyap_ad_draft'

export default function AdsManagerPage() {
  const [ads, setAds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [adToDelete, setAdToDelete] = useState<string | null>(null)
  const [currentAd, setCurrentAd] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    external_link: '',
    image_url: '',
    cta_text: 'Learn More',
    placement: 'feed',
    image_position: 'top',
    status: 'active',
    visual_style: 'flat'
  })

  useEffect(() => {
    fetchAds()
  }, [])

  useEffect(() => {
    if (isModalOpen && !currentAd) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData))
    }
  }, [formData, isModalOpen, currentAd])

  async function fetchAds() {
    setLoading(true)
    const { data, error } = await supabase.from('ads').select('*').order('created_at', { ascending: false })
    if (error) console.error('Fetch Error:', error.message)
    if (data) setAds(data)
    setLoading(false)
  }

  const handleOpenModal = (ad: any = null) => {
    if (ad) {
      setCurrentAd(ad)
      setFormData({
        title: ad.title,
        description: ad.description || '',
        external_link: ad.external_link,
        image_url: ad.image_url || '',
        cta_text: ad.cta_text || 'Learn More',
        placement: ad.placement || 'feed',
        image_position: ad.image_position || 'top',
        status: ad.status || 'active',
        visual_style: ad.visual_style || 'flat'
      })
    } else {
      const savedDraft = localStorage.getItem(DRAFT_KEY)
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft)
          if (parsed.title || parsed.description) {
            if (window.confirm('You have an unsaved draft. Do you want to restore it?')) {
              setFormData(parsed)
            } else {
              localStorage.removeItem(DRAFT_KEY)
            }
          }
        } catch (e) {
          localStorage.removeItem(DRAFT_KEY)
        }
      }
      setCurrentAd(null)
    }
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (currentAd) {
        const { error } = await supabase.from('ads').update(formData).eq('id', currentAd.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('ads').insert([formData])
        if (error) throw error
        localStorage.removeItem(DRAFT_KEY)
      }
      setIsModalOpen(false)
      fetchAds()
    } catch (err: any) {
      alert('Database Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDiscard = () => {
    if (!currentAd && (formData.title || formData.description)) {
      if (window.confirm('Discard draft?')) {
        localStorage.removeItem(DRAFT_KEY)
        setIsModalOpen(false)
      } else {
        setIsModalOpen(false)
      }
    } else {
      setIsModalOpen(false)
    }
  }

  const confirmDelete = (id: string) => {
    setAdToDelete(id)
    setIsDeleteModalOpen(true)
  }

  const executeDelete = async () => {
    if (!adToDelete) return
    setLoading(true)
    await supabase.from('ads').delete().eq('id', adToDelete)
    setAdToDelete(null)
    setIsDeleteModalOpen(false)
    fetchAds()
  }

  const toggleStatus = async (ad: any) => {
    const newStatus = ad.status === 'active' ? 'paused' : 'active'
    await supabase.from('ads').update({ status: newStatus }).eq('id', ad.id)
    fetchAds()
  }

  return (
    <div className="flex min-h-screen bg-white text-[#444]">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 min-w-0 flex flex-col border-l border-gray-100">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-gray-400"><Menu className="w-5 h-5" /></button>
            <h1 className="text-[11px] font-medium uppercase tracking-widest text-gray-400">Ads Management</h1>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded text-[10px] font-medium uppercase tracking-widest hover:bg-orange-600 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Ad
          </button>
        </header>

        <div className="p-10 space-y-12 overflow-y-auto no-scrollbar">
          <div className="flex items-center gap-12 border-b border-gray-50 pb-10">
             <div className="space-y-1">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Total Impressions</p>
                <span className="text-2xl font-normal text-gray-800">{ads.reduce((acc, curr) => acc + (curr.views_count || 0), 0).toLocaleString()}</span>
             </div>
             <div className="space-y-1">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Engagements</p>
                <span className="text-2xl font-normal text-gray-800">{ads.reduce((acc, curr) => acc + (curr.clicks_count || 0), 0).toLocaleString()}</span>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-[11px]">
            {loading && ads.length === 0 ? (
               <div className="col-span-full py-20 text-center"><Loader2 className="w-6 h-6 text-orange-500 animate-spin mx-auto" /></div>
            ) : ads.length === 0 ? (
               <div className="col-span-full py-20 text-center uppercase tracking-widest text-gray-400">No campaigns found</div>
            ) : (
              ads.map((ad) => (
                <div key={ad.id} className="group bg-white border border-gray-100 rounded-lg p-6 flex flex-col gap-6 transition-all hover:border-orange-200">
                  <div className="flex items-start justify-between">
                    <div className={`px-2 py-0.5 rounded text-[9px] font-medium uppercase tracking-widest ${
                      ad.status === 'active' ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {ad.status}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => toggleStatus(ad)} className="p-2 text-gray-300 hover:text-orange-500 transition-colors">
                         {ad.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                       </button>
                       <button onClick={() => handleOpenModal(ad)} className="p-2 text-gray-300 hover:text-orange-500 transition-colors">
                         <BarChart3 className="w-3.5 h-3.5" />
                       </button>
                       <button onClick={() => confirmDelete(ad.id)} className="p-2 text-gray-300 hover:text-red-400 transition-colors">
                         <Trash2 className="w-3.5 h-3.5" />
                       </button>
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 uppercase tracking-widest">
                       <span>{ad.placement}</span>
                       <span>{format(new Date(ad.created_at), 'MMM dd')}</span>
                    </div>
                    {ad.image_url && <img src={ad.image_url} alt="p" className="w-full h-24 object-cover rounded bg-gray-50 border border-gray-50" />}
                    <div className="space-y-1">
                      <h3 className="text-[13px] font-medium text-gray-700 uppercase tracking-tight truncate">{ad.title}</h3>
                      <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{ad.description}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
           <div className="absolute inset-0 bg-white/60 backdrop-blur-sm" onClick={handleDiscard} />
           <div className="relative w-full max-w-6xl bg-white h-full border-l border-gray-100 animate-in slide-in-from-right duration-300 flex overflow-hidden lg:shadow-2xl">
              <div className="flex-1 flex flex-col border-r border-gray-100">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                   <h2 className="text-[11px] font-medium uppercase tracking-widest text-gray-400">Campaign Editor</h2>
                </div>
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
                   <div className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Partner Brand Name</label>
                         <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full py-2 bg-transparent border-b border-gray-100 focus:border-orange-500 focus:outline-none text-[13px] font-normal transition-all" placeholder="Partner Name..." />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Main Content / Message</label>
                         <textarea required rows={2} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full py-2 bg-transparent border-b border-gray-100 focus:border-orange-500 focus:outline-none text-[12px] font-normal resize-none leading-relaxed" placeholder="Write something native..." />
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                         <div className="space-y-3">
                            <label className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Placement Slot</label>
                            <select value={formData.placement} onChange={(e) => setFormData({...formData, placement: e.target.value})} className="w-full bg-transparent border-b border-gray-100 focus:outline-none text-[11px] uppercase tracking-widest font-medium py-1">
                              <option value="feed">Global Feed Post</option>
                              <option value="sidebar">Right Sidebar Card</option>
                            </select>
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Template Logic</label>
                            <select value={formData.image_position} onChange={(e) => setFormData({...formData, image_position: e.target.value})} className="w-full bg-transparent border-b border-gray-100 focus:outline-none text-[11px] uppercase tracking-widest font-medium py-1">
                              <option value="top">Post Attachment Style</option>
                              <option value="left">Profile Alignment Style</option>
                            </select>
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Action URL</label>
                         <input required type="url" value={formData.external_link} onChange={(e) => setFormData({...formData, external_link: e.target.value})} className="w-full py-2 bg-transparent border-b border-gray-100 focus:border-orange-500 focus:outline-none text-[12px] font-normal" placeholder="https://..." />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Asset image URL (Optional)</label>
                         <input type="url" value={formData.image_url} onChange={(e) => setFormData({...formData, image_url: e.target.value})} className="w-full py-2 bg-transparent border-b border-gray-100 focus:border-orange-500 focus:outline-none text-[12px] font-normal" placeholder="https://..." />
                      </div>
                   </div>
                   <div className="pt-10 flex gap-4 sticky bottom-0 bg-white">
                      <button type="submit" disabled={loading} className="bg-orange-500 text-white px-10 py-3 rounded text-[10px] font-medium uppercase tracking-widest hover:bg-orange-600 transition-all">
                        {loading ? 'Publishing...' : 'Publish'}
                      </button>
                      <button type="button" onClick={handleDiscard} className="px-6 py-3 border border-gray-100 rounded text-[10px] font-medium uppercase tracking-widest text-gray-300 hover:bg-gray-50 transition-all">
                        Discard
                      </button>
                   </div>
                </form>
              </div>

              {/* LIVE NATIVE PREVIEW */}
              <div className="w-96 bg-gray-50/50 flex flex-col p-8 overflow-y-auto no-scrollbar">
                <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-gray-400 mb-8 pb-4 border-b border-gray-100">
                  <Layout className="w-3.5 h-3.5" /> Native Feed UI
                </div>
                <div className="space-y-12">
                   <div className="space-y-6">
                      <p className="text-[9px] font-medium uppercase tracking-widest text-gray-300 text-center">Live Visualization</p>
                      
                      {/* SIMULATED NATIVE POST WITH HOVER EFFECT */}
                      <div className="bg-white border-b border-gray-100 py-10 px-4 relative transition-all duration-300 hover:border-orange-200 hover:bg-orange-50/5 group/preview">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-orange-100 flex-shrink-0 flex items-center justify-center text-orange-600 font-bold text-xs shadow-sm group-hover/preview:scale-105 transition-transform">
                            {formData.title ? formData.title.charAt(0).toUpperCase() : 'K'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col mb-2 focus:outline-none">
                               <span className="text-[13px] font-bold text-gray-900 truncate leading-tight group-hover/preview:text-orange-500 transition-colors">{formData.title || 'Brand Name'}</span>
                               <span className="text-[10px] text-gray-400 font-normal uppercase tracking-widest group-hover/preview:text-orange-400 transition-colors">Promoted Content</span>
                            </div>
                            <p className="text-[13px] text-gray-600 leading-relaxed font-normal mb-5 whitespace-pre-wrap">
                              {formData.description || 'Campaign details will appear here as a native post text...'}
                            </p>
                            {formData.image_url && (
                              <div className="block mb-5 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 shadow-sm group-hover/preview:border-orange-100 transition-all">
                                 <img src={formData.image_url} alt="p" className="w-full h-auto max-h-60 object-cover" />
                              </div>
                            )}
                            <div className="inline-flex items-center gap-2 px-4 py-2 border border-gray-100 rounded-full text-[11px] font-bold text-orange-500 shadow-sm group-hover/preview:bg-orange-500 group-hover/preview:text-white transition-all">
                              {formData.cta_text || 'Learn More'}
                              <ExternalLink className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                        <div className="absolute top-10 right-4 text-[7px] text-gray-300 uppercase tracking-widest font-black opacity-40 group-hover/preview:text-orange-400 group-hover/preview:opacity-100 transition-all">Sponsored</div>
                      </div>
                   </div>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-white/60 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
           <div className="relative w-full max-w-sm bg-white border border-gray-100 rounded-xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex flex-col items-center text-center space-y-6">
                 <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                    <Trash2 className="w-6 h-6" />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-tight">Delete Campaign?</h3>
                    <p className="text-[11px] text-gray-400 font-normal leading-relaxed px-4">This action cannot be undone. All performance data will be permanently removed.</p>
                 </div>
                 <div className="flex flex-col w-full gap-3">
                    <button 
                      onClick={executeDelete}
                      className="w-full bg-red-500 text-white py-3 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-all"
                    >
                      Delete Permanently
                    </button>
                    <button 
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="w-full bg-white border border-gray-50 text-gray-300 py-3 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all"
                    >
                      Keep Campaign
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
