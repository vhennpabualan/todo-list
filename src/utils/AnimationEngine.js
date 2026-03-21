/**
 * AnimationEngine - GPU-optimized animations
 * 
 * Features:
 * - will-change lifecycle management
 * - GPU-accelerated properties (transform, opacity)
 * - Reduced motion support
 * - Animation helpers
 */
export class AnimationEngine {
  constructor() {
    this.activeAnimations = new Map()
  }

  /**
   * Prepare element for animation by applying will-change
   * @param {HTMLElement} element - Element to animate
   * @param {string[]} properties - Properties that will change
   */
  prepareAnimation(element, properties = ['transform', 'opacity']) {
    if (!element) return
    element.style.willChange = properties.join(', ')
  }

  /**
   * Clean up after animation by removing will-change
   * @param {HTMLElement} element - Element that was animated
   */
  cleanupAnimation(element) {
    if (!element) return
    element.style.willChange = 'auto'
  }

  /**
   * Animate element using Web Animations API
   * @param {HTMLElement} element - Element to animate
   * @param {object} animation - Animation configuration
   * @returns {Promise<void>} Resolves when animation completes
   */
  async animate(element, animation) {
    if (!element || this.respectReducedMotion()) {
      return Promise.resolve()
    }

    // Prepare for animation
    const properties = this.extractProperties(animation.keyframes)
    this.prepareAnimation(element, properties)

    return new Promise((resolve, reject) => {
      try {
        const anim = element.animate(animation.keyframes, animation.options)
        
        // Track active animation
        this.activeAnimations.set(element, anim)

        anim.onfinish = () => {
          this.cleanupAnimation(element)
          this.activeAnimations.delete(element)
          resolve()
        }

        anim.oncancel = () => {
          this.cleanupAnimation(element)
          this.activeAnimations.delete(element)
          resolve()
        }
      } catch (error) {
        this.cleanupAnimation(element)
        reject(error)
      }
    })
  }

  /**
   * Cancel animation on element
   * @param {HTMLElement} element - Element with active animation
   */
  cancel(element) {
    const anim = this.activeAnimations.get(element)
    if (anim) {
      anim.cancel()
      this.activeAnimations.delete(element)
      this.cleanupAnimation(element)
    }
  }

  /**
   * Fade in element
   * @param {HTMLElement} element - Element to fade in
   * @param {number} duration - Duration in milliseconds
   * @returns {Promise<void>}
   */
  async fadeIn(element, duration = 300) {
    if (!element) return Promise.resolve()

    return this.animate(element, {
      keyframes: [
        { opacity: 0 },
        { opacity: 1 }
      ],
      options: {
        duration,
        easing: 'ease-out',
        fill: 'forwards'
      }
    })
  }

  /**
   * Fade out element
   * @param {HTMLElement} element - Element to fade out
   * @param {number} duration - Duration in milliseconds
   * @returns {Promise<void>}
   */
  async fadeOut(element, duration = 300) {
    if (!element) return Promise.resolve()

    return this.animate(element, {
      keyframes: [
        { opacity: 1 },
        { opacity: 0 }
      ],
      options: {
        duration,
        easing: 'ease-in',
        fill: 'forwards'
      }
    })
  }

  /**
   * Slide in element
   * @param {HTMLElement} element - Element to slide in
   * @param {string} direction - Direction: 'left', 'right', 'up', 'down'
   * @param {number} duration - Duration in milliseconds
   * @returns {Promise<void>}
   */
  async slideIn(element, direction = 'right', duration = 300) {
    if (!element) return Promise.resolve()

    const transforms = {
      left: ['translateX(-100%)', 'translateX(0)'],
      right: ['translateX(100%)', 'translateX(0)'],
      up: ['translateY(-100%)', 'translateY(0)'],
      down: ['translateY(100%)', 'translateY(0)']
    }

    const [from, to] = transforms[direction] || transforms.right

    return this.animate(element, {
      keyframes: [
        { transform: from, opacity: 0 },
        { transform: to, opacity: 1 }
      ],
      options: {
        duration,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'forwards'
      }
    })
  }

  /**
   * Slide out element
   * @param {HTMLElement} element - Element to slide out
   * @param {string} direction - Direction: 'left', 'right', 'up', 'down'
   * @param {number} duration - Duration in milliseconds
   * @returns {Promise<void>}
   */
  async slideOut(element, direction = 'right', duration = 300) {
    if (!element) return Promise.resolve()

    const transforms = {
      left: ['translateX(0)', 'translateX(-100%)'],
      right: ['translateX(0)', 'translateX(100%)'],
      up: ['translateY(0)', 'translateY(-100%)'],
      down: ['translateY(0)', 'translateY(100%)']
    }

    const [from, to] = transforms[direction] || transforms.right

    return this.animate(element, {
      keyframes: [
        { transform: from, opacity: 1 },
        { transform: to, opacity: 0 }
      ],
      options: {
        duration,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'forwards'
      }
    })
  }

  /**
   * Scale animation
   * @param {HTMLElement} element - Element to scale
   * @param {number} from - Starting scale
   * @param {number} to - Ending scale
   * @param {number} duration - Duration in milliseconds
   * @returns {Promise<void>}
   */
  async scale(element, from = 0.8, to = 1, duration = 300) {
    if (!element) return Promise.resolve()

    return this.animate(element, {
      keyframes: [
        { transform: `scale(${from})`, opacity: 0 },
        { transform: `scale(${to})`, opacity: 1 }
      ],
      options: {
        duration,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'forwards'
      }
    })
  }

  /**
   * Check if user prefers reduced motion
   * @returns {boolean} True if reduced motion is preferred
   */
  respectReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  /**
   * Extract properties from keyframes
   * @private
   */
  extractProperties(keyframes) {
    const properties = new Set()
    keyframes.forEach(frame => {
      Object.keys(frame).forEach(prop => {
        if (prop !== 'offset' && prop !== 'easing') {
          properties.add(prop)
        }
      })
    })
    return Array.from(properties)
  }

  /**
   * Cancel all active animations
   */
  cancelAll() {
    this.activeAnimations.forEach((anim, element) => {
      anim.cancel()
      this.cleanupAnimation(element)
    })
    this.activeAnimations.clear()
  }
}
