'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Link as LinkIcon, Loader2, X, UploadCloud, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface ImageUploadProps {
  value?: string | null
  onChange: (url: string) => void
  folder?: string
  aspect?: 'square' | 'video' | 'auto'
  label?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  maxSizeMB?: number
}

/**
 * ImageUpload component configured for Vercel Blob Storage.
 * Allows file drag-and-drop, button uploads, and image URL inputs.
 * Ensures uploads go directly through `/api/upload` to Vercel Blob CDN.
 */
export function ImageUpload({
  value,
  onChange,
  folder = 'choutuppal-uploads',
  aspect = 'square',
  label,
  placeholder = 'https://... or paste image URL',
  className,
  disabled = false,
  maxSizeMB = 5,
}: ImageUploadProps) {
  const [tab, setTab] = useState<'file' | 'url'>('file')
  const [urlInput, setUrlInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const aspectClass =
    aspect === 'square' ? 'aspect-square' : aspect === 'video' ? 'aspect-video' : 'aspect-auto'

  async function uploadFile(file: File) {
    if (!file) return

    // File size check (default 5MB)
    const maxBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxBytes) {
      toast.error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max size is ${maxSizeMB}MB.`)
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (JPG, PNG, WebP, AVIF).')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to upload image to Vercel Blob')
      }

      const returnedUrl = data.url || data.files?.[0]?.url
      if (!returnedUrl) {
        throw new Error('No URL returned from upload server')
      }

      onChange(returnedUrl)
      toast.success('Image uploaded successfully!')
    } catch (err: any) {
      console.error('[ImageUpload] Error:', err)
      toast.error(err?.message || 'Image upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function handleFileSelection(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled || uploading) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
  }

  function handleUrlApply() {
    if (!urlInput.trim()) return
    const cleanUrl = urlInput.trim()
    onChange(cleanUrl)
    setUrlInput('')
    toast.success('Image URL applied!')
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && <label className="text-xs font-semibold text-slate-700">{label}</label>}

      {/* Preview with remove action if value is set */}
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
              ;(e.currentTarget as unknown as HTMLImageElement).src = 'https://placehold.co/600x400?text=Image+Load+Error'
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition group-hover:opacity-100">
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
              Upload Image
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

          {/* Tab 1: File Drag & Drop / Click Upload */}
          {tab === 'file' && (
            <div
              onClick={() => !uploading && !disabled && fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition',
                isDragOver
                  ? 'border-blue-500 bg-blue-50/50'
                  : 'border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50/20',
                uploading && 'pointer-events-none opacity-60',
              )}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="text-xs font-medium text-slate-600">Uploading to Vercel Blob...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="rounded-full bg-blue-50 p-2.5 text-blue-600">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Click or drag & drop photo
                  </span>
                  <span className="text-[11px] text-slate-400">
                    PNG, JPG, WebP up to {maxSizeMB}MB (Stored on Vercel CDN)
                  </span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={disabled || uploading}
                onChange={handleFileSelection}
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
                  Apply
                </Button>
              </div>
              <p className="text-[11px] text-slate-400">
                Paste a direct image URL (e.g. from Cloudinary, Imgur, or direct CDN link).
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ImageUpload
