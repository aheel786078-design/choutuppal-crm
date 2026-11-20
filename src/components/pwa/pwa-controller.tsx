'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Download, X, MapPin, Bell, HardDrive, CheckCircle2, Shield, Share, Smartphone } from 'lucide-react'

export function PWAController() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)

  // Permissions Status
  const [locationGranted, setLocationGranted] = useState(false)
  const [notificationsGranted, setNotificationsGranted] = useState(false)
  const [storageGranted, setStorageGranted] = useState(false)
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false)

  useEffect(() => {
    // 1. Check if running as standalone PWA
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')

    setIsStandalone(isStandaloneMode)

    // 2. Register Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Check for worker updates
          reg.onupdatefound = () => {
            const installing = reg.installing
            if (installing) {
              installing.onstatechange = () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New version ready')
                }
              }
            }
          }
        })
        .catch((err) => console.warn('[PWA SW] Registration failed:', err))
    }

    // 3. Listen for Android/Chromium install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)

      const dismissedTime = localStorage.getItem('cpl_pwa_install_dismissed')
      if (dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 24 * 60 * 60 * 1000) {
        return // snoozed for 24h
      }

      setShowInstallBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // 4. Detect iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    if (isIOS && isSafari && !isStandaloneMode) {
      const iosDismissed = localStorage.getItem('cpl_pwa_ios_dismissed')
      if (!iosDismissed || Date.now() - parseInt(iosDismissed, 10) > 48 * 60 * 60 * 1000) {
        setShowIOSPrompt(true)
      }
    }

    // 5. Check if permissions were already granted
    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((res) => setLocationGranted(res.state === 'granted'))
        .catch(() => {})

      if ('Notification' in window) {
        setNotificationsGranted(Notification.permission === 'granted')
      }
    }

    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then((isPersisted) => setStorageGranted(isPersisted))
    }

    // 6. Check if first open to show smart permissions setup
    const permissionsPrompted = localStorage.getItem('cpl_permissions_prompted')
    if (!permissionsPrompted) {
      // Delay prompt slightly so page loads cleanly first
      const timer = setTimeout(() => {
        setShowPermissionsModal(true)
      }, 3500)
      return () => clearTimeout(timer)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  // Action: Trigger PWA Install
  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowInstallBanner(false)
      // Open permissions setup after install acceptance
      setShowPermissionsModal(true)
    }
    setDeferredPrompt(null)
  }

  const dismissInstallBanner = () => {
    setShowInstallBanner(false)
    localStorage.setItem('cpl_pwa_install_dismissed', Date.now().toString())
  }

  const dismissIOSPrompt = () => {
    setShowIOSPrompt(false)
    localStorage.setItem('cpl_pwa_ios_dismissed', Date.now().toString())
  }

  // Action: Request All Permissions (Location, Notifications, Storage)
  const handleGrantAllPermissions = async () => {
    setIsRequestingPermissions(true)

    // 1. Location Request
    if ('geolocation' in navigator) {
      try {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setLocationGranted(true)
              localStorage.setItem('cpl_user_lat', pos.coords.latitude.toString())
              localStorage.setItem('cpl_user_lng', pos.coords.longitude.toString())
              resolve(pos)
            },
            () => resolve(null),
            { timeout: 8000 }
          )
        })
      } catch (_) {}
    }

    // 2. Notifications Request
    if ('Notification' in window && Notification.permission !== 'granted') {
      try {
        const perm = await Notification.requestPermission()
        setNotificationsGranted(perm === 'granted')
      } catch (_) {}
    }

    // 3. Persistent Storage Request
    if (navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persist()
        setStorageGranted(isPersisted)
      } catch (_) {}
    }

    localStorage.setItem('cpl_permissions_prompted', 'true')
    setIsRequestingPermissions(false)
    setShowPermissionsModal(false)
  }

  const handleSkipPermissions = () => {
    localStorage.setItem('cpl_permissions_prompted', 'true')
    setShowPermissionsModal(false)
  }

  return (
    <>
      {/* 1. High-Converting Mobile Install Floating Banner (Android / Desktop Chrome) */}
      {showInstallBanner && !isStandalone && (
        <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto animate-in slide-in-from-bottom duration-300">
          <div className="bg-slate-950/95 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl border border-blue-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-blue-700 p-1.5 shrink-0 shadow-md">
                <Image
                  src="/assets/choutuppal-favicon.png"
                  alt="Choutuppal App"
                  width={44}
                  height={44}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black tracking-tight text-white truncate">చౌటుప్పల్ యాప్</h4>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500 text-slate-950">
                    ఆఫీషియల్
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate mt-0.5">
                  మొబైల్‌లో ఇన్‌స్టాల్ చేసుకోండి • వేగంగా పనిచేస్తుంది
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleInstallClick}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                ఇన్‌స్టాల్
              </button>
              <button
                onClick={dismissInstallBanner}
                className="p-1.5 text-slate-400 hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. iOS Safari Add to Home Screen Tip */}
      {showIOSPrompt && !isStandalone && (
        <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto animate-in slide-in-from-bottom duration-300">
          <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl border border-slate-700 text-xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Smartphone className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">ఐఫోన్‌లో యాప్ ఇన్‌స్టాల్ చేసుకోండి:</p>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  క్రింది <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-400" /> Share బటన్ నొక్కి{' '}
                  <span className="font-semibold text-amber-400">Add to Home Screen</span> ఎంచుకోండి.
                </p>
              </div>
            </div>
            <button
              onClick={dismissIOSPrompt}
              className="p-1 text-slate-400 hover:text-white"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Comprehensive Permissions & Offline Cache Onboarding Modal */}
      {showPermissionsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500" />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 grid place-items-center text-blue-700">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">యాప్ ఫీచర్స్ & అనుమతులు</h3>
                  <p className="text-[11px] text-slate-500">సులభమైన మరియు వేగవంతమైన అనుభవం కోసం</p>
                </div>
              </div>
              <button
                onClick={handleSkipPermissions}
                className="text-slate-400 hover:text-slate-700 p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {/* Permission 1: Location */}
              <div className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100/70 text-blue-700 grid place-items-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">స్థానిక లొకేషన్ (Location)</p>
                    {locationGranted && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    చౌటుప్పల్ టౌన్ మరియు మీ సమీపంలోని షాపులు, సర్వీసులు & ఆటోలను తక్షణమే కనుగొనడానికి.
                  </p>
                </div>
              </div>

              {/* Permission 2: Notifications */}
              <div className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-700 grid place-items-center shrink-0 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">నోటిఫికేషన్లు & ఆఫర్లు (Alerts)</p>
                    {notificationsGranted && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    రోజూ స్థానిక దుకాణాల ప్రత్యేక డిస్కౌంట్లు మరియు అత్యవసర హెచ్చరికలను అందుకోవడానికి.
                  </p>
                </div>
              </div>

              {/* Permission 3: Storage & Offline Cache */}
              <div className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-700 grid place-items-center shrink-0 mt-0.5">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">ఆఫ్‌లైన్ క్యాష్ & డేటా ఆదా (Offline Save)</p>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    ఒకసారి బ్రౌజ్ చేసిన ఫోటోలు మీ ఫోన్‌లో సేవ్ అవుతాయి. నెట్ లేకపోయినా యాప్ పనిచేస్తుంది!
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleGrantAllPermissions}
                disabled={isRequestingPermissions}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-700/20 hover:from-blue-800 hover:to-indigo-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isRequestingPermissions ? 'అనుమతిస్తున్నారు...' : 'అన్నింటినీ ప్రారంభించండి (Allow All)'}
              </button>
              <button
                onClick={handleSkipPermissions}
                className="w-full py-2 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                తర్వాత చేస్తాను (Later)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
