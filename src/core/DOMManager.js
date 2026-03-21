/**
 * DOMManager - Centralized DOM element caching and query optimization
 * 
 * Provides efficient DOM access through caching and event delegation.
 * Reduces redundant querySelector calls and improves performance.
 */
export class DOMManager {
  constructor() {
    this.cache = new Map()
    this.delegatedEvents = new Map()
    this.init()
  }

  /**
   * Initialize cache with critical DOM elements
   */
  init() {
    const criticalIds = [
      'tasksList',
      'sidebar',
      'taskModal',
      'aiPanel',
      'deleteModal',
      'authModal',
      'notificationToast',
      'reminderModal',
      'remindersPanel',
      'profileModal',
      'logoutModal',
      'floatingAddBtn',
      'aiChatBubble',
      'mobileOverlay',
      'aiOverlay',
      'confirmDeleteBtn',
      'cancelDeleteBtn',
      'confirmLogoutBtn',
      'cancelLogoutBtn'
    ]

    criticalIds.forEach(id => {
      const el = document.getElementById(id)
      if (el) {
        this.cache.set(id, el)
      }
    })
  }

  /**
   * Get cached DOM element by ID
   * @param {string} elementId - The element ID to retrieve
   * @returns {HTMLElement|null} The cached element or null
   */
  get(elementId) {
    // Check cache first
    if (this.cache.has(elementId)) {
      const el = this.cache.get(elementId)
      // Validate element still in DOM
      if (document.contains(el)) {
        return el
      }
      // Element removed, invalidate cache
      this.cache.delete(elementId)
    }

    // Query and cache
    const el = document.getElementById(elementId)
    if (el) {
      this.cache.set(elementId, el)
    }
    return el
  }

  /**
   * Get all elements matching a selector
   * @param {string} selector - CSS selector
   * @returns {NodeList} List of matching elements
   */
  getAll(selector) {
    return document.querySelectorAll(selector)
  }

  /**
   * Refresh the entire cache
   */
  refresh() {
    this.cache.clear()
    this.init()
  }

  /**
   * Invalidate a specific cached element
   * @param {string} elementId - The element ID to invalidate
   */
  invalidate(elementId) {
    this.cache.delete(elementId)
  }

  /**
   * Validate all cached elements are still in DOM
   * @returns {boolean} True if all cached elements are valid
   */
  validate() {
    let allValid = true
    for (const [id, el] of this.cache.entries()) {
      if (!document.contains(el)) {
        this.cache.delete(id)
        allValid = false
      }
    }
    return allValid
  }

  /**
   * Delegate event to parent element for dynamic children
   * @param {string} parentId - Parent element ID
   * @param {string} selector - Child selector to match
   * @param {string} event - Event type (e.g., 'click')
   * @param {Function} handler - Event handler function
   */
  delegate(parentId, selector, event, handler) {
    const parent = this.get(parentId)
    if (!parent) {
      console.warn(`DOMManager: Parent element not found: ${parentId}`)
      return
    }

    const wrappedHandler = (e) => {
      const target = e.target.closest(selector)
      if (target && parent.contains(target)) {
        handler.call(target, e)
      }
    }

    parent.addEventListener(event, wrappedHandler)

    // Track delegated events for cleanup
    const key = `${parentId}:${event}`
    if (!this.delegatedEvents.has(key)) {
      this.delegatedEvents.set(key, [])
    }
    this.delegatedEvents.get(key).push({
      selector,
      handler: wrappedHandler,
      parent
    })
  }

  /**
   * Remove delegated event listeners
   * @param {string} parentId - Parent element ID
   * @param {string} event - Event type to remove
   */
  undelegate(parentId, event) {
    const key = `${parentId}:${event}`
    if (!this.delegatedEvents.has(key)) {
      return
    }

    const events = this.delegatedEvents.get(key)
    events.forEach(({ parent, handler }) => {
      parent.removeEventListener(event, handler)
    })

    this.delegatedEvents.delete(key)
  }

  /**
   * Remove all delegated event listeners
   */
  undelegateAll() {
    this.delegatedEvents.forEach((events, key) => {
      const [, event] = key.split(':')
      events.forEach(({ parent, handler }) => {
        parent.removeEventListener(event, handler)
      })
    })
    this.delegatedEvents.clear()
  }

  /**
   * Get count of delegated events
   * @returns {number} Number of delegated event handlers
   */
  getDelegatedEventCount() {
    let count = 0
    this.delegatedEvents.forEach(events => {
      count += events.length
    })
    return count
  }
}
