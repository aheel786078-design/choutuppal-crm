'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { FlowEditorShell } from '@/components/flows/flow-editor-shell'
import type { FlowRow, FlowNodeRow } from '@/lib/flows/types'

export default function AdminFlowEditorPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [flow, setFlow] = useState<FlowRow | null>(null)
  const [nodes, setNodes] = useState<FlowNodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/flows/${id}`)
        if (res.status === 404) {
          if (!cancelled) setNotFound(true)
          return
        }
        if (!res.ok) throw new Error(`Failed to load flow: ${res.status}`)
        const json = await res.json()
        if (!cancelled) {
          setFlow(json.flow)
          setNodes(json.nodes ?? [])
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error(err)
          toast.error(err.message || 'Could not load flow')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="text-xs text-slate-400 font-medium">Loading Admin Visual Flow Canvas...</span>
        </div>
      </div>
    )
  }

  if (notFound || !flow) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center">
        <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Flow Not Found</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            The requested WhatsApp flow was not found or has been removed from this territory.
          </p>
        </div>
        <Link
          href="/admin/flows"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Admin Flows
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950">
      <FlowEditorShell initialFlow={flow} initialNodes={nodes} baseReturnPath="/admin/flows" />
    </div>
  )
}
