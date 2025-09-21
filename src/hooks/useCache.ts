import { useState, useEffect, useCallback } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>()

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }
}

const cache = new SimpleCache()

interface UseCacheOptions {
  ttl?: number // Time to live in seconds
  enabled?: boolean
}

export const useCache = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCacheOptions = {}
) => {
  const { ttl = 300, enabled = true } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) {
      try {
        setLoading(true)
        setError(null)
        const result = await fetcher()
        setData(result)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
      return
    }

    // Check cache first
    if (!forceRefresh && cache.has(key)) {
      const cachedData = cache.get<T>(key)
      if (cachedData !== null) {
        setData(cachedData)
        return
      }
    }

    try {
      setLoading(true)
      setError(null)
      const result = await fetcher()
      
      // Store in cache
      cache.set(key, result, ttl)
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [key, fetcher, ttl, enabled])

  const invalidate = useCallback(() => {
    cache.delete(key)
  }, [key])

  const refresh = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refresh,
    invalidate
  }
}

// Hook for managing multiple cache entries
export const useCacheManager = () => {
  const invalidatePattern = useCallback((pattern: string) => {
    // Simple pattern matching - invalidate keys that include the pattern
    cache.clear() // For simplicity, clear all cache
  }, [])

  const clearAll = useCallback(() => {
    cache.clear()
  }, [])

  return {
    invalidatePattern,
    clearAll
  }
}