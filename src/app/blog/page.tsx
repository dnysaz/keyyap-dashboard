'use client'

import React, { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import {
  Plus,
  Search,
  MessageCircle,
  Trash2,
  Menu,
  Loader2,
  Check,
  ExternalLink,
  Image as ImageIcon,
  X,
  FileText,
  Calendar,
  ChevronDown,
  ChevronUp,
  Save,
  Link as LinkIcon,
  Tag,
  Eye,
  BarChart2,
  Type,
  MoreHorizontal,
  Settings
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import dynamic from 'next/dynamic'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area
} from 'recharts'
import 'react-quill-new/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false })

interface LinkPreview {
  url: string
  title: string
  loading: boolean
}

const DRAFT_KEY = 'keyyap_blog_wordpress_draft'

export default function WordPressBlogPage() {
  const { user } = useAuth()
  const [blogs, setBlogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [blogStats, setBlogStats] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(false)

  // View States
  const [showEditorModal, setShowEditorModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Editor States
  const [currentBlogId, setCurrentBlogId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [linkPreviews, setLinkPreviews] = useState<LinkPreview[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    image_url: '',
    hashtags: [] as string[],
    status: 'published'
  })

  useEffect(() => {
    fetchBlogs()
  }, [])

  // Auto-save draft
  useEffect(() => {
    if (showEditorModal && !currentBlogId) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData))
    }
  }, [formData, showEditorModal, currentBlogId])

  async function fetchBlogs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('blogs')
      .select('*, profiles(username, full_name), comments(count)')
      .order('created_at', { ascending: false })

    if (error) console.error('Fetch Error:', error.message)
    if (data) {
      const formattedBlogs = data.map((blog: any) => ({
        ...blog,
        comments_count: blog.comments?.[0]?.count || 0
      }))
      setBlogs(formattedBlogs)
    }
    setLoading(false)
  }

  async function fetchBlogStats(blogId: string) {
    setLoadingStats(true)
    const { data, error } = await supabase
      .from('blog_stats')
      .select('view_date, view_count')
      .eq('blog_id', blogId)
      .order('view_date', { ascending: true })
      .limit(7)

    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const dateString = format(d, 'yyyy-MM-dd')

      const foundMatch = data?.find(s => s.view_date === dateString)
      return {
        name: format(d, 'EEE'),
        views: foundMatch ? foundMatch.view_count : 0
      }
    })

    setBlogStats(last7Days)
    setLoadingStats(false)
  }

  useEffect(() => {
    if (expandedId) {
      fetchBlogStats(expandedId)
    }
  }, [expandedId])

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

    // Initial check: if file is way too big (> 5MB) even before compression
    if (file.size > 5 * 1024 * 1024) {
      alert('Original image is too large (max 512kb before compression)')
      return
    }

    setUploadingImage(true)
    try {
      // Compress targeting 128kb (quality 0.6)
      const compressedBlob = await compressImage(file, 1200, 0.6)

      // Final size check: max 512kb
      if (compressedBlob.size > 512 * 1024) {
        alert(`Compressed image is still too large (${Math.round(compressedBlob.size / 1024)}kb). Please use a smaller image.`)
        setUploadingImage(false)
        return
      }

      const fileName = `blog_${Date.now()}.webp`
      const { error: uploadError } = await supabase.storage
        .from('blogs')
        .upload(fileName, compressedBlob, { contentType: 'image/webp' })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('blogs').getPublicUrl(fileName)
      setFormData(prev => ({ ...prev, image_url: publicUrl }))
    } catch (err: any) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const slugify = (text: string) => {
    return text.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-')
  }

  const handleOpenEditor = (blog: any = null) => {
    console.log('handleOpenEditor called', blog)
    if (blog) {
      setCurrentBlogId(blog.id)
      setFormData({
        title: blog.title,
        slug: blog.slug,
        content: blog.content,
        image_url: blog.image_url || '',
        hashtags: blog.hashtags || [],
        status: blog.status || 'published'
      })
    } else {
      const savedDraft = localStorage.getItem(DRAFT_KEY)
      if (savedDraft) {
        setFormData(JSON.parse(savedDraft))
      } else {
        setFormData({ title: '', slug: '', content: '', image_url: '', hashtags: [], status: 'published' })
      }
      setCurrentBlogId(null)
    }
    setShowEditorModal(true)
  }

  const handleCloseEditor = () => {
    setShowEditorModal(false)
  }

  const handleSave = async (status: string = 'published') => {
    if (!user || !formData.title) return
    setIsSaving(true)
    try {
      const payload = { ...formData, status, author_id: user.id }
      if (currentBlogId) {
        await supabase.from('blogs').update(payload).eq('id', currentBlogId)
      } else {
        await supabase.from('blogs').insert([payload])
      }
      localStorage.removeItem(DRAFT_KEY)
      setShowEditorModal(false)
      fetchBlogs()
    } catch (err: any) {
      alert('Save failed: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(id)
  }

  const confirmDelete = async () => {
    if (!deleteConfirmId) return
    setIsSaving(true)
    try {
      await supabase.from('blogs').delete().eq('id', deleteConfirmId)
      setDeleteConfirmId(null)
      fetchBlogs()
    } catch (err: any) {
      alert('Delete failed: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleSelectAll = () => {
    if (selectedIds.length === blogs.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(blogs.map(b => b.id))
    }
  }

  const handleToggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(idx => idx !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // Link Preview Logic for Rich Editor HTML
  useEffect(() => {
    // Strip HTML tags and entities like &nbsp; to get clean text
    const cleanText = formData.content
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ');

    const urls = cleanText.match(/https?:\/\/[^\s<>"]+/g);

    if (urls && urls.length > 0) {
      const lastUrl = urls[urls.length - 1];
      if (!linkPreviews.find(p => p.url === lastUrl)) {
        setLinkPreviews(prev => [...prev, { url: lastUrl, title: 'Detected Link', loading: false }]);
      }
    }
}, [formData.content])

  if (showEditorModal) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#f0f2f1] flex flex-col">
        <div className="relative w-full h-full flex flex-col">
           {/* Editor Toolbar */}
           <header className="h-14 bg-white border-b border-gray-100 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                 <button 
                   onClick={handleCloseEditor}
                   className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                 >
                   <X className="w-5 h-5" />
                 </button>
                 <div className="h-6 w-px bg-gray-200" />
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-400 italic">Editing</span>
                    <span className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{formData.title || 'Untitled'}</span>
                 </div>
              </div>
              
              <div className="flex items-center gap-3">
                 <button 
                   onClick={() => handleSave('draft')}
                   disabled={isSaving}
                   className="text-gray-400 hover:text-gray-900 px-4 py-1.5 rounded text-sm font-bold transition-all"
                 >
                   Save Draft
                 </button>
                 <button 
                   onClick={() => handleSave('published')}
                   disabled={isSaving}
                   className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded text-sm font-bold shadow-sm transition-all"
                 >
                   {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                   Publish
                 </button>
              </div>
           </header>

           <div className="flex-1 flex overflow-hidden">
              {/* WRITING AREA - WordPress Style */}
              <main className="flex-1 overflow-y-auto no-scrollbar p-12 flex justify-center">
                 <div className="w-full max-w-3xl bg-white min-h-full relative shadow-sm px-4">
                    <input 
                       placeholder="Article Title..." 
                       className="w-full text-4xl font-black text-gray-900 border-none focus:ring-0 focus:outline-none placeholder-gray-200 mb-6 bg-transparent px-8 pt-8"
                       value={formData.title}
                       onChange={(e) => {
                         const val = e.target.value
                         setFormData({ ...formData, title: val, slug: currentBlogId ? formData.slug : slugify(val) })
                       }}
                    />

                    <div className="prose-editor">
                       <ReactQuill 
                          theme="snow"
                          value={formData.content}
                          onChange={(content) => setFormData({ ...formData, content })}
                          placeholder="Tell your story..."
                          modules={{
                             toolbar: [
                                [{ 'header': [1, 2, 3, false] }],
                                ['bold', 'italic', 'underline', 'strike'],
                                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                ['link'],
                                ['clean']
                             ],
                          }}
                          className="bg-transparent"
                       />
                    </div>
                    <style jsx global>{`
                       .prose-editor .ql-container {
                          border: none !important;
                          font-family: inherit;
                          font-size: 18px;
                          background: transparent;
                       }
                       .prose-editor .ql-toolbar {
                          border: none !important;
                          border-bottom: 1px solid #f3f4f6 !important;
                          background: #fafafa;
                       }
                       .prose-editor .ql-editor {
                          min-height: 400px;
                          padding: 24px 32px;
                          font-family: Georgia, serif;
                          font-size: 18px;
                          line-height: 1.8;
                          color: #2d3748;
                       }
                       .prose-editor .ql-editor.ql-blank::before {
                          left: 32px !important;
                          right: 32px !important;
                          font-style: normal;
                          color: #cbd5e0;
                          top: 24px !important;
                       }
                    `}</style>
                 </div>
              </main>

              {/* SIDEBAR SETTINGS */}
              <aside className="w-72 bg-white border-l border-gray-100 overflow-y-auto no-scrollbar p-6 space-y-6">
                 <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-500 border-b border-gray-50 pb-2 flex items-center gap-2">
                       <Settings className="w-3.5 h-3.5" /> Post Settings
                    </h3>
                    
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-500">Permalink (Slug)</label>
                       <div className="flex items-center gap-1 text-[11px] text-orange-500 font-bold bg-orange-50/50 p-2 rounded border border-orange-100">
                          <span className="opacity-40">{process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '')}/blog/</span>
                          <span>{formData.slug || '...'}</span>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-500">Featured Image</label>
                       {formData.image_url ? (
                         <div className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-video">
                            <img src={formData.image_url} className="w-full h-full object-cover" alt="" />
                            <button 
                               type="button" 
                               onClick={() => setFormData({...formData, image_url: ''})}
                               className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                            >
                               Change Image
                            </button>
                         </div>
                       ) : (
                         <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-100 rounded-lg hover:border-gray-300 transition-all cursor-pointer bg-gray-50">
                            {uploadingImage ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" /> : <ImageIcon className="w-6 h-6 text-gray-300" />}
                            <span className="text-[11px] text-gray-400 mt-2 font-bold">Set Featured Image</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                         </label>
                       )}
                    </div>

                    <div className="space-y-2">
                       <label className="text-sm font-bold text-gray-500">Hashtags</label>
                       <div className="flex flex-wrap gap-2 mb-2">
                          {formData.hashtags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-orange-50 text-orange-500 rounded text-[10px] font-bold flex items-center gap-1">
                               #{tag} 
                               <button onClick={() => setFormData({...formData, hashtags: formData.hashtags.filter(t => t !== tag)})}><X className="w-3 h-3" /></button>
                            </span>
                          ))}
                       </div>
                       <input 
                          placeholder="Add tag (use comma or enter)" 
                          className="w-full text-xs bg-gray-50 border border-gray-100 rounded p-2 focus:ring-0 focus:outline-none focus:border-orange-300 transition-all font-medium" 
                          onKeyDown={(e) => {
                             if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault()
                                const val = (e.target as HTMLInputElement).value.trim().replace(/[#,]/g, '')
                                if (val && !formData.hashtags.includes(val)) {
                                   setFormData({...formData, hashtags: [...formData.hashtags, val]});
                                   (e.target as HTMLInputElement).value = '';
                                }
                             }
                          }}
                       />
                    </div>
                 </div>

                 <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 space-y-2">
                    <p className="text-[11px] font-bold text-orange-500">Writing Tip</p>
                    <p className="text-[11px] text-orange-600 leading-relaxed font-medium">Use high-quality images and at least 3 relevant hashtags to improve SEO reach on KeyYap Feed.</p>
                 </div>
              </aside>
           </div>
        </div>
      </div>
    )
  }

  // LIST VIEW — WordPress Style
  return (
    <div className="flex min-h-screen bg-[#f6f7f7] text-[#3c434a]">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 min-w-0 p-8">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-gray-400"><Menu className="w-5 h-5" /></button>
            <h1 className="text-2xl font-black text-gray-900">Articles</h1>
            <button
              onClick={() => handleOpenEditor()}
              className="bg-white border border-orange-500 text-orange-500 hover:bg-orange-50 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors"
            >
              Add New Post
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Search posts..."
              className="bg-white border border-gray-100 rounded-xl px-10 py-1.5 text-sm focus:border-orange-500 focus:ring-0 outline-none w-64 transition-all"
            />
          </div>
        </header>

        {/* FILTERS */}
        <div className="flex items-center gap-4 mb-4 text-sm font-bold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`${statusFilter === 'all' ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'}`}
          >
            All ({blogs.length})
          </button>
          <span className="text-gray-200">|</span>
          <button
            onClick={() => setStatusFilter('published')}
            className={`${statusFilter === 'published' ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Published ({blogs.filter(b => b.status === 'published').length})
          </button>
          <span className="text-gray-200">|</span>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`${statusFilter === 'draft' ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Drafts ({blogs.filter(b => b.status === 'draft').length})
          </button>
        </div>

        {/* POSTS TABLE */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200 text-sm font-bold text-[#1d2327]">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    checked={selectedIds.length > 0 && selectedIds.length === blogs.length}
                    onChange={handleToggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3 w-20 text-center"><MessageCircle className="w-4 h-4 mx-auto" /></th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-300" /></td></tr>
              ) : blogs.filter(b => statusFilter === 'all' || b.status === statusFilter).length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-gray-400 text-sm italic">No {statusFilter === 'all' ? 'posts' : statusFilter + 's'} found</td></tr>
              ) : (
                blogs.filter(b => statusFilter === 'all' || b.status === statusFilter).map(blog => (
                  <React.Fragment key={blog.id}>
                    <tr
                      className={`hover:bg-[#f6f7f7] cursor-pointer group transition-colors ${expandedId === blog.id ? 'bg-[#f6f7f7]' : ''} ${selectedIds.includes(blog.id) ? 'bg-orange-50/30' : ''}`}
                      onClick={() => setExpandedId(expandedId === blog.id ? null : blog.id)}
                    >
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                          checked={selectedIds.includes(blog.id)}
                          onChange={() => handleToggleSelectOne(blog.id)}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-bold text-gray-900 group-hover:text-orange-500 transition-colors">{blog.title}</span>
                            {blog.status === 'draft' && (
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 text-[9px] font-black rounded">Draft</span>
                            )}
                          </div>
                          <div className="flex gap-2 text-[11px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); handleOpenEditor(blog) }} className="text-orange-500 font-bold hover:underline">Edit</button>
                            <span className="text-gray-200">|</span>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(blog.id) }} className="text-red-500 hover:underline">Delete</button>
                            <span className="text-gray-200">|</span>
                            <a href={`${process.env.NEXT_PUBLIC_APP_URL}/blog/${blog.slug}`} target="_blank" className="text-gray-400 hover:text-orange-500">View</a>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{blog.profiles?.full_name || 'Admin'}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {blog.hashtags?.length > 0 ? blog.hashtags.map((t: string) => (
                            <span key={t} className="text-[10px] text-gray-500">#{t}</span>
                          )) : <span className="text-[10px] text-gray-300">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-bold">
                          {blog.comments_count || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500">
                        Published<br />{format(new Date(blog.created_at), 'yyyy/MM/dd')}
                      </td>
                    </tr>

                    {/* EXPANDED STATS SECTION */}
                    {expandedId === blog.id && (
                      <tr className="bg-white">
                        <td colSpan={6} className="px-8 py-10 border-b border-gray-100 bg-gray-50/50">
                          <div className="flex flex-col lg:flex-row gap-10">
                            {/* Mini Stats Card */}
                            <div className="lg:w-1/3 grid grid-cols-2 gap-4">
                              <div className="bg-white p-4 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="p-2 bg-orange-50 rounded-lg text-orange-500">
                                    <Eye className="w-4 h-4" />
                                  </div>
                                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Views</p>
                                </div>
                                <p className="text-xl font-bold text-gray-900">{blog.views || 0}</p>
                              </div>
                              <div className="bg-white p-4 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
                                    <MessageCircle className="w-4 h-4" />
                                  </div>
                                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Comments</p>
                                </div>
                                <p className="text-xl font-bold text-gray-900">{blog.comments_count || 0}</p>
                              </div>
                              <div className="bg-white p-4 rounded-2xl border border-gray-100 col-span-2">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-500">
                                    <BarChart2 className="w-4 h-4" />
                                  </div>
                                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Share Count</p>
                                </div>
                                <p className="text-xl font-bold text-gray-900">{blog.shares || 0}</p>
                              </div>

                              <div className="col-span-2 pt-4">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(blog.id) }}
                                  className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-500 rounded-xl font-bold text-xs hover:bg-red-100 transition-all border border-red-100"
                                >
                                  <Trash2 className="w-4 h-4" /> Delete Article
                                </button>
                              </div>
                            </div>

                            {/* Chart Section */}
                            <div className="flex-1 bg-white p-6 rounded-3xl border border-gray-100 h-[280px]">
                              <div className="flex items-center justify-between mb-8">
                                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">7 Days Performance</p>
                                <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-500">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                  Live Statistics
                                </div>
                              </div>
                              <ResponsiveContainer width="100%" height="80%">
                                {loadingStats ? (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-gray-200" />
                                  </div>
                                ) : blogStats.length > 0 ? (
                                  <AreaChart data={blogStats}>
                                    <defs>
                                      <linearGradient id="colorViewsGraph" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f36c1e" stopOpacity={0.05} />
                                        <stop offset="95%" stopColor="#f36c1e" stopOpacity={0} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                    <XAxis
                                      dataKey="name"
                                      axisLine={false}
                                      tickLine={false}
                                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                                      dy={10}
                                    />
                                    <YAxis
                                      axisLine={false}
                                      tickLine={false}
                                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                                    />
                                    <Tooltip
                                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }}
                                    />
                                    <Area type="monotone" dataKey="views" stroke="#f36c1e" strokeWidth={2} fillOpacity={1} fill="url(#colorViewsGraph)" />
                                  </AreaChart>
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                                    <BarChart2 className="w-8 h-8 opacity-20" />
                                    <p className="text-[10px] uppercase font-black tracking-widest">No data collected yet</p>
                                  </div>
                                )}
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Mockup */}
          <div className="p-4 flex items-center justify-between text-sm text-gray-500 bg-white">
            <p>{blogs.length} items</p>
            <div className="flex gap-2">
              <button className="px-2 py-1 border border-gray-200 rounded disabled:opacity-50" disabled>«</button>
              <button className="px-2 py-1 border border-gray-200 rounded disabled:opacity-50" disabled>‹</button>
              <span className="px-3 py-1 border border-orange-500 bg-orange-50 rounded font-bold text-orange-500">1</span>
              <button className="px-2 py-1 border border-gray-200 rounded disabled:opacity-50" disabled>›</button>
              <button className="px-2 py-1 border border-gray-200 rounded disabled:opacity-50" disabled>»</button>
            </div>
          </div>
        </div>
      </main>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative bg-white rounded-3xl p-8 max-w-sm w-full border border-gray-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Article?</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Are you sure you want to delete this article? This action cannot be undone and will remove all associated comments.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isSaving}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
