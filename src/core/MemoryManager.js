/**
 * MemoryManager - Resource cleanup and memory leak prevention
 * 
 * Features:
 * - Event listener tracking and cleanup
 * - Interval and timeout management
 * - Custom resource cleanup registry
 * - Scope-based cleanup
 * - Resource monitoring
 */
export class MemoryManager {
  constructor() {
    this.listeners = new Map()
    this.intervals = new Set()
    this.timeouts = new Set()
    this.resources = new Map()
  }

  /**
   * Register an event listener for cleanup
   * @param {HTMLElement} element - DOM element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {string} scope - Scope identifier (default: 'global')
   */
  registerListener(element, event, handler, scope = 'global') {
    const key = `${scope}:${event}`
    if (!this.listeners.has(key)) {
      this.listeners.set(key, [])
    }
    this.listeners.get(key).push({ element, handler })
  }

  /**
   * Register an interval for cleanup
   * @param {number} id - Interval ID
   * @param {string} scope - Scope identifier (default: 'global')
   */
  registerInterval(id, scope = 'global') {
    this.intervals.add({ id, scope })
  }

  /**
   * Register a timeout for cleanup
   * @param {number} id - Timeout ID
   * @param {string} scope - Scope identifier (default: 'global')
   */
  registerTimeout(id, scope = 'global') {
    this.timeouts.add({ id, scope })
  }

  /**
   * Register a custom resource with cleanup function
   * @param {string} key - Resource key
   * @param {Function} cleanup - Cleanup function
   * @param {string} scope - Scope identifier (default: 'global')
   */
  registerResource(key, cleanup, scope = 'global') {
    this.resources.set(`${scope}:${key}`, cleanup)
  }

  /**
   * Clean up all resources or resources in a specific scope
   * @param {string|null} scope - Scope to clean up (null = all)
   */
  cleanup(scope = null) {
    // Clean listeners
    this.cleanupListeners(scope)
    
    // Clean intervals
    this.cleanupIntervals(scope)
    
    // Clean timeouts
    this.cleanupTimeouts(scope)
    
    // Clean custom resources
    this.cleanupResources(scope)
  }

  /**
   * Clean up event listeners
   * @param {string|null} scope - Scope to clean up
   */
  cleanupListeners(scope = null) {
    const keysToDelete = []
    
    this.listeners.forEach((handlers, key) => {
      if (!scope || key.startsWith(`${scope}:`)) {
        handlers.forEach(({ element, handler }) => {
          const [, event] = key.split(':')
          if (element && element.removeEventListener) {
            element.removeEventListener(event, handler)
          }
        })
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => this.listeners.delete(key))
  }

  /**
   * Clean up intervals
   * @param {string|null} scope - Scope to clean up
   */
  cleanupIntervals(scope = null) {
    const toDelete = []
    
    this.intervals.forEach(({ id, scope: intervalScope }) => {
      if (!scope || intervalScope === scope) {
        clearInterval(id)
        toDelete.push({ id, scope: intervalScope })
      }
    })
    
    toDelete.forEach(item => this.intervals.delete(item))
  }

  /**
   * Clean up timeouts
   * @param {string|null} scope - Scope to clean up
   */
  cleanupTimeouts(scope = null) {
    const toDelete = []
    
    this.timeouts.forEach(({ id, scope: timeoutScope }) => {
      if (!scope || timeoutScope === scope) {
        clearTimeout(id)
        toDelete.push({ id, scope: timeoutScope })
      }
    })
    
    toDelete.forEach(item => this.timeouts.delete(item))
  }

  /**
   * Clean up custom resources
   * @param {string|null} scope - Scope to clean up
   */
  cleanupResources(scope = null) {
    const keysToDelete = []
    
    this.resources.forEach((cleanup, key) => {
      if (!scope || key.startsWith(`${scope}:`)) {
        try {
          cleanup()
        } catch (error) {
          console.error(`Error cleaning up resource ${key}:`, error)
        }
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => this.resources.delete(key))
  }

  /**
   * Get count of active resources
   * @returns {object} Resource counts
   */
  getActiveResources() {
    let listenerCount = 0
    this.listeners.forEach(handlers => {
      listenerCount += handlers.length
    })
    
    return {
      listeners: listenerCount,
      intervals: this.intervals.size,
      timeouts: this.timeouts.size,
      customResources: this.resources.size
    }
  }

  /**
   * Check if a specific scope has resources
   * @param {string} scope - Scope to check
   * @returns {boolean} True if scope has resources
   */
  hasScope(scope) {
    // Check listeners
    for (const key of this.listeners.keys()) {
      if (key.startsWith(`${scope}:`)) {
        return true
      }
    }
    
    // Check intervals
    for (const { scope: intervalScope } of this.intervals) {
      if (intervalScope === scope) {
        return true
      }
    }
    
    // Check timeouts
    for (const { scope: timeoutScope } of this.timeouts) {
      if (timeoutScope === scope) {
        return true
      }
    }
    
    // Check resources
    for (const key of this.resources.keys()) {
      if (key.startsWith(`${scope}:`)) {
        return true
      }
    }
    
    return false
  }

  /**
   * Clear all resources (for testing/reset)
   */
  clear() {
    this.cleanup()
    this.listeners.clear()
    this.intervals.clear()
    this.timeouts.clear()
    this.resources.clear()
  }
}
