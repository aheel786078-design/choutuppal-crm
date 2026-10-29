'use client'

import React, { useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { AlertTriangle, Info, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AdminConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  title: string
  description: string | React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'primary'
  affectedCount?: number
  loading?: boolean
}

export function AdminConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  affectedCount,
  loading: externalLoading = false,
}: AdminConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false)
  const loading = externalLoading || internalLoading

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (loading) return

    try {
      setInternalLoading(true)
      await onConfirm()
      onClose()
    } catch {
      // Errors handled in caller or toast
    } finally {
      setInternalLoading(false)
    }
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
          iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
          confirmBtn:
            'bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-600/30 border border-rose-500',
        }
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          confirmBtn:
            'bg-amber-600 hover:bg-amber-500 text-white shadow-sm shadow-amber-600/30 border border-amber-500',
        }
      case 'primary':
      default:
        return {
          icon: <Info className="w-5 h-5 text-blue-400" />,
          iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
          confirmBtn:
            'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/30 border border-blue-500',
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md w-full shadow-2xl p-6">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-start gap-3.5">
            <div className={cn('p-2.5 rounded-xl border shrink-0', styles.iconBg)}>
              {styles.icon}
            </div>
            <div className="space-y-1 text-left min-w-0">
              <AlertDialogTitle className="text-base font-semibold text-white tracking-tight">
                {title}
              </AlertDialogTitle>
              {affectedCount !== undefined && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  <span>Target records:</span>
                  <span className="font-bold text-white">{affectedCount}</span>
                </div>
              )}
            </div>
          </div>

          <AlertDialogDescription className="text-xs text-slate-300 leading-relaxed text-left pt-1">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/80">
          <AlertDialogCancel
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelText}
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              'px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed',
              styles.confirmBtn
            )}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
