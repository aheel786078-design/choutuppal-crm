'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Upload,
  Image as ImageIcon,
  Check,
  Search,
  Sparkles,
  Loader2,
  HardDrive,
  Link2,
  AlertCircle,
  Smartphone,
  CheckCircle2,
  Zap,
} from 'lucide-react'
import { compressImage, formatBytes, type CompressionResult } from '@/lib/image-compress'

export interface MediaPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string) => void
  currentValue?: string
  title?: string
  source?: 'banner' | 'flow' | 'listing' | 'manual'
}

interface MediaItem {
  id: string
  url: string
  name: string
  category: 'uploads' | 'banners' | 'branding' | 'listings' | 'presets'
  source: string
  size?: number
  uploadedAt?: string
}

export function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  currentValue = '',
  title = 'ఫోటో ఎంచుకోండి లేదా అప్‌లోడ్ చేయండి (Media Gallery & Upload)',
  source = 'manual',
}: MediaPickerModalProps) {
  const [activeTab, setActiveTab] = useState<'gallery' | 'upload' | 'url'>('gallery')
  const [mediaList, setMediaList] = useState<MediaItem[]>([])
  const [loadingGallery, setLoadingGallery] = useState(false)
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'uploads' | 'banners' | 'branding' | 'listings'>('all')
  const [gallerySearch, setGallerySearch] = useState('')
  const [selectedUrl, setSelectedUrl] = useState<string>(currentValue)

  // Upload & Compression State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [customUrlInput, setCustomUrlInput] = useState(currentValue)

  // Fetch website & uploaded media gallery
  const fetchMedia = async () => {
    try {
      setLoadingGallery(true)
      const res = await fetch('/api/admin/media')
      const data = await res.json()
      if (data.success && Array.isArray(data.media)) {
        setMediaList(data.media)
      }
    } catch (err) {
      console.warn('Failed to fetch media library:', err)
    } finally {
      setLoadingGallery(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setSelectedUrl(currentValue)
      setCustomUrlInput(currentValue)
      fetchMedia()
    } else {
      setSelectedFile(null)
      setCompressionResult(null)
      setUploadError(null)
    }
  }, [isOpen, currentValue])

  // Handle file selection from PC or Mobile
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setUploadError(null)
    setIsCompressing(true)

    try {
      // Automatic client-side compression (reduces 5MB-10MB photo to ~150KB WebP)
      const result = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.82,
        format: 'image/webp',
      })
      setCompressionResult(result)
    } catch (err: any) {
      console.error('Compression failed:', err)
      setUploadError('ఇమేజ్ కంప్రెషన్‌లో లోపం వచ్చింది. దయచేసి వేరే ఫోటో ప్రయత్నించండి.')
    } finally {
      setIsCompressing(false)
    }
  }

  // Upload compressed file to Cloudflare R2
  const handleUploadToR2 = async () => {
    const fileToUpload = compressionResult?.file || selectedFile
    if (!fileToUpload) return

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', fileToUpload)
      formData.append('source', source)

      let res = await fetch('/api/admin/media', {
        method: 'POST',
        body: formData,
      })
      let data = await res.json().catch(() => ({}))

      if (!res.ok || !data.success) {
        // Fallback to /api/upload
        res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        data = await res.json().catch(() => ({}))
      }

      if (!res.ok || (!data.success && !data.ok)) {
        throw new Error(data.error || 'Photo upload failed. Please try again.')
      }

      const uploadedUrl = data.publicUrl || data.url || data.files?.[0]?.url
      if (!uploadedUrl) {
        throw new Error('No valid URL returned from media server')
      }
      setSelectedUrl(uploadedUrl)
      onSelect(uploadedUrl)
      onClose()
    } catch (err: any) {
      console.error('R2 Upload error:', err)
      setUploadError(err.message || 'ఫోటో అప్‌లోడ్ కాలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.')
    } finally {
      setIsUploading(false)
    }
  }

  // Filter gallery items
  const filteredMedia = mediaList.filter((item) => {
    if (galleryFilter !== 'all' && item.category !== galleryFilter) return false
    if (gallerySearch.trim()) {
      const q = gallerySearch.toLowerCase()
      return item.name.toLowerCase().includes(q) || item.url.toLowerCase().includes(q)
    }
    return true
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500">
                Direct Cloudflare R2 Upload • Automatic WebP Compression • Zero Speed Impact
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-100 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'gallery'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>వెబ్‌సైట్ ఫోటోలు ({mediaList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>మొబైల్ / పీసీ అప్‌లోడ్</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              Auto Size Drop
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>కస్టమ్ URL</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: WEBSITE MEDIA GALLERY */}
          {activeTab === 'gallery' && (
            <div className="space-y-4">
              {/* Filter pills & search */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
                  {[
                    { id: 'all', label: 'అన్నీ (All)' },
                    { id: 'uploads', label: 'R2 Uploads' },
                    { id: 'banners', label: 'Banners' },
                    { id: 'branding', label: 'Branding' },
                    { id: 'listings', label: 'Listings' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setGalleryFilter(tab.id as any)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer shrink-0 ${
                        galleryFilter === tab.id
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={gallerySearch}
                    onChange={(e) => setGallerySearch(e.target.value)}
                    placeholder="Search photos..."
                    className="w-full sm:w-48 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Photo Grid */}
              {loadingGallery ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <span className="text-xs">ఫోటోలు లోడ్ అవుతున్నాయి...</span>
                </div>
              ) : filteredMedia.length === 0 ? (
                <div className="py-14 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                  <ImageIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-600">ఈ విభాగంలో ఫోటోలు లేవు.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    &quot;మొబైల్ / పీసీ అప్‌లోడ్&quot; ట్యాబ్ నుండి కొత్త ఫోటోను అప్‌లోడ్ చేయండి.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredMedia.map((item) => {
                    const isSelected = selectedUrl === item.url
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedUrl(item.url)}
                        className={`group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-600 ring-2 ring-emerald-500/30 shadow-md'
                            : 'border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                        }`}
                      >
                        <div className="aspect-video bg-slate-100 overflow-hidden relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.url}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow">
                                <Check className="w-3.5 h-3.5 stroke-3" />
                              </div>
                            </div>
                          )}
                          <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {item.category}
                          </span>
                        </div>
                        <div className="p-1.5 bg-white">
                          <p className="text-[11px] font-medium text-slate-800 truncate" title={item.name}>
                            {item.name}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DIRECT UPLOAD WITH AUTO-COMPRESSION */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Upload Dropzone */}
              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-400 bg-emerald-50/40 rounded-2xl p-8 text-center cursor-pointer hover:bg-emerald-50/70 transition-all flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      మొబైల్ లేదా కంప్యూటర్ నుండి ఫోటో ఎంచుకోండి
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Choose from Gallery, Files or Camera (JPG, PNG, WebP)
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-emerald-700 shadow-2xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Browse Files / Camera</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 font-medium bg-emerald-100/60 px-3 py-1 rounded-full">
                    ⚡ ఆటోమేటిక్ సైజ్ తగ్గింపు: 5MB ఫోటోను కూడా ~180KB WebP గా మార్చి వేగంగా లోడ్ అయ్యేలా చేస్తుంది!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected & Compressed Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center">
                    {/* Image Preview */}
                    <div className="w-32 h-24 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300 shadow-xs relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={compressionResult?.dataUrl || URL.createObjectURL(selectedFile)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Compression details */}
                    <div className="flex-1 space-y-1.5 text-xs w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 truncate max-w-[200px]">
                          {selectedFile.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null)
                            setCompressionResult(null)
                          }}
                          className="text-slate-400 hover:text-rose-600 text-[11px] font-semibold"
                        >
                          Change Photo
                        </button>
                      </div>

                      {isCompressing ? (
                        <div className="flex items-center gap-2 text-emerald-700 font-semibold py-1">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>ఫోటో ఆటో-కంప్రెస్ అవుతోంది (Shrinking Size)...</span>
                        </div>
                      ) : compressionResult ? (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-3 gap-2 bg-white p-2 rounded-xl border border-slate-200 text-center">
                            <div>
                              <p className="text-[10px] text-slate-400">అసలు సైజ్</p>
                              <p className="font-semibold text-slate-700">
                                {formatBytes(compressionResult.originalSize)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-emerald-600 font-bold">తగ్గిన సైజ్</p>
                              <p className="font-bold text-emerald-700">
                                {formatBytes(compressionResult.compressedSize)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400">సేవింగ్స్</p>
                              <span className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                                -{compressionResult.compressionRatio}%
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                            <Zap className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                            <span>సూపర్ ఫాస్ట్ లోడింగ్: వెబ్‌సైట్ స్పీడ్‌పై ఎటువంటి ప్రభావం పడదు!</span>
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {uploadError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* Upload button */}
                  <button
                    type="button"
                    disabled={isCompressing || isUploading}
                    onClick={handleUploadToR2}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Cloudflare R2 కి అప్‌లోడ్ అవుతోంది...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Cloudflare R2 కి అప్‌లోడ్ చేసి ఎంచుకోండి (Upload &amp; Select)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CUSTOM URL */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  డైరెక్ట్ ఇమేజ్ లింక్ (Direct Image URL)
                </label>
                <input
                  type="text"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://images.choutuppal.in/... or /assets/choutuppal-app-banner.jpg"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {customUrlInput && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500">ప్రివ్యూ (Preview):</span>
                  <div className="h-44 w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={customUrlInput.startsWith('/') ? `https://choutuppal.in${customUrlInput}` : customUrlInput}
                      alt="Custom URL Preview"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        ;(e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  let url = customUrlInput.replace(/\s+/g, '').trim()
                  if (url) {
                    if (url.startsWith('/')) {
                      url = `https://choutuppal.in${url}`
                    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
                      url = `https://${url}`
                    }
                    setSelectedUrl(url)
                    onSelect(url)
                    onClose()
                  }
                }}
                disabled={!customUrlInput.trim()}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                ఈ లింక్‌ను ఎంచుకోండి (Use URL)
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {activeTab === 'gallery' && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/70">
            <div className="text-[11px] text-slate-500 truncate max-w-[260px] sm:max-w-md">
              {selectedUrl ? (
                <span className="font-mono text-emerald-800 truncate block">ఎంచుకున్నది: {selectedUrl}</span>
              ) : (
                'గ్యాలరీ నుండి ఒక ఫోటోను ఎంచుకోండి'
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 border border-slate-200 bg-white text-slate-700 text-xs font-medium rounded-xl hover:bg-slate-50"
              >
                రద్దు (Cancel)
              </button>
              <button
                type="button"
                disabled={!selectedUrl}
                onClick={() => {
                  if (selectedUrl) {
                    let finalUrl = selectedUrl.replace(/\s+/g, '').trim()
                    if (finalUrl.startsWith('/')) {
                      finalUrl = `https://choutuppal.in${finalUrl}`
                    }
                    onSelect(finalUrl)
                    onClose()
                  }
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>ఫోటో సెలెక్ట్ చేయండి</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
