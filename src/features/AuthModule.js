/**
 * AuthModule - Authentication feature module
 * 
 * Handles all authentication-related functionality:
 * - Login/Signup modal management
 * - User authentication (sign up, sign in, logout)
 * - Session management and token refresh
 * - User profile management
 * - UI state management for authenticated/unauthenticated states
 * 
 * Integrates with:
 * - APIClient for Supabase authentication calls
 * - DOMManager for element access and caching
 * - MemoryManager for event listener cleanup
 */
export class AuthModule {
  constructor(apiClient, domManager, memoryManager, callbacks = {}) {
    this.apiClient = apiClient
    this.domManager = domManager
    this.memoryManager = memoryManager
    
    // Callbacks for parent app integration
    this.onAuthStateChange = callbacks.onAuthStateChange || (() => {})
    this.onUserDataLoad = callbacks.onUserDataLoad || (() => {})
    this.showNotification = callbacks.showNotification || (() => {})
    this.renderApp = callbacks.renderApp || (() => {})
    
    // State
    this.currentUser = null
    this.isSignUpMode = false
    
    // Initialize
    this.checkAuth()
  }

  /**
   * Check authentication status on initialization
   */
  checkAuth() {
    const user = localStorage.getItem('user')
    if (user) {
      this.currentUser = JSON.parse(user)
      this.showAuthenticatedUI()
    } else {
      this.currentUser = null
      this.hideAuthenticatedUI()
    }
    
    // Notify parent of auth state
    this.onAuthStateChange(this.currentUser)
  }

  /**
   * Initialize authentication modal and event listeners
   */
  init() {
    // Only setup listeners once
    if (!this.listenersSetup) {
      this.setupAuthModal()
      this.listenersSetup = true
    }
  }

  /**
   * Show authenticated UI elements
   */
  showAuthenticatedUI() {
    const logoutBtn = this.domManager.get('logoutBtn')
    const logoutBtnDesktop = this.domManager.get('logoutBtnDesktop')
    const profileBtn = this.domManager.get('profileBtn')
    const profileBtnDesktop = this.domManager.get('profileBtnDesktop')
    
    if (logoutBtn) logoutBtn.style.display = 'block'
    if (logoutBtnDesktop) logoutBtnDesktop.style.display = 'flex'
    if (profileBtn) profileBtn.style.display = 'block'
    if (profileBtnDesktop) profileBtnDesktop.style.display = 'flex'
  }

  /**
   * Hide authenticated UI elements
   */
  hideAuthenticatedUI() {
    const logoutBtn = this.domManager.get('logoutBtn')
    const logoutBtnDesktop = this.domManager.get('logoutBtnDesktop')
    const profileBtn = this.domManager.get('profileBtn')
    const profileBtnDesktop = this.domManager.get('profileBtnDesktop')
    
    if (logoutBtn) logoutBtn.style.display = 'none'
    if (logoutBtnDesktop) logoutBtnDesktop.style.display = 'none'
    if (profileBtn) profileBtn.style.display = 'none'
    if (profileBtnDesktop) profileBtnDesktop.style.display = 'none'
  }

  /**
   * Show authentication modal
   */
  showAuthModal() {
    const modal = this.domManager.get('authModal')
    if (modal) {
      modal.style.display = 'flex'
      modal.classList.remove('hidden')
    }
  }

  /**
   * Hide authentication modal
   */
  hideAuthModal() {
    const modal = this.domManager.get('authModal')
    if (modal) {
      modal.style.display = 'none'
      modal.classList.add('hidden')
    }
  }

  /**
   * Setup authentication modal event listeners
   */
  setupAuthModal() {
    const closeBtn = this.domManager.get('closeAuthModal')
    const submitBtn = this.domManager.get('authSubmitBtn')
    const toggleBtn = this.domManager.get('toggleAuthMode')
    const emailInput = this.domManager.get('authEmail')
    const passwordInput = this.domManager.get('authPassword')
    const togglePasswordBtn = this.domManager.get('togglePasswordBtn')
    const eyeIcon = this.domManager.get('eyeIcon')
    const eyeOffIcon = this.domManager.get('eyeOffIcon')
    const authModal = this.domManager.get('authModal')

    // Close button
    if (closeBtn) {
      const closeBtnHandler = () => this.hideAuthModal()
      closeBtn.addEventListener('click', closeBtnHandler)
      this.memoryManager.registerListener(closeBtn, 'click', closeBtnHandler, 'auth')
    }

    // Submit button
    if (submitBtn) {
      const submitHandler = () => this.handleAuth()
      submitBtn.addEventListener('click', submitHandler)
      this.memoryManager.registerListener(submitBtn, 'click', submitHandler, 'auth')
    }

    // Toggle auth mode button
    if (toggleBtn) {
      const toggleHandler = () => this.toggleAuthMode()
      toggleBtn.addEventListener('click', toggleHandler)
      this.memoryManager.registerListener(toggleBtn, 'click', toggleHandler, 'auth')
    }

    // Email input - Enter key
    if (emailInput) {
      const emailHandler = (e) => {
        if (e.key === 'Enter') this.handleAuth()
      }
      emailInput.addEventListener('keypress', emailHandler)
      this.memoryManager.registerListener(emailInput, 'keypress', emailHandler, 'auth')
    }

    // Password input - Enter key
    if (passwordInput) {
      const passwordHandler = (e) => {
        if (e.key === 'Enter') this.handleAuth()
      }
      passwordInput.addEventListener('keypress', passwordHandler)
      this.memoryManager.registerListener(passwordInput, 'keypress', passwordHandler, 'auth')
    }

    // Toggle password visibility
    if (togglePasswordBtn && passwordInput && eyeIcon && eyeOffIcon) {
      const togglePasswordHandler = () => {
        const isPassword = passwordInput.type === 'password'
        passwordInput.type = isPassword ? 'text' : 'password'
        eyeIcon.classList.toggle('hidden', isPassword)
        eyeOffIcon.classList.toggle('hidden', !isPassword)
        togglePasswordBtn.title = isPassword ? 'Hide password' : 'Show password'
      }
      togglePasswordBtn.addEventListener('click', togglePasswordHandler)
      this.memoryManager.registerListener(togglePasswordBtn, 'click', togglePasswordHandler, 'auth')
    }

    // Close modal by clicking outside
    if (authModal) {
      const modalClickHandler = (e) => {
        if (e.target.id === 'authModal') {
          this.hideAuthModal()
        }
      }
      authModal.addEventListener('click', modalClickHandler)
      this.memoryManager.registerListener(authModal, 'click', modalClickHandler, 'auth')
    }
  }

  /**
   * Toggle between sign in and sign up modes
   */
  toggleAuthMode() {
    this.isSignUpMode = !this.isSignUpMode
    const title = this.domManager.get('authModalTitle')
    const submitBtn = this.domManager.get('authSubmitBtn')
    const toggleBtn = this.domManager.get('toggleAuthMode')
    const nameField = this.domManager.get('nameField')

    if (this.isSignUpMode) {
      if (title) title.textContent = 'Create Account'
      if (submitBtn) submitBtn.textContent = 'Sign Up'
      if (toggleBtn) toggleBtn.textContent = 'Already have an account? Sign In'
      if (nameField) nameField.classList.remove('hidden')
    } else {
      if (title) title.textContent = 'Sign In'
      if (submitBtn) submitBtn.textContent = 'Sign In'
      if (toggleBtn) toggleBtn.textContent = 'Create Account'
      if (nameField) nameField.classList.add('hidden')
    }
    this.clearAuthError()
  }

  /**
   * Handle authentication form submission
   */
  async handleAuth() {
    const emailInput = this.domManager.get('authEmail')
    const passwordInput = this.domManager.get('authPassword')
    const nameInput = this.domManager.get('authName')

    const email = emailInput?.value.trim() || ''
    const password = passwordInput?.value.trim() || ''
    const name = nameInput?.value.trim() || ''

    if (!email || !password) {
      this.showAuthError('Please fill in all fields')
      return
    }

    if (this.isSignUpMode && !name) {
      this.showAuthError('Please enter your name')
      return
    }

    this.setAuthLoading(true)

    try {
      if (this.isSignUpMode) {
        await this.signUp(email, password, name)
      } else {
        await this.signIn(email, password)
      }
    } catch (error) {
      this.showAuthError(error.message)
    } finally {
      this.setAuthLoading(false)
    }
  }

  /**
   * Sign up new user
   */
  async signUp(email, password, name) {
    const response = await fetch(`${this.apiClient.url}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiClient.key,
        'Authorization': `Bearer ${this.apiClient.key}`
      },
      body: JSON.stringify({
        email,
        password,
        data: { name }
      })
    })

    const data = await response.json()
    console.log('Sign up response:', data)

    if (!response.ok) {
      console.error('Sign up error:', data)
      throw new Error(data.msg || data.message || data.error_description || 'Sign up failed')
    }

    // Store auth tokens
    const token = data.session?.access_token || data.access_token
    const refreshToken = data.session?.refresh_token || data.refresh_token
    
    if (token) {
      localStorage.setItem('authToken', token)
      console.log('Auth token stored:', token.substring(0, 20) + '...')
    } else {
      console.error('No auth token in response:', data)
    }
    
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
      console.log('Refresh token stored')
    }

    // Store user profile in database
    if (data.user) {
      await this.storeUserProfile(data.user.id, email, name)
    }

    // Update current user
    this.currentUser = {
      id: data.user.id,
      email,
      name
    }
    localStorage.setItem('user', JSON.stringify(this.currentUser))

    // Update UI and load data
    this.hideAuthModal()
    this.showAuthenticatedUI()
    await this.onUserDataLoad()
    this.renderApp()
    this.showNotification('Account created successfully!', '✨', 2000)
    this.onAuthStateChange(this.currentUser)
  }

  /**
   * Sign in existing user
   */
  async signIn(email, password) {
    const response = await fetch(`${this.apiClient.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiClient.key,
        'Authorization': `Bearer ${this.apiClient.key}`
      },
      body: JSON.stringify({
        email,
        password
      })
    })

    const data = await response.json()
    console.log('Sign in response:', data)

    if (!response.ok) {
      console.error('Sign in error:', data)
      throw new Error(data.error_description || data.msg || data.message || 'Sign in failed')
    }

    // Store auth tokens
    const token = data.access_token || data.session?.access_token
    const refreshToken = data.refresh_token || data.session?.refresh_token
    
    if (token) {
      localStorage.setItem('authToken', token)
      console.log('Auth token stored:', token.substring(0, 20) + '...')
    } else {
      console.error('No auth token in response:', data)
    }
    
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
      console.log('Refresh token stored')
    }

    // Get user profile
    const profile = await this.getUserProfile(data.user.id)

    // Update current user
    this.currentUser = {
      id: data.user.id,
      email: data.user.email,
      name: profile?.name || email.split('@')[0]
    }
    localStorage.setItem('user', JSON.stringify(this.currentUser))

    // Update UI and load data
    this.hideAuthModal()
    this.showAuthenticatedUI()
    await this.onUserDataLoad()
    this.renderApp()
    this.showNotification(`Welcome back, ${this.currentUser.name}!`, '👋', 2000)
    this.onAuthStateChange(this.currentUser)
  }

  /**
   * Refresh authentication session
   */
  async refreshSession() {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      console.warn('Cannot refresh session: missing refresh token')
      return false
    }

    try {
      console.log('🔄 Attempting to refresh session...')
      const response = await fetch(`${this.apiClient.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiClient.key,
          'Authorization': `Bearer ${this.apiClient.key}`
        },
        body: JSON.stringify({
          refresh_token: refreshToken
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ Session refresh failed:', data)
        return false
      }

      // Update tokens
      const newToken = data.access_token || data.session?.access_token
      const newRefreshToken = data.refresh_token || data.session?.refresh_token

      if (newToken) {
        localStorage.setItem('authToken', newToken)
        console.log('✅ Auth token refreshed')
      }

      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken)
        console.log('✅ Refresh token updated')
      }

      return true
    } catch (error) {
      console.error('❌ Error refreshing session:', error)
      return false
    }
  }

  /**
   * Store user profile in database
   */
  async storeUserProfile(userId, email, name) {
    try {
      await this.apiClient.post('profiles', {
        id: userId,
        email,
        name,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error storing user profile:', error)
    }
  }

  /**
   * Get user profile from database
   */
  async getUserProfile(userId) {
    try {
      const data = await this.apiClient.get('profiles', { id: userId })
      return data[0] || null
    } catch (error) {
      console.error('Error getting user profile:', error)
      return null
    }
  }

  /**
   * Update user profile in database
   */
  async updateUserProfile(userId, updates) {
    try {
      const data = await this.apiClient.patch('profiles', userId, updates)
      return data[0] || null
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  }

  /**
   * Logout current user
   */
  logout() {
    localStorage.removeItem('user')
    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('todoTasks')
    localStorage.removeItem('todoReminders')
    
    this.currentUser = null
    this.hideAuthenticatedUI()
    this.renderApp()
    this.showNotification('Logged out successfully', '👋', 2000)
    this.onAuthStateChange(null)
  }

  /**
   * Show authentication error message
   */
  showAuthError(message) {
    const errorDiv = this.domManager.get('authError')
    if (errorDiv) {
      errorDiv.textContent = message
      errorDiv.classList.remove('hidden')
    }
  }

  /**
   * Clear authentication error message
   */
  clearAuthError() {
    const errorDiv = this.domManager.get('authError')
    if (errorDiv) {
      errorDiv.classList.add('hidden')
    }
  }

  /**
   * Set loading state for authentication form
   */
  setAuthLoading(loading) {
    const form = this.domManager.get('authForm')
    const loadingDiv = this.domManager.get('authLoading')

    if (loading) {
      if (form) form.classList.add('hidden')
      if (loadingDiv) loadingDiv.classList.remove('hidden')
    } else {
      if (form) form.classList.remove('hidden')
      if (loadingDiv) loadingDiv.classList.add('hidden')
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.currentUser !== null
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.memoryManager.cleanup('auth')
  }
}
