/**
 * APIClient - Optimized Supabase API wrapper
 * 
 * Features:
 * - Request debouncing (300ms default)
 * - Response caching with TTL (60s default)
 * - Exponential backoff retry (1s, 2s, 4s)
 * - Batch operations
 * - Automatic token refresh
 */
export class APIClient {
  constructor(supabaseUrl, supabaseKey) {
    this.url = supabaseUrl
    this.key = supabaseKey
    this.cache = new Map()
    this.pendingRequests = new Map()
    this.debounceTimers = new Map()
    this.debounceDelay = 300 // ms
    this.maxRetries = 3
    this.baseRetryDelay = 1000 // ms
    this.cacheTTL = 60000 // 60 seconds
  }

  /**
   * Build URL with query parameters
   * @param {string} table - Table name
   * @param {object} query - Query parameters
   * @returns {string} Complete URL
   */
  buildUrl(table, query = {}) {
    const url = new URL(`${this.url}/rest/v1/${table}`)
    
    Object.entries(query).forEach(([key, value]) => {
      if (typeof value === 'object') {
        // Handle operators like { in: [1,2,3] }
        Object.entries(value).forEach(([op, val]) => {
          url.searchParams.append(key, `${op}.${JSON.stringify(val)}`)
        })
      } else {
        url.searchParams.append(key, `eq.${value}`)
      }
    })
    
    return url.toString()
  }

  /**
   * GET request with caching and debouncing
   * @param {string} table - Table name
   * @param {object} query - Query parameters
   * @param {object} options - Request options
   * @returns {Promise<any>} Response data
   */
  async get(table, query = {}, options = {}) {
    const cacheKey = `${table}:${JSON.stringify(query)}`
    
    // Check cache
    if (options.cache !== false && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      const age = Date.now() - cached.timestamp
      if (age < (options.cacheTTL || this.cacheTTL)) {
        return cached.data
      }
      // Cache expired
      this.cache.delete(cacheKey)
    }
    
    // Debounce if requested
    if (options.debounce) {
      return this.debounceRequest(cacheKey, () =>
        this.executeGet(table, query, cacheKey, options)
      )
    }
    
    return this.executeGet(table, query, cacheKey, options)
  }

  /**
   * Execute GET request
   * @private
   */
  async executeGet(table, query, cacheKey, options) {
    const url = this.buildUrl(table, query)
    const data = await this.fetchWithRetry(url, { method: 'GET' }, options.retries)
    
    // Cache result
    if (options.cache !== false) {
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      })
    }
    
    return data
  }

  /**
   * POST request
   * @param {string} table - Table name
   * @param {object} data - Data to insert
   * @param {object} options - Request options
   * @returns {Promise<any>} Response data
   */
  async post(table, data, options = {}) {
    const url = `${this.url}/rest/v1/${table}`
    return this.fetchWithRetry(url, {
      method: 'POST',
      body: JSON.stringify(data)
    }, options.retries)
  }

  /**
   * PATCH request
   * @param {string} table - Table name
   * @param {string} id - Record ID
   * @param {object} data - Data to update
   * @param {object} options - Request options
   * @returns {Promise<any>} Response data
   */
  async patch(table, id, data, options = {}) {
    const url = `${this.url}/rest/v1/${table}?id=eq.${id}`
    return this.fetchWithRetry(url, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }, options.retries)
  }

  /**
   * DELETE request
   * @param {string} table - Table name
   * @param {string} id - Record ID
   * @param {object} options - Request options
   * @returns {Promise<any>} Response data
   */
  async delete(table, id, options = {}) {
    const url = `${this.url}/rest/v1/${table}?id=eq.${id}`
    return this.fetchWithRetry(url, {
      method: 'DELETE'
    }, options.retries)
  }

  /**
   * Batch GET operation
   * @param {string} table - Table name
   * @param {string[]} ids - Array of IDs to fetch
   * @returns {Promise<any[]>} Array of records
   */
  async batchGet(table, ids) {
    const query = { id: { in: ids } }
    return this.get(table, query)
  }

  /**
   * Batch POST operation
   * @param {string} table - Table name
   * @param {object[]} items - Array of items to insert
   * @returns {Promise<any[]>} Array of created records
   */
  async batchPost(table, items) {
    const url = `${this.url}/rest/v1/${table}`
    return this.fetchWithRetry(url, {
      method: 'POST',
      body: JSON.stringify(items)
    })
  }

  /**
   * Debounce request execution
   * @private
   */
  debounceRequest(key, fn) {
    return new Promise((resolve, reject) => {
      // Clear existing timer
      if (this.debounceTimers.has(key)) {
        const existing = this.debounceTimers.get(key)
        clearTimeout(existing.timer)
      }
      
      // Set new timer
      const timer = setTimeout(async () => {
        try {
          const result = await fn()
          const callbacks = this.debounceTimers.get(key)
          if (callbacks) {
            callbacks.resolve(result)
          }
        } catch (error) {
          const callbacks = this.debounceTimers.get(key)
          if (callbacks) {
            callbacks.reject(error)
          }
        } finally {
          this.debounceTimers.delete(key)
        }
      }, this.debounceDelay)
      
      this.debounceTimers.set(key, { timer, resolve, reject })
    })
  }

  /**
   * Fetch with exponential backoff retry
   * @private
   */
  async fetchWithRetry(url, fetchOptions, maxRetries = this.maxRetries) {
    let lastError
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const token = localStorage.getItem('authToken')
        
        // If no token, don't even try
        if (!token) {
          throw new Error('HTTP 401: No authentication token')
        }
        
        const response = await fetch(url, {
          ...fetchOptions,
          headers: {
            'apikey': this.key,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            ...fetchOptions.headers
          }
        })
        
        // Handle 401 - token expired
        if (response.status === 401 && attempt === 0) {
          const refreshed = await this.refreshSession()
          if (refreshed) {
            continue // Retry with new token
          } else {
            // Refresh failed - throw 401 immediately
            throw new Error('HTTP 401: Unauthorized')
          }
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        return data
      } catch (error) {
        lastError = error
        
        // Don't retry on 401 errors after refresh attempt
        if (error.message && error.message.includes('401')) {
          throw error
        }
        
        // Don't retry on last attempt
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = this.baseRetryDelay * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError
  }

  /**
   * Refresh authentication session
   * @private
   */
  async refreshSession() {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      return false
    }
    
    try {
      const response = await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.key,
          'Authorization': `Bearer ${this.key}`
        },
        body: JSON.stringify({
          refresh_token: refreshToken
        })
      })
      
      if (!response.ok) {
        return false
      }
      
      const data = await response.json()
      const newToken = data.access_token || data.session?.access_token
      const newRefreshToken = data.refresh_token || data.session?.refresh_token
      
      if (newToken) {
        localStorage.setItem('authToken', newToken)
      }
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken)
      }
      
      return true
    } catch (error) {
      console.error('Session refresh failed:', error)
      return false
    }
  }

  /**
   * Clear cache
   * @param {string} table - Optional table name to clear specific cache
   */
  clearCache(table = null) {
    if (table) {
      // Clear cache for specific table
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${table}:`)) {
          this.cache.delete(key)
        }
      }
    } else {
      // Clear all cache
      this.cache.clear()
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
   * Set retry configuration
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} baseDelay - Base delay in milliseconds
   */
  setRetryConfig(maxRetries, baseDelay) {
    this.maxRetries = maxRetries
    this.baseRetryDelay = baseDelay
  }
}
