'use client'

import React, { useState, useEffect } from 'react'
import {
  Workflow,
  Plus,
  Search,
  Upload,
  Download,
  CheckCircle2,
  Clock,
  PauseCircle,
  PlayCircle,
  Trash2,
  Edit3,
  Smartphone,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Image as ImageIcon,
  Building2,
  Phone,
  Send,
  RefreshCw,
  X,
  Layers,
  ArrowRight,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ListOrdered,
} from 'lucide-react'
import { FlowImportModal } from '@/components/crm/flow-import-modal'
import type { WhatsAppFlow, FlowStatus, FlowNode, FlowNodeType, FlowButton, FlowListSection, ListingSortMode } from '@/lib/types'

interface ListingSummary {
  id: string
  title: string
  slug: string
  categoryName: string
  phone: string
  whatsapp: string
  address: string
  coverImage?: string
  territoryId: string
}

export default function CRMFlowsPage() {
  const [flows, setFlows] = useState<WhatsAppFlow[]>([])
  const [listings, setListings] = useState<ListingSummary[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | FlowStatus>('ALL')
  const [loading, setLoading] = useState(true)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingFlow, setEditingFlow] = useState<Partial<WhatsAppFlow> | null>(null)
  const [editorButtons, setEditorButtons] = useState<Array<{ id: string; title: string; nextNodeId?: string }>>([])
  const [editorKeywords, setEditorKeywords] = useState<string>('')
  const [selectedListingId, setSelectedListingId] = useState<string>('')
  const [listingSortMode, setListingSortMode] = useState<ListingSortMode>('manual')
  const [listingSortOrder, setListingSortOrder] = useState<string[]>([])
  const [categoryPriority, setCategoryPriority] = useState<string[]>([])
  const [listingPageSize, setListingPageSize] = useState<number>(8)
  const [listingCategory, setListingCategory] = useState<string>('')
  const [selectedListingToAddToOrder, setSelectedListingToAddToOrder] = useState<string>('')
  const [selectedCatToAddToPriority, setSelectedCatToAddToPriority] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Simulator State
  interface SimMessage {
    sender: 'user' | 'bot'
    text: string
    imageUrl?: string
    mediaType?: 'image' | 'video' | 'document'
    buttons?: Array<{ id: string; title: string; payload?: string; nextNodeId?: string }>
    listSections?: FlowListSection[]
    timestamp: string
    diagnostics?: {
      matched: boolean
      matchedTrigger?: string | null
      flowId?: string | null
      flowName?: string | null
      nodeId?: string | null
      nodeType?: string | null
      nextNodeTransition?: string | null
      attachedListing?: { id: string; title: string; url?: string; coverImage?: string } | null
      reason?: string | null
    }
  }

  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false)
  const [simChat, setSimChat] = useState<SimMessage[]>([])
  const [simInput, setSimInput] = useState('')
  const [simLoading, setSimLoading] = useState(false)
  const [activeSimFlowId, setActiveSimFlowId] = useState<string | undefined>(undefined)
  const [showDiagnostics, setShowDiagnostics] = useState(true)

  const fetchFlows = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/crm/flows')
      const data = await res.json()
      if (data.success) {
        if (Array.isArray(data.flows)) setFlows(data.flows)
        if (Array.isArray(data.listings)) setListings(data.listings)
      }
    } catch (err) {
      console.warn('Failed to fetch flows:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlows()
  }, [])

  // Metrics
  const totalFlows = flows.length
  const publishedCount = flows.filter((f) => f.status === 'published' || f.isActive).length
  const draftCount = flows.filter((f) => f.status === 'draft').length
  const pausedCount = flows.filter((f) => f.status === 'paused').length

  // Filtered flows
  const filteredFlows = flows.filter((f) => {
    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'published'
        ? f.status === 'published' || f.isActive
        : f.status === statusFilter

    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      f.name.toLowerCase().includes(q) ||
      (f.description && f.description.toLowerCase().includes(q)) ||
      (f.initial_message && f.initial_message.toLowerCase().includes(q)) ||
      (f.trigger_keywords && f.trigger_keywords.some((k) => k.toLowerCase().includes(q))) ||
      (f.triggers && f.triggers.some((t) => t.value.toLowerCase().includes(q)))

    return matchesStatus && matchesSearch
  })

  // Quick Status Toggle
  const handleToggleStatus = async (flow: WhatsAppFlow) => {
    const nextStatus: FlowStatus =
      flow.status === 'published' || flow.isActive ? 'paused' : 'published'

    try {
      const res = await fetch('/api/crm/flows', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: flow.id,
          status: nextStatus,
          isActive: nextStatus === 'published',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setFlows((prev) =>
          prev.map((f) =>
            f.id === flow.id ? { ...f, status: nextStatus, isActive: nextStatus === 'published' } : f
          )
        )
      }
    } catch (err) {
      console.error('Failed to toggle status:', err)
    }
  }

  // Delete Flow
  const handleDeleteFlow = async (flowId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete flow "${name}"?`)) return

    try {
      const res = await fetch(`/api/crm/flows?id=${encodeURIComponent(flowId)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        setFlows((prev) => prev.filter((f) => f.id !== flowId))
      } else {
        alert(data.error || 'Failed to delete flow')
      }
    } catch (err: any) {
      alert(err.message || 'Network error')
    }
  }

  // Open Create Modal
  const handleOpenCreate = () => {
    setValidationError(null)
    setEditingFlow({
      id: `flow_${Date.now()}`,
      name: '',
      description: '',
      status: 'draft',
      initial_message: '',
      imageUrl: '',
      mediaType: 'image',
      territoryId: 'territory_choutuppal',
    })
    setEditorButtons([
      { id: 'btn_1', title: 'Option 1', nextNodeId: 'action_node_1' },
      { id: 'btn_2', title: 'Option 2', nextNodeId: 'action_node_2' },
    ])
    setEditorKeywords('hi, menu')
    setSelectedListingId('')
    setListingSortMode('manual')
    setListingSortOrder([])
    setCategoryPriority([])
    setListingPageSize(8)
    setListingCategory('')
    setSelectedListingToAddToOrder('')
    setSelectedCatToAddToPriority('')
    setIsEditorOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (flow: WhatsAppFlow) => {
    setValidationError(null)
    const entryNode = flow.nodes?.find((n) => n.id === 'entry_message' || n.id === flow.entryNodeId)
    const boundListingId =
      entryNode?.config?.listingId || flow.listingId || ''
    const detectedMediaType =
      entryNode?.config?.mediaType ||
      flow.mediaType ||
      (flow.imageUrl && /\.(mp4|mov|avi|webm)(\?.*)?$/i.test(flow.imageUrl) ? 'video' : 'image')

    const detectedSortMode: ListingSortMode =
      entryNode?.config?.listingSortMode ||
      flow.listingSortMode ||
      (flow.listingSortOrder && flow.listingSortOrder.length > 0
        ? 'manual'
        : (flow.categoryPriority && flow.categoryPriority.length > 0
            ? 'category_priority'
            : 'manual'))
    const detectedSortOrder =
      entryNode?.config?.listingSortOrder || flow.listingSortOrder || []
    const detectedCatPriority =
      entryNode?.config?.categoryPriority || flow.categoryPriority || flow.categoriesOrder || []
    const detectedPageSize =
      entryNode?.config?.listingPageSize || flow.listingPageSize || 8
    const detectedCat =
      entryNode?.config?.listingCategory || ''

    setEditingFlow({
      ...flow,
      imageUrl: flow.imageUrl || entryNode?.config?.mediaUrl || '',
      mediaType: detectedMediaType,
    })

    const existingButtons =
      entryNode?.config?.buttons ||
      flow.button_options?.map((b, i) => ({ id: `btn_${i + 1}`, title: b, nextNodeId: `action_node_${i + 1}` })) ||
      []
    setEditorButtons(existingButtons)

    const existingKws =
      flow.triggers?.map((t) => t.value).join(', ') ||
      flow.trigger_keywords?.join(', ') ||
      flow.triggerKeyword ||
      ''
    setEditorKeywords(existingKws)

    setSelectedListingId(boundListingId)
    setListingSortMode(detectedSortMode)
    setListingSortOrder(detectedSortOrder)
    setCategoryPriority(detectedCatPriority)
    setListingPageSize(detectedPageSize)
    setListingCategory(detectedCat)
    setSelectedListingToAddToOrder('')
    setSelectedCatToAddToPriority('')
    setIsEditorOpen(true)
  }

  // Save Flow from Editor
  const handleSaveFlow = async () => {
    setValidationError(null)
    if (!editingFlow || !editingFlow.name?.trim()) {
      setValidationError('Flow name is required.')
      return
    }

    const keywords = editorKeywords
      .split(/[,;]/)
      .map((k) => k.trim())
      .filter(Boolean)

    if (keywords.length === 0) {
      setValidationError('At least one trigger keyword is required.')
      return
    }

    setIsSaving(true)
    try {
      const triggers = keywords.map((k) => ({
        type: 'keyword' as const,
        value: k,
        territoryId: editingFlow.territoryId || 'territory_choutuppal',
      }))

      const buttons: FlowButton[] = editorButtons
        .filter((b) => b.title.trim().length > 0)
        .slice(0, 3)
        .map((b, i) => ({
          id: b.id || `btn_${i + 1}`,
          title: b.title.trim().slice(0, 20),
          action: 'BUTTON_REPLY',
          payload: b.title.trim(),
          nextNodeId: b.nextNodeId || `action_node_${i + 1}`,
        }))

      const mediaUrl = editingFlow.imageUrl?.trim() || undefined
      if (mediaUrl && !/^https?:\/\//i.test(mediaUrl)) {
        setValidationError(`Media URL must be a valid absolute URL starting with http:// or https:// (received: "${mediaUrl}").`)
        return
      }

      for (const b of buttons) {
        if (b.title.length > 20) {
          setValidationError(`Button title "${b.title}" exceeds Meta 20-character limit (${b.title.length} characters).`)
          return
        }
      }

      const isVideo =
        editingFlow.mediaType === 'video' ||
        (mediaUrl && /\.(mp4|mov|avi|webm)(\?.*)?$/i.test(mediaUrl))
      const isDocument =
        editingFlow.mediaType === 'document' ||
        (mediaUrl && /\.(pdf|doc|docx|csv|xlsx)(\?.*)?$/i.test(mediaUrl))
      const mediaType: 'image' | 'video' | 'document' = isVideo ? 'video' : isDocument ? 'document' : 'image'

      let entryNodeType: FlowNodeType = 'send_message'
      if (buttons.length > 0) {
        entryNodeType = 'send_buttons'
      } else if (selectedListingId) {
        entryNodeType = 'send_listing'
      } else if (mediaUrl) {
        entryNodeType = 'send_media'
      }

      // Preserve complete multi-node graph if flow already has nodes
      let nodes: FlowNode[] = []
      if (Array.isArray(editingFlow.nodes) && editingFlow.nodes.length > 0) {
        // Deep clone existing nodes to preserve complete multi-node graph
        nodes = editingFlow.nodes.map((n) => ({ ...n, config: { ...n.config } }))

        const entryIdx = nodes.findIndex((n) => n.id === 'entry_message' || n.id === editingFlow.entryNodeId)
        if (entryIdx >= 0) {
          nodes[entryIdx] = {
            ...nodes[entryIdx],
            type: entryNodeType,
            config: {
              ...nodes[entryIdx].config,
              text: editingFlow.initial_message || 'Welcome to Choutuppal App!',
              buttons: buttons.length > 0 ? buttons : undefined,
              mediaUrl,
              mediaType: mediaUrl ? mediaType : undefined,
              listingId: selectedListingId || undefined,
              listingCategory: listingCategory || undefined,
              listingSortMode,
              listingSortOrder: listingSortOrder.length > 0 ? listingSortOrder : undefined,
              categoryPriority: categoryPriority.length > 0 ? categoryPriority : undefined,
              listingPageSize,
              footerText: nodes[entryIdx].config.footerText || 'చౌటుప్పల్ యాప్ 24/7 బాట్',
            },
          }
        } else {
          nodes.push({
            id: 'entry_message',
            type: entryNodeType,
            name: 'Interactive Message',
            config: {
              text: editingFlow.initial_message || 'Welcome to Choutuppal App!',
              buttons: buttons.length > 0 ? buttons : undefined,
              mediaUrl,
              mediaType: mediaUrl ? mediaType : undefined,
              listingId: selectedListingId || undefined,
              listingCategory: listingCategory || undefined,
              listingSortMode,
              listingSortOrder: listingSortOrder.length > 0 ? listingSortOrder : undefined,
              categoryPriority: categoryPriority.length > 0 ? categoryPriority : undefined,
              listingPageSize,
              footerText: 'చౌటుప్పల్ యాప్ 24/7 బాట్',
            },
            positionX: 100,
            positionY: 220,
          })
        }

        // Add action nodes for newly created buttons if their nextNodeId doesn't exist
        buttons.forEach((b, i) => {
          if (b.nextNodeId && !nodes.some((n) => n.id === b.nextNodeId)) {
            nodes.push({
              id: b.nextNodeId,
              type: 'send_message',
              name: `Action for ${b.title}`,
              config: {
                text: `ధన్యవాదాలు! మీరు "${b.title}" ఎంచుకున్నారు. వివరాలు త్వరలో రానున్నాయి.\n\n🌐 https://choutuppal.in`,
                nextNodeId: 'end_terminal',
              },
              positionX: 100 + (i - 1) * 260,
              positionY: 380,
            })
          }
        })

        // Ensure start node exists
        if (!nodes.some((n) => n.id === 'start')) {
          nodes.unshift({
            id: 'start',
            type: 'start',
            name: 'Entry Trigger',
            config: { nextNodeId: 'entry_message' },
            positionX: 100,
            positionY: 100,
          })
        }

        // Ensure terminal node exists
        if (!nodes.some((n) => n.id === 'end_terminal' || n.type === 'end')) {
          nodes.push({
            id: 'end_terminal',
            type: 'end',
            name: 'Flow Terminal',
            config: {},
            positionX: 100,
            positionY: 520,
          })
        }
      } else {
        const actionNodes: FlowNode[] = buttons.map((b, i) => ({
          id: b.nextNodeId || `action_node_${i + 1}`,
          type: 'send_message',
          name: `Action ${b.title}`,
          config: {
            text: `ధన్యవాదాలు! మీరు "${b.title}" ఎంచుకున్నారు. వివరాలు త్వరలో రానున్నాయి.\n\n🌐 https://choutuppal.in`,
            nextNodeId: 'end_terminal',
          },
          positionX: 100 + (i - 1) * 260,
          positionY: 380,
        }))

        nodes = [
          {
            id: 'start',
            type: 'start',
            name: 'Entry Trigger',
            config: { nextNodeId: 'entry_message' },
            positionX: 100,
            positionY: 100,
          },
          {
            id: 'entry_message',
            type: entryNodeType,
            name: 'Interactive Message',
            config: {
              text: editingFlow.initial_message || 'Welcome to Choutuppal App!',
              buttons: buttons.length > 0 ? buttons : undefined,
              mediaUrl,
              mediaType: mediaUrl ? mediaType : undefined,
              listingId: selectedListingId || undefined,
              listingCategory: listingCategory || undefined,
              listingSortMode,
              listingSortOrder: listingSortOrder.length > 0 ? listingSortOrder : undefined,
              categoryPriority: categoryPriority.length > 0 ? categoryPriority : undefined,
              listingPageSize,
              footerText: 'చౌటుప్పల్ యాప్ 24/7 బాట్',
            },
            positionX: 100,
            positionY: 220,
          },
          ...actionNodes,
          {
            id: 'end_terminal',
            type: 'end',
            name: 'Flow Terminal',
            config: {},
            positionX: 100,
            positionY: 520,
          },
        ]
      }

      // Graph node ID uniqueness validation
      const nodeIds = nodes.map((n) => n.id)
      const duplicateIds = nodeIds.filter((id, idx) => nodeIds.indexOf(id) !== idx)
      if (duplicateIds.length > 0) {
        setValidationError(`Duplicate node ID(s) detected: ${Array.from(new Set(duplicateIds)).join(', ')}. Node IDs must be unique.`)
        return
      }

      const isUpdate = flows.some((f) => f.id === editingFlow.id)
      const payload = {
        ...editingFlow,
        mediaUrl,
        mediaType: mediaUrl ? mediaType : undefined,
        listingId: selectedListingId || undefined,
        listingCategory: listingCategory || undefined,
        listingSortMode,
        listingSortOrder: listingSortOrder.length > 0 ? listingSortOrder : undefined,
        categoryPriority: categoryPriority.length > 0 ? categoryPriority : undefined,
        listingPageSize,
        triggers,
        trigger_keywords: keywords,
        button_options: buttons.map((b) => b.title),
        nodes,
        isActive: editingFlow.status === 'published',
      }

      const res = await fetch('/api/crm/flows', {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (data.success) {
        await fetchFlows()
        setIsEditorOpen(false)
      } else {
        setValidationError(data.error || 'Failed to save flow.')
      }
    } catch (err: any) {
      setValidationError(err.message || 'Network error saving flow.')
    } finally {
      setIsSaving(false)
    }
  }

  // Insert Variable Token into Editor
  const handleInsertVariable = (token: string) => {
    if (!editingFlow) return
    const cur = editingFlow.initial_message || ''
    setEditingFlow({
      ...editingFlow,
      initial_message: `${cur} ${token}`.trim(),
    })
  }

  // Open Simulator
  const handleOpenSimulator = (flow?: WhatsAppFlow) => {
    const targetFlow = flow || flows.find((f) => f.status === 'published') || flows[0]
    setActiveSimFlowId(targetFlow?.id)
    setSimChat([
      {
        sender: 'bot',
        text: 'నమస్కారం! చౌటుప్పల్ లైవ్ వాట్సాప్ బాట్ సిమ్యులేటర్‌కు స్వాగతం. టైప్ చేయండి లేదా క్రింది బటన్ నొక్కండి.',
        buttons: targetFlow
          ? (targetFlow.button_options || []).slice(0, 3).map((b, i) => ({ id: `btn_${i + 1}`, title: b, payload: b }))
          : [{ id: 'b1', title: 'Hi', payload: 'Hi' }, { id: 'b2', title: 'Menu', payload: 'Menu' }],
        timestamp: 'Just now',
      },
    ])
    setSimInput('')
    setIsSimulatorOpen(true)
  }

  // Send message in simulator via /api/crm/flows/dry-run
  const handleSimSend = async (textToSend?: string, buttonPayload?: string) => {
    const text = textToSend !== undefined ? textToSend : simInput
    if (!text.trim() && !buttonPayload) return

    const userMsgText = text || buttonPayload || ''
    const newChat: SimMessage[] = [
      ...simChat,
      {
        sender: 'user',
        text: userMsgText,
        timestamp: 'Just now',
      },
    ]

    setSimChat(newChat)
    setSimInput('')
    setSimLoading(true)

    try {
      const lastBotMsg = [...simChat].reverse().find((m) => m.sender === 'bot')
      const activeNodeId = lastBotMsg?.diagnostics?.nodeId || undefined

      const res = await fetch('/api/crm/flows/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageText: text,
          buttonPayload: buttonPayload,
          buttonTitle: textToSend,
          activeFlowId: activeSimFlowId,
          activeNodeId,
          allowDraft: true,
        }),
      })

      const data = await res.json()
      if (data.success && data.matched) {
        if (data.flowId) {
          setActiveSimFlowId(data.flowId)
        }
        setSimChat((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: data.renderedBody || 'No text rendered',
            imageUrl: data.selectedMedia,
            mediaType: data.mediaType || 'image',
            buttons: data.buttons || [],
            listSections: data.listSections || [],
            timestamp: 'Just now',
            diagnostics: {
              matched: true,
              matchedTrigger: data.matchedTrigger,
              flowId: data.flowId,
              flowName: data.flowName,
              nodeId: data.nodeId,
              nodeType: data.nodeType,
              nextNodeTransition: data.nextNodeTransition,
              attachedListing: data.attachedListing,
              reason: data.reason,
            },
          },
        ])
      } else {
        setSimChat((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `నమస్కారం! "${userMsgText}" కోసం ఫ్లో మ్యాచ్ కాలేదు. అందుబాటులో ఉన్న సేవల కోసం 'Menu' అని టైప్ చేయండి.`,
            buttons: [
              { id: 'b1', title: 'ప్రభుత్వ సేవలు', payload: 'ప్రభుత్వ సేవలు' },
              { id: 'b2', title: 'వ్యాపారాలు_నిపుణులు', payload: 'వ్యాపారాలు_నిపుణులు' },
              { id: 'b3', title: 'మార్కెట్ప్లేస్', payload: 'మార్కెట్ప్లేస్' },
            ],
            timestamp: 'Just now',
            diagnostics: {
              matched: false,
              reason: data.reason || 'No matching keyword or button trigger found.',
            },
          },
        ])
      }
    } catch (err: any) {
      setSimChat((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `Simulator Dry-Run Error: ${err.message}`,
          timestamp: 'Just now',
        },
      ])
    } finally {
      setSimLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">
                Interactive WhatsApp Flows ({totalFlows})
              </h1>
              <p className="text-xs text-slate-400">
                Visual chatbot decision graphs, button selectors, directory listing bindings &amp; multi-node routing.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleOpenSimulator()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Live Simulator</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Flow</span>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
          <a
            href="/csv/sample_flows.csv"
            download="sample_flows.csv"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Flows</div>
            <div className="text-xl font-bold text-white mt-1">{totalFlows}</div>
          </div>
          <Workflow className="w-7 h-7 text-blue-400 opacity-60" />
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-emerald-400 uppercase font-semibold">Published (Live)</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{publishedCount}</div>
          </div>
          <CheckCircle2 className="w-7 h-7 text-emerald-400 opacity-60" />
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-amber-400 uppercase font-semibold">Draft (Safe)</div>
            <div className="text-xl font-bold text-amber-400 mt-1">{draftCount}</div>
          </div>
          <Clock className="w-7 h-7 text-amber-400 opacity-60" />
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Paused</div>
            <div className="text-xl font-bold text-slate-300 mt-1">{pausedCount}</div>
          </div>
          <PauseCircle className="w-7 h-7 text-slate-400 opacity-60" />
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search flows by name, Telugu keywords, or descriptions..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl shrink-0">
          {(['ALL', 'published', 'draft', 'paused'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st === 'ALL' ? 'All' : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Flows Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
          Loading active WhatsApp flows...
        </div>
      ) : filteredFlows.length === 0 ? (
        <div className="p-16 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
          No flows found matching your filter. Click &quot;New Flow&quot; or &quot;Import CSV&quot; to load flows.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFlows.map((flow, idx) => {
            const isLive = flow.status === 'published' || flow.isActive
            const isPaused = flow.status === 'paused'

            return (
              <div
                key={flow.id || idx}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm space-y-3"
              >
                <div className="space-y-2.5">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 font-mono text-xs flex items-center justify-center font-bold shrink-0">
                        #{idx + 1}
                      </span>
                      <h3 className="font-bold text-white text-xs truncate" title={flow.name}>
                        {flow.name}
                      </h3>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(flow)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                        isLive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : isPaused
                          ? 'bg-slate-700/40 text-slate-400 border-slate-700 hover:bg-slate-700'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                      }`}
                    >
                      {isLive ? '● Live' : isPaused ? '⏸ Paused' : '✎ Draft'}
                    </button>
                  </div>

                  {/* Message Preview */}
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 font-mono line-clamp-3">
                    {flow.initial_message || flow.description || 'Welcome to Choutuppal App!'}
                  </div>

                  {/* Triggers */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Triggers:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {flow.triggers && flow.triggers.length > 0 ? (
                        flow.triggers.slice(0, 3).map((tr, ti) => (
                          <span
                            key={ti}
                            className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono"
                          >
                            {tr.value}
                          </span>
                        ))
                      ) : flow.trigger_keywords && flow.trigger_keywords.length > 0 ? (
                        flow.trigger_keywords.slice(0, 3).map((kw, ki) => (
                          <span
                            key={ki}
                            className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono"
                          >
                            {kw}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-500">Keyword greeting</span>
                      )}
                      {(flow.triggers?.length || 0) > 3 && (
                        <span className="text-[10px] text-slate-500">
                          +{(flow.triggers?.length || 0) - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Interactive Button Chips */}
                  {(flow.button_options?.length || 0) > 0 && (
                    <div className="space-y-1 pt-0.5">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Interactive Buttons:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {flow.button_options!.slice(0, 3).map((btn, bi) => (
                          <span
                            key={bi}
                            className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-md font-medium"
                          >
                            🔘 {btn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attached Listing Preview if present */}
                  {flow.nodes?.some((n) => n.config?.listingId) && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 p-1.5 rounded-lg">
                      <Building2 className="w-3 h-3" />
                      <span>Directory Listing Attached</span>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenSimulator(flow)}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Test in Simulator"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(flow)}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Flow"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteFlow(flow.id, flow.name)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Delete Flow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500">
                    {flow.nodes?.length || 3} Nodes
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Visual Flow Editor Modal */}
      {isEditorOpen && editingFlow && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {flows.some((f) => f.id === editingFlow.id) ? 'Edit Flow' : 'Create New Flow'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Configure triggers, interactive buttons, dynamic directory listings &amp; response text.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Row 1: Name and Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Flow Name</label>
                  <input
                    type="text"
                    value={editingFlow.name || ''}
                    onChange={(e) => setEditingFlow({ ...editingFlow, name: e.target.value })}
                    placeholder="e.g. Welcome Step 2 or ఆస్పత్రులు సమాచారం"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Status</label>
                  <select
                    value={editingFlow.status || 'draft'}
                    onChange={(e) =>
                      setEditingFlow({
                        ...editingFlow,
                        status: e.target.value as FlowStatus,
                        isActive: e.target.value === 'published',
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="draft">Draft (Safe)</option>
                    <option value="published">Published (Live)</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>

              {/* Trigger Keywords */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Trigger Keywords (Comma separated)
                </label>
                <input
                  type="text"
                  value={editorKeywords}
                  onChange={(e) => setEditorKeywords(e.target.value)}
                  placeholder="e.g. hi, hello, నమస్కారం, సేవలు, menu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Message Body with Variable Chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Message Body (Telugu / English)
                  </label>
                  <span className="text-[10px] text-slate-400">Insert dynamic variables:</span>
                </div>

                <div className="flex flex-wrap gap-1.5 pb-1">
                  {[
                    '{{contact.name}}',
                    '{{listing.title}}',
                    '{{listing.phone}}',
                    '{{listing.address}}',
                    '{{listing.url}}',
                    '{{town.name}}',
                    '{{town.url}}',
                  ].map((tok) => (
                    <button
                      key={tok}
                      type="button"
                      onClick={() => handleInsertVariable(tok)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded text-[10px] font-mono border border-slate-700 transition-colors"
                    >
                      + {tok}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={5}
                  value={editingFlow.initial_message || ''}
                  onChange={(e) =>
                    setEditingFlow({ ...editingFlow, initial_message: e.target.value })
                  }
                  placeholder="నమస్కారం! చౌటుప్పల్ యాప్ కి స్వాగతం..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 font-sans text-xs leading-relaxed"
                />
              </div>

              {/* Directory Listing Binding */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-white">Attach Single Directory Listing (Optional)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Select a live business listing to dynamically inject its name, contact phone, address, and cover image.
                </p>
                <select
                  value={selectedListingId}
                  onChange={(e) => setSelectedListingId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- No single listing attached --</option>
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} ({l.categoryName} • {l.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Business Listing Order & Pagination Section */}
              <div className="p-4 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">Business Listing Order</h4>
                      <p className="text-[10px] text-slate-400">
                        Admin-controlled sequence for businesses and categories presented to customers.
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-mono">
                    Phase 9 Verified
                  </span>
                </div>

                {/* Mode Selector & Category Scoping */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Sorting Mode</label>
                    <select
                      value={listingSortMode}
                      onChange={(e) => setListingSortMode(e.target.value as ListingSortMode)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="manual">Manual Order (Default)</option>
                      <option value="category_priority">Category Priority</option>
                      <option value="newest">Newest First</option>
                      <option value="alphabetical">Alphabetical (A-Z)</option>
                      <option value="featured">Featured Listings First</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Category Filter (Optional)</label>
                    <select
                      value={listingCategory}
                      onChange={(e) => setListingCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- All Categories (Full Directory) --</option>
                      <option value="automobile">Automobiles &amp; Multi-Brand</option>
                      <option value="services">Services &amp; Contractors</option>
                      <option value="electrical-hardware">Electrical &amp; Hardware</option>
                      <option value="health-medical">Health &amp; Medical</option>
                      <option value="food-dining">Food &amp; Dining</option>
                      <option value="internet-cyber-cafe">Internet &amp; Cyber Cafe</option>
                      <option value="building-materials">Building Materials</option>
                      <option value="real-estate">Real Estate &amp; Properties</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">
                      Batch Page Size <span className="text-slate-500 font-normal">(Max 10)</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={listingPageSize}
                      onChange={(e) => setListingPageSize(Math.min(Math.max(parseInt(e.target.value) || 8, 1), 10))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                  <span className="font-semibold text-amber-400">WhatsApp Limit:</span>
                  <span>Interactive lists allow max 10 rows per message. Sequences exceeding page size auto-generate &quot;Next ➡️&quot; and &quot;Previous ⬅️&quot; navigation.</span>
                </div>

                {/* MANUAL MODE: Explicit Reordering List */}
                {listingSortMode === 'manual' && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-300">
                        Configured Business Sequence ({listingSortOrder.length} Selected)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Top business appears #1 to customer. Remaining businesses append afterwards.
                      </span>
                    </div>

                    {/* Add Listing to Sequence */}
                    <div className="flex gap-2">
                      <select
                        value={selectedListingToAddToOrder}
                        onChange={(e) => setSelectedListingToAddToOrder(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Choose business to add to sequence --</option>
                        {listings
                          .filter((l) => !listingSortOrder.includes(l.id))
                          .map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.title} ({l.categoryName} • {l.phone})
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedListingToAddToOrder && !listingSortOrder.includes(selectedListingToAddToOrder)) {
                            setListingSortOrder([...listingSortOrder, selectedListingToAddToOrder])
                            setSelectedListingToAddToOrder('')
                          }
                        }}
                        disabled={!selectedListingToAddToOrder}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        + Add to Order
                      </button>
                    </div>

                    {/* Ordered List Items */}
                    {listingSortOrder.length > 0 ? (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {listingSortOrder.map((lId, idx) => {
                          const item = listings.find((l) => l.id === lId)
                          return (
                            <div
                              key={lId}
                              className="flex items-center justify-between gap-2 p-2 bg-slate-900 rounded-lg border border-slate-800 text-xs"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="w-6 h-6 flex items-center justify-center bg-emerald-500/20 text-emerald-300 font-bold font-mono rounded text-[11px] shrink-0">
                                  #{idx + 1}
                                </span>
                                <div className="truncate">
                                  <span className="text-white font-medium truncate block">
                                    {item?.title || lId}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {item?.categoryName || 'Directory Item'} {item?.phone ? `• ${item.phone}` : ''}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => {
                                    if (idx === 0) return
                                    const next = [...listingSortOrder]
                                    const temp = next[idx - 1]
                                    next[idx - 1] = next[idx]
                                    next[idx] = temp
                                    setListingSortOrder(next)
                                  }}
                                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded disabled:opacity-30"
                                  title="Move Up"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === listingSortOrder.length - 1}
                                  onClick={() => {
                                    if (idx === listingSortOrder.length - 1) return
                                    const next = [...listingSortOrder]
                                    const temp = next[idx + 1]
                                    next[idx + 1] = next[idx]
                                    next[idx] = temp
                                    setListingSortOrder(next)
                                  }}
                                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded disabled:opacity-30"
                                  title="Move Down"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setListingSortOrder(listingSortOrder.filter((id) => id !== lId))}
                                  className="p-1 text-slate-500 hover:text-red-400 rounded"
                                  title="Remove"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic p-2 bg-slate-900/40 rounded-lg text-center">
                        No manual order configured. When no specific IDs are set, all eligible directory listings will be presented alphabetically.
                      </div>
                    )}
                  </div>
                )}

                {/* CATEGORY PRIORITY MODE */}
                {listingSortMode === 'category_priority' && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-300">
                        Category Precedence Sequence ({categoryPriority.length} Prioritized)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Listings in #1 category display first, then #2, then #3.
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={selectedCatToAddToPriority}
                        onChange={(e) => setSelectedCatToAddToPriority(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Select category to prioritize --</option>
                        {[
                          'automobile',
                          'services',
                          'electrical-hardware',
                          'health-medical',
                          'food-dining',
                          'internet-cyber-cafe',
                          'building-materials',
                          'real-estate',
                        ]
                          .filter((c) => !categoryPriority.includes(c))
                          .map((slug) => (
                            <option key={slug} value={slug}>
                              {slug}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedCatToAddToPriority && !categoryPriority.includes(selectedCatToAddToPriority)) {
                            setCategoryPriority([...categoryPriority, selectedCatToAddToPriority])
                            setSelectedCatToAddToPriority('')
                          }
                        }}
                        disabled={!selectedCatToAddToPriority}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        + Add Category
                      </button>
                    </div>

                    {categoryPriority.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {categoryPriority.map((cat, ci) => (
                          <div
                            key={cat}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                          >
                            <span className="text-emerald-400 font-bold font-mono">#{ci + 1}</span>
                            <span className="font-medium">{cat}</span>
                            <div className="flex items-center ml-1">
                              <button
                                type="button"
                                disabled={ci === 0}
                                onClick={() => {
                                  if (ci === 0) return
                                  const next = [...categoryPriority]
                                  const temp = next[ci - 1]
                                  next[ci - 1] = next[ci]
                                  next[ci] = temp
                                  setCategoryPriority(next)
                                }}
                                className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={ci === categoryPriority.length - 1}
                                onClick={() => {
                                  if (ci === categoryPriority.length - 1) return
                                  const next = [...categoryPriority]
                                  const temp = next[ci + 1]
                                  next[ci + 1] = next[ci]
                                  next[ci] = temp
                                  setCategoryPriority(next)
                                }}
                                className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setCategoryPriority(categoryPriority.filter((c) => c !== cat))}
                                className="p-0.5 text-slate-500 hover:text-red-400 ml-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic p-2 bg-slate-900/40 rounded-lg text-center">
                        No categories prioritized yet. All categories will be presented using standard town order.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Interactive Reply Buttons (Up to 3) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Quick-Reply Buttons (Max 3 on WhatsApp)
                  </label>
                  {editorButtons.length < 3 && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditorButtons([
                          ...editorButtons,
                          { id: `btn_${editorButtons.length + 1}`, title: '' },
                        ])
                      }
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-bold"
                    >
                      + Add Button
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {editorButtons.map((btn, bi) => (
                    <div key={bi} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-slate-950/80 rounded-xl border border-slate-800/80">
                      <span className="text-[11px] font-mono text-slate-500 w-12">
                        Btn #{bi + 1}:
                      </span>
                      <input
                        type="text"
                        value={btn.title}
                        maxLength={20}
                        onChange={(e) => {
                          const updated = [...editorButtons]
                          updated[bi].title = e.target.value
                          setEditorButtons(updated)
                        }}
                        placeholder="Button Title (e.g. సేవలు)"
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        value={btn.nextNodeId || ''}
                        onChange={(e) => {
                          const updated = [...editorButtons]
                          updated[bi].nextNodeId = e.target.value
                          setEditorButtons(updated)
                        }}
                        placeholder="Next Node ID or goto_flow (Optional)"
                        className="w-full sm:w-48 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 font-mono text-[11px] focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditorButtons(editorButtons.filter((_, idx) => idx !== bi))
                        }
                        className="p-1.5 text-slate-500 hover:text-red-400 self-end sm:self-auto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Image / Video Media URL & Media Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Hero Media URL (Image or Video)
                  </label>
                  <input
                    type="text"
                    value={editingFlow.imageUrl || ''}
                    onChange={(e) => setEditingFlow({ ...editingFlow, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/... or https://example.com/tour.mp4"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Media Type</label>
                  <select
                    value={editingFlow.mediaType || 'image'}
                    onChange={(e) =>
                      setEditingFlow({
                        ...editingFlow,
                        mediaType: e.target.value as 'image' | 'video' | 'document',
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="image">Image (JPG/PNG/WebP)</option>
                    <option value="video">Video (MP4/H.264)</option>
                    <option value="document">Document (PDF/DOCX/CSV)</option>
                  </select>
                </div>
              </div>

              {/* Connected Graph Nodes Inspector */}
              {editingFlow.nodes && editingFlow.nodes.length > 0 && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-300 text-[11px]">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      <span>Connected Graph Nodes ({editingFlow.nodes.length})</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">100% Graph Preserved</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                    {editingFlow.nodes.map((node) => (
                      <div
                        key={node.id}
                        className="p-2 bg-slate-900 border border-slate-800/80 rounded-lg text-[10px] space-y-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white font-mono">{node.id}</span>
                          <span className="text-blue-400 uppercase font-semibold">{node.type}</span>
                        </div>
                        {node.config?.nextNodeId && (
                          <div className="text-slate-400 truncate flex items-center gap-1">
                            <span>➔ Next:</span>
                            <span className="text-emerald-400 font-mono">{node.config.nextNodeId}</span>
                          </div>
                        )}
                        {node.config?.targetFlowId && (
                          <div className="text-purple-400 truncate font-mono">
                            ➔ Goto: {node.config.targetFlowId}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Validation Error Banner */}
              {validationError && (
                <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <span className="font-bold">⚠️ Error:</span>
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFlow}
                disabled={isSaving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Flow'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive WhatsApp Simulator Drawer */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm h-[660px] flex flex-col shadow-2xl overflow-hidden border-2 border-emerald-500/20">
            {/* Phone Top Notch */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <div className="font-bold text-white text-xs leading-none">Choutuppal Bot Live</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {activeSimFlowId ? `Active: ${activeSimFlowId}` : 'Ready (Dry-Run Mode)'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowDiagnostics((prev) => !prev)}
                  title="Toggle Dry-Run Diagnostics"
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                    showDiagnostics
                      ? 'bg-blue-900/60 text-blue-300 border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Diag
                </button>
                <button
                  type="button"
                  onClick={() => setIsSimulatorOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto bg-slate-950/60 text-xs">
              {simChat.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3 shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-bl-none space-y-2'
                    }`}
                  >
                    {/* Media Handling (Video vs Image) */}
                    {msg.imageUrl && (
                      msg.mediaType === 'video' || /\.(mp4|mov|webm)(\?.*)?$/i.test(msg.imageUrl) ? (
                        <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                          <video
                            src={msg.imageUrl}
                            controls
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <img
                          src={msg.imageUrl}
                          alt="Hero"
                          className="w-full h-28 object-cover rounded-xl"
                        />
                      )
                    )}

                    <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                    {/* Attached Listing Card */}
                    {msg.diagnostics?.attachedListing && (
                      <div className="p-2 bg-slate-900/90 border border-emerald-500/30 rounded-xl space-y-1 text-[11px]">
                        <div className="font-semibold text-emerald-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          <span>{msg.diagnostics.attachedListing.title}</span>
                        </div>
                        {msg.diagnostics.attachedListing.url && (
                          <a
                            href={msg.diagnostics.attachedListing.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <span>Open in Directory</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Interactive Quick-Reply Buttons */}
                    {msg.buttons && msg.buttons.length > 0 && (
                      <div className="pt-2 border-t border-slate-700/60 flex flex-col gap-1.5">
                        {msg.buttons.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleSimSend(b.title, b.payload || b.id)}
                            className="w-full py-1.5 px-3 bg-slate-900/80 hover:bg-slate-900 text-blue-400 rounded-lg text-[11px] font-bold border border-blue-500/30 flex items-center justify-center gap-1 transition-colors"
                          >
                            <span>🔘</span>
                            <span>{b.title}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Interactive List Sections */}
                    {msg.listSections && msg.listSections.length > 0 && (
                      <div className="pt-2 border-t border-slate-700/60 space-y-1.5">
                        {msg.listSections.map((sec, sIdx) => (
                          <div key={sIdx} className="space-y-1">
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              {sec.title}
                            </div>
                            <div className="flex flex-col gap-1">
                              {sec.rows.map((row) => (
                                <button
                                  key={row.id}
                                  type="button"
                                  onClick={() => handleSimSend(row.title, row.id)}
                                  className="w-full text-left py-1.5 px-2 bg-slate-900/90 hover:bg-slate-900 border border-slate-700/80 rounded-lg text-[11px] text-slate-200 hover:text-white transition-colors"
                                >
                                  <div className="font-semibold text-blue-400">{row.title}</div>
                                  {row.description && (
                                    <div className="text-[10px] text-slate-400 line-clamp-1">{row.description}</div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dry-Run Diagnostic Meta Badge */}
                    {showDiagnostics && msg.diagnostics && (
                      <div className="pt-1.5 border-t border-slate-700/40 text-[9px] text-slate-400 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-emerald-400">
                            {msg.diagnostics.matched ? '✓ MATCHED' : '✗ NO MATCH'}
                          </span>
                          {msg.diagnostics.matchedTrigger && (
                            <span className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">
                              Trig: {msg.diagnostics.matchedTrigger}
                            </span>
                          )}
                        </div>
                        {msg.diagnostics.flowId && (
                          <div className="truncate">
                            <span className="text-slate-500">Flow:</span> {msg.diagnostics.flowId}
                          </div>
                        )}
                        {msg.diagnostics.nodeId && (
                          <div className="truncate">
                            <span className="text-slate-500">Node:</span> {msg.diagnostics.nodeId} ({msg.diagnostics.nodeType})
                          </div>
                        )}
                        {msg.diagnostics.nextNodeTransition && (
                          <div className="truncate text-blue-400">
                            <span className="text-slate-500">Next:</span> {msg.diagnostics.nextNodeTransition}
                          </div>
                        )}
                        {msg.diagnostics.reason && (
                          <div className="text-slate-500 italic">
                            {msg.diagnostics.reason}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-0.5 px-1">{msg.timestamp}</span>
                </div>
              ))}

              {/* Typing / Loading Indicator */}
              {simLoading && (
                <div className="flex items-start gap-1 p-2 bg-slate-800/60 rounded-2xl w-20 justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
            </div>

            {/* Phone Input Box */}
            <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={simInput}
                disabled={simLoading}
                onChange={(e) => setSimInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !simLoading && handleSimSend()}
                placeholder="Type 'hi', 'menu', or Telugu..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => handleSimSend()}
                disabled={simLoading || !simInput.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      <FlowImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={(count) => {
          fetchFlows()
          alert(`Successfully imported ${count} custom WhatsApp flows!`)
        }}
      />
    </div>
  )
}
