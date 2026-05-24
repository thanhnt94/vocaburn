import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CloudUpload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  Download,
  Brain,
  Zap,
  Info,
  X,
  FileSpreadsheet,
  ChevronRight,
  Eye,
  Image,
  Volume2,
  Settings
} from 'lucide-react'
import axios from 'axios'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

const parseBBCodeToHtml = (text: string): string => {
  if (!text) return '';
  let html = text;
  html = html.replace(/\[b\]/gi, '<strong>');
  html = html.replace(/\[\/b\]/gi, '</strong>');
  html = html.replace(/\[i\]/gi, '<em>');
  html = html.replace(/\[\/i\]/gi, '</em>');
  html = html.replace(/\[u\]/gi, '<u>');
  html = html.replace(/\[\/u\]/gi, '</u>');
  html = html.replace(/\[s\]/gi, '<del>');
  html = html.replace(/\[\/s\]/gi, '</del>');
  html = html.replace(/\[color=([^\]]+)\]/gi, (_, color) => `<span style="color: ${color}">`);
  html = html.replace(/\[\/color\]/gi, '</span>');
  html = html.replace(/\[size=([^\]]+)\]/gi, (_, size) => `<span style="font-size: ${size}">`);
  html = html.replace(/\[\/size\]/gi, '</span>');
  return html;
};

const MarkdownComponents = {
  code({ node, className, children, ...props }: any) {
    const value = String(children || '').replace(/\n$/, '')
    const hasRuby = value.includes('<ruby>') || value.includes('</ruby>')
    if (hasRuby) {
      return (
        <code className={className} dangerouslySetInnerHTML={{ __html: value }} {...props} />
      )
    }
    return <code className={className} {...props}>{children}</code>
  }
}

const ImportQuiz = () => {
  const navigate = useNavigate()
  const [isUploading, setIsUploading] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  const handlePreview = async (file: File) => {
    setIsPreviewing(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await axios.post('/api/v1/quiz/preview', formData)
      setPreviewData(response.data)
      setSelectedFile(file)
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to parse preview."
      setError(msg)
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleFinalUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('metadata_override', JSON.stringify(previewData.metadata))
    
    try {
      const response = await axios.post('/api/v1/quiz/upload', formData)
      if (response.data.status === 'ok') {
        setSuccess(true)
        setTimeout(() => navigate('/manage'), 2000)
      } else {
        throw new Error(response.data.error || "Neural ingestion failed.")
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Neural injection failed."
      setError(msg)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      {/* Sticky Mobile Header */}
      <div className="sticky top-0 z-[120] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-4 md:hidden shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/manage')}
            className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 active:scale-90 transition-all border border-slate-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">Import Studio</h1>
        </div>
        <button 
           onClick={() => setShowGuide(true)}
           className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center active:scale-90 transition-all"
        >
           <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-10 mb-8 hidden md:block">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/manage')}
              className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Flashcard Management Center</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Bulk Deck Ingestion</p>
            </div>
          </div>
          <a 
            href="/api/v1/quiz/template/download"
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-[10px] font-black rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 uppercase tracking-widest"
          >
            <Download className="w-4 h-4" />
            Download Excel Template
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6 md:mt-0 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Instructions (Desktop Only) */}
        {!previewData && (
          <div className="hidden lg:flex flex-col gap-6">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest italic mb-6 flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-600" />
                Upload Protocol
              </h2>
              <div className="space-y-6">
                <div className="relative pl-8">
                  <div className="absolute left-0 top-0 w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600">1</div>
                  <h4 className="text-[10px] font-black text-slate-900 uppercase mb-1">Dual-Sheet Structure</h4>
                  <p className="text-[10px] font-medium text-slate-400 leading-relaxed">File must contain <span className="text-slate-900 font-bold italic">"Info"</span> and <span className="text-slate-900 font-bold italic">"Data"</span> sheets.</p>
                </div>
                <div className="relative pl-8">
                  <div className="absolute left-0 top-0 w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600">2</div>
                  <h4 className="text-[10px] font-black text-slate-900 uppercase mb-1">Data Schema</h4>
                  <p className="text-[10px] font-medium text-slate-400 leading-relaxed">Supports: Front, Back, Front_Img, Back_Img, Front_Audio_Url, Back_Audio_Url, etc.</p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100">
               <CloudUpload className="w-8 h-8 mb-4 opacity-50" />
               <h3 className="text-sm font-black uppercase tracking-tight italic mb-2">Bulk Processing</h3>
               <p className="text-[10px] font-medium opacity-80 leading-relaxed">Large sets (1000+ cards) may take a few moments to stabilize in the database.</p>
            </div>
          </div>
        )}

        {/* Main Upload Zone */}
        <div className={cn("space-y-6", previewData ? "lg:col-span-4" : "lg:col-span-3")}>
          {!previewData ? (
            <div 
              className={`relative h-[300px] md:h-[400px] rounded-[2.5rem] md:rounded-[3.5rem] border-4 border-dashed transition-all flex flex-col items-center justify-center p-6 md:p-12 text-center group ${
                isPreviewing ? 'border-indigo-600 bg-indigo-50/10' :
                error ? 'border-rose-500 bg-rose-50/30' :
                'border-slate-200 bg-white hover:border-indigo-600'
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                if (file) handlePreview(file)
              }}
            >
              {isPreviewing ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-xl shadow-indigo-100 animate-pulse">
                    <Zap className="w-8 h-8 md:w-10 md:h-10 animate-bounce" />
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight italic">Parsing Content</h3>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-2 text-center">Extracting flashcard deck from spreadsheet...</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all mb-6 group-hover:scale-110">
                    <CloudUpload className="w-8 h-8 md:w-10 md:h-10" />
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight italic mb-2">Upload Flashcard Decks</h3>
                  <p className="text-[9px] md:text-[10px] font-medium text-slate-400 max-w-[200px] mx-auto leading-relaxed uppercase tracking-widest">Select an Excel file (.xlsx) to preview your collection</p>
                  
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="mt-8 px-8 py-4 bg-indigo-600 text-white text-[10px] font-black rounded-xl md:rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase tracking-[0.2em] active:scale-95"
                  >
                    Select File
                  </button>
                </>
              )}

              {error && (
                <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10 right-6 md:right-10 flex items-center gap-3 bg-white/90 backdrop-blur p-4 rounded-xl border border-rose-100 text-rose-600 shadow-xl shadow-rose-500/5">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-tight text-left leading-tight">{error}</p>
                </div>
              )}

              <input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handlePreview(file)
                }}
              />
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Preview Header Card */}
              <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border border-slate-100 shadow-sm space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 rounded-xl md:rounded-2xl flex items-center justify-center text-indigo-600">
                        <FileText className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase italic tracking-tight">Flashcard Deck Preview</h2>
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                          {previewData.count} Cards detected • {selectedFile?.name.substring(0, 20)}...
                        </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => { setPreviewData(null); setSelectedFile(null); }}
                      className="flex-1 md:flex-none px-6 py-3 bg-slate-50 text-slate-400 text-[10px] font-black rounded-xl hover:bg-slate-100 transition-all uppercase tracking-widest"
                    >
                      Discard
                    </button>
                    <button 
                      onClick={handleFinalUpload}
                      disabled={isUploading || success}
                      className={cn(
                        "flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 text-white text-[10px] font-black rounded-xl transition-all shadow-lg uppercase tracking-widest",
                        success ? "bg-emerald-500 shadow-emerald-100" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                      )}
                    >
                      {isUploading ? <Zap className="w-4 h-4 animate-spin" /> : success ? <CheckCircle2 className="w-4 h-4" /> : <CloudUpload className="w-4 h-4" />}
                      {isUploading ? "..." : success ? "OK" : "Import"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Deck Title</label>
                      <input 
                        type="text" 
                        value={previewData.metadata.title}
                        onChange={(e) => setPreviewData({
                          ...previewData, 
                          metadata: { ...previewData.metadata, title: e.target.value }
                        })}
                        className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Description</label>
                      <textarea 
                        rows={3}
                        value={previewData.metadata.description}
                        onChange={(e) => setPreviewData({
                          ...previewData, 
                          metadata: { ...previewData.metadata, description: e.target.value }
                        })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Category</label>
                      <input 
                        type="text" 
                        value={previewData.metadata.category}
                        onChange={(e) => setPreviewData({
                          ...previewData, 
                          metadata: { ...previewData.metadata, category: e.target.value }
                        })}
                        className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Tags (Comma Separated)</label>
                      <input 
                        type="text" 
                        value={previewData.metadata.tags?.join(', ')}
                        onChange={(e) => setPreviewData({
                          ...previewData, 
                          metadata: { ...previewData.metadata, tags: e.target.value.split(',').map(t => t.trim()) }
                        })}
                        className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Questions Preview List */}
              <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Flashcard Preview</h3>
                  <div className="px-3 py-1 bg-white rounded-lg border border-slate-100">
                    <span className="text-[9px] font-black text-indigo-600">{previewData.questions.length} CARDS</span>
                  </div>
                </div>
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                  {/* Table for Desktop */}
                  <div className="hidden md:block">
                    <table className="w-full text-left table-fixed">
                      <thead className="sticky top-0 bg-white/95 backdrop-blur z-10 border-b border-slate-100">
                        <tr>
                          <th className="w-1/2 px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Front Face (Word & Assets)</th>
                          <th className="w-1/2 px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Back Face (Definition & Explanation)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/60 bg-slate-50/10">
                        {previewData.questions.map((q: any, idx: number) => (
                          <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                            {/* FRONT CARD PREVIEW */}
                            <td className="px-8 py-6 align-top">
                              <div className="p-5 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm space-y-3 min-h-[140px] flex flex-col justify-between hover:border-indigo-200 transition-all">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-md flex items-center justify-center text-[9px] font-black">{idx + 1}</span>
                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">FRONT FACE</span>
                                  </div>
                                  <div className="text-xs font-bold text-slate-800 leading-relaxed markdown-content whitespace-pre-wrap">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                                      {parseBBCodeToHtml(q.content || '')}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                                {(q.image || q.others?.front_img || q.audio || q.others?.front_audio_url || q.others?.front_audio_content) && (
                                  <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-50">
                                    {(q.image || q.others?.front_img) && (
                                      <span title="Front Image" className="inline-flex items-center gap-1 text-[8px] font-black text-indigo-600 bg-indigo-50/60 px-2 py-0.5 rounded-md">
                                        <Image className="w-2.5 h-2.5" /> IMG
                                      </span>
                                    )}
                                    {(q.audio || q.others?.front_audio_url) && (
                                      <span title="Front Audio" className="inline-flex items-center gap-1 text-[8px] font-black text-indigo-600 bg-indigo-50/60 px-2 py-0.5 rounded-md">
                                        <Volume2 className="w-2.5 h-2.5" /> AUDIO
                                      </span>
                                    )}
                                    {q.others?.front_audio_content?.trim() && (
                                      <span title="Front Reading Script" className="inline-flex items-center gap-1 text-[8px] font-black text-indigo-600 bg-indigo-50/60 px-2 py-0.5 rounded-md max-w-[120px] truncate">
                                        <FileText className="w-2.5 h-2.5 shrink-0" /> SCRIPT: "{q.others.front_audio_content.substring(0, 15)}..."
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* BACK CARD PREVIEW */}
                            <td className="px-8 py-6 align-top">
                              <div className="p-5 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm space-y-3 min-h-[140px] flex flex-col justify-between hover:border-purple-200 transition-all">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 bg-purple-50 text-purple-600 rounded-md flex items-center justify-center text-[9px] font-black">{idx + 1}</span>
                                    <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">BACK FACE</span>
                                  </div>
                                  <div className="text-xs font-bold text-slate-700 leading-relaxed markdown-content whitespace-pre-wrap">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                                      {parseBBCodeToHtml(q.options.find((o: any) => o.is_correct)?.content || q.explanation || "No definition.")}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                                {(q.others?.back_img || q.others?.back_audio_url || q.others?.back_audio_content || q.others?.other_content) && (
                                  <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-50">
                                    {q.others?.back_img && (
                                      <span title="Back Image" className="inline-flex items-center gap-1 text-[8px] font-black text-purple-600 bg-purple-50/60 px-2 py-0.5 rounded-md">
                                        <Image className="w-2.5 h-2.5" /> IMG
                                      </span>
                                    )}
                                    {q.others?.back_audio_url && (
                                      <span title="Back Audio" className="inline-flex items-center gap-1 text-[8px] font-black text-purple-600 bg-purple-50/60 px-2 py-0.5 rounded-md">
                                        <Volume2 className="w-2.5 h-2.5" /> AUDIO
                                      </span>
                                    )}
                                    {q.others?.back_audio_content?.trim() && (
                                      <span title="Back Reading Script" className="inline-flex items-center gap-1 text-[8px] font-black text-purple-600 bg-purple-50/60 px-2 py-0.5 rounded-md max-w-[120px] truncate">
                                        <FileText className="w-2.5 h-2.5 shrink-0" /> SCRIPT: "{q.others.back_audio_content.substring(0, 15)}..."
                                      </span>
                                    )}
                                    {q.others?.other_content && (
                                      <span title="Custom JSON Metadata" className="inline-flex items-center gap-1 text-[8px] font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">
                                        <Settings className="w-2.5 h-2.5" /> METADATA
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Cards for Mobile */}
                  <div className="md:hidden divide-y divide-slate-100 bg-slate-50/20">
                     {previewData.questions.map((q: any, idx: number) => (
                       <div key={idx} className="p-5 space-y-4">
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                             <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0">
                               {idx + 1}
                             </div>
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CARD DETAILS</span>
                           </div>
                         </div>
                         <div className="space-y-3">
                           {/* FRONT */}
                           <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-2">
                             <span className="text-[8px] font-black text-indigo-500 uppercase tracking-wider block">FRONT</span>
                             <div className="text-xs font-bold text-slate-900 leading-relaxed markdown-content whitespace-pre-wrap">
                               <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                                 {parseBBCodeToHtml(q.content || '')}
                               </ReactMarkdown>
                             </div>
                             {(q.image || q.others?.front_img || q.audio || q.others?.front_audio_url || q.others?.front_audio_content) && (
                               <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-50 text-[8px] font-black text-indigo-600">
                                 {(q.image || q.others?.front_img) && <span>IMAGE</span>}
                                 {(q.audio || q.others?.front_audio_url) && <span>• AUDIO</span>}
                                 {q.others?.front_audio_content && <span>• SCRIPT</span>}
                               </div>
                             )}
                           </div>
                           
                           {/* BACK */}
                           <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-2">
                             <span className="text-[8px] font-black text-purple-500 uppercase tracking-wider block">BACK</span>
                             <div className="text-xs font-bold text-slate-700 leading-relaxed markdown-content whitespace-pre-wrap">
                               <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                                 {parseBBCodeToHtml(q.options.find((o: any) => o.is_correct)?.content || q.explanation || "No definition.")}
                               </ReactMarkdown>
                             </div>
                             {(q.others?.back_img || q.others?.back_audio_url || q.others?.back_audio_content) && (
                               <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-50 text-[8px] font-black text-purple-600">
                                 {q.others?.back_img && <span>IMAGE</span>}
                                 {q.others?.back_audio_url && <span>• AUDIO</span>}
                                 {q.others?.back_audio_content && <span>• SCRIPT</span>}
                               </div>
                             )}
                           </div>
                         </div>
                       </div>
                     ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {!previewData && (
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                   <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Supported Formats</p>
                   <p className="text-xs font-bold text-slate-700 mt-0.5">Excel Workbook (.xlsx, .xls)</p>
                </div>
              </div>
              <a 
                href="/api/v1/quiz/template/download"
                className="md:hidden flex items-center justify-center gap-2 py-4 bg-slate-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-slate-100"
              >
                 <Download className="w-4 h-4" />
                 Download Template
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Guide Modal */}
      <AnimatePresence>
         {showGuide && (
           <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center p-0 md:p-6">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md md:rounded-0" 
                onClick={() => setShowGuide(false)} 
              />
              <motion.div 
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 md:p-10 shadow-2xl border-t md:border border-slate-100 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                      <Info className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Upload Protocol</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Spreadsheet requirements</p>
                    </div>
                  </div>
                  <button onClick={() => setShowGuide(false)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6">
                    <div className="flex gap-4">
                       <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0">1</div>
                       <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase mb-1">Dual-Sheet Matrix</h4>
                          <p className="text-[11px] font-medium text-slate-500 leading-relaxed">File must contain <span className="text-indigo-600 font-bold">"Info"</span> (Meta) and <span className="text-indigo-600 font-bold">"Data"</span> (Cards) sheets.</p>
                       </div>
                    </div>
                    <div className="flex gap-4">
                       <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0">2</div>
                       <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase mb-1">Column Schema</h4>
                          <p className="text-[11px] font-medium text-slate-500 leading-relaxed">Sheet "Data" supports: Front (Word), Back (Definition), Front_Img, Back_Img, Front_Audio_Url, Back_Audio_Url, etc.</p>
                       </div>
                    </div>
                  </div>
                  
                  <a 
                    href="/api/v1/quiz/template/download"
                    className="flex items-center justify-center gap-3 w-full py-5 bg-slate-900 text-white text-[11px] font-black rounded-2xl uppercase tracking-[0.2em] shadow-xl shadow-slate-200"
                  >
                     <Download className="w-5 h-5" />
                     Get Template (.xlsx)
                  </a>
                </div>
              </motion.div>
           </div>
         )}
      </AnimatePresence>
    </div>
  )
}

export default ImportQuiz
