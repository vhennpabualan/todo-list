/**
 * PerformanceMonitor - Track and report performance metrics
 * 
 * Features:
 * - Page load time tracking
 * - Time-to-interactive measurement
 * - Operation duration tracking
 * - Performance budget monitoring
 * - Development mode logging
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoad: 0,
      timeToInteractive: 0,
      operations: new Map(),
      budgetViolations: []
    }
    this.budgets = new Map()
    this.init()
  }

  /**
   * Initialize performance tracking
   */
  init() {
    // Track page load time
    if (window.performance && window.performance.timing) {
      window.addEventListener('load', () => {
        const timing = performance.timing
        this.metrics.pageLoad = timing.loadEventEnd - timing.navigationStart
      })
    }

    // Track time to interactive
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-input') {
              this.metrics.timeToInteractive = entry.startTime
            }
          }
        })
        observer.observe({ entryTypes: ['first-input'] })
      } catch (error) {
        // PerformanceObserver not supported or error
        console.warn('PerformanceObserver not available:', error)
      }
    }
  }

  /**
   * Mark the start of an operation
   * @param {string} label - Operation label
   */
  markStart(label) {
    performance.mark(`${label}-start`)
  }

  /**
   * Mark the end of an operation and calculate duration
   * @param {string} label - Operation label
   * @returns {number} Duration in milliseconds
   */
  markEnd(label) {
    performance.mark(`${label}-end`)
    const duration = this.measure(label, `${label}-start`, `${label}-end`)

    // Store operation duration
    if (!this.metrics.operations.has(label)) {
      this.metrics.operations.set(label, [])
    }
    this.metrics.operations.get(label).push(duration)

    // Check budget
    if (this.budgets.has(label)) {
      this.checkBudget(label, duration)
    }

    return duration
  }

  /**
   * Measure duration between two marks
   * @param {string} label - Measurement label
   * @param {string} startMark - Start mark name
   * @param {string} endMark - End mark name
   * @returns {number} Duration in milliseconds
   */
  measure(label, startMark, endMark) {
    try {
      performance.measure(label, startMark, endMark)
      const measures = performance.getEntriesByName(label)
      if (measures.length > 0) {
        return measures[measures.length - 1].duration
      }
    } catch (error) {
      console.warn(`Performance measurement failed for ${label}:`, error)
    }
    return 0
  }

  /**
   * Set performance budget for an operation
   * @param {string} operation - Operation name
   * @param {number} maxMs - Maximum allowed duration in milliseconds
   */
  setBudget(operation, maxMs) {
    this.budgets.set(operation, maxMs)
  }

  /**
   * Check if operation exceeded budget
   * @param {string} operation - Operation name
   * @param {number} actualMs - Actual duration in milliseconds
   * @returns {boolean} True if within budget
   */
  checkBudget(operation, actualMs) {
    const budget = this.budgets.get(operation)
    if (actualMs > budget) {
      const violation = `${operation}: ${actualMs.toFixed(2)}ms (budget: ${budget}ms)`
      this.metrics.budgetViolations.push(violation)
      
      if (import.meta.env.DEV) {
        console.warn(`⚠️ Performance budget exceeded: ${violation}`)
      }
      
      return false
    }
    return true
  }

  /**
   * Get all collected metrics
   * @returns {object} Metrics object
   */
  getMetrics() {
    return {
      pageLoad: this.metrics.pageLoad,
      timeToInteractive: this.metrics.timeToInteractive,
      operations: new Map(this.metrics.operations),
      budgetViolations: [...this.metrics.budgetViolations]
    }
  }

  /**
   * Log metrics to console (development mode only)
   */
  logMetrics() {
    if (!import.meta.env.DEV) {
      return
    }

    console.group('📊 Performance Metrics')
    
    if (this.metrics.pageLoad > 0) {
      console.log(`Page Load: ${this.metrics.pageLoad}ms`)
    }
    
    if (this.metrics.timeToInteractive > 0) {
      console.log(`Time to Interactive: ${this.metrics.timeToInteractive.toFixed(2)}ms`)
    }

    if (this.metrics.operations.size > 0) {
      console.group('Operations')
      this.metrics.operations.forEach((durations, label) => {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length
        const min = Math.min(...durations)
        const max = Math.max(...durations)
        console.log(`${label}: avg ${avg.toFixed(2)}ms, min ${min.toFixed(2)}ms, max ${max.toFixed(2)}ms (${durations.length} samples)`)
      })
      console.groupEnd()
    }

    if (this.metrics.budgetViolations.length > 0) {
      console.group('⚠️ Budget Violations')
      this.metrics.budgetViolations.forEach(v => console.warn(v))
      console.groupEnd()
    }

    console.groupEnd()
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.operations.clear()
    this.metrics.budgetViolations = []
  }

  /**
   * Get average duration for an operation
   * @param {string} operation - Operation name
   * @returns {number} Average duration in milliseconds
   */
  getAverageDuration(operation) {
    const durations = this.metrics.operations.get(operation)
    if (!durations || durations.length === 0) {
      return 0
    }
    return durations.reduce((a, b) => a + b, 0) / durations.length
  }
}
