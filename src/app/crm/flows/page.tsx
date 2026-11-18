'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Workflow,
  Plus,
  GitFork,
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
  List,
  Eye,
  Settings2,
  AlignLeft,
} from 'lucide-react'
import { FlowImportModal } from '@/components/crm/flow-import-modal'
import type {
  WhatsAppFlow,
  FlowStatus,
  FlowNode,
  FlowNodeType,
  FlowButton,
  FlowListSection,
  FlowListRow,
  FlowNodeConfig,
  ListingSortMode,
} from '@/lib/types'

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

  // Granular Step & Multi-message Editor State
  const [editorNodes, setEditorNodes] = useState<FlowNode[]>([])
  const [activeNodeId, setActiveNodeId] = useState<string>('entry_message')
  const [activeStepTab, setActiveStepTab] = useState<'message' | 'buttons' | 'list' | 'listings'>('message')

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
      { id: 'btn_1', title: 'సేవలు', nextNodeId: 'action_node_1' },
      { id: 'btn_2', title: 'రియల్ ఎస్టేట్', nextNodeId: 'action_node_2' },
    ])
    setEditorKeywords('hi, menu, నమస్కారం')
    setSelectedListingId('')
    setListingSortMode('manual')
    setListingSortOrder([])
    setCategoryPriority([])
    setListingPageSize(8)
    setListingCategory('')
    setSelectedListingToAddToOrder('')
    setSelectedCatToAddToPriority('')

    const initialEntryNode: FlowNode = {
      id: 'entry_message',
      type: 'send_buttons',
      name: 'Step 1: స్వాగతం (Entry)',
      config: {
        text: 'నమస్కారం! చౌటుప్పల్ యాప్ కి స్వాగతం. మీకు ఏ సేవ కావాలి?\n\n🌐 అధికారిక పోర్టల్: https://choutuppal.in',
        buttons: [
          { id: 'btn_1', title: 'సేవలు', nextNodeId: 'action_node_1', action: 'BUTTON_REPLY' },
          { id: 'btn_2', title: 'రియల్ ఎస్టేట్', nextNodeId: 'action_node_2', action: 'BUTTON_REPLY' },
        ],
        listSections: [
          {
            title: 'ప్రధాన సేవలు',
            rows: [
              { id: 'row_1', title: 'రియల్ ఎస్టేట్ & ప్లాట్లు', description: 'స్థలాలు & వెంచర్లు', nextNodeId: 'action_node_2' },
              { id: 'row_2', title: 'వ్యాపారాలు & దుకాణాలు', description: 'షాపులు మరియు కాంట్రాక్టర్లు', nextNodeId: 'action_node_1' },
            ],
          },
        ],
        listButtonText: 'మెనూ చూడండి',
        footerText: 'చౌటుప్పల్ యాప్ 24/7 బాట్',
      },
      positionX: 100,
      positionY: 220,
    }

    const defaultNodes: FlowNode[] = [
      { id: 'start', type: 'start', name: 'Start', config: { nextNodeId: 'entry_message' }, positionX: 100, positionY: 100 },
      initialEntryNode,
      {
        id: 'action_node_1',
        type: 'send_message',
        name: 'Step 2: సేవలు',
        config: {
          text: 'చౌటుప్పల్ లో అందుబాటులో ఉన్న అన్ని సేవల సమాచారం:\n\n1. ఎలక్ట్రికల్ & ప్లంబింగ్\n2. కార్పెంటర్ & పెయింటింగ్\n3. ట్రాన్స్పోర్ట్ సర్వీసెస్\n\n🌐 https://choutuppal.in',
          footerText: 'చౌటుప్పల్ యాప్ 24/7 బాట్',
          buttons: [],
          listSections: [],
          listButtonText: 'ఎంపికలు',
        },
        positionX: 100,
        positionY: 340,
      },
      {
        id: 'action_node_2',
        type: 'send_message',
        name: 'Step 3: రియల్ ఎస్టేట్',
        config: {
          text: 'చౌటుప్పల్ మరియు పరిసర ప్రాంతాల్లో ఓపెన్ ప్లాట్లు & భూముల వివరాలు:\n\n🌐 https://choutuppal.in/listings?category=real-estate',
          footerText: 'చౌటుప్పల్ యాప్ 24/7 బాట్',
          buttons: [],
          listSections: [],
          listButtonText: 'ఎంపికలు',
        },
        positionX: 360,
        positionY: 340,
      },
      { id: 'end_terminal', type: 'end', name: 'End', config: {}, positionX: 100, positionY: 480 },
    ]
    setEditorNodes(defaultNodes)
    setActiveNodeId('entry_message')
    setActiveStepTab('message')
    setIsEditorOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (flow: WhatsAppFlow) => {
    setValidationError(null)
    const entryNode = flow.nodes?.find((n) => n.id === 'entry_message' || n.id === flow.entryNodeId)
    const boundListingId =
      entryNode?.config?.listingId || flow.listingId || ''
    const detectedMediaType: 'image' | 'video' | 'document' =
      entryNode?.config?.mediaType === 'video' ||
      flow.mediaType === 'video' ||
      (flow.imageUrl && /\.(mp4|mov|avi|webm)(\?.*)?$/i.test(flow.imageUrl))
        ? 'video'
        : entryNode?.config?.mediaType === 'document' ||
          flow.mediaType === 'document' ||
          (flow.imageUrl && /\.(pdf|doc|docx)(\?.*)?$/i.test(flow.imageUrl))
        ? 'document'
        : 'image'

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

    // Initialize multi-node editor structures
    let nodesToEdit: FlowNode[] = []
    if (Array.isArray(flow.nodes) && flow.nodes.length > 0) {
      nodesToEdit = flow.nodes.map((n) => ({
        ...n,
        config: {
          ...n.config,
          buttons: n.config?.buttons ? [...n.config.buttons] : [],
          listSections: n.config?.listSections ? n.config.listSections.map((s) => ({ ...s, rows: [...(s.rows || [])] })) : [],
          listButtonText: n.config?.listButtonText || 'మెనూ చూడండి',
        },
      }))
    }

    const entryId = flow.entryNodeId || 'entry_message'
    let resolvedEntry = nodesToEdit.find((n) => n.id === entryId || n.id === 'entry_message')
    if (!resolvedEntry) {
      resolvedEntry = {
        id: 'entry_message',
        type: flow.button_options && flow.button_options.length > 0 ? 'send_buttons' : 'send_message',
        name: 'Step 1: స్వాగతం (Entry)',
        config: {
          text: flow.initial_message || 'నమస్కారం! చౌటుప్పల్ యాప్ కి స్వాగతం...',
          buttons: existingButtons.map((b) => ({ id: b.id, title: b.title, nextNodeId: b.nextNodeId })),
          listSections: [],
          listButtonText: 'మెనూ చూడండి',
          mediaUrl: flow.imageUrl || flow.mediaUrl || '',
          mediaType: detectedMediaType,
          footerText: 'చౌటుప్పల్ యాప్ 24/7 బాట్',
        },
        positionX: 100,
        positionY: 220,
      }
      nodesToEdit.push(resolvedEntry)
    }

    // Ensure start node
    if (!nodesToEdit.some((n) => n.id === 'start')) {
      nodesToEdit.unshift({
        id: 'start',
        type: 'start',
        name: 'Start',
        config: { nextNodeId: resolvedEntry.id },
        positionX: 100,
        positionY: 100,
      })
    }

    // Ensure terminal node
    if (!nodesToEdit.some((n) => n.id === 'end_terminal' || n.type === 'end')) {
      nodesToEdit.push({
        id: 'end_terminal',
        type: 'end',
        name: 'End',
        config: {},
        positionX: 100,
        positionY: 600,
      })
    }

    setEditorNodes(nodesToEdit)
    setActiveNodeId(resolvedEntry.id)
    setActiveStepTab('message')
    setIsEditorOpen(true)
  }

  // Active Node derived reference & helpers
  const activeNode = editorNodes.find((n) => n.id === activeNodeId) || editorNodes.find((n) => n.type !== 'start' && n.type !== 'end') || editorNodes[0]
  const messageSteps = editorNodes.filter((n) => n.type !== 'start' && n.type !== 'end')

  const updateActiveNode = (updates: Partial<FlowNodeConfig>, nodeName?: string) => {
    if (!activeNode) return
    setEditorNodes((prev) =>
      prev.map((n) => {
        if (n.id === activeNode.id) {
          return {
            ...n,
            name: nodeName !== undefined ? nodeName : n.name,
            config: {
              ...n.config,
              ...updates,
            },
          }
        }
        return n
      })
    )

    const isEntry = activeNode.id === 'entry_message' || activeNode.id === editingFlow?.entryNodeId
    if (isEntry && editingFlow) {
      setEditingFlow((prev) => {
        if (!prev) return null
        const sync: Partial<WhatsAppFlow> = { ...prev }
        if (updates.text !== undefined) sync.initial_message = updates.text
        if (updates.mediaUrl !== undefined) sync.imageUrl = updates.mediaUrl
        if (updates.mediaType !== undefined) sync.mediaType = updates.mediaType
        return sync
      })
    }
  }

  const handleAddStep = () => {
    const stepNum = messageSteps.length + 1
    const newId = `step_node_${Date.now()}`
    const newNode: FlowNode = {
      id: newId,
      type: 'send_message',
      name: `Step ${stepNum}: సందేశం`,
      config: {
        text: `దశ ${stepNum} వివరాలు:\n\nధన్యవాదాలు! మరింత సమాచారం కోసం సందర్శించండి:\n🌐 https://choutuppal.in`,
        footerText: 'చౌటుప్పల్ యాప్ 24/7 బాట్',
        buttons: [],
        listSections: [],
        listButtonText: 'ఎంపికలు',
      },
      positionX: 100 + (stepNum - 1) * 200,
      positionY: 340,
    }
    setEditorNodes([...editorNodes, newNode])
    setActiveNodeId(newId)
    setActiveStepTab('message')
  }

  const handleDeleteStep = (nodeId: string) => {
    const isEntry = nodeId === 'entry_message' || nodeId === editingFlow?.entryNodeId
    if (isEntry) {
      alert('ప్రధాన స్వాగత సందేశం (Entry Step) ని తొలగించలేరు.')
      return
    }
    if (confirm('ఈ సందేశ దశను ఖచ్చితంగా తొలగించాలనుకుంటున్నారా?')) {
      const remaining = editorNodes.filter((n) => n.id !== nodeId)
      setEditorNodes(remaining)
      const nextActive = remaining.find((n) => n.type !== 'start' && n.type !== 'end')
      if (nextActive) setActiveNodeId(nextActive.id)
    }
  }

  // Button handlers for active node
  const handleAddButton = () => {
    if (!activeNode) return
    const curButtons = activeNode.config?.buttons || []
    if (curButtons.length >= 3) {
      alert('WhatsApp allows a maximum of 3 quick-reply buttons per message.')
      return
    }
    const nextBtnId = `btn_${Date.now()}_${curButtons.length + 1}`
    const updated = [
      ...curButtons,
      { id: nextBtnId, title: `Option ${curButtons.length + 1}`, nextNodeId: 'end_terminal', action: 'BUTTON_REPLY' },
    ]
    updateActiveNode({ buttons: updated })
  }

  const handleUpdateButton = (idx: number, patch: Partial<FlowButton>) => {
    if (!activeNode) return
    const curButtons = [...(activeNode.config?.buttons || [])]
    if (!curButtons[idx]) return
    curButtons[idx] = { ...curButtons[idx], ...patch }
    updateActiveNode({ buttons: curButtons })
  }

  const handleRemoveButton = (idx: number) => {
    if (!activeNode) return
    const curButtons = (activeNode.config?.buttons || []).filter((_, i) => i !== idx)
    updateActiveNode({ buttons: curButtons })
  }

  // List Menu Section & Row handlers for active node
  const handleAddListSection = () => {
    if (!activeNode) return
    const curSections = activeNode.config?.listSections || []
    const newSection: FlowListSection = {
      title: `విభాగం ${curSections.length + 1}`,
      rows: [
        {
          id: `row_${Date.now()}_1`,
          title: 'సేవ లేదా ఎంపిక',
          description: 'చిన్న వివరణ ఇక్కడ ఇవ్వండి',
          nextNodeId: 'end_terminal',
        },
      ],
    }
    updateActiveNode({ listSections: [...curSections, newSection] })
  }

  const handleUpdateListSectionTitle = (secIdx: number, title: string) => {
    if (!activeNode) return
    const curSections = [...(activeNode.config?.listSections || [])]
    if (!curSections[secIdx]) return
    curSections[secIdx] = { ...curSections[secIdx], title }
    updateActiveNode({ listSections: curSections })
  }

  const handleRemoveListSection = (secIdx: number) => {
    if (!activeNode) return
    const curSections = (activeNode.config?.listSections || []).filter((_, i) => i !== secIdx)
    updateActiveNode({ listSections: curSections })
  }

  const handleAddListRow = (secIdx: number) => {
    if (!activeNode) return
    const curSections = [...(activeNode.config?.listSections || [])]
    if (!curSections[secIdx]) return
    const rows = curSections[secIdx].rows || []
    const totalRows = curSections.reduce((acc, s) => acc + (s.rows?.length || 0), 0)
    if (totalRows >= 10) {
      alert('WhatsApp interactive lists allow a maximum of 10 rows across all sections.')
      return
    }
    const newRow: FlowListRow = {
      id: `row_${Date.now()}_${rows.length + 1}`,
      title: `ఎంపిక ${rows.length + 1}`,
      description: 'వివరాలు',
      nextNodeId: 'end_terminal',
    }
    curSections[secIdx] = {
      ...curSections[secIdx],
      rows: [...rows, newRow],
    }
    updateActiveNode({ listSections: curSections })
  }

  const handleUpdateListRow = (secIdx: number, rowIdx: number, patch: Partial<FlowListRow>) => {
    if (!activeNode) return
    const curSections = [...(activeNode.config?.listSections || [])]
    if (!curSections[secIdx] || !curSections[secIdx].rows[rowIdx]) return
    const rows = [...curSections[secIdx].rows]
    rows[rowIdx] = { ...rows[rowIdx], ...patch }
    curSections[secIdx] = { ...curSections[secIdx], rows }
    updateActiveNode({ listSections: curSections })
  }

  const handleRemoveListRow = (secIdx: number, rowIdx: number) => {
    if (!activeNode) return
    const curSections = [...(activeNode.config?.listSections || [])]
    if (!curSections[secIdx]) return
    curSections[secIdx] = {
      ...curSections[secIdx],
      rows: curSections[secIdx].rows.filter((_, i) => i !== rowIdx),
    }
    updateActiveNode({ listSections: curSections })
  }

  // Insert Variable Token into Editor
  const handleInsertVariable = (token: string) => {
    if (!activeNode) return
    const cur = activeNode.config?.text || ''
    updateActiveNode({ text: `${cur} ${token}`.trim() })
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

      // Prepare final nodes from editorNodes
      let finalNodes: FlowNode[] = editorNodes.map((n) => {
        const cfg = { ...n.config }
        // Clean up buttons
        if (cfg.buttons && cfg.buttons.length > 0) {
          cfg.buttons = cfg.buttons
            .filter((b) => b.title && b.title.trim().length > 0)
            .slice(0, 3)
            .map((b, i) => ({
              id: b.id || `btn_${i + 1}`,
              title: b.title.trim().slice(0, 20),
              action: 'BUTTON_REPLY',
              payload: b.payload || b.title.trim(),
              nextNodeId: b.nextNodeId || 'end_terminal',
            }))
        } else {
          delete cfg.buttons
        }

        // Clean up listSections
        if (cfg.listSections && cfg.listSections.length > 0) {
          cfg.listSections = cfg.listSections
            .map((s) => ({
              title: s.title?.trim().slice(0, 24) || 'Section',
              rows: (s.rows || [])
                .filter((r) => r.title && r.title.trim().length > 0)
                .map((r, ri) => ({
                  id: r.id || `row_${ri + 1}`,
                  title: r.title.trim().slice(0, 24),
                  description: r.description ? r.description.trim().slice(0, 72) : undefined,
                  nextNodeId: r.nextNodeId || 'end_terminal',
                })),
            }))
            .filter((s) => s.rows.length > 0)
        } else {
          delete cfg.listSections
        }

        let nodeType: FlowNodeType = n.type || 'send_message'
        if (cfg.buttons && cfg.buttons.length > 0) {
          nodeType = 'send_buttons'
        } else if (cfg.listSections && cfg.listSections.length > 0) {
          nodeType = 'send_list'
        } else if (cfg.listingId) {
          nodeType = 'send_listing'
        } else if (cfg.mediaUrl) {
          nodeType = 'send_media'
        } else {
          nodeType = 'send_message'
        }

        return {
          ...n,
          type: nodeType,
          config: cfg,
        }
      })

      // Ensure start node points to entry node
      const entryId = editingFlow.entryNodeId || 'entry_message'
      if (!finalNodes.some((n) => n.id === 'start')) {
        finalNodes.unshift({
          id: 'start',
          type: 'start',
          name: 'Entry Trigger',
          config: { nextNodeId: entryId },
          positionX: 100,
          positionY: 100,
        })
      } else {
        const startIdx = finalNodes.findIndex((n) => n.id === 'start')
        finalNodes[startIdx].config = { ...finalNodes[startIdx].config, nextNodeId: entryId }
      }

      // Ensure terminal node exists
      if (!finalNodes.some((n) => n.id === 'end_terminal' || n.type === 'end')) {
        finalNodes.push({
          id: 'end_terminal',
          type: 'end',
          name: 'Flow Terminal',
          config: {},
          positionX: 100,
          positionY: 600,
        })
      }

      // Find entry node config for backwards-compatible fields
      const entryNode = finalNodes.find((n) => n.id === entryId || n.id === 'entry_message') || finalNodes[1]
      const initial_message = entryNode?.config?.text || editingFlow.initial_message || 'Welcome to Choutuppal App!'
      const button_options = entryNode?.config?.buttons ? entryNode.config.buttons.map((b) => b.title) : []
      const imageUrl = entryNode?.config?.mediaUrl || editingFlow.imageUrl

      // Validate button titles and list rows limits
      for (const node of finalNodes) {
        if (node.config?.buttons) {
          for (const b of node.config.buttons) {
            if (b.title.length > 20) {
              setValidationError(`Button title "${b.title}" exceeds Meta 20-character limit (${b.title.length} characters).`)
              setIsSaving(false)
              return
            }
          }
        }
        if (node.config?.listSections) {
          const totalRows = node.config.listSections.reduce((acc, s) => acc + (s.rows?.length || 0), 0)
          if (totalRows > 10) {
            setValidationError(`Interactive list in "${node.name || node.id}" exceeds WhatsApp maximum of 10 rows (${totalRows} rows).`)
            setIsSaving(false)
            return
          }
          for (const s of node.config.listSections) {
            if (s.title.length > 24) {
              setValidationError(`List section title "${s.title}" exceeds 24 characters.`)
              setIsSaving(false)
              return
            }
            for (const r of s.rows) {
              if (r.title.length > 24) {
                setValidationError(`List row title "${r.title}" exceeds 24 characters.`)
                setIsSaving(false)
                return
              }
              if (r.description && r.description.length > 72) {
                setValidationError(`List row description for "${r.title}" exceeds 72 characters.`)
                setIsSaving(false)
                return
              }
            }
          }
        }
      }

      const isUpdate = flows.some((f) => f.id === editingFlow.id)
      const payload = {
        ...editingFlow,
        initial_message,
        button_options,
        imageUrl,
        mediaUrl: imageUrl,
        triggers,
        trigger_keywords: keywords,
        nodes: finalNodes,
        entryNodeId: entryId,
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs text-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-wide">
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
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
          <a
            href="/csv/sample_flows.csv"
            download="sample_flows.csv"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-white rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl flex items-center justify-between shadow-xs text-slate-900">
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Flows</div>
            <div className="text-xl font-bold text-white mt-1">{totalFlows}</div>
          </div>
          <Workflow className="w-7 h-7 text-blue-400 opacity-60" />
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl flex items-center justify-between shadow-xs text-slate-900">
          <div>
            <div className="text-[11px] text-emerald-400 uppercase font-semibold">Published (Live)</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{publishedCount}</div>
          </div>
          <CheckCircle2 className="w-7 h-7 text-emerald-400 opacity-60" />
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl flex items-center justify-between shadow-xs text-slate-900">
          <div>
            <div className="text-[11px] text-amber-400 uppercase font-semibold">Draft (Safe)</div>
            <div className="text-xl font-bold text-amber-400 mt-1">{draftCount}</div>
          </div>
          <Clock className="w-7 h-7 text-amber-400 opacity-60" />
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl flex items-center justify-between shadow-xs text-slate-900">
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
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shrink-0 shadow-xs">
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
        <div className="p-16 text-center text-slate-500 text-xs bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          Loading active WhatsApp flows...
        </div>
      ) : filteredFlows.length === 0 ? (
        <div className="p-16 text-center text-slate-500 text-xs bg-white border border-slate-200/80 rounded-2xl shadow-xs">
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
                className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all shadow-xs space-y-3 text-slate-900"
              >
                <div className="space-y-2.5">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 font-mono text-xs flex items-center justify-center font-bold shrink-0">
                        #{idx + 1}
                      </span>
                      <h3 className="font-bold text-slate-900 text-xs truncate" title={flow.name}>
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
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-700 font-mono line-clamp-3">
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
                <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs">
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
                      className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit Flow"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteFlow(flow.id, flow.name)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Delete Flow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/crm/flows/${flow.id}`}
                      className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                      title="Open Interactive Visual Canvas"
                    >
                      <GitFork className="w-3 h-3" />
                      <span>Canvas</span>
                    </Link>
                    <span className="text-[10px] font-mono text-slate-500">
                      {flow.nodes?.length || 3} Nodes
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Visual Flow Editor Modal */}
      {isEditorOpen && editingFlow && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-900">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200 shadow-2xs">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>{flows.some((f) => f.id === editingFlow.id) ? 'Edit Flow & Messages' : 'Create New Flow & Messages'}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono rounded-full font-semibold">
                      {messageSteps.length} Steps Active
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ప్రతి మెసేజ్, క్విక్ బటన్స్, మరియు ఇంటరాక్టివ్ లిస్ట్ మెనూని దశలవారీగా సులభంగా ఎడిట్ చేయండి.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Row 1: Flow Name, Status, Trigger Keywords (Flow-level settings) */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/90 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">Flow Name (ఫ్లో పేరు)</label>
                    <input
                      type="text"
                      value={editingFlow.name || ''}
                      onChange={(e) => setEditingFlow({ ...editingFlow, name: e.target.value })}
                      placeholder="e.g. Welcome & Directory Bot / స్వాగతం & డైరెక్టరీ బాట్"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">Status (స్థితి)</label>
                    <select
                      value={editingFlow.status || 'draft'}
                      onChange={(e) =>
                        setEditingFlow({
                          ...editingFlow,
                          status: e.target.value as FlowStatus,
                          isActive: e.target.value === 'published',
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="draft">Draft (డ్రాఫ్ట్ - టెస్ట్)</option>
                      <option value="published">Published (లైవ్ WhatsApp)</option>
                      <option value="paused">Paused (పాజ్)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">Trigger Keywords</label>
                    <input
                      type="text"
                      value={editorKeywords}
                      onChange={(e) => setEditorKeywords(e.target.value)}
                      placeholder="e.g. hi, hello, సేవలు, menu"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Step Navigation Pill Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>సందేశాల దశలు (Message Steps): ఏ సందేశాన్ని ఎడిట్ చేయాలో ఎంచుకోండి</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200 text-[11px] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ కొత్త దశ (Add Step)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                  {messageSteps.map((step, idx) => {
                    const isSelected = step.id === activeNode?.id
                    const isEntry = step.id === 'entry_message' || step.id === editingFlow.entryNodeId
                    return (
                      <div
                        key={step.id}
                        className={`group shrink-0 flex items-center rounded-xl border text-xs transition-all ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-700 text-white shadow-md'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveNodeId(step.id)}
                          className="px-3 py-1.5 flex items-center gap-1.5 font-medium cursor-pointer"
                        >
                          <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                            isSelected ? 'bg-white text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {idx + 1}
                          </span>
                          <span>{step.name || `Step ${idx + 1}`}</span>
                          {isEntry && (
                            <span className={`text-[9px] px-1 rounded uppercase font-bold tracking-wider ${
                              isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              Entry
                            </span>
                          )}
                        </button>
                        {!isEntry && (
                          <button
                            type="button"
                            onClick={() => handleDeleteStep(step.id)}
                            className={`p-1.5 rounded-r-xl transition-colors ${
                              isSelected ? 'hover:bg-emerald-700 text-emerald-200 hover:text-white' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                            }`}
                            title="Delete this step"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Step Editor & Live Preview Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
                {/* Left Column: Step Configuration Form (7 cols) */}
                <div className="lg:col-span-7 space-y-3.5">
                  {/* Step Title & Subtabs bar */}
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-[11px] font-semibold text-slate-500 shrink-0">Step Name:</span>
                        <input
                          type="text"
                          value={activeNode?.name || ''}
                          onChange={(e) => updateActiveNode({}, e.target.value)}
                          placeholder="e.g. Step 1: స్వాగతం"
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 font-bold text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 bg-slate-50 rounded border border-slate-100 shrink-0">
                        ID: {activeNode?.id}
                      </span>
                    </div>

                    {/* Sub-tabs for the active step */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] overflow-x-auto">
                      <button
                        type="button"
                        onClick={() => setActiveStepTab('message')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer shrink-0 ${
                          activeStepTab === 'message'
                            ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>సందేశం &amp; మీడియా</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveStepTab('buttons')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer shrink-0 ${
                          activeStepTab === 'buttons'
                            ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>🔘 క్విక్ బటన్స్ ({activeNode?.config?.buttons?.length || 0}/3)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveStepTab('list')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer shrink-0 ${
                          activeStepTab === 'list'
                            ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                        <span>
                          లిస్ట్ మెనూ ({activeNode?.config?.listSections?.reduce((acc, s) => acc + (s.rows?.length || 0), 0) || 0}/10)
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveStepTab('listings')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer shrink-0 ${
                          activeStepTab === 'listings'
                            ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>లిస్టింగ్స్ &amp; క్రమం</span>
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: Message Content & Media */}
                  {activeStepTab === 'message' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-2xs">
                      {/* Variables helper */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-700">
                            సందేశ పాఠ్యం (Message Body - Telugu / English)
                          </label>
                          <span className="text-[10px] text-slate-400">వేరియబుల్స్ జోడించండి:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            '{{contact.name}}',
                            '{{listing.title}}',
                            '{{listing.phone}}',
                            '{{town.name}}',
                            '{{town.url}}',
                          ].map((tok) => (
                            <button
                              key={tok}
                              type="button"
                              onClick={() => handleInsertVariable(tok)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-mono border border-slate-200 transition-colors cursor-pointer"
                            >
                              + {tok}
                            </button>
                          ))}
                        </div>
                        <textarea
                          rows={6}
                          value={activeNode?.config?.text || ''}
                          onChange={(e) => updateActiveNode({ text: e.target.value })}
                          placeholder="నమస్కారం! చౌటుప్పల్ యాప్ కి స్వాగతం..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-emerald-500 font-sans text-xs leading-relaxed"
                        />
                      </div>

                      {/* Media Header (Image / Video) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700">
                            Hero Media URL (Image or Video)
                          </label>
                          <input
                            type="text"
                            value={activeNode?.config?.mediaUrl || ''}
                            onChange={(e) => updateActiveNode({ mediaUrl: e.target.value })}
                            placeholder="https://images.unsplash.com/... or https://example.com/banner.mp4"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700">Media Type</label>
                          <select
                            value={activeNode?.config?.mediaType || 'image'}
                            onChange={(e) =>
                              updateActiveNode({
                                mediaType: e.target.value as 'image' | 'video' | 'document',
                              })
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                          >
                            <option value="image">Image (JPG/PNG/WebP)</option>
                            <option value="video">Video (MP4)</option>
                            <option value="document">Document (PDF)</option>
                          </select>
                        </div>
                      </div>

                      {/* Footer Text */}
                      <div className="space-y-1 pt-1">
                        <label className="text-[11px] font-semibold text-slate-700">
                          Footer Text (బాట్ ఫుటర్ క్యాప్షన్)
                        </label>
                        <input
                          type="text"
                          value={activeNode?.config?.footerText || ''}
                          onChange={(e) => updateActiveNode({ footerText: e.target.value })}
                          placeholder="చౌటుప్పల్ యాప్ 24/7 బాట్"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Quick-Reply Buttons */}
                  {activeStepTab === 'buttons' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">Quick-Reply Buttons</h4>
                          <p className="text-[10px] text-slate-500">
                            WhatsApp మెసేజ్ క్రింద గరిష్టంగా 3 బటన్స్ ఇవ్వవచ్చు. ప్రతి బటన్ క్లిక్ చేస్తే ఏ దశకు వెళ్లాలో ఎంచుకోండి.
                          </p>
                        </div>
                        {(activeNode?.config?.buttons?.length || 0) < 3 && (
                          <button
                            type="button"
                            onClick={handleAddButton}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ బటన్ జోడించు</span>
                          </button>
                        )}
                      </div>

                      {(!activeNode?.config?.buttons || activeNode.config.buttons.length === 0) ? (
                        <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center space-y-2">
                          <p className="text-slate-500 text-xs">ఈ సందేశానికి ప్రస్తుతం బటన్స్ ఏవీ లేవు.</p>
                          <button
                            type="button"
                            onClick={handleAddButton}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>మొదటి బటన్ జోడించు</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {activeNode.config.buttons.map((btn, bi) => (
                            <div key={btn.id || bi} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-700 text-xs flex items-center gap-1">
                                  <span>బటన్ #{bi + 1}</span>
                                  <span className={`text-[10px] px-1.5 rounded font-mono ${
                                    btn.title.length > 20 ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'
                                  }`}>
                                    {btn.title.length}/20 chars
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveButton(bi)}
                                  className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                                  title="Remove button"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[10px] text-slate-500 font-medium">Button Title (శీర్షిక)</label>
                                  <input
                                    type="text"
                                    maxLength={20}
                                    value={btn.title}
                                    onChange={(e) => handleUpdateButton(bi, { title: e.target.value })}
                                    placeholder="e.g. సేవలు / వివరాలు"
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] text-slate-500 font-medium">Target Next Step (తదుపరి దశ)</label>
                                  <select
                                    value={btn.nextNodeId || 'end_terminal'}
                                    onChange={(e) => handleUpdateButton(bi, { nextNodeId: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                                  >
                                    <option value="end_terminal">-- పూర్తి (End Conversation) --</option>
                                    {messageSteps
                                      .filter((s) => s.id !== activeNode.id)
                                      .map((s, si) => (
                                        <option key={s.id} value={s.id}>
                                          {s.name || `Step ${si + 1}`} ({s.id})
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: Interactive List Menu */}
                  {activeStepTab === 'list' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <ListOrdered className="w-4 h-4 text-emerald-600" />
                            <span>WhatsApp Interactive List Menu</span>
                          </h4>
                          <p className="text-[10px] text-slate-500">
                            యూజర్ &quot;మెనూ చూడండి&quot; క్లిక్ చేసినప్పుడు డ్రావర్‌లో 10 ఆప్షన్స్ వరకు కేటగిరీలుగా కనిపిస్తాయి.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddListSection}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ కొత్త విభాగం (Add Section)</span>
                        </button>
                      </div>

                      {/* Main List Button Text */}
                      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-emerald-900">
                            List Menu Button Title (బటన్ పై కనిపించే పేరు)
                          </label>
                          <span className={`text-[10px] px-1.5 rounded font-mono ${
                            (activeNode?.config?.listButtonText?.length || 0) > 20
                              ? 'bg-red-100 text-red-700 font-bold'
                              : 'text-emerald-700'
                          }`}>
                            {activeNode?.config?.listButtonText?.length || 0}/20 chars
                          </span>
                        </div>
                        <input
                          type="text"
                          maxLength={20}
                          value={activeNode?.config?.listButtonText || ''}
                          onChange={(e) => updateActiveNode({ listButtonText: e.target.value })}
                          placeholder="e.g. మెనూ చూడండి / View Menu"
                          className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 shadow-2xs"
                        />
                      </div>

                      {/* Sections and Rows */}
                      {(!activeNode?.config?.listSections || activeNode.config.listSections.length === 0) ? (
                        <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center space-y-2">
                          <p className="text-slate-500 text-xs">ఈ సందేశానికి ఇంటరాక్టివ్ లిస్ట్ మెనూ ఇంకా లేదు.</p>
                          <button
                            type="button"
                            onClick={handleAddListSection}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>లిస్ట్ విభాగం జోడించు</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {activeNode.config.listSections.map((sec, si) => (
                            <div key={si} className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3">
                              {/* Section Header */}
                              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="font-bold text-slate-700 text-xs shrink-0">
                                    విభాగం #{si + 1}:
                                  </span>
                                  <input
                                    type="text"
                                    maxLength={24}
                                    value={sec.title}
                                    onChange={(e) => handleUpdateListSectionTitle(si, e.target.value)}
                                    placeholder="Section Title (e.g. ప్రధాన సేవలు)"
                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveListSection(si)}
                                  className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                                  title="Delete Section"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Rows in Section */}
                              <div className="space-y-2 pl-2 border-l-2 border-emerald-300">
                                {sec.rows?.map((row, ri) => (
                                  <div key={row.id || ri} className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[10px] font-bold text-emerald-700">Row #{ri + 1}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveListRow(si, ri)}
                                        className="text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <div className="space-y-0.5">
                                        <label className="text-[9px] text-slate-500 font-medium">Row Title (max 24)</label>
                                        <input
                                          type="text"
                                          maxLength={24}
                                          value={row.title}
                                          onChange={(e) => handleUpdateListRow(si, ri, { title: e.target.value })}
                                          placeholder="e.g. రియల్ ఎస్టేట్ & ప్లాట్లు"
                                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-900 focus:outline-none focus:border-emerald-500"
                                        />
                                      </div>
                                      <div className="space-y-0.5">
                                        <label className="text-[9px] text-slate-500 font-medium">Description (max 72)</label>
                                        <input
                                          type="text"
                                          maxLength={72}
                                          value={row.description || ''}
                                          onChange={(e) => handleUpdateListRow(si, ri, { description: e.target.value })}
                                          placeholder="e.g. చౌటుప్పల్ పరిసరాల్లో వెంచర్లు"
                                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-900 focus:outline-none focus:border-emerald-500"
                                        />
                                      </div>
                                      <div className="space-y-0.5">
                                        <label className="text-[9px] text-slate-500 font-medium">Next Step (తదుపరి దశ)</label>
                                        <select
                                          value={row.nextNodeId || 'end_terminal'}
                                          onChange={(e) => handleUpdateListRow(si, ri, { nextNodeId: e.target.value })}
                                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-900 focus:outline-none focus:border-emerald-500"
                                        >
                                          <option value="end_terminal">-- పూర్తి (End) --</option>
                                          {messageSteps
                                            .filter((s) => s.id !== activeNode.id)
                                            .map((s, si) => (
                                              <option key={s.id} value={s.id}>
                                                {s.name || `Step ${si + 1}`}
                                              </option>
                                            ))}
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                <button
                                  type="button"
                                  onClick={() => handleAddListRow(si)}
                                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors border border-dashed border-slate-300 flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ ఈ విభాగానికి ఆప్షన్ జోడించు (Add Row)</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: Directory Listings & Sort Order */}
                  {activeStepTab === 'listings' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-2xs">
                      {/* Directory Listing Binding */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-amber-500" />
                          <span className="font-semibold text-slate-800">Attach Single Directory Listing (Optional)</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Select a live business listing to dynamically inject its name, contact phone, address, and cover image.
                        </p>
                        <select
                          value={selectedListingId}
                          onChange={(e) => setSelectedListingId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
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
                      <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg border border-emerald-500/20">
                              <ArrowUpDown className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-xs">Business Listing Order</h4>
                              <p className="text-[10px] text-slate-500">
                                Admin-controlled sequence for businesses and categories presented to customers.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Mode Selector & Category Scoping */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">Sorting Mode</label>
                            <select
                              value={listingSortMode}
                              onChange={(e) => setListingSortMode(e.target.value as ListingSortMode)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                            >
                              <option value="manual">Manual Order (Default)</option>
                              <option value="category_priority">Category Priority</option>
                              <option value="newest">Newest First</option>
                              <option value="alphabetical">Alphabetical (A-Z)</option>
                              <option value="featured">Featured Listings First</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">Category Filter (Optional)</label>
                            <select
                              value={listingCategory}
                              onChange={(e) => setListingCategory(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
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
                            <label className="text-[11px] font-semibold text-slate-700">
                              Batch Page Size <span className="text-slate-500 font-normal">(Max 10)</span>
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={listingPageSize}
                              onChange={(e) => setListingPageSize(Math.min(Math.max(parseInt(e.target.value) || 8, 1), 10))}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-xs font-mono focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        {/* MANUAL MODE: Explicit Reordering List */}
                        {listingSortMode === 'manual' && (
                          <div className="space-y-2.5 pt-1">
                            <div className="flex gap-2">
                              <select
                                value={selectedListingToAddToOrder}
                                onChange={(e) => setSelectedListingToAddToOrder(e.target.value)}
                                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
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
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                + Add to Order
                              </button>
                            </div>

                            {listingSortOrder.length > 0 && (
                              <div className="space-y-1 max-h-36 overflow-y-auto">
                                {listingSortOrder.map((lId, idx) => {
                                  const item = listings.find((l) => l.id === lId)
                                  return (
                                    <div
                                      key={lId}
                                      className="flex items-center justify-between gap-2 p-1.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-900"
                                    >
                                      <span className="font-bold font-mono text-emerald-600 text-[10px]">#{idx + 1}</span>
                                      <span className="truncate flex-1 font-medium">{item?.title || lId}</span>
                                      <button
                                        type="button"
                                        onClick={() => setListingSortOrder(listingSortOrder.filter((id) => id !== lId))}
                                        className="text-slate-400 hover:text-red-500 p-0.5"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Live WhatsApp Phone Preview (5 cols) */}
                <div className="lg:col-span-5 space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp Live Phone Preview</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-mono font-semibold">
                      {activeNode?.name || 'Active Step'}
                    </span>
                  </div>

                  {/* Phone Screen Mockup */}
                  <div className="bg-[#0b141a] rounded-3xl border-4 border-slate-800 shadow-xl overflow-hidden flex flex-col">
                    {/* WhatsApp Top Header Bar */}
                    <div className="bg-[#1f2c34] text-white px-3.5 py-2.5 flex items-center justify-between border-b border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white shadow-2xs">
                          CP
                        </div>
                        <div className="leading-tight">
                          <div className="font-bold text-xs flex items-center gap-1">
                            <span>చౌటుప్పల్ యాప్</span>
                            <span className="w-3 h-3 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[8px] font-black">✓</span>
                          </div>
                          <div className="text-[9px] text-slate-300">Official Business Account • online</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                        24/7
                      </span>
                    </div>

                    {/* Chat Bubble Canvas */}
                    <div className="p-3 space-y-3 min-h-[380px] max-h-[500px] overflow-y-auto bg-[#0b141a]">
                      {/* Outgoing User Trigger Simulation */}
                      <div className="flex justify-end">
                        <div className="bg-[#005c4b] text-white px-3 py-1.5 rounded-l-xl rounded-tr-xl text-xs max-w-[80%] shadow">
                          <span>{editorKeywords.split(/[,;]/)[0]?.trim() || 'నమస్కారం'}</span>
                          <div className="text-[9px] text-emerald-200 text-right mt-0.5">10:30 AM ✓✓</div>
                        </div>
                      </div>

                      {/* Incoming Bot Message */}
                      <div className="flex justify-start">
                        <div className="bg-[#202c33] text-slate-100 rounded-r-xl rounded-tl-xl text-xs max-w-[92%] shadow-md border border-slate-700/40 overflow-hidden">
                          {/* Media Preview if provided */}
                          {activeNode?.config?.mediaUrl && (
                            <div className="w-full bg-black/40 max-h-40 overflow-hidden flex items-center justify-center border-b border-slate-700/50">
                              {activeNode.config.mediaType === 'video' ? (
                                <div className="p-4 text-center text-slate-400 text-xs flex items-center gap-2">
                                  <span>📹 Video:</span>
                                  <span className="text-[10px] truncate max-w-[150px]">{activeNode.config.mediaUrl}</span>
                                </div>
                              ) : (
                                <img
                                  src={activeNode.config.mediaUrl}
                                  alt="Media"
                                  className="w-full h-auto max-h-40 object-cover"
                                  onError={(e) => {
                                    ;(e.target as any).style.display = 'none'
                                  }}
                                />
                              )}
                            </div>
                          )}

                          {/* Message Body */}
                          <div className="p-3 space-y-1.5">
                            <div className="whitespace-pre-wrap leading-relaxed text-[11px] text-slate-100 font-sans">
                              {(activeNode?.config?.text || editingFlow?.initial_message || 'సందేశం ఇక్కడ కనిపిస్తుంది...')
                                .replace(/{{contact\.name}}/g, 'రాకేష్ గారు')
                                .replace(/{{listing\.title}}/g, 'శ్రీ లక్ష్మి నిలయం')
                                .replace(/{{town\.name}}/g, 'చౌటుప్పల్')
                                .replace(/{{town\.url}}/g, 'https://choutuppal.in')}
                            </div>

                            {/* Footer Text */}
                            <div className="text-[9px] text-slate-400 italic pt-1">
                              {activeNode?.config?.footerText || 'చౌటుప్పల్ యాప్ 24/7 బాట్'}
                            </div>

                            <div className="text-[9px] text-slate-400 text-right">
                              10:30 AM
                            </div>
                          </div>

                          {/* Interactive List Menu Button Preview */}
                          {activeNode?.config?.listSections && activeNode.config.listSections.length > 0 && (
                            <div className="border-t border-slate-700/60 bg-[#111b21] p-2 space-y-1.5">
                              <div className="w-full py-2 bg-[#2a3942] hover:bg-[#32424b] text-emerald-400 font-bold text-center rounded-lg text-xs flex items-center justify-center gap-1.5 border border-emerald-500/30 shadow-xs cursor-default">
                                <ListOrdered className="w-3.5 h-3.5" />
                                <span>{activeNode.config.listButtonText || 'మెనూ చూడండి'}</span>
                              </div>

                              {/* Interactive List Drawer Preview */}
                              <div className="bg-[#1f2c34] p-2 rounded-lg border border-slate-700/50 space-y-2 mt-1">
                                {activeNode.config.listSections.map((sec, si) => (
                                  <div key={si} className="space-y-1">
                                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider px-1">
                                      {sec.title || `విభాగం ${si + 1}`}
                                    </div>
                                    <div className="space-y-1">
                                      {sec.rows?.map((row, ri) => (
                                        <div key={ri} className="p-1.5 bg-[#2a3942] rounded text-slate-200 border border-slate-700/40 text-[10px]">
                                          <div className="font-semibold text-white">{row.title || `Row ${ri + 1}`}</div>
                                          {row.description && <div className="text-slate-400 text-[9px]">{row.description}</div>}
                                          {row.nextNodeId && (
                                            <div className="text-emerald-300 text-[8px] font-mono mt-0.5">➔ {row.nextNodeId}</div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Quick-Reply Buttons Preview */}
                          {activeNode?.config?.buttons && activeNode.config.buttons.length > 0 && (
                            <div className="border-t border-slate-700/60 bg-[#111b21] p-1.5 space-y-1">
                              {activeNode.config.buttons.map((btn, bi) => (
                                <div
                                  key={bi}
                                  className="w-full py-2 bg-[#2a3942] hover:bg-[#32424b] text-emerald-400 font-medium text-center rounded-lg text-xs border border-slate-700 flex items-center justify-center gap-1.5 shadow-2xs"
                                >
                                  <span>💬 {btn.title || `Button ${bi + 1}`}</span>
                                  {btn.nextNodeId && (
                                    <span className="text-[9px] text-slate-400 font-mono">({btn.nextNodeId})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Validation Error Banner */}
              {validationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <span className="font-bold">⚠️ Error:</span>
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/90">
              <div className="text-[11px] text-slate-500 font-mono">
                {messageSteps.length} Steps configured • Status: {editingFlow.status || 'draft'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveFlow}
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Flow (ఫ్లో భద్రపరచు)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive WhatsApp Simulator Drawer */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm h-[660px] flex flex-col shadow-2xl overflow-hidden border-2 border-emerald-500/30 text-slate-900">
            {/* Phone Top Notch */}
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
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
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Diag
                </button>
                <button
                  type="button"
                  onClick={() => setIsSimulatorOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto bg-slate-50 text-xs">
              {simChat.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3 shadow-2xs ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-white text-slate-900 border border-slate-200/90 rounded-bl-none space-y-2'
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
                      <div className="p-2 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1 text-[11px] text-emerald-950">
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
                            className="w-full py-1.5 px-3 bg-white hover:bg-slate-50 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-300 flex items-center justify-center gap-1 transition-colors shadow-xs"
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
                                  className="w-full text-left py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-800 hover:text-emerald-700 transition-colors shadow-xs"
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
                            <span className="bg-amber-50 px-1 py-0.5 rounded text-amber-800 font-bold border border-amber-200">
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
                <div className="flex items-start gap-1 p-2 bg-slate-200/80 rounded-2xl w-20 justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
            </div>

            {/* Phone Input Box */}
            <div className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={simInput}
                disabled={simLoading}
                onChange={(e) => setSimInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !simLoading && handleSimSend()}
                placeholder="Type 'hi', 'menu', or Telugu..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => handleSimSend()}
                disabled={simLoading || !simInput.trim()}
                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all disabled:opacity-50"
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
