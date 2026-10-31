'use client'

import React, { useState, useRef, useMemo, useCallback } from 'react'
import {
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Workflow,
  Sparkles,
  PlayCircle,
  X,
  ChevronRight,
  Settings,
  ArrowRight,
  GitFork,
  MessageSquare,
  HelpCircle,
  Flag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  NODE_META,
  NodeIconChip,
  groupNodeTypesByCategory,
  summarizeNode,
  type BuilderNode,
  type NodeType,
} from './shared'
import { useFlowEditor } from './flow-editor-state'
import { NodeConfigForm } from './forms/node-config-form'
import { deriveCanvasEdges, type CanvasEdge } from '@/lib/flows/edges'

const NODE_WIDTH = 260
const NODE_HEIGHT = 120

export function FlowCanvas() {
  const {
    state,
    addNode,
    updateNodeConfig,
    updateNodePosition,
    removeNode,
    setEntryNodeId,
    requestFlash,
    flashKey,
  } = useFlowEditor()

  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 40, y: 40 })
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [draggingNodeKey, setDraggingNodeKey] = useState<string | null>(null)
  const [nodeDragOffset, setNodeDragOffset] = useState({ x: 0, y: 0 })

  const canvasRef = useRef<HTMLDivElement>(null)

  // Layout default positions if all are 0
  const nodes = useMemo(() => {
    return state.nodes.map((node, index) => {
      let x = node.position_x || 0
      let y = node.position_y || 0
      if (x === 0 && y === 0) {
        // Simple auto-spread grid
        const col = index % 3
        const row = Math.floor(index / 3)
        x = 60 + col * 320
        y = 60 + row * 220
      }
      return { ...node, position_x: x, position_y: y }
    })
  }, [state.nodes])

  // Derive connection edges between nodes
  const edges: CanvasEdge[] = useMemo(() => {
    return deriveCanvasEdges(nodes)
  }, [nodes])

  const nodeMap = useMemo(() => {
    return new Map(nodes.map((n) => [n.node_key, n]))
  }, [nodes])

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.node_key === selectedNodeKey) || null
  }, [nodes, selectedNodeKey])

  // Canvas pan handlers
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.flow-node-card')) return
    setIsDraggingCanvas(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    } else if (draggingNodeKey) {
      const newX = Math.round((e.clientX - pan.x - nodeDragOffset.x) / zoom)
      const newY = Math.round((e.clientY - pan.y - nodeDragOffset.y) / zoom)
      updateNodePosition(draggingNodeKey, Math.max(10, newX), Math.max(10, newY))
    }
  }

  const handleMouseUp = () => {
    setIsDraggingCanvas(false)
    setDraggingNodeKey(null)
  }

  // Node drag handlers
  const handleNodeMouseDown = (e: React.MouseEvent, nodeKey: string, currentX: number, currentY: number) => {
    e.stopPropagation()
    setDraggingNodeKey(nodeKey)
    setNodeDragOffset({
      x: e.clientX - (pan.x + currentX * zoom),
      y: e.clientY - (pan.y + currentY * zoom),
    })
  }

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(2.0, Math.max(0.4, prev + delta)))
  }

  const handleResetView = () => {
    setZoom(1)
    setPan({ x: 40, y: 40 })
  }

  return (
    <div
      ref={canvasRef}
      onMouseDown={handleMouseDownCanvas}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="relative flex-1 w-full h-full min-h-[580px] bg-slate-950 overflow-hidden select-none cursor-grab active:cursor-grabbing border border-slate-800 rounded-2xl"
    >
      {/* Background Dot Pattern */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <defs>
          <pattern id="grid-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#64748b" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      </svg>

      {/* FLOATING CONTROLS TOOLBAR */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 px-3 rounded-lg shadow-sm shadow-emerald-600/30 gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Step</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-slate-900 border-slate-800 text-slate-100">
            {groupNodeTypesByCategory(Object.keys(NODE_META) as NodeType[]).map((group) => (
              <DropdownMenuGroup key={group.id}>
                <DropdownMenuLabel className="text-[10px] uppercase font-bold text-slate-400">
                  {group.label}
                </DropdownMenuLabel>
                {group.types.map((type) => {
                  const meta = NODE_META[type]
                  const Icon = meta.icon
                  return (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => {
                        const newKey = addNode(type)
                        setSelectedNodeKey(newKey)
                      }}
                      className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800 gap-2 text-xs"
                    >
                      <span className={cn('p-1 rounded-md bg-slate-800 shrink-0', meta.color)}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <div className="font-semibold text-white">{meta.label}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{meta.blurb}</div>
                      </div>
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuSeparator className="bg-slate-800" />
              </DropdownMenuGroup>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleZoom(0.15)}
          className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleZoom(-0.15)}
          className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleResetView}
          className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
          title="Reset View"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>

        <span className="text-[10px] font-mono text-slate-400 px-2">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* SVG CONNECTOR EDGES LAYER */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          <marker
            id="edge-arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#10b981" />
          </marker>
          <marker
            id="edge-arrow-dim"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" />
          </marker>
        </defs>

        {edges.map((edge) => {
          const src = nodeMap.get(edge.source)
          const tgt = nodeMap.get(edge.target)
          if (!src || !tgt) return null

          const x1 = (src.position_x || 0) + NODE_WIDTH
          const y1 = (src.position_y || 0) + NODE_HEIGHT / 2
          const x2 = tgt.position_x || 0
          const y2 = (tgt.position_y || 0) + NODE_HEIGHT / 2

          // Smooth cubic bezier curve
          const dx = Math.abs(x2 - x1) * 0.5
          const pathD = `M ${x1} ${y1} C ${x1 + Math.max(40, dx)} ${y1}, ${x2 - Math.max(40, dx)} ${y2}, ${x2} ${y2}`

          const isHighlighted = selectedNodeKey === src.node_key || selectedNodeKey === tgt.node_key

          return (
            <g key={edge.id} className="transition-opacity">
              <path
                d={pathD}
                fill="none"
                stroke={isHighlighted ? '#10b981' : '#475569'}
                strokeWidth={isHighlighted ? '2.5' : '1.5'}
                strokeDasharray={isHighlighted ? 'none' : '4 2'}
                markerEnd={isHighlighted ? 'url(#edge-arrow)' : 'url(#edge-arrow-dim)'}
              />
              {edge.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 6}
                  fill={isHighlighted ? '#34d399' : '#94a3b8'}
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="bg-slate-900 px-1 py-0.5"
                >
                  {edge.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* NODES LAYER */}
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {nodes.map((node) => {
          const meta = NODE_META[node.node_type] || NODE_META.send_message
          const Icon = meta.icon
          const isSelected = selectedNodeKey === node.node_key
          const isEntry = state.entry_node_id === node.node_key
          const summary = summarizeNode(node)
          const isFlashed = flashKey === node.node_key

          return (
            <div
              key={node.node_key}
              onMouseDown={(e) => handleNodeMouseDown(e, node.node_key, node.position_x, node.position_y)}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedNodeKey(node.node_key)
              }}
              style={{
                transform: `translate3d(${node.position_x}px, ${node.position_y}px, 0)`,
                width: `${NODE_WIDTH}px`,
              }}
              className={cn(
                'flow-node-card absolute rounded-2xl bg-slate-900 border p-3.5 shadow-xl transition-shadow cursor-pointer',
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-emerald-500/20'
                  : 'border-slate-800 hover:border-slate-700',
                isFlashed && 'animate-pulse ring-4 ring-amber-400',
              )}
            >
              {/* Top Row: Icon + Type Label + Entry Pill */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn('p-1.5 rounded-lg bg-slate-800 shrink-0', meta.color)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="truncate">
                    <div className="font-bold text-xs text-white truncate">{meta.label}</div>
                    <code className="text-[10px] text-slate-400 font-mono">{node.node_key}</code>
                  </div>
                </div>

                {isEntry ? (
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0">
                    Entry
                  </span>
                ) : null}
              </div>

              {/* Summary description preview */}
              <div className="bg-slate-950/80 rounded-xl p-2 border border-slate-800/80 text-[11px] text-slate-300 line-clamp-2 leading-relaxed min-h-[38px]">
                {summary || <span className="text-slate-500 italic">Configure step settings...</span>}
              </div>

              {/* Bottom ports / branch summary */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                <span className="truncate">
                  {node.node_type === 'send_buttons' && (node.config.buttons as any[])?.length
                    ? `${(node.config.buttons as any[]).length} Quick Buttons`
                    : node.node_type === 'condition'
                      ? 'True / False branches'
                      : node.node_type === 'send_list'
                        ? 'Interactive List'
                        : node.node_type === 'end'
                          ? 'Terminal step'
                          : 'Advances on send'}
                </span>
                <span className="text-emerald-400 font-bold hover:underline">Edit ⚙️</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* NODE CONFIGURATION INSPECTOR SIDE-SHEET */}
      <Sheet
        open={Boolean(selectedNodeKey)}
        onOpenChange={(open) => !open && setSelectedNodeKey(null)}
      >
        <SheetContent side="right" className="w-full sm:max-w-md bg-slate-900 border-slate-800 text-slate-100 p-6 overflow-y-auto">
          {selectedNode && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={cn('p-2 rounded-xl bg-slate-800', NODE_META[selectedNode.node_type]?.color)}>
                      {React.createElement(NODE_META[selectedNode.node_type]?.icon || Workflow, { className: 'h-5 w-5' })}
                    </span>
                    <div>
                      <SheetTitle className="text-base font-black text-white">
                        {NODE_META[selectedNode.node_type]?.label || 'Node Config'}
                      </SheetTitle>
                      <SheetDescription className="text-xs text-slate-400">
                        Key: <code className="text-emerald-400 font-mono">{selectedNode.node_key}</code>
                      </SheetDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {state.entry_node_id !== selectedNode.node_key && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEntryNodeId(selectedNode.node_key)}
                        className="text-[10px] h-7 bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                      >
                        Set Entry
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        removeNode(selectedNode.node_key)
                        setSelectedNodeKey(null)
                      }}
                      className="h-7 w-7 p-0 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                      title="Delete node"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              {/* Per-Node Config Form */}
              <div className="pt-2 border-t border-slate-800">
                <NodeConfigForm
                  node={selectedNode}
                  allNodes={nodes}
                  showAdvanced={true}
                  onUpdateConfig={(patch) => updateNodeConfig(selectedNode.node_key, patch)}
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Edits are synced to canvas live</span>
                <Button
                  size="sm"
                  onClick={() => setSelectedNodeKey(null)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
