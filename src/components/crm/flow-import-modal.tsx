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
} from 'lucide-react'
import { parseFlowCsvContent, ParsedFlowRecord } from '@/lib/parse-flow-csv'

interface FlowImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (importedCount: number) => void
}

export function FlowImportModal({ isOpen, onClose, onSuccess }: FlowImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedFlows, setParsedFlows] = useState<ParsedFlowRecord[]>([])
  const [parseErrors, setParseErrors] = useState<Array<{ line: number; message: string }>>([])
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    setFile(selected)
    const text = await selected.text()
    const { flows, errors } = parseFlowCsvContent(text)
    setParsedFlows(flows)
    setParseErrors(errors)
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
        onSuccess(data.importedCount || parsedFlows.length)
        onClose()
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
                Bulk upload custom flows with images, buttons, and trigger keywords (Zero Demo Overwrite).
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
                  ✓ {parsedFlows.length} Valid flow(s) parsed and ready to activate
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

          {/* Errors Notice */}
          {parseErrors.length > 0 && (
            <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Found {parseErrors.length} CSV warning(s):</span>
              </div>
              <ul className="list-disc list-inside text-[11px] text-red-300 space-y-0.5">
                {parseErrors.slice(0, 3).map((err, i) => (
                  <li key={i}>Line {err.line}: {err.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedFlows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
                <span>Previewing {parsedFlows.length} Flows to be installed:</span>
                <span className="text-emerald-400">100% Real Nodes Built</span>
              </div>
              <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 max-h-48 overflow-y-auto bg-slate-950">
                {parsedFlows.slice(0, 10).map((f) => (
                  <div key={f.id} className="p-2.5 flex items-center justify-between hover:bg-slate-900/50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate">{f.name}</span>
                        <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.2 rounded border border-blue-500/20">
                          {f.trigger_type}
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
        <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950">
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
                <span>Activating Flows...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Import &amp; Publish {parsedFlows.length} Flows</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
