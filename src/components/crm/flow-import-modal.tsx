'use client'

import React, { useState, useRef } from 'react'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  Download,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Shield,
  Eye,
} from 'lucide-react'
import { parseFlowCsvContent, ParsedFlowRecord } from '@/lib/parse-flow-csv'
import type { FlowStatus } from '@/lib/types'

interface FlowImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (importedCount: number) => void
}

export function FlowImportModal({ isOpen, onClose, onSuccess }: FlowImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedFlows, setParsedFlows] = useState<ParsedFlowRecord[]>([])
  const [parseErrors, setParseErrors] = useState<Array<{ line: number; message: string }>>([])
  const [warnings, setWarnings] = useState<Array<{ line: number; message: string }>>([])
  const [detectedMappings, setDetectedMappings] = useState<Record<string, string | null>>({})
  const [importStatus, setImportStatus] = useState<FlowStatus>('draft')
  const [isImporting, setIsImporting] = useState(false)
  const [isDryRunning, setIsDryRunning] = useState(false)
  const [dryRunReport, setDryRunReport] = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<{ created: number; updated: number; total: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const processCsvText = (text: string, targetStatus: FlowStatus) => {
    const { flows, errors, warnings: parsedWarnings, detectedMappings: mappings } = parseFlowCsvContent(text, { defaultStatus: targetStatus })
    setParsedFlows(flows as ParsedFlowRecord[])
    setParseErrors(errors)
    setWarnings(parsedWarnings || [])
    setDetectedMappings(mappings || {})
    setDryRunReport(null)
    setImportSummary(null)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    setFile(selected)
    const text = await selected.text()
    processCsvText(text, importStatus)
  }

  const handleStatusChange = (status: FlowStatus) => {
    setImportStatus(status)
    if (parsedFlows.length > 0) {
      setParsedFlows((prev) =>
        prev.map((f) => ({
          ...f,
          status,
          isActive: status === 'published',
        }))
      )
    }
  }

  const handleDryRun = async () => {
    if (parsedFlows.length === 0) return
    setIsDryRunning(true)
    setDryRunReport(null)

    try {
      const res = await fetch('/api/crm/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true, flows: parsedFlows }),
      })
      const data = await res.json()
      if (data.success) {
        setDryRunReport(`✓ Dry run passed: ${data.candidateCount} candidate flows validated. No records modified.`)
      } else {
        setDryRunReport(`⚠ Dry run warning: ${data.error}`)
      }
    } catch (err: any) {
      setDryRunReport(`⚠ Dry run network error: ${err.message}`)
    } finally {
      setIsDryRunning(false)
    }
  }

  const handleImportSubmit = async () => {
    if (parsedFlows.length === 0) return
    setIsImporting(true)

    try {
      const res = await fetch('/api/crm/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flows: parsedFlows }),
      })

      const data = await res.json()
      if (data.success) {
        const summary = {
          created: data.createdCount ?? data.importedCount ?? parsedFlows.length,
          updated: data.updatedCount ?? 0,
          total: data.totalActiveFlows ?? parsedFlows.length,
        }
        setImportSummary(summary)
        onSuccess(data.importedCount || parsedFlows.length)
        setTimeout(() => {
          onClose()
        }, 1200)
      } else {
        alert(data.error || 'Flow import failed')
      }
    } catch (err: any) {
      alert(err.message || 'Network error during import')
    } finally {
      setIsImporting(false)
    }
  }

  const handleDownloadMasterCsv = () => {
    const a = document.createElement('a')
    a.href = '/csv/sample_flows.csv'
    a.download = 'sample_flows.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Import WhatsApp Flows from CSV</h3>
              <p className="text-[11px] text-slate-400">
                Bulk upload conversational flows with Telugu Unicode &amp; interactive buttons (Zero Template Overwrite).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* File Picker */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              file
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-slate-700 hover:border-blue-500 bg-slate-950/40 hover:bg-slate-950/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            {file ? (
              <div>
                <p className="font-semibold text-white">{file.name}</p>
                <p className="text-[11px] text-emerald-400 mt-1">
                  ✓ {parsedFlows.length} Valid flow(s) parsed with Telugu Unicode preserved
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-slate-200">
                  Click to select or drop <span className="text-blue-400 font-mono">sample_flows.csv</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supports columns: name, trigger_type, trigger_keywords, initial_message, button_options, template_slug
                </p>
              </div>
            )}
          </div>

          {/* Import Posture Selector */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-white font-medium text-xs">Import Status Mode</div>
                <div className="text-[10px] text-slate-400">
                  {importStatus === 'draft'
                    ? 'Safe Mode: Newly imported flows stay in draft until reviewed'
                    : 'Active Mode: Flows will immediately be eligible for WhatsApp triggers'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => handleStatusChange('draft')}
                className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                  importStatus === 'draft'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Draft (Safe)
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('published')}
                className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                  importStatus === 'published'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Published (Live)
              </button>
            </div>
          </div>

          {/* Download Sample Button */}
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Need the validated 39 Flows master dataset?</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadMasterCsv}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Master CSV</span>
            </button>
          </div>

          {/* Post-Import Summary */}
          {importSummary && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-xl text-emerald-300 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Import successful: <strong>{importSummary.created} created</strong>, <strong>{importSummary.updated} updated</strong>. (Total in CRM: {importSummary.total})
                </span>
              </div>
            </div>
          )}

          {/* Dry Run Feedback */}
          {dryRunReport && (
            <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl text-blue-300 font-mono text-[11px]">
              {dryRunReport}
            </div>
          )}

          {/* Detected Column Mappings */}
          {Object.keys(detectedMappings).length > 0 && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-300">Detected Column Mappings</span>
                <span className="text-slate-500 font-mono text-[10px]">
                  {Object.values(detectedMappings).filter(Boolean).length} / {Object.keys(detectedMappings).length} mapped
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(detectedMappings).map(([field, colName]) => (
                  <span
                    key={field}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 ${
                      colName
                        ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                        : 'bg-slate-900 border border-slate-800 text-slate-500'
                    }`}
                  >
                    <span className="font-semibold">{field}:</span>
                    <span>{colName || 'none'}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Errors Notice */}
          {parseErrors.length > 0 && (
            <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Found {parseErrors.length} CSV error(s):</span>
              </div>
              <ul className="list-disc list-inside text-[11px] text-red-300 space-y-0.5">
                {parseErrors.slice(0, 5).map((err, i) => (
                  <li key={i}>Line {err.line}: {err.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings Notice */}
          {warnings.length > 0 && (
            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Found {warnings.length} CSV warning(s) (non-fatal):</span>
              </div>
              <ul className="list-disc list-inside text-[11px] text-amber-300/90 space-y-0.5 max-h-24 overflow-y-auto">
                {warnings.slice(0, 5).map((w, i) => (
                  <li key={i}>Line {w.line}: {w.message}</li>
                ))}
                {warnings.length > 5 && (
                  <li className="list-none text-[10px] text-amber-400 font-semibold mt-1">
                    + {warnings.length - 5} more warnings
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedFlows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
                <span>Previewing {parsedFlows.length} Flows to be imported:</span>
                <span className="text-emerald-400 font-mono">100% Graph Auto-Linked</span>
              </div>
              <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 max-h-48 overflow-y-auto bg-slate-950">
                {parsedFlows.slice(0, 10).map((f) => (
                  <div key={f.id} className="p-2.5 flex items-center justify-between hover:bg-slate-900/50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate">{f.name}</span>
                        <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.2 rounded border border-blue-500/20">
                          {f.id}
                        </span>
                        {f.imageUrl && (
                          <span className="text-[9px] bg-purple-500/10 text-purple-400 px-1.5 py-0.2 rounded flex items-center gap-1">
                            <ImageIcon className="w-2.5 h-2.5" />
                            Image
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {f.initial_message}
                      </p>
                    </div>
                    {f.button_options && f.button_options.length > 0 && (
                      <span className="text-[10px] text-slate-400 shrink-0 ml-3 bg-slate-800 px-2 py-0.5 rounded">
                        {f.button_options.length} Buttons
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950">
          <button
            type="button"
            onClick={handleDryRun}
            disabled={parsedFlows.length === 0 || isDryRunning}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors"
          >
            {isDryRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            <span>Preflight Dry-Run</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImportSubmit}
              disabled={parsedFlows.length === 0 || isImporting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    Import {parsedFlows.length} Flows ({importStatus.toUpperCase()})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
