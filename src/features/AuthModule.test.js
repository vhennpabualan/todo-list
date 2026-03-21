import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthModule } from './AuthModule.js'

describe('AuthModule', () => {
  let authModule
  let mockApiClient
  let mockDomManager
  let mockMemoryManager
  let mockCallbacks

  beforeEach(() => {
    // Mock APIClient
    mockApiClient = {
      url: 'https://test.supabase.co',
      key: 'test-key',
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn()
    }

    // Create a cache for mock elements to ensure same instance is returned
    const elementCache = new Map()

    // Mock DOMManager
    mockDomManager = {
      get: vi.fn((id) => {
        // Return cached element if exists
        if (elementCache.has(id)) {
          return elementCache.get(id)
        }

        // Create new mock element
        const mockElement = {
          style: { display: '' },
          classList: {
            add: vi.fn(),
            remove: vi.fn(),
            toggle: vi.fn()
          },
          addEventListener: vi.fn(),
          value: '',
          textContent: '',
          id
        }
        
        // Cache it
        elementCache.set(id, mockElement)
        return mockElement
      })
    }

    // Mock MemoryManager
    mockMemoryManager = {
      registerListener: vi.fn(),
      cleanup: vi.fn()
    }

    // Mock callbacks
    mockCallbacks = {
      onAuthStateChange: vi.fn(),
      onUserDataLoad: vi.fn(),
      showNotification: vi.fn(),
      renderApp: vi.fn()
    }

    // Clear localStorage
    localStorage.clear()

    // Create AuthModule instance
    authModule = new AuthModule(
      mockApiClient,
      mockDomManager,
      mockMemoryManager,
      mockCallbacks
    )
  })

  describe('Initialization', () => {
    it('should initialize with no current user', () => {
      expect(authModule.currentUser).toBeNull()
    })

    it('should initialize in sign-in mode', () => {
      expect(authModule.isSignUpMode).toBe(false)
    })

    it('should check auth on initialization', () => {
      expect(mockCallbacks.onAuthStateChange).toHaveBeenCalledWith(null)
    })

    it('should load user from localStorage if present', () => {
      const testUser = { id: '123', email: 'test@example.com', name: 'Test User' }
      localStorage.setItem('user', JSON.stringify(testUser))

      const newAuthModule = new AuthModule(
        mockApiClient,
        mockDomManager,
        mockMemoryManager,
        mockCallbacks
      )

      expect(newAuthModule.currentUser).toEqual(testUser)
    })
  })

  describe('Modal Management', () => {
    it('should show auth modal', () => {
      const mockModal = mockDomManager.get('authModal')
      authModule.showAuthModal()

      expect(mockModal.style.display).toBe('flex')
      expect(mockModal.classList.remove).toHaveBeenCalledWith('hidden')
    })

    it('should hide auth modal', () => {
      const mockModal = mockDomManager.get('authModal')
      authModule.hideAuthModal()

      expect(mockModal.style.display).toBe('none')
      expect(mockModal.classList.add).toHaveBeenCalledWith('hidden')
    })

    it('should toggle auth mode from sign-in to sign-up', () => {
      authModule.isSignUpMode = false
      authModule.toggleAuthMode()

      expect(authModule.isSignUpMode).toBe(true)
    })

    it('should toggle auth mode from sign-up to sign-in', () => {
      authModule.isSignUpMode = true
      authModule.toggleAuthMode()

      expect(authModule.isSignUpMode).toBe(false)
    })
  })

  describe('UI State Management', () => {
    it('should show authenticated UI elements', () => {
      authModule.showAuthenticatedUI()

      const logoutBtn = mockDomManager.get('logoutBtn')
      const profileBtn = mockDomManager.get('profileBtn')

      expect(logoutBtn.style.display).toBe('block')
      expect(profileBtn.style.display).toBe('block')
    })

    it('should hide authenticated UI elements', () => {
      authModule.hideAuthenticatedUI()

      const logoutBtn = mockDomManager.get('logoutBtn')
      const profileBtn = mockDomManager.get('profileBtn')

      expect(logoutBtn.style.display).toBe('none')
      expect(profileBtn.style.display).toBe('none')
    })
  })

  describe('Error Handling', () => {
    it('should show auth error', () => {
      const errorMessage = 'Invalid credentials'
      authModule.showAuthError(errorMessage)

      const errorDiv = mockDomManager.get('authError')
      expect(errorDiv.textContent).toBe(errorMessage)
      expect(errorDiv.classList.remove).toHaveBeenCalledWith('hidden')
    })

    it('should clear auth error', () => {
      authModule.clearAuthError()

      const errorDiv = mockDomManager.get('authError')
      expect(errorDiv.classList.add).toHaveBeenCalledWith('hidden')
    })
  })

  describe('User State', () => {
    it('should return current user', () => {
      authModule.currentUser = { id: '123', email: 'test@example.com' }
      expect(authModule.getCurrentUser()).toEqual({ id: '123', email: 'test@example.com' })
    })

    it('should check if user is authenticated', () => {
      authModule.currentUser = null
      expect(authModule.isAuthenticated()).toBe(false)

      authModule.currentUser = { id: '123' }
      expect(authModule.isAuthenticated()).toBe(true)
    })
  })

  describe('Logout', () => {
    it('should clear user data on logout', () => {
      localStorage.setItem('user', JSON.stringify({ id: '123' }))
      localStorage.setItem('authToken', 'token')
      localStorage.setItem('refreshToken', 'refresh')

      authModule.currentUser = { id: '123' }
      authModule.logout()

      expect(authModule.currentUser).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
      expect(localStorage.getItem('authToken')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
    })

    it('should notify auth state change on logout', () => {
      authModule.currentUser = { id: '123' }
      authModule.logout()

      expect(mockCallbacks.onAuthStateChange).toHaveBeenCalledWith(null)
    })

    it('should show notification on logout', () => {
      authModule.logout()

      expect(mockCallbacks.showNotification).toHaveBeenCalledWith(
        'Logged out successfully',
        '👋',
        2000
      )
    })
  })

  describe('Cleanup', () => {
    it('should cleanup auth scope resources', () => {
      authModule.cleanup()

      expect(mockMemoryManager.cleanup).toHaveBeenCalledWith('auth')
    })
  })

  describe('Setup', () => {
    it('should setup auth modal on init', () => {
      authModule.init()

      // Verify event listeners are registered
      expect(mockMemoryManager.registerListener).toHaveBeenCalled()
    })

    it('should register event listeners with memory manager', () => {
      authModule.setupAuthModal()

      // Should register multiple listeners
      expect(mockMemoryManager.registerListener.mock.calls.length).toBeGreaterThan(0)
      
      // All listeners should be in 'auth' scope
      mockMemoryManager.registerListener.mock.calls.forEach(call => {
        expect(call[3]).toBe('auth')
      })
    })
  })
})
