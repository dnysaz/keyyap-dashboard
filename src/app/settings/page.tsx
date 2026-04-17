'use client'

import { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import { 
  Menu,
  Check,
  Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('seo')
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  
  const [saveStatus, setSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'success'>>({
    seo: 'idle',
    terms: 'idle',
    privacy: 'idle',
    cookie: 'idle'
  })

  const [settings, setSettings] = useState({
    site_title: '',
    site_description: '',
    site_og_image: '',
    terms_of_service: '',
    privacy_policy: '',
    cookie_policy: ''
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    // Only update editor if we are on a legal tab and editor exists
    if (!loading && activeTab !== 'seo' && editorRef.current) {
      const field = activeTab === 'terms' ? 'terms_of_service' : activeTab === 'privacy' ? 'privacy_policy' : 'cookie_policy'
      // @ts-ignore
      const content = settings[field] || ''
      if (editorRef.current.innerHTML !== content) {
        editorRef.current.innerHTML = content
      }
    }
  }, [activeTab, loading]) // Removed settings from here to keep array size constant

  async function fetchSettings() {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('site_settings').select('key, value')
      if (error) throw error
      
      if (data) {
        const newSettings = { ...settings }
        data.forEach(item => {
          if (item.key in newSettings) {
            // @ts-ignore
            newSettings[item.key] = item.value
          }
        })
        setSettings(newSettings)
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (tabId: string) => {
    setSaveStatus(prev => ({ ...prev, [tabId]: 'saving' }))
    
    try {
      let updates = []
      if (tabId === 'seo') {
        updates = [
          { key: 'site_title', value: settings.site_title },
          { key: 'site_description', value: settings.site_description },
          { key: 'site_og_image', value: settings.site_og_image }
        ]
      } else {
        const fieldMap: Record<string, string> = {
          terms: 'terms_of_service',
          privacy: 'privacy_policy',
          cookie: 'cookie_policy'
        }
        const field = fieldMap[tabId]
        const content = editorRef.current?.innerHTML || ''
        updates = [{ key: field, value: content }]
        setSettings(prev => ({ ...prev, [field]: content }))
      }

      await supabase.from('site_settings').upsert(updates)
      setSaveStatus(prev => ({ ...prev, [tabId]: 'success' }))
      setTimeout(() => setSaveStatus(prev => ({ ...prev, [tabId]: 'idle' })), 3000)
    } catch (err) {
      setSaveStatus(prev => ({ ...prev, [tabId]: 'idle' }))
    }
  }

  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value)
    if (editorRef.current) editorRef.current.focus()
  }

  const tabs = [
    { id: 'seo', name: 'SEO Settings' },
    { id: 'terms', name: 'Terms of Service' },
    { id: 'privacy', name: 'Privacy Policy' },
    { id: 'cookie', name: 'Cookie Policy' },
  ]

  return (
    <div className="flex min-h-screen bg-white font-sans text-gray-600">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 min-w-0 flex flex-col border-l border-gray-100">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-400"><Menu className="w-5 h-5" /></button>
            <h1 className="text-[13px] font-normal uppercase tracking-widest text-gray-400">Configuration</h1>
          </div>
          <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded flex items-center justify-center font-normal text-xs uppercase">AD</div>
        </header>

        <nav className="bg-white border-b border-gray-100 px-8 flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-5 text-sm font-normal transition-all border-b-2 -mb-px ${
                activeTab === tab.id 
                ? 'border-orange-500 text-orange-600' 
                : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="max-w-4xl mx-auto py-12 px-8">
            
            {/* CONTENT AREA - EXCLUSIVE CONDITIONS */}
            {activeTab === 'seo' && (
              <div className="space-y-10 animate-in fade-in duration-200">
                <div className="space-y-4">
                  <label className="text-[11px] font-normal uppercase tracking-widest text-gray-400 block px-1">Site Title</label>
                  <input 
                    type="text" 
                    value={settings.site_title}
                    onChange={(e) => setSettings({...settings, site_title: e.target.value})}
                    className="w-full py-2 text-sm font-normal text-gray-700 bg-transparent border-b border-gray-50 focus:border-orange-500 focus:outline-none transition-all placeholder-gray-200"
                    placeholder="Enter title..."
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-normal uppercase tracking-widest text-gray-400 block px-1">Description</label>
                  <textarea 
                    rows={2}
                    value={settings.site_description}
                    onChange={(e) => setSettings({...settings, site_description: e.target.value})}
                    className="w-full py-2 text-sm font-normal text-gray-700 bg-transparent border-b border-gray-50 focus:border-orange-500 focus:outline-none resize-none leading-relaxed placeholder-gray-200"
                    placeholder="Enter description..."
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-normal uppercase tracking-widest text-gray-400 block px-1">OG Image URL</label>
                  <input 
                    type="url" 
                    value={settings.site_og_image}
                    onChange={(e) => setSettings({...settings, site_og_image: e.target.value})}
                    className="w-full py-2 text-sm font-normal text-orange-600/70 bg-transparent border-b border-gray-50 focus:border-orange-500 focus:outline-none placeholder-gray-200"
                    placeholder="https://..."
                  />
                </div>
                <div className="pt-4">
                  <button 
                    onClick={() => handleSave('seo')}
                    disabled={saveStatus.seo === 'saving'}
                    className="bg-orange-500 text-white px-8 py-2.5 rounded text-sm font-normal hover:bg-orange-600 transition-all disabled:opacity-50"
                  >
                    {saveStatus.seo === 'saving' ? 'Saving...' : saveStatus.seo === 'success' ? 'Done!' : 'Save Changes'}
                    {saveStatus.seo === 'success' && <Check className="w-4 h-4 ml-2 inline-block" />}
                  </button>
                </div>

                {/* Google Search Preview Card */}
                <div className="mt-16 pt-12 border-t border-gray-50 flex flex-col gap-6">
                   <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-medium uppercase tracking-widest text-gray-400">Search Result Preview</h3>
                      <div className="flex gap-1.5">
                         <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                         <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                         <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                      </div>
                   </div>
                   
                   <div className="bg-white p-6 border border-gray-50 rounded-xl max-w-2xl group transition-all">
                      <div className="flex gap-6">
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-400">K/</div>
                            <span className="text-[11px] text-gray-500 font-normal">keyyap.com</span>
                          </div>
                          <h4 className="text-[16px] md:text-[18px] text-[#1a0dab] font-normal cursor-pointer hover:underline decoration-1 underline-offset-2">
                            {settings.site_title || 'KeyYap! - The Good Place For Yapping!'}
                          </h4>
                          <p className="text-[12px] md:text-[13px] text-[#4d5156] leading-relaxed line-clamp-2">
                             {settings.site_description || 'Express yourself freely on KeyYap!, the ultimate social space for text-based sharing and meaningful conversations.'}
                          </p>
                        </div>
                        {settings.site_og_image && (
                          <div className="w-20 h-20 md:w-28 md:h-28 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 self-center">
                             <img src={settings.site_og_image} alt="SEO Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                   </div>
                   <p className="text-[10px] text-gray-300 italic">This is an approximate visual representation of how your site might appear in search engine results.</p>
                </div>
              </div>
            )}

            {activeTab !== 'seo' && (
              <div className="flex flex-col animate-in fade-in duration-200">
                <div className="flex items-center gap-4 py-4 mb-8 border-b border-gray-50 sticky top-0 bg-white">
                  <button type="button" onClick={() => execCommand('bold')} className="text-[11px] font-normal text-gray-400 border border-gray-100 px-3 py-1.5 rounded hover:text-orange-600">BOLD</button>
                  <button type="button" onClick={() => execCommand('italic')} className="text-[11px] font-normal text-gray-400 border border-gray-100 px-3 py-1.5 rounded hover:text-orange-600">ITALIC</button>
                  <button type="button" onClick={() => execCommand('formatBlock', 'h2')} className="text-[11px] font-normal text-gray-400 border border-gray-100 px-3 py-1.5 rounded hover:text-orange-600">TITLE</button>
                  
                  <button 
                    onClick={() => handleSave(activeTab)}
                    disabled={saveStatus[activeTab] === 'saving'}
                    className="ml-auto bg-orange-500 text-white px-8 py-2.5 rounded text-sm font-normal hover:bg-orange-600 transition-all disabled:opacity-50"
                  >
                    {saveStatus[activeTab] === 'saving' ? 'Publishing...' : saveStatus[activeTab] === 'success' ? 'Done!' : 'Publish Update'}
                    {saveStatus[activeTab] === 'success' && <Check className="w-4 h-4 ml-2 inline-block" />}
                  </button>
                </div>
                <div 
                  ref={editorRef}
                  contentEditable
                  className="w-full min-h-[60vh] text-sm font-normal text-gray-600 leading-relaxed focus:outline-none prose max-w-none pb-40"
                  data-placeholder="Start typing..."
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx global>{`
        [contenteditable]:empty:before { content: attr(data-placeholder); color: #f1f5f9; cursor: text; }
        .prose h2 { font-weight: 500; font-size: 1rem; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #333; text-transform: uppercase; letter-spacing: 0.05em; }
        .prose p { margin-bottom: 1rem; font-size: 0.875rem; color: #4b5563; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
