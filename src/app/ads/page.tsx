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

const COLOR_PALETTE = [
  '#ffffff', // Default White
  '#fff7ed', // Orange 50
  '#f0fdf4', // Green 50
  '#eff6ff', // Blue 50
  '#fdf2f8', // Pink 50
  '#fefce8', // Yellow 50
  '#f5f3ff', // Violet 50
  '#fafafa', // Nuetral 50
]

export default function AdsManagerPage() {
  const [ads, setAds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [adToDelete, setAdToDelete] = useState<string | null>(null)
  const [currentAd, setCurrentAd] = useState<any>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  
  const compressImage = (file: File, maxWidth: number, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.src = URL.createObjectURL(file)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Compression failed'))
        }, 'image/webp', quality)
      }
      img.onerror = (err) => reject(err)
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 512 * 1024) {
      alert('File too large. Max 512KB before compression.')
      return
    }

    setUploadingImage(true)
    try {
      // Compress to 800px width with 0.6 quality to achieve < 96KB
      const compressedBlob = await compressImage(file, 800, 0.6)
      const fileName = `ad_${Date.now()}.webp`
      
      const { error: uploadError } = await supabase.storage
        .from('ads')
        .upload(fileName, compressedBlob, { contentType: 'image/webp' })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('ads')
        .getPublicUrl(fileName)

      setFormData(prev => ({ ...prev, image_url: publicUrl }))
    } catch (err: any) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 512 * 1024) {
      alert('File too large. Max 512KB before compression.')
      return
    }

    setUploadingLogo(true)
    try {
      // Compress logo to 256px layout
      const compressedBlob = await compressImage(file, 256, 0.8)
      const fileName = `logo_${Date.now()}.webp`
      
      const { error: uploadError } = await supabase.storage
        .from('ads')
        .upload(fileName, compressedBlob, { contentType: 'image/webp' })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('ads')
        .getPublicUrl(fileName)

      setFormData(prev => ({ ...prev, brand_logo_url: publicUrl }))
    } catch (err: any) {
      alert('Logo upload failed: ' + err.message)
    } finally {
      setUploadingLogo(false)
    }
  }
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    external_link: '',
    image_url: '',
    cta_text: 'Learn More',
    placement: 'feed',
    image_position: 'bottom',
    status: 'active',
    visual_style: 'flat',
    bg_color: '#ffffff',
    brand_logo_url: ''
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
        image_position: ad.image_position === 'top' ? 'bottom' : (ad.image_position || 'bottom'),
        status: ad.status || 'active',
        visual_style: ad.visual_style || 'flat',
        bg_color: ad.bg_color || '#ffffff',
        brand_logo_url: ad.brand_logo_url || ''
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
                <div 
                  key={ad.id} 
                  className="group relative bg-white border border-gray-100 rounded-xl overflow-hidden transition-all duration-300 hover:border-orange-200 hover:shadow-lg hover:-translate-y-1"
                  style={{ backgroundColor: ad.bg_color || '#ffffff' }}
                >
                  {/* Floating Action Menu on Hover */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/90 backdrop-blur rounded p-1 border border-gray-50 shadow-sm">
                     <button onClick={() => toggleStatus(ad)} className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors" title={ad.status === 'active' ? 'Pause' : 'Activate'}>
                       {ad.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                     </button>
                     <button onClick={() => handleOpenModal(ad)} className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors" title="Edit">
                       <BarChart3 className="w-3 h-3" />
                     </button>
                     <button onClick={() => confirmDelete(ad.id)} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors" title="Delete">
                       <Trash2 className="w-3 h-3" />
                     </button>
                  </div>
                  
                  {/* Native Simulation */}
                  <div className="flex items-start gap-3 p-5">
                    {ad.brand_logo_url ? (
                       <img src={ad.brand_logo_url} alt="Brand Logo" className="w-9 h-9 rounded-full object-cover flex-shrink-0 shadow-sm" />
                    ) : (
                       <div className="w-9 h-9 rounded-full bg-orange-100 flex-shrink-0 flex items-center justify-center text-orange-600 font-bold text-[10px] shadow-sm">
                         {ad.title ? ad.title.charAt(0).toUpperCase() : 'K'}
                       </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col mb-2 focus:outline-none pr-10">
                         <div className="flex items-center gap-2">
                           <span className="text-[12px] font-bold text-gray-900 truncate leading-tight">{ad.title || 'Brand Name'}</span>
                           <span className={`px-1.5 py-px rounded text-[8px] font-bold uppercase tracking-widest ${
                              ad.status === 'active' ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-400'
                           }`}>
                             {ad.status}
                           </span>
                         </div>
                         <span className="text-[9px] text-gray-400 font-normal uppercase tracking-widest mt-0.5">Promoted Content • {ad.placement}</span>
                      </div>
                      {ad.image_position === 'left' ? (
                        <div className="flex gap-4 mb-3">
                          {ad.image_url && (
                             <div className="w-24 h-24 flex-shrink-0 bg-white rounded-lg overflow-hidden border border-gray-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] flex items-center justify-center">
                                <img src={ad.image_url} alt="p" className="w-full h-full object-contain" />
                             </div>
                          )}
                          <p className="text-[11px] text-gray-600 leading-relaxed font-normal whitespace-pre-wrap line-clamp-3">
                            {ad.description || 'Campaign details...'}
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="text-[11px] text-gray-600 leading-relaxed font-normal mb-3 whitespace-pre-wrap line-clamp-3">
                            {ad.description || 'Campaign details...'}
                          </p>
                          {ad.image_url && (
                            <div className="block mb-3 bg-white rounded-lg overflow-hidden border border-gray-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] flex items-center justify-center">
                               <img src={ad.image_url} alt="p" className="w-full h-auto max-h-32 object-contain" />
                            </div>
                          )}
                        </>
                      )}
                      
                      <div className="mt-4 pt-3 border-t border-gray-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white rounded-full text-[9px] font-bold text-orange-500 shadow-sm transition-all hover:bg-orange-50 w-max">
                          {ad.cta_text || 'Learn More'}
                          <ExternalLink className="w-3 h-3" />
                        </div>
                        <div className="flex gap-2.5 text-[9px] font-medium text-gray-400 uppercase tracking-widest">
                           <span className="flex items-center gap-1 opacity-70" title="Views"><Eye className="w-3 h-3" /> {ad.views_count || 0}</span>
                           <span className="flex items-center gap-1 text-orange-500/80" title="Clicks"><MousePointerClick className="w-3 h-3" /> {ad.clicks_count || 0}</span>
                        </div>
                      </div>
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <div className="space-y-2">
                           <label className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Partner Brand Name</label>
                           <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full py-2 bg-transparent border-b border-gray-100 focus:border-orange-500 focus:outline-none text-[13px] font-normal transition-all" placeholder="Partner Name..." />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Brand Logo (Optional)</label>
                           {formData.brand_logo_url ? (
                             <div className="flex items-center gap-3 mt-1">
                               <img src={formData.brand_logo_url} alt="Logo" className="w-9 h-9 rounded-full object-cover border border-gray-100 shadow-sm" />
                               <button type="button" onClick={() => setFormData({...formData, brand_logo_url: ''})} className="text-[9px] text-red-500 font-bold uppercase tracking-widest hover:underline bg-red-50 px-2 py-1 rounded">Remove</button>
                             </div>
                           ) : (
                             <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold uppercase tracking-widest text-orange-500 hover:text-orange-600 transition-colors mt-2 bg-orange-50 w-max px-3 py-1.5 rounded-full">
                               {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                               <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                               <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                             </label>
                           )}
                        </div>
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
                            <select value={formData.image_position === 'top' ? 'bottom' : formData.image_position} onChange={(e) => setFormData({...formData, image_position: e.target.value})} className="w-full bg-transparent border-b border-gray-100 focus:outline-none text-[11px] uppercase tracking-widest font-medium py-1">
                              <option value="bottom">Bottom Attachment Style</option>
                              <option value="left">Left Thumbnail Style</option>
                            </select>
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Background Color</label>
                            <div className="flex flex-wrap gap-3 mt-2">
                               {COLOR_PALETTE.map((color) => (
                                 <button
                                   key={color}
                                   type="button"
                                   onClick={() => setFormData({...formData, bg_color: color})}
                                   style={{ backgroundColor: color }}
                                   className={`w-8 h-8 rounded-full border-2 transition-all shadow-sm flex items-center justify-center ${formData.bg_color === color ? 'border-orange-500 scale-110' : 'border-gray-200 hover:scale-105'}`}
                                 >
                                   {formData.bg_color === color && <Check className="w-4 h-4 text-orange-500 mix-blend-difference" />}
                                 </button>
                               ))}
                            </div>
                         </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-2">
                            <label className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Action Button Text</label>
                            <input required value={formData.cta_text} onChange={(e) => setFormData({...formData, cta_text: e.target.value})} className="w-full py-2 bg-transparent border-b border-gray-100 focus:border-orange-500 focus:outline-none text-[12px] font-normal transition-all" placeholder="e.g. Learn More, Buy Now" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Action URL</label>
                            <input required type="url" value={formData.external_link} onChange={(e) => setFormData({...formData, external_link: e.target.value})} className="w-full py-2 bg-transparent border-b border-gray-100 focus:border-orange-500 focus:outline-none text-[12px] font-normal" placeholder="https://..." />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Campaign Image (Optional)</label>
                         {formData.image_url ? (
                           <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-100 group bg-gray-50 flex items-center justify-center">
                             <img src={formData.image_url} alt="Ad Visual" className="w-full h-full object-contain" />
                             <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <button 
                                 type="button" 
                                 onClick={() => setFormData({...formData, image_url: ''})}
                                 className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             </div>
                           </div>
                         ) : (
                           <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all rounded-lg cursor-pointer">
                             {uploadingImage ? (
                               <div className="flex flex-col items-center gap-2">
                                 <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                                 <span className="text-[10px] font-medium uppercase tracking-widest text-orange-500">Compressing...</span>
                               </div>
                             ) : (
                               <>
                                 <ImageIcon className="w-6 h-6 text-gray-300 mb-2" />
                                 <span className="text-[11px] text-gray-500 font-medium">Click to upload image</span>
                                 <span className="text-[9px] text-gray-400 mt-1 uppercase tracking-widest">Max 512KB (Auto-compressed to &lt;96kb)</span>
                               </>
                             )}
                             <input 
                               type="file" 
                               accept="image/*" 
                               className="hidden" 
                               onChange={handleImageUpload}
                               disabled={uploadingImage}
                             />
                           </label>
                         )}
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
                      <div 
                        className="bg-white border-b border-gray-100 py-10 px-4 relative transition-all duration-300 hover:border-orange-200 group/preview"
                        style={{ backgroundColor: formData.bg_color }}
                      >
                        <div className="flex items-start gap-4">
                          {formData.brand_logo_url ? (
                             <img src={formData.brand_logo_url} alt="Brand Logo" className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-sm group-hover/preview:scale-105 transition-transform" />
                          ) : (
                             <div className="w-10 h-10 rounded-full bg-orange-100 flex-shrink-0 flex items-center justify-center text-orange-600 font-bold text-xs shadow-sm group-hover/preview:scale-105 transition-transform">
                               {formData.title ? formData.title.charAt(0).toUpperCase() : 'K'}
                             </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col mb-2 focus:outline-none">
                               <span className="text-[13px] font-bold text-gray-900 truncate leading-tight group-hover/preview:text-orange-500 transition-colors">{formData.title || 'Brand Name'}</span>
                               <span className="text-[10px] text-gray-400 font-normal uppercase tracking-widest group-hover/preview:text-orange-400 transition-colors">Promoted Content</span>
                            </div>
                            {formData.image_position === 'left' ? (
                              <div className="flex gap-4 mb-5">
                                {formData.image_url && (
                                  <div className="w-24 h-24 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-sm flex items-center justify-center">
                                     <img src={formData.image_url} alt="p" className="w-full h-full object-contain" />
                                  </div>
                                )}
                                <p className="text-[13px] text-gray-600 leading-relaxed font-normal whitespace-pre-wrap">
                                  {formData.description || 'Campaign details will appear here as a native post text...'}
                                </p>
                              </div>
                            ) : (
                              <>
                                <p className="text-[13px] text-gray-600 leading-relaxed font-normal mb-5 whitespace-pre-wrap">
                                  {formData.description || 'Campaign details will appear here as a native post text...'}
                                </p>
                                {formData.image_url && (
                                  <div className="block mb-5 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 shadow-sm group-hover/preview:border-orange-100 transition-all flex items-center justify-center">
                                     <img src={formData.image_url} alt="p" className="w-full h-auto max-h-60 object-contain" />
                                  </div>
                                )}
                              </>
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
