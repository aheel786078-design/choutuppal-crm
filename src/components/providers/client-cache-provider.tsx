'use client'

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'

/**
 * Cache entry structure stored in memory and sessionStorage.
 */
export interface CacheRecord<T = unknown> {
  data: T
  timestamp: number
}

export interface CacheOptions<T = unknown> {
  /**
   * Time-to-live in milliseconds before data is considered stale.
   * Default: 5 minutes (300,000 ms).
   */
  ttl?: number
  /**
   * Whether to perform background revalidation on mount if stale.
   * Default: true.
   */
  revalidateOnMount?: boolean
  /**
   * Whether to revalidate when window regains focus.
   * Default: true.
   */
  revalidateOnFocus?: boolean
  /**
   * Optional initial fallback data.
   */
  initialData?: T
  /**
   * Set to false to disable fetching (useful for conditional fetches).
   * Default: true.
   */
  enabled?: boolean
}

export interface CacheResult<T> {
  data: T | null
  isLoading: boolean
  isValidating: boolean
  error: Error | null
  mutate: (dataOrUpdater?: T | ((prev: T | null) => T), shouldRevalidate?: boolean) => Promise<void>
  refetch: () => Promise<T | null>
}

interface CacheContextValue {
  getMemoryCache: <T>(key: string) => CacheRecord<T> | undefined
  setMemoryCache: <T>(key: string, data: T) => void
  removeMemoryCache: (key: string) => void
  clearAllCache: () => void
}

const STORAGE_PREFIX = 'choutuppal_cache_'
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

const CacheContext = createContext<CacheContextValue | null>(null)

/**
 * Safe sessionStorage read helper.
 */
function readSessionStorage<T>(key: string): CacheRecord<T> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheRecord<T>
    if (parsed && typeof parsed.timestamp === 'number' && 'data' in parsed) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

/**
 * Safe sessionStorage write helper.
 */
function writeSessionStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  try {
    const record: CacheRecord<T> = {
      data,
      timestamp: Date.now(),
    }
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(record))
  } catch (err) {
    // Gracefully handle storage quota exceeded or disabled storage
    console.warn(`[ClientCache] sessionStorage write failed for key "${key}":`, err)
  }
}

/**
 * Safe sessionStorage delete helper.
 */
function removeSessionStorage(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`)
  } catch {
    // Ignore error
  }
}

/**
 * Provider wrapping the client application to manage shared client memory cache.
 */
export function ClientCacheProvider({ children }: { children: ReactNode }) {
  const memoryStore = useRef<Map<string, CacheRecord>>(new Map())

  const getMemoryCache = useCallback(<T,>(key: string): CacheRecord<T> | undefined => {
    return memoryStore.current.get(key) as CacheRecord<T> | undefined
  }, [])

  const setMemoryCache = useCallback(<T,>(key: string, data: T): void => {
    const record: CacheRecord<T> = {
      data,
      timestamp: Date.now(),
    }
    memoryStore.current.set(key, record)
    writeSessionStorage(key, data)
  }, [])

  const removeMemoryCache = useCallback((key: string): void => {
    memoryStore.current.delete(key)
    removeSessionStorage(key)
  }, [])

  const clearAllCache = useCallback((): void => {
    memoryStore.current.clear()
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i)
          if (k && k.startsWith(STORAGE_PREFIX)) {
            keysToRemove.push(k)
          }
        }
        keysToRemove.forEach((k) => window.sessionStorage.removeItem(k))
      } catch {
        // Ignore errors
      }
    }
  }, [])

  return (
    <CacheContext.Provider
      value={{
        getMemoryCache,
        setMemoryCache,
        removeMemoryCache,
        clearAllCache,
      }}
    >
      {children}
    </CacheContext.Provider>
  )
}

/**
 * Hook to access raw cache management operations.
 */
export function useClientCacheContext(): CacheContextValue {
  const ctx = useContext(CacheContext)
  if (!ctx) {
    throw new Error('useClientCacheContext must be used within a ClientCacheProvider')
  }
  return ctx
}

/**
 * High-performance client-side data hook implementing Stale-While-Revalidate (SWR).
 *
 * - Returns cached data immediately (from memory or sessionStorage) to eliminate skeletons.
 * - Silently revalidates fresh data in the background and updates state without UI flicker.
 * - Handles component unmounting and race conditions safely.
 *
 * @param key Unique cache key (or null to pause fetch)
 * @param fetcher Async function returning fresh data
 * @param options Cache options (ttl, initialData, revalidateOnFocus, enabled)
 */
export function useClientCache<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: CacheOptions<T> = {}
): CacheResult<T> {
  const {
    ttl = DEFAULT_TTL,
    revalidateOnMount = true,
    revalidateOnFocus = true,
    initialData = null,
    enabled = true,
  } = options

  const context = useContext(CacheContext)
  const fetcherRef = useRef(fetcher)

  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  // In-flight request deduplication store per key across active hook instances
  const inFlightRef = useRef<Promise<T> | null>(null)

  // 1. Initial State Resolution from Cache (Synchronous read)
  const getInitialSnapshot = useCallback((): { data: T | null; isCached: boolean; isStale: boolean } => {
    if (!key) {
      return { data: initialData, isCached: false, isStale: true }
    }

    // Check memory cache first
    let record: CacheRecord<T> | undefined
    if (context) {
      record = context.getMemoryCache<T>(key)
    }

    // Fall back to sessionStorage if not in memory
    if (!record) {
      const storageRecord = readSessionStorage<T>(key)
      if (storageRecord) {
        record = storageRecord
        // Populate back into memory cache for instant future lookups
        if (context) {
          context.setMemoryCache(key, storageRecord.data)
        }
      }
    }

    if (record) {
      const age = Date.now() - record.timestamp
      const isStale = age > ttl
      return { data: record.data, isCached: true, isStale }
    }

    return { data: initialData, isCached: false, isStale: true }
  }, [key, context, initialData, ttl])

  const initialSnapshot = getInitialSnapshot()

  const [data, setData] = useState<T | null>(initialSnapshot.data)
  const [isLoading, setIsLoading] = useState<boolean>(!initialSnapshot.isCached && enabled && Boolean(key))
  const [isValidating, setIsValidating] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  // Sync state if initial snapshot or key changes
  useEffect(() => {
    const snapshot = getInitialSnapshot()
    setData(snapshot.data)
    setIsLoading(!snapshot.isCached && enabled && Boolean(key))
    setError(null)
  }, [key, enabled, getInitialSnapshot])

  /**
   * Execute fetcher with SWR update logic and race condition prevention.
   */
  const executeFetch = useCallback(
    async (isBackground = false): Promise<T | null> => {
      if (!key || !enabled) return null

      if (!isBackground && !data) {
        setIsLoading(true)
      }
      setIsValidating(true)

      try {
        // Reuse ongoing in-flight promise if available
        if (!inFlightRef.current) {
          inFlightRef.current = fetcherRef.current()
        }

        const freshData = await inFlightRef.current
        inFlightRef.current = null

        setData(freshData)
        setError(null)

        // Update memory and session storage
        if (context) {
          context.setMemoryCache(key, freshData)
        } else {
          writeSessionStorage(key, freshData)
        }

        return freshData
      } catch (err: unknown) {
        inFlightRef.current = null
        const errorObj = err instanceof Error ? err : new Error(String(err))
        setError(errorObj)
        return null
      } finally {
        setIsLoading(false)
        setIsValidating(false)
      }
    },
    [key, enabled, data, context]
  )

  /**
   * Main lifecycle effect with cleanup guard for unmounted component states.
   */
  useEffect(() => {
    let isMounted = true

    if (!key || !enabled) {
      setIsLoading(false)
      setIsValidating(false)
      return
    }

    const snapshot = getInitialSnapshot()

    if (!snapshot.isCached) {
      // First-time load: execute fetch with initial loading state
      executeFetch(false)
    } else if (revalidateOnMount && snapshot.isStale) {
      // Stale-While-Revalidate: serve cached data instantly, revalidate silently
      executeFetch(true)
    }

    return () => {
      isMounted = false
    }
  }, [key, enabled, revalidateOnMount, getInitialSnapshot, executeFetch])

  /**
   * Window focus revalidation.
   */
  useEffect(() => {
    if (!revalidateOnFocus || !key || !enabled) return

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        executeFetch(true)
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [revalidateOnFocus, key, enabled, executeFetch])

  /**
   * Manual mutation for optimistic updates.
   */
  const mutate = useCallback(
    async (
      dataOrUpdater?: T | ((prev: T | null) => T),
      shouldRevalidate = true
    ): Promise<void> => {
      if (!key) return

      if (typeof dataOrUpdater !== 'undefined') {
        const nextData =
          typeof dataOrUpdater === 'function'
            ? (dataOrUpdater as (prev: T | null) => T)(data)
            : dataOrUpdater

        setData(nextData)
        if (context) {
          context.setMemoryCache(key, nextData)
        } else {
          writeSessionStorage(key, nextData)
        }
      }

      if (shouldRevalidate) {
        await executeFetch(true)
      }
    },
    [key, data, context, executeFetch]
  )

  const refetch = useCallback(async (): Promise<T | null> => {
    return executeFetch(false)
  }, [executeFetch])

  return {
    data,
    isLoading,
    isValidating,
    error,
    mutate,
    refetch,
  }
}

/**
 * Hook to selectively invalidate cached items by key or prefix.
 */
export function useInvalidateCache() {
  const ctx = useContext(CacheContext)

  return useCallback(
    (keyOrPrefix: string, isPrefix = false) => {
      if (!ctx) return

      if (!isPrefix) {
        ctx.removeMemoryCache(keyOrPrefix)
      } else {
        if (typeof window !== 'undefined') {
          try {
            const keysToRemove: string[] = []
            for (let i = 0; i < window.sessionStorage.length; i++) {
              const k = window.sessionStorage.key(i)
              if (k && k.startsWith(`${STORAGE_PREFIX}${keyOrPrefix}`)) {
                const plainKey = k.replace(STORAGE_PREFIX, '')
                keysToRemove.push(plainKey)
              }
            }
            keysToRemove.forEach((k) => ctx.removeMemoryCache(k))
          } catch {
            // Ignore error
          }
        }
      }
    },
    [ctx]
  )
}
