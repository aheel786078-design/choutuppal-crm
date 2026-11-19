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
  Bold,
  Italic,
  Wand2,
} from 'lucide-react'
import { FlowImportModal } from '@/components/crm/flow-import-modal'
import { MediaPickerModal } from '@/components/common/media-picker-modal'
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

interface SmartFlowTemplate {
  id: string
  name: string
  nameTe: string
  badge: string
  icon: string
  description: string
  stepName: string
  text: string
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'document'
  footerText?: string
  buttons?: FlowButton[]
  listButtonText?: string
  listSections?: FlowListSection[]
}

const SMART_TEMPLATES: SmartFlowTemplate[] = [
  {
    id: 'welcome_3buttons',
    name: 'Welcome + 3 Buttons',
    nameTe: 'స్వాగతం & 3 బటన్లు',
    badge: 'అత్యంత ప్రజాదరణ',
    icon: '👋',
    description: 'ఫోటో బ్యానర్, స్వాగత సందేశం మరియు 3 డైరెక్ట్ బటన్స్ (వ్యాపారాలు, ఆఫర్లు, ఎమర్జెన్సీ).',
    stepName: 'Step 1: స్వాగతం (Welcome)',
    mediaUrl: '/assets/branding/choutuppal-banner.jpg',
    mediaType: 'image',
    footerText: 'చౌటుప్పల్ యాప్ 24/7 అధికారిక బాట్',
    text: `*నమస్కారం! చౌటుప్పల్ సూపర్ యాప్‌కు స్వాగతం* 🙏✨\n\nచౌటుప్పల్ మరియు పరిసర ప్రాంతాల సమగ్ర వ్యాపార సమాచారం, సేవలు, రియల్ ఎస్టేట్ మరియు అత్యవసర హెల్ప్‌లైన్ల కోసం మేము సిద్ధంగా ఉన్నాము.\n\nమీకు అవసరమైన సమాచారాన్ని వెంటనే తెలుసుకోవడానికి క్రింది బటన్ నొక్కండి:\n\n• స్థానిక వ్యాపారాలు & దుకాణాలు\n• తాజా ఆఫర్లు & డీల్స్\n• 24/7 అత్యవసర సేవలు\n\n🌐 అధికారిక పోర్టల్: https://choutuppal.in`,
    buttons: [
      { id: 'btn_t1_1', title: '🏢 వ్యాపారాలు', action: 'BUTTON_REPLY', nextNodeId: 'action_node_1' },
      { id: 'btn_t1_2', title: '🏷️ ఆఫర్లు & డీల్స్', action: 'BUTTON_REPLY', nextNodeId: 'action_node_2' },
      { id: 'btn_t1_3', title: '🚨 ఎమర్జెన్సీ', action: 'BUTTON_REPLY', nextNodeId: 'action_node_3' },
    ],
  },
  {
    id: 'services_interactive_list',
    name: 'Interactive Services Menu',
    nameTe: 'సర్వీసెస్ లిస్ట్ మెనూ (10 కేటగిరీలు)',
    badge: 'డైరెక్టరీ మెనూ',
    icon: '📋',
    description: 'విస్తృత కేటగిరీల డ్రావర్ మెనూ. కస్టమర్ "మెనూ చూడండి" నొక్కితే 10 ఆప్షన్స్ కనిపిస్తాయి.',
    stepName: 'Step 1: సేవల మెనూ',
    mediaUrl: '',
    footerText: 'చౌటుప్పల్ యాప్ సర్వీస్ డైరెక్టరీ',
    text: `*చౌటుప్పల్ అధికారిక సర్వీస్ డైరెక్టరీ* 📋\n\nమా వద్ద నమోదు చేయబడిన ప్రముఖ వ్యాపారాలు మరియు ప్రొఫెషనల్ సేవల జాబితా.\n\nక్రింది *'మెనూ చూడండి'* బటన్ నొక్కి మీకు కావలసిన విభాగాన్ని ఎంచుకోండి:\n\n👉 ఎలక్ట్రికల్, ప్లంబింగ్, రియల్ ఎస్టేట్, హాస్పిటల్స్ మరియు మరెన్నో.`,
    listButtonText: 'మెనూ చూడండి',
    listSections: [
      {
        title: 'ప్రధాన సేవలు (Main Services)',
        rows: [
          { id: 'r_s1', title: 'రియల్ ఎస్టేట్ & ప్లాట్లు', description: 'ఓపెన్ ప్లాట్లు & వ్యవసాయ భూములు', nextNodeId: 'action_node_realestate' },
          { id: 'r_s2', title: 'షాపులు & మార్కెట్', description: 'కిరాణా, బట్టలు, ఎలక్ట్రానిక్స్', nextNodeId: 'action_node_shops' },
          { id: 'r_s3', title: 'ఎలక్ట్రికల్ & ప్లంబింగ్', description: 'ఇంటి మరమ్మత్తు నిపుణులు', nextNodeId: 'action_node_services' },
        ],
      },
      {
        title: 'సహాయం & రవాణా (Help & Transport)',
        rows: [
          { id: 'r_s4', title: '24/7 ఎమర్జెన్సీ హెల్ప్‌లైన్', description: 'పోలీస్, హాస్పిటల్, ఫైర్', nextNodeId: 'action_node_emergency' },
          { id: 'r_s5', title: 'ఆర్టీసీ బస్సు వేళలు', description: 'హైదరాబాద్ & విజయవాడ రూట్ బస్సులు', nextNodeId: 'action_node_transport' },
        ],
      },
    ],
  },
  {
    id: 'offers_and_discounts',
    name: 'Hot Offers & Deals',
    nameTe: 'ఆఫర్లు & స్పెషల్ డీల్స్',
    badge: 'ప్రమోషన్స్',
    icon: '🏷️',
    description: 'స్థానిక వ్యాపారాల బంపర్ ఆఫర్లు, డిస్కౌంట్ కోడ్లు మరియు డీల్స్ కోసం.',
    stepName: 'Step: ప్రత్యేక ఆఫర్లు',
    mediaUrl: '',
    footerText: 'పరిమిత కాల ఆఫర్లు • చౌటుప్పల్ యాప్',
    text: `*చౌటుప్పల్ సూపర్ ఆఫర్లు & డీల్స్!* 🏷️✨\n\nఈరోజు స్థానిక షాపులు & వ్యాపారాలలో లభించే ప్రత్యేక తగ్గింపులు:\n\n• షాపింగ్ & క్లాతింగ్ పై 20% వరకు తగ్గింపు\n• ఎలక్ట్రానిక్స్ & మొబైల్స్ పై క్యాష్‌బ్యాక్\n• రెస్టారెంట్ డిస్కౌంట్ కూపన్లు\n\nవివరాలు పొందడానికి క్రింది బటన్ నొక్కండి:`,
    buttons: [
      { id: 'btn_of_1', title: '🏷️ కూపన్ కోడ్ పొందండి', action: 'BUTTON_REPLY', nextNodeId: 'end_terminal' },
      { id: 'btn_of_2', title: '🛍️ అన్ని ఆఫర్లు చూడండి', action: 'BUTTON_REPLY', nextNodeId: 'end_terminal' },
      { id: 'btn_of_3', title: '🏠 మెయిన్ మెనూ', action: 'BUTTON_REPLY', nextNodeId: 'entry_message' },
    ],
  },
  {
    id: 'emergency_helpline',
    name: '24/7 Emergency Directory',
    nameTe: 'అత్యవసర హెల్ప్‌లైన్ నంబర్లు',
    badge: 'అత్యవసరం',
    icon: '🚨',
    description: 'పోలీస్, హాస్పిటల్, అంబులెన్స్ మరియు మున్సిపల్ అత్యవసర ఫోన్ నంబర్లు.',
    stepName: 'Step: ఎమర్జెన్సీ హెల్ప్‌లైన్',
    mediaUrl: '',
    footerText: '24/7 అత్యవసర సేవలు • డయల్ చేయండి',
    text: `*చౌటుప్పల్ 24/7 అత్యవసర హెల్ప్‌లైన్ నంబర్లు* 🚨\n\nఏదైనా అత్యవసర సమయంలో క్రింది విభాగాలను వెంటనే సంప్రదించండి:\n\n• పోలీస్ స్టేషన్: 100 / 08694-222033\n• అంబులెన్స్ సర్వీస్: 108 / 102\n• అగ్నిమాపక కేంద్రం: 101\n• విద్యుత్ శాఖ హెల్ప్‌లైన్: 1912\n• ప్రభుత్వ ఆసుపత్రి: 08694-222045\n\nసహాయం కోసం ఎంపిక చేసుకోండి:`,
    buttons: [
      { id: 'btn_em_1', title: '🏥 ఆసుపత్రుల వివరాలు', action: 'BUTTON_REPLY', nextNodeId: 'end_terminal' },
      { id: 'btn_em_2', title: '📞 పోలీస్ సంప్రదించండి', action: 'BUTTON_REPLY', nextNodeId: 'end_terminal' },
      { id: 'btn_em_3', title: '🏠 మెయిన్ మెనూ', action: 'BUTTON_REPLY', nextNodeId: 'entry_message' },
    ],
  },
  {
    id: 'real_estate_showcase',
    name: 'Real Estate & Properties',
    nameTe: 'రియల్ ఎస్టేట్ & ప్లాట్లు',
    badge: 'ప్రాపర్టీస్',
    icon: '🏡',
    description: 'ఓపెన్ ప్లాట్లు, వ్యవసాయ భూములు, వెంచర్ సమాచారం & ఏజెంట్ కాంటాక్ట్.',
    stepName: 'Step: రియల్ ఎస్టేట్',
    mediaUrl: '',
    footerText: 'చౌటుప్పల్ రియల్ ఎస్టేట్ గైడ్',
    text: `*చౌటుప్పల్ పరిసరాల్లో వెంచర్లు & ఓపెన్ ప్లాట్లు* 🏡✨\n\nహైదరాబాద్ - విజయవాడ హైవే (NH-65) సమీపంలో HMDA & DTCP అప్రూవ్డ్ లేఅవుట్లు అందుబాటులో ఉన్నాయి:\n\n• 100% క్లియర్ టైటిల్ & తక్షణ రిజిస్ట్రేషన్\n• బ్యాంక్ లోన్ సదుపాయం\n• 40/30 అడుగుల బిటి రోడ్లు & అండర్‌గ్రౌండ్ డ్రైనేజ్\n\nబ్రోచర్ లేదా సైట్ విజిట్ కోసం క్రింది బటన్ నొక్కండి:`,
    buttons: [
      { id: 'btn_re_1', title: '🗺️ వెంచర్ వివరాలు', action: 'BUTTON_REPLY', nextNodeId: 'end_terminal' },
      { id: 'btn_re_2', title: '📞 ఏజెంట్‌ను కలవండి', action: 'BUTTON_REPLY', nextNodeId: 'end_terminal' },
      { id: 'btn_re_3', title: '🏠 మెయిన్ మెనూ', action: 'BUTTON_REPLY', nextNodeId: 'entry_message' },
    ],
  },
]

function renderWhatsAppFormattedText(text: string) {
  const clean = (text || '')
    .replace(/{{contact\.name}}/g, 'రాకేష్ గారు')
    .replace(/{{listing\.title}}/g, 'శ్రీ లక్ష్మి నిలయం')
    .replace(/{{listing\.phone}}/g, '9848012345')
    .replace(/{{town\.name}}/g, 'చౌటుప్పల్')
    .replace(/{{town\.url}}/g, 'https://choutuppal.in')

  const lines = clean.split('\n')
  return lines.map((line, lineIdx, arr) => {
    const parts = line.split(/(\*[^\*]+\*)/g)
    return (
      <React.Fragment key={lineIdx}>
        {parts.map((part, pIdx) => {
          if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
            return (
              <strong key={pIdx} className="font-bold text-white">
                {part.slice(1, -1)}
              </strong>
            )
          }
          return part
        })}
        {lineIdx < arr.length - 1 && <br />}
      </React.Fragment>
    )
  })
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
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false)

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

  // Quick Formatting insertion into textarea
  const handleInsertFormatting = (prefix: string, suffix: string = '') => {
    if (!activeNode) return
    const cur = activeNode.config?.text || ''
    if (!textareaRef.current) {
      updateActiveNode({ text: `${cur}${prefix}${suffix}` })
      return
    }
    const el = textareaRef.current
    const start = el.selectionStart || 0
    const end = el.selectionEnd || 0
    const selected = cur.substring(start, end)
    const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}${suffix}`
    const nextText = cur.substring(0, start) + replacement + cur.substring(end)
    updateActiveNode({ text: nextText })
    setTimeout(() => {
      el.focus()
      const cursor = selected ? start + prefix.length + selected.length + suffix.length : start + prefix.length
      el.setSelectionRange(cursor, cursor)
    }, 10)
  }

  // Segmented Action Switch handler
  const handleSetResponseMode = (mode: 'buttons' | 'list' | 'none') => {
    if (!activeNode) return
    if (mode === 'buttons') {
      const curButtons = activeNode.config?.buttons || []
      const newButtons = curButtons.length > 0 ? curButtons : [
        { id: `btn_${Date.now()}_1`, title: 'సేవలు', action: 'BUTTON_REPLY', nextNodeId: 'end_terminal' },
        { id: `btn_${Date.now()}_2`, title: 'రియల్ ఎస్టేట్', action: 'BUTTON_REPLY', nextNodeId: 'end_terminal' },
      ]
      updateActiveNode({ buttons: newButtons, listSections: [] })
    } else if (mode === 'list') {
      const curSections = activeNode.config?.listSections || []
      const newSections = curSections.length > 0 ? curSections : [
        {
          title: 'ప్రధాన సేవలు',
          rows: [
            { id: `row_${Date.now()}_1`, title: 'రియల్ ఎస్టేట్ & ప్లాట్లు', description: 'స్థలాలు & వెంచర్లు', nextNodeId: 'end_terminal' },
            { id: `row_${Date.now()}_2`, title: 'వ్యాపారాలు & షాపులు', description: 'స్థానిక దుకాణాలు', nextNodeId: 'end_terminal' },
          ],
        },
      ]
      updateActiveNode({
        listSections: newSections,
        listButtonText: activeNode.config?.listButtonText || 'మెనూ చూడండి',
        buttons: [],
      })
    } else {
      updateActiveNode({ buttons: [], listSections: [] })
    }
  }

  // Apply Smart Preset Template
  const handleApplyTemplate = (template: (typeof SMART_TEMPLATES)[0]) => {
    if (!activeNode) return
    updateActiveNode(
      {
        text: template.text,
        footerText: template.footerText || 'చౌటుప్పల్ యాప్ 24/7 బాట్',
        mediaUrl: template.mediaUrl || '',
        mediaType: template.mediaType || 'image',
        buttons: template.buttons ? [...template.buttons] : [],
        listSections: template.listSections ? JSON.parse(JSON.stringify(template.listSections)) : [],
        listButtonText: template.listButtonText || 'మెనూ చూడండి',
      },
      template.stepName
    )
    setIsTemplatesModalOpen(false)
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden text-slate-900">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200 shadow-2xs">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>{flows.some((f) => f.id === editingFlow.id) ? 'Edit WhatsApp Flow & Messages' : 'Create New WhatsApp Flow'}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono rounded-full font-semibold">
                      {messageSteps.length} Steps
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ప్రతి మెసేజ్, ఫోటో, మరియు క్విక్ బటన్స్ లేదా లిస్ట్ మెనూని ఒకే స్క్రీన్‌లో సులభంగా ఎడిట్ చేయండి.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplatesModalOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl border border-amber-300 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  title="Load ready-made template"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>⚡ స్మార్ట్ టెంప్లేట్లు (Templates)</span>
                </button>
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Row 1: Flow-level settings (Flow Name, Status, Keywords) */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">Flow Name (ఫ్లో పేరు)</label>
                    <input
                      type="text"
                      value={editingFlow.name || ''}
                      onChange={(e) => setEditingFlow({ ...editingFlow, name: e.target.value })}
                      placeholder="e.g. Welcome & Directory Bot / స్వాగతం & డైరెక్టరీ బాట్"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-semibold text-xs shadow-2xs"
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
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 text-xs shadow-2xs font-medium"
                    >
                      <option value="draft">Draft (డ్రాఫ్ట్ - టెస్ట్)</option>
                      <option value="published">Published (లైవ్ WhatsApp)</option>
                      <option value="paused">Paused (పాజ్)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">Trigger Keywords (ట్రిగ్గర్ పదాలు)</label>
                    <input
                      type="text"
                      value={editorKeywords}
                      onChange={(e) => setEditorKeywords(e.target.value)}
                      placeholder="e.g. hi, hello, సేవలు, menu"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Step Navigation Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>సందేశాల దశలు (Steps): ఏ సందేశాన్ని ఎడిట్ చేయాలో ఎంచుకోండి</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200 text-[11px] transition-colors cursor-pointer shadow-2xs"
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
                            ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm ring-2 ring-emerald-400/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveNodeId(step.id)}
                          className="px-3 py-1.5 flex items-center gap-1.5 font-medium cursor-pointer"
                        >
                          <span
                            className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                              isSelected ? 'bg-white text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="font-semibold">{step.name || `Step ${idx + 1}`}</span>
                          {isEntry && (
                            <span
                              className={`text-[9px] px-1 rounded uppercase font-bold tracking-wider ${
                                isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
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

              {/* Main 2-Column Workspace: Step Editor (7 cols) + Live Phone Preview (5 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
                {/* Left Column: Step Configuration Form (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Step Header & Title Bar */}
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs font-bold text-slate-700 shrink-0">దశ పేరు:</span>
                      <input
                        type="text"
                        value={activeNode?.name || ''}
                        onChange={(e) => updateActiveNode({}, e.target.value)}
                        placeholder="e.g. Step 1: స్వాగతం"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 font-bold text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 bg-slate-50 rounded border border-slate-100">
                        ID: {activeNode?.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsTemplatesModalOpen(true)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-300 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        title="Load pre-built template"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>⚡ టెంప్లేట్ వర్తింపజేయి</span>
                      </button>
                    </div>
                  </div>

                  {/* CARD 1: Message Text, Formatting Toolbar & Media */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-200">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">1. సందేశం &amp; ఫోటో (Message &amp; Media)</h4>
                          <p className="text-[10px] text-slate-500">కస్టమర్‌కు వెళ్ళే సందేశ పాఠ్యం మరియు ఫోటోను ఇక్కడ సెట్ చేయండి.</p>
                        </div>
                      </div>
                    </div>

                    {/* Formatting & Dynamic Variable Toolbar */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-0.5">ఫార్మాట్:</span>
                          <button
                            type="button"
                            onClick={() => handleInsertFormatting('*', '*')}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer"
                            title="బోల్డ్ టెక్స్ట్ (*text*)"
                          >
                            *B* బోల్డ్
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInsertFormatting('_', '_')}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] italic border border-slate-200 transition-colors cursor-pointer"
                            title="ఇటాలిక్ టెక్స్ట్ (_text_)"
                          >
                            _I_ ఇటాలిక్
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInsertFormatting('\n• ')}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-medium border border-slate-200 transition-colors cursor-pointer"
                            title="బుల్లెట్ పాయింట్ (• )"
                          >
                            • బుల్లెట్
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInsertFormatting('\n👉 ')}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-medium border border-slate-200 transition-colors cursor-pointer"
                            title="పాయింటర్ (👉 )"
                          >
                            👉 పాయింటర్
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInsertFormatting('✨ ')}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-medium border border-slate-200 transition-colors cursor-pointer"
                            title="హైలైట్ స్టార్ (✨ )"
                          >
                            ✨ స్టార్
                          </button>
                        </div>

                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400 mr-0.5">ట్యాగ్స్:</span>
                          {[
                            { label: '+ పేరు', val: '{{contact.name}}' },
                            { label: '+ వెబ్‌సైట్', val: '{{town.url}}' },
                            { label: '+ ఫోన్', val: '{{listing.phone}}' },
                            { label: '+ షాప్', val: '{{listing.title}}' },
                          ].map((tok) => (
                            <button
                              key={tok.val}
                              type="button"
                              onClick={() => handleInsertFormatting(tok.val)}
                              className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-[10px] font-mono border border-emerald-200 transition-colors cursor-pointer font-semibold"
                              title={`Insert ${tok.val}`}
                            >
                              {tok.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Textarea */}
                      <textarea
                        ref={textareaRef}
                        rows={6}
                        value={activeNode?.config?.text || ''}
                        onChange={(e) => updateActiveNode({ text: e.target.value })}
                        placeholder="నమస్కారం! చౌటుప్పల్ యాప్ కి స్వాగతం..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-emerald-500 font-sans text-xs leading-relaxed transition-all"
                      />
                    </div>

                    {/* Hero Media Preview & Picker */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Hero Photo / Banner (ఫోటో లేదా బ్యానర్)</span>
                        </label>
                      </div>

                      {activeNode?.config?.mediaUrl ? (
                        <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                          <div className="w-16 h-12 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={activeNode.config.mediaUrl}
                              alt="Media preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0 text-xs">
                            <span className="font-semibold text-slate-800 block truncate">
                              {activeNode.config.mediaUrl}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>WhatsApp మెసేజ్ పైభాగంలో ఈ ఫోటో కనిపిస్తుంది</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setIsMediaPickerOpen(true)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                            >
                              మార్చండి
                            </button>
                            <button
                              type="button"
                              onClick={() => updateActiveNode({ mediaUrl: '' })}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remove photo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-2 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center sm:text-left justify-between">
                          <div className="text-xs text-slate-500">
                            ఈ మెసేజ్‌కి ఫోటో లేదా బ్యానర్ లేదు (ఐచ్ఛికం).
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsMediaPickerOpen(true)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>+ ఫోటో ఎంచుకోండి లేదా అప్‌లోడ్ చేయండి</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Footer Text */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[11px] font-semibold text-slate-700">
                        Footer Caption (బాట్ ఫుటర్ క్యాప్షన్)
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

                  {/* CARD 2: Interactive Customer Response (Buttons / List / None) */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>2. కస్టమర్ రెస్పాన్స్ ఎంపిక (Interactive Action)</span>
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          WhatsApp మెసేజ్ క్రింద కస్టమర్ ఎంచుకునే బటన్లు లేదా లిస్ట్ మెనూని ఎంచుకోండి.
                        </p>
                      </div>
                    </div>

                    {/* Segmented 3-way toggle */}
                    <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-xl text-xs font-semibold gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetResponseMode('buttons')}
                        className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          activeNode?.config?.buttons && activeNode.config.buttons.length > 0
                            ? 'bg-white text-emerald-700 shadow-2xs font-bold border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>🔘 క్విక్ బటన్లు (1-3)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetResponseMode('list')}
                        className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          activeNode?.config?.listSections && activeNode.config.listSections.length > 0
                            ? 'bg-white text-emerald-700 shadow-2xs font-bold border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                        <span>📋 లిస్ట్ మెనూ (1-10)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetResponseMode('none')}
                        className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          (!activeNode?.config?.buttons || activeNode.config.buttons.length === 0) &&
                          (!activeNode?.config?.listSections || activeNode.config.listSections.length === 0)
                            ? 'bg-white text-slate-800 shadow-2xs font-bold border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>💬 కేవలం టెక్స్ట్</span>
                      </button>
                    </div>

                    {/* Sub-section: Quick-Reply Buttons */}
                    {activeNode?.config?.buttons && activeNode.config.buttons.length > 0 && (
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700">
                            బటన్లు (గరిష్టంగా 3 బటన్లు - Meta WhatsApp API పరిమితి)
                          </span>
                          {(activeNode?.config?.buttons?.length || 0) < 3 && (
                            <button
                              type="button"
                              onClick={handleAddButton}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ బటన్ జోడించు</span>
                            </button>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          {activeNode.config.buttons.map((btn, bi) => (
                            <div
                              key={btn.id || bi}
                              className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-emerald-700 font-mono text-[11px] bg-emerald-100 px-2 py-0.5 rounded-full">
                                    బటన్ #{bi + 1}
                                  </span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                      (btn.title?.length || 0) > 20
                                        ? 'bg-red-100 text-red-700'
                                        : (btn.title?.length || 0) >= 16
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-slate-200/80 text-slate-600'
                                    }`}
                                  >
                                    {btn.title?.length || 0}/20 అక్షరాలు
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveButton(bi)}
                                  className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Delete Button"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-semibold text-slate-600">
                                    బటన్ పేరు (Button Label - max 20)
                                  </label>
                                  <input
                                    type="text"
                                    maxLength={20}
                                    value={btn.title}
                                    onChange={(e) => handleUpdateButton(bi, { title: e.target.value })}
                                    placeholder="e.g. సేవలు"
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 shadow-2xs"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-semibold text-slate-600">
                                    నొక్కితే ఏ దశకు వెళ్ళాలి? (Next Step Target)
                                  </label>
                                  <select
                                    value={btn.nextNodeId || 'end_terminal'}
                                    onChange={(e) => handleUpdateButton(bi, { nextNodeId: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-500 shadow-2xs"
                                  >
                                    <option value="end_terminal">🏁 సంభాషణ పూర్తి (End Conversation)</option>
                                    {messageSteps
                                      .filter((s) => s.id !== activeNode.id)
                                      .map((s, si) => (
                                        <option key={s.id} value={s.id}>
                                          ➔ {s.name || `Step ${si + 1}`} ({s.id})
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sub-section: Interactive List Menu */}
                    {activeNode?.config?.listSections && activeNode.config.listSections.length > 0 && (
                      <div className="space-y-3.5 pt-1">
                        {/* Main List Button Text */}
                        <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-emerald-950">
                              List Menu Button Title (బటన్ పై కనిపించే పేరు)
                            </label>
                            <span
                              className={`text-[10px] px-1.5 rounded font-mono font-bold ${
                                (activeNode?.config?.listButtonText?.length || 0) > 20
                                  ? 'bg-red-100 text-red-700'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {activeNode?.config?.listButtonText?.length || 0}/20 chars
                            </span>
                          </div>
                          <input
                            type="text"
                            maxLength={20}
                            value={activeNode?.config?.listButtonText || ''}
                            onChange={(e) => updateActiveNode({ listButtonText: e.target.value })}
                            placeholder="e.g. మెనూ చూడండి / View Menu"
                            className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 shadow-2xs"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700">
                            విభాగాలు &amp; ఆప్షన్స్ (గరిష్టంగా 10 ఆప్షన్స్)
                          </span>
                          <button
                            type="button"
                            onClick={handleAddListSection}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ కొత్త విభాగం (Add Section)</span>
                          </button>
                        </div>

                        {/* Sections and Rows */}
                        <div className="space-y-3">
                          {activeNode.config.listSections.map((sec, si) => (
                            <div key={si} className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2.5">
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
                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
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

                              <div className="space-y-2 pl-2 border-l-2 border-emerald-400">
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
                                        <label className="text-[9px] text-slate-500 font-medium">Title (max 24)</label>
                                        <input
                                          type="text"
                                          maxLength={24}
                                          value={row.title}
                                          onChange={(e) => handleUpdateListRow(si, ri, { title: e.target.value })}
                                          placeholder="e.g. రియల్ ఎస్టేట్"
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
                                          placeholder="e.g. స్థలాలు & వెంచర్లు"
                                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-900 focus:outline-none focus:border-emerald-500"
                                        />
                                      </div>
                                      <div className="space-y-0.5">
                                        <label className="text-[9px] text-slate-500 font-medium">Next Step</label>
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
                      </div>
                    )}

                    {/* Sub-section: Text Only */}
                    {(!activeNode?.config?.buttons || activeNode.config.buttons.length === 0) &&
                      (!activeNode?.config?.listSections || activeNode.config.listSections.length === 0) && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center space-y-1">
                          <p className="text-slate-700 text-xs font-medium">💬 కేవలం సందేశం మాత్రమే (Text Only)</p>
                          <p className="text-slate-500 text-[11px]">
                            ఈ సందేశానికి ఎలాంటి బటన్లు లేదా లిస్ట్ మెనూ జతచేయబడలేదు. కస్టమర్ సందేశాన్ని చదివి ఏదైనా టెక్స్ట్ టైప్ చేయవచ్చు.
                          </p>
                        </div>
                      )}
                  </div>

                  {/* CARD 3: Advanced Directory Settings (Collapsible Accordion) */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
                      className="w-full flex items-center justify-between p-3.5 bg-slate-50/80 hover:bg-slate-100 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-slate-200 text-slate-700 rounded-md">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          అధునాతన డైరెక్టరీ సెట్టింగ్స్ (Business Listing &amp; Sequence - ఐచ్ఛికం)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-[10px] font-mono text-slate-500">
                          {selectedListingId ? '1 Listing Attached' : 'డిఫాల్ట్'}
                        </span>
                        {isAdvancedExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {isAdvancedExpanded && (
                      <div className="p-4 border-t border-slate-200 space-y-4 text-xs">
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

                        {/* Business Listing Order & Sorting */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                            <label className="text-[11px] font-semibold text-slate-700">Category Filter</label>
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
                      </div>
                    )}
                  </div>
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
                            <div className="w-full bg-black/40 max-h-44 overflow-hidden flex items-center justify-center border-b border-slate-700/50">
                              {activeNode.config.mediaType === 'video' ? (
                                <div className="p-4 text-center text-slate-400 text-xs flex items-center gap-2">
                                  <span>📹 Video:</span>
                                  <span className="text-[10px] truncate max-w-[150px]">{activeNode.config.mediaUrl}</span>
                                </div>
                              ) : (
                                <img
                                  src={activeNode.config.mediaUrl}
                                  alt="Media"
                                  className="w-full h-auto max-h-44 object-cover"
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
                              {renderWhatsAppFormattedText(
                                activeNode?.config?.text || editingFlow?.initial_message || 'సందేశం ఇక్కడ కనిపిస్తుంది...'
                              )}
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
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
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

            {/* Smart Flow Templates Preset Selector Modal */}
      {isTemplatesModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 text-slate-900">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">స్మార్ట్ ఫ్లో టెంప్లేట్లు (Smart Templates)</h3>
                  <p className="text-[11px] text-slate-500">
                    సిద్ధంగా ఉన్న టెంప్లేట్‌ను ఎంచుకోండి. 1-క్లిక్‌తో మెసేజ్, బటన్స్ మరియు ఫార్మాటింగ్ సెట్ అవుతాయి.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTemplatesModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1">
              {SMART_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-4 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-2xl p-2 bg-white rounded-xl shadow-2xs border border-slate-200 shrink-0">
                      {tmpl.icon}
                    </span>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{tmpl.nameTe}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">({tmpl.name})</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded-full">
                          {tmpl.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {tmpl.description}
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-500 font-mono">
                        {tmpl.buttons && <span>🔘 {tmpl.buttons.length} Buttons</span>}
                        {tmpl.listSections && (
                          <span>📋 {tmpl.listSections.reduce((acc, s) => acc + (s.rows?.length || 0), 0)} List Rows</span>
                        )}
                        {tmpl.mediaUrl && <span>• 📷 Banner Image</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ఈ టెంప్లేట్ వర్తింపజేయి</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsTemplatesModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                రద్దు చేయండి (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Gallery & Auto-Compress R2 Upload Modal */}
      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(url) => updateActiveNode({ mediaUrl: url, mediaType: 'image' })}
        currentValue={activeNode?.config?.mediaUrl || ''}
        title="ఫ్లో మెసేజ్ ఫోటో ఎంచుకోండి (WhatsApp Flow Media)"
        source="flow"
      />
    </div>
  )
}
