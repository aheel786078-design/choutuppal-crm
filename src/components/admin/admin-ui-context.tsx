'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface AdminUIContextType {
  isSidebarCollapsed: boolean
  toggleSidebarCollapse: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  isMobileNavOpen: boolean
  openMobileNav: () => void
  closeMobileNav: () => void
  isCommandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void
}

const AdminUIContext = createContext<AdminUIContextType | undefined>(undefined)

const SIDEBAR_COLLAPSED_KEY = 'choutuppal_admin_sidebar_collapsed'

export function AdminUIProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false)

  // Hydrate collapsed state from localStorage safely after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (stored !== null) {
        setIsSidebarCollapsed(stored === 'true')
      }
    } catch {
      // localStorage may be unavailable or restricted
    }
  }, [])

  const toggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      } catch {}
      return next
    })
  }, [])

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed)
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
    } catch {}
  }, [])

  const openMobileNav = useCallback(() => setIsMobileNavOpen(true), [])
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), [])

  const toggleCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen((prev) => !prev)
  }, [])

  // Global Command Palette Shortcut ("Ctrl+K" / "Cmd+K")
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
      } else if (e.key === 'Escape') {
        // Close modals/drawers on Escape if open
        setIsCommandPaletteOpen(false)
        setIsMobileNavOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <AdminUIContext.Provider
      value={{
        isSidebarCollapsed,
        toggleSidebarCollapse,
        setSidebarCollapsed,
        isMobileNavOpen,
        openMobileNav,
        closeMobileNav,
        isCommandPaletteOpen,
        setCommandPaletteOpen: setIsCommandPaletteOpen,
        toggleCommandPalette,
      }}
    >
      {children}
    </AdminUIContext.Provider>
  )
}

export function useAdminUI() {
  const context = useContext(AdminUIContext)
  if (!context) {
    throw new Error('useAdminUI must be used within an AdminUIProvider')
  }
  return context
}
