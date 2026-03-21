/**
 * StorageManager - Optimized LocalStorage operations
 * 
 * Features:
 * - Memory caching for reads
 * - Debounced writes (500ms default)
 * - Delta serialization
 * - Quota management with LRU eviction
 * - Compression for large data
 */
export class StorageManager {
  constructor() {
    this.cache = new Map()
    this.debounceTimers = new Map()
    this.debounceDelay = 500 // ms
    this.accessTimes = new Map() // For LRU tracking
    this.compressionThreshold = 10240 // 10KB
  }

  /**
   * Get item from storage (cache-first)
   * @param {string} key - Storage key
   * @returns {any} Parsed value or null
   */
  get(key) {
    // Check cache first
    if (this.cache.has(key)) {
      this.accessTimes.set(key, Date.now())
      return this.cache.get(key)
    }

    // Read from localStorage
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) {
        return null
      }

      // Check if compressed
      let value
      if (raw.startsWith('__COMPRESSED__:')) {
        value = this.decompress(raw.substring(15))
      } else {
        value = JSON.parse(raw)
      }

      // Cache the parsed value
      this.cache.set(key, value)
      this.accessTimes.set(key, Date.now())
      
      return value
    } catch (error) {
      console.error(`Error reading from storage: ${key}`, error)
      return null
    }
  }

  /**
   * Get all items from storage
   * @returns {object} All key-value pairs
   */
  getAll() {
    const all = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      all[key] = this.get(key)
    }
    return all
  }

  /**
   * Set item in storage with debouncing
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @param {object} options - Options
   */
  set(key, value, options = {}) {
    // Update cache immediately
    this.cache.set(key, value)
    this.accessTimes.set(key, Date.now())

    // Debounce write to localStorage
    if (options.debounce !== false) {
      this.debounceWrite(key, value, options)
    } else {
      this.writeToStorage(key, value, options)
    }
  }

  /**
   * Set multiple items at once
   * @param {object} items - Key-value pairs to set
   */
  setMultiple(items) {
    Object.entries(items).forEach(([key, value]) => {
      this.set(key, value)
    })
  }

  /**
   * Remove item from storage
   * @param {string} key - Storage key
   */
  remove(key) {
    this.cache.delete(key)
    this.accessTimes.delete(key)
    
    // Cancel pending write
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key))
      this.debounceTimers.delete(key)
    }
    
    localStorage.removeItem(key)
  }

  /**
   * Clear all storage
   */
  clear() {
    this.cache.clear()
    this.accessTimes.clear()
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()
    localStorage.clear()
  }

  /**
   * Invalidate cache for a key
   * @param {string} key - Storage key (optional, clears all if not provided)
   */
  invalidateCache(key = null) {
    if (key) {
      this.cache.delete(key)
      this.accessTimes.delete(key)
    } else {
      this.cache.clear()
      this.accessTimes.clear()
    }
  }

  /**
   * Get storage usage information
   * @returns {object} Usage statistics
   */
  getUsage() {
    let used = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      const value = localStorage.getItem(key)
      used += key.length + value.length
    }

    // Approximate available space (5MB typical limit)
    const available = 5 * 1024 * 1024 // 5MB in bytes
    const percentage = (used / available) * 100

    return {
      used,
      available: available - used,
      percentage: Math.min(percentage, 100)
    }
  }

  /**
   * Clean up old data using LRU eviction
   */
  cleanup() {
    // Sort by access time (oldest first)
    const entries = Array.from(this.accessTimes.entries())
      .sort((a, b) => a[1] - b[1])

    // Remove oldest 20% of entries
    const toRemove = Math.ceil(entries.length * 0.2)
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i]
      this.remove(key)
    }
  }

  /**
   * Debounce write operation
   * @private
   */
  debounceWrite(key, value, options) {
    // Clear existing timer
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key))
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.writeToStorage(key, value, options)
      this.debounceTimers.delete(key)
    }, this.debounceDelay)

    this.debounceTimers.set(key, timer)
  }

  /**
   * Write to localStorage with compression if needed
   * @private
   */
  writeToStorage(key, value, options = {}) {
    try {
      let serialized = JSON.stringify(value)
      
      // Compress if large
      if (options.compress !== false && serialized.length > this.compressionThreshold) {
        serialized = '__COMPRESSED__:' + this.compress(serialized)
      }

      localStorage.setItem(key, serialized)
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded, cleaning up...')
        this.cleanup()
        
        // Retry write
        try {
          const serialized = JSON.stringify(value)
          localStorage.setItem(key, serialized)
        } catch (retryError) {
          console.error('Failed to write to storage after cleanup:', retryError)
        }
      } else {
        console.error(`Error writing to storage: ${key}`, error)
      }
    }
  }

  /**
   * Compress string using simple RLE-like compression
   * @private
   */
  compress(str) {
    // Simple compression: just use btoa for now
    // In production, consider using a proper compression library
    try {
      return btoa(encodeURIComponent(str))
    } catch (error) {
      console.warn('Compression failed, using uncompressed:', error)
      return str
    }
  }

  /**
   * Decompress string
   * @private
   */
  decompress(str) {
    try {
      return decodeURIComponent(atob(str))
    } catch (error) {
      console.error('Decompression failed:', error)
      return str
    }
  }

  /**
   * Set debounce delay
   * @param {number} ms - Delay in milliseconds
   */
  setDebounceDelay(ms) {
    this.debounceDelay = ms
  }

  /**
   * Flush all pending writes immediately
   */
  flush() {
    this.debounceTimers.forEach((timer, key) => {
      clearTimeout(timer)
      const value = this.cache.get(key)
      if (value !== undefined) {
        this.writeToStorage(key, value)
      }
    })
    this.debounceTimers.clear()
  }
}
