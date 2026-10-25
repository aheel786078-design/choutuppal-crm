'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Link as LinkIcon, Loader2, X, UploadCloud, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface ImageUploaderProps {
  value?: string | null
  onChange: (url: string) => void
  folder?: string
  aspect?: 'square' | 'video' | 'auto'
  label?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function ImageUploader({
  value,
  onChange,
  folder = 'choutuppal-uploads',
  aspect = 'square',
  label,
  placeholder = 'https://example.com/image.jpg',
  className,
  disabled = false,
}: ImageUploaderProps) {
  const [tab, setTab] = useState<'file' | 'url'>('file')
  const [urlInput, setUrlInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const aspectClass =
    aspect === 'square' ? 'aspect-square' : aspect === 'video' ? 'aspect-video' : 'aspect-auto'

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('files', file)
      form.append('folder', folder)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Upload failed')
      }
      const uploadedUrl = json.url || json.files?.[0]?.url
      if (!uploadedUrl) {
        throw new Error('No URL returned from upload server')
      }
      onChange(uploadedUrl)
      toast.success('Image uploaded successfully!')
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleUrlApply() {
    if (!urlInput.trim()) return
    const cleanUrl = urlInput.trim()
    onChange(cleanUrl)
    setUrlInput('')
    toast.success('Image URL set!')
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && <label className="text-xs font-semibold text-slate-700">{label}</label>}

      {/* Preview Card if value is present */}
      {value ? (
        <div className={cn('group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50', aspectClass)}>
          <Image
            src={value}
            alt="Uploaded preview"
            width={800}
            height={800}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            unoptimized={value.startsWith('http://') || value.startsWith('https://')}
            onError={(e) => {
              ;(e.currentTarget as unknown as HTMLImageElement).src = 'https://placehold.co/600x400?text=Invalid+Image+URL'
            }}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 transition group-hover:opacity-100 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => onChange('')}
              disabled={disabled}
              className="rounded-full bg-red-600 p-2 text-white shadow hover:bg-red-700 transition"
              title="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-3">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setTab('file')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-md py-1 transition-all',
                tab === 'file' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900',
              )}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setTab('url')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-md py-1 transition-all',
                tab === 'url' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900',
              )}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Enter Image URL
            </button>
          </div>

          {/* Tab 1: File Upload */}
          {tab === 'file' && (
            <div
              onClick={() => !uploading && !disabled && fileInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-6 text-center cursor-pointer transition hover:border-blue-500 hover:bg-blue-50/20',
                uploading && 'pointer-events-none opacity-60',
              )}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="text-xs font-medium text-slate-600">Uploading image to Vercel Blob...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="rounded-full bg-blue-50 p-2.5 text-blue-600">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Click to upload photo</span>
                  <span className="text-[11px] text-slate-400">PNG, JPG, WEBP (Saved to Vercel Blob CDN)</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={disabled || uploading}
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </div>
          )}

          {/* Tab 2: Paste URL */}
          {tab === 'url' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder={placeholder}
                  className="text-xs"
                  disabled={disabled}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleUrlApply()
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUrlApply}
                  disabled={disabled || !urlInput.trim()}
                  className="gap-1 text-xs shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Check className="h-3.5 w-3.5" />
                  Set URL
                </Button>
              </div>
              <p className="text-[11px] text-slate-400">
                Paste a direct image web address ending in .jpg, .png, or webp
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
