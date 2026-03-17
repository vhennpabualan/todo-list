import './style.css'

// Supabase client setup
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || ''

class TodoApp {
  constructor() {
    this.tasks = this.loadTasks()
    this.reminders = this.loadReminders()
    this.currentFilter = 'today'
    this.isDarkMode = this.loadTheme()
    this.aiMessages = []
    this.aiApiKey = import.meta.env.VITE_OPENROUTER_API_KEY || ''
    this.pendingDeleteId = null
    this.editingTaskId = null
    this.reminderCheckInterval = null
    this.notifiedReminders = new Set()
    this.currentUser = null
    this.isSignUpMode = false
    this.setupAuthModal()
    this.checkAuth()
  }

  checkAuth() {
    const user = localStorage.getItem('user')
    if (user) {
      this.currentUser = JSON.parse(user)
      this.showAuthenticatedUI()
    } else {
      this.currentUser = null
      this.hideAuthenticatedUI()
    }
    // Always initialize the app to allow browsing
    this.init()
  }

  showAuthenticatedUI() {
    // Show logout and profile buttons
    const logoutBtn = document.getElementById('logoutBtn')
    const logoutBtnDesktop = document.getElementById('logoutBtnDesktop')
    const profileBtn = document.getElementById('profileBtn')
    const profileBtnDesktop = document.getElementById('profileBtnDesktop')
    
    if (logoutBtn) logoutBtn.style.display = 'block'
    if (logoutBtnDesktop) logoutBtnDesktop.style.display = 'flex'
    if (profileBtn) profileBtn.style.display = 'block'
    if (profileBtnDesktop) profileBtnDesktop.style.display = 'flex'
  }

  hideAuthenticatedUI() {
    // Hide logout and profile buttons when not logged in
    const logoutBtn = document.getElementById('logoutBtn')
    const logoutBtnDesktop = document.getElementById('logoutBtnDesktop')
    const profileBtn = document.getElementById('profileBtn')
    const profileBtnDesktop = document.getElementById('profileBtnDesktop')
    
    if (logoutBtn) logoutBtn.style.display = 'none'
    if (logoutBtnDesktop) logoutBtnDesktop.style.display = 'none'
    if (profileBtn) profileBtn.style.display = 'none'
    if (profileBtnDesktop) profileBtnDesktop.style.display = 'none'
  }

  showAuthModal() {
    const modal = document.getElementById('authModal')
    if (modal) {
      modal.style.display = 'flex'
      modal.classList.remove('hidden')
    }
  }

  hideAuthModal() {
    const modal = document.getElementById('authModal')
    if (modal) {
      modal.style.display = 'none'
      modal.classList.add('hidden')
    }
  }

  setupAuthModal() {
    const closeBtn = document.getElementById('closeAuthModal')
    const submitBtn = document.getElementById('authSubmitBtn')
    const toggleBtn = document.getElementById('toggleAuthMode')
    const emailInput = document.getElementById('authEmail')
    const passwordInput = document.getElementById('authPassword')
    const togglePasswordBtn = document.getElementById('togglePasswordBtn')
    const eyeIcon = document.getElementById('eyeIcon')
    const eyeOffIcon = document.getElementById('eyeOffIcon')

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideAuthModal()
      })
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.handleAuth())
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleAuthMode())
    }

    if (emailInput) {
      emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleAuth()
      })
    }

    if (passwordInput) {
      passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleAuth()
      })
    }

    // Toggle password visibility
    if (togglePasswordBtn && passwordInput && eyeIcon && eyeOffIcon) {
      togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password'
        passwordInput.type = isPassword ? 'text' : 'password'
        eyeIcon.classList.toggle('hidden', isPassword)
        eyeOffIcon.classList.toggle('hidden', !isPassword)
        togglePasswordBtn.title = isPassword ? 'Hide password' : 'Show password'
      })
    }

    // Allow closing modal by clicking outside
    const authModal = document.getElementById('authModal')
    if (authModal) {
      authModal.addEventListener('click', (e) => {
        if (e.target.id === 'authModal') {
          this.hideAuthModal()
        }
      })
    }
  }

  toggleAuthMode() {
    this.isSignUpMode = !this.isSignUpMode
    const title = document.getElementById('authModalTitle')
    const submitBtn = document.getElementById('authSubmitBtn')
    const toggleBtn = document.getElementById('toggleAuthMode')
    const nameField = document.getElementById('nameField')

    if (this.isSignUpMode) {
      title.textContent = 'Create Account'
      submitBtn.textContent = 'Sign Up'
      toggleBtn.textContent = 'Already have an account? Sign In'
      nameField.classList.remove('hidden')
    } else {
      title.textContent = 'Sign In'
      submitBtn.textContent = 'Sign In'
      toggleBtn.textContent = 'Create Account'
      nameField.classList.add('hidden')
    }
    this.clearAuthError()
  }

  async handleAuth() {
    const email = document.getElementById('authEmail').value.trim()
    const password = document.getElementById('authPassword').value.trim()
    const name = document.getElementById('authName').value.trim()

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

  async signUp(email, password, name) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Supabase credentials not configured')
    }

    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        email,
        password,
        data: {
          name: name
        }
      })
    })

    const data = await response.json()
    console.log('Sign up response:', data)

    if (!response.ok) {
      console.error('Sign up error:', data)
      throw new Error(data.msg || data.message || data.error_description || 'Sign up failed')
    }

    // Store auth token
    const token = data.session?.access_token || data.access_token
    if (token) {
      localStorage.setItem('authToken', token)
      console.log('Auth token stored:', token.substring(0, 20) + '...')
    } else {
      console.error('No auth token in response:', data)
    }

    // Store user in database
    if (data.user) {
      await this.storeUserProfile(data.user.id, email, name)
    }

    this.currentUser = {
      id: data.user.id,
      email,
      name
    }
    localStorage.setItem('user', JSON.stringify(this.currentUser))

    this.hideAuthModal()
    this.showAuthenticatedUI()
    await this.loadUserData()
    this.render()
    this.showNotification('Account created successfully!', '✨', 2000)
  }

  async signIn(email, password) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Supabase credentials not configured')
    }

    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
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

    // Store auth token
    const token = data.access_token || data.session?.access_token
    if (token) {
      localStorage.setItem('authToken', token)
      console.log('Auth token stored:', token.substring(0, 20) + '...')
    } else {
      console.error('No auth token in response:', data)
    }

    // Get user profile
    const profile = await this.getUserProfile(data.user.id)

    this.currentUser = {
      id: data.user.id,
      email: data.user.email,
      name: profile?.name || email.split('@')[0]
    }
    localStorage.setItem('user', JSON.stringify(this.currentUser))

    this.hideAuthModal()
    this.showAuthenticatedUI()
    await this.loadUserData()
    this.render()
    this.showNotification(`Welcome back, ${this.currentUser.name}!`, '👋', 2000)
  }

  async storeUserProfile(userId, email, name) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return

    const token = localStorage.getItem('authToken')
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        id: userId,
        email,
        name,
        created_at: new Date().toISOString()
      })
    })
  }

  async getUserProfile(userId) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return null

    const token = localStorage.getItem('authToken')
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`
      }
    })

    const data = await response.json()
    return data[0] || null
  }

  async updateUserProfile(userId, updates) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return null

    const token = localStorage.getItem('authToken')
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      throw new Error('Failed to update profile')
    }

    const data = await response.json()
    return data[0] || null
  }

  logout() {
    localStorage.removeItem('user')
    localStorage.removeItem('authToken')
    localStorage.removeItem('todoTasks')
    localStorage.removeItem('todoReminders')
    this.currentUser = null
    this.tasks = []
    this.reminders = []
    this.hideAuthenticatedUI()
    this.showAuthModal()
  }

  showAuthError(message) {
    const errorDiv = document.getElementById('authError')
    errorDiv.textContent = message
    errorDiv.classList.remove('hidden')
  }

  clearAuthError() {
    const errorDiv = document.getElementById('authError')
    errorDiv.classList.add('hidden')
  }

  setAuthLoading(loading) {
    const form = document.getElementById('authForm')
    const loadingDiv = document.getElementById('authLoading')

    if (loading) {
      form.classList.add('hidden')
      loadingDiv.classList.remove('hidden')
    } else {
      form.classList.remove('hidden')
      loadingDiv.classList.add('hidden')
    }
  }

  init() {
    this.applyTheme()
    this.setupThemeToggle()
    this.setupMobileMenu()
    this.setupFloatingTaskModal()
    this.setupDeleteModal()
    this.setupNotifications()
    this.setupAIAssistant()
    this.setupRemindersPanel()
    this.setupOutsideClickHandler()
    this.setupEventListeners()
    this.setupReminderSystem()
    this.setupLogout()
    this.requestNotificationPermission()
    this.updateDate()
    this.loadUserData()
    this.render()
    this.generateAIGreeting()
  }

  async loadUserData() {
    if (this.currentUser) {
      this.tasks = await this.loadTasksFromSupabase()
      this.reminders = await this.loadRemindersFromSupabase()
    } else {
      // Load demo tasks for non-authenticated users
      this.tasks = this.getDefaultTasks()
      this.reminders = []
    }
  }

  setupLogout() {
    // Mobile logout button
    const logoutBtn = document.getElementById('logoutBtn')
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.showLogoutModal())
    }

    // Desktop logout button
    const logoutBtnDesktop = document.getElementById('logoutBtnDesktop')
    if (logoutBtnDesktop) {
      logoutBtnDesktop.addEventListener('click', () => this.showLogoutModal())
    }

    // Logout modal buttons
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn')
    if (cancelLogoutBtn) {
      cancelLogoutBtn.addEventListener('click', () => this.closeLogoutModal())
    }

    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn')
    if (confirmLogoutBtn) {
      confirmLogoutBtn.addEventListener('click', () => {
        this.closeLogoutModal()
        this.logout()
      })
    }

    const logoutModal = document.getElementById('logoutModal')
    if (logoutModal) {
      logoutModal.addEventListener('click', (e) => {
        if (e.target.id === 'logoutModal') this.closeLogoutModal()
      })
    }

    // Mobile profile button
    const profileBtn = document.getElementById('profileBtn')
    if (profileBtn) {
      profileBtn.addEventListener('click', () => this.openProfileModal())
    }

    // Desktop profile button
    const profileBtnDesktop = document.getElementById('profileBtnDesktop')
    if (profileBtnDesktop) {
      profileBtnDesktop.addEventListener('click', () => this.openProfileModal())
    }

    const closeProfileBtn = document.getElementById('closeProfileModal')
    if (closeProfileBtn) {
      closeProfileBtn.addEventListener('click', () => this.closeProfileModal())
    }

    const saveProfileBtn = document.getElementById('saveProfileBtn')
    if (saveProfileBtn) {
      saveProfileBtn.addEventListener('click', () => this.saveProfileChanges())
    }

    const profileModal = document.getElementById('profileModal')
    if (profileModal) {
      profileModal.addEventListener('click', (e) => {
        if (e.target.id === 'profileModal') this.closeProfileModal()
      })
    }
  }

  showLogoutModal() {
    const modal = document.getElementById('logoutModal')
    if (modal) {
      modal.classList.remove('hidden')
      modal.style.display = 'flex'
    }
  }

  closeLogoutModal() {
    const modal = document.getElementById('logoutModal')
    if (modal) {
      modal.classList.add('hidden')
      modal.style.display = 'none'
    }
  }

  openProfileModal() {
    const modal = document.getElementById('profileModal')
    if (!modal) return

    document.getElementById('profileName').value = this.currentUser.name || ''
    document.getElementById('profileEmail').textContent = this.currentUser.email
    modal.classList.remove('hidden')
    modal.style.display = 'flex'
  }

  closeProfileModal() {
    const modal = document.getElementById('profileModal')
    if (modal) {
      modal.classList.add('hidden')
      modal.style.display = 'none'
    }
  }

  async saveProfileChanges() {
    const newName = document.getElementById('profileName').value.trim()

    if (!newName) {
      this.showNotification('Name cannot be empty', '⚠️', 3000)
      return
    }

    try {
      await this.updateUserProfile(this.currentUser.id, { name: newName })
      this.currentUser.name = newName
      localStorage.setItem('user', JSON.stringify(this.currentUser))
      this.showNotification('Profile updated successfully!', '✨', 2000)
      this.closeProfileModal()
    } catch (error) {
      this.showNotification('Failed to update profile: ' + error.message, '❌', 3000)
    }
  }

  // Theme Management
  loadTheme() {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  applyTheme() {
    const html = document.documentElement
    if (this.isDarkMode) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
    this.updateThemeLabel()
  }

  setupThemeToggle() {
    const toggles = [
      document.getElementById('themeToggle'),
      document.getElementById('themeToggleDesktop')
    ]

    toggles.forEach(toggle => {
      if (toggle) {
        toggle.addEventListener('click', () => this.toggleTheme())
      }
    })
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light')
    this.applyTheme()
  }

  updateThemeLabel() {
    const label = document.getElementById('themeLabel')
    if (label) {
      label.textContent = this.isDarkMode ? 'Light Mode' : 'Dark Mode'
    }
  }

  // Delete Modal - INDEPENDENT
  setupDeleteModal() {
    const deleteModal = document.getElementById('deleteModal')
    const cancelBtn = document.getElementById('cancelDeleteBtn')
    const confirmBtn = document.getElementById('confirmDeleteBtn')

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.pendingDeleteId = null
        deleteModal.classList.add('hidden')
        deleteModal.style.display = 'none'
      })
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (this.pendingDeleteId) {
          this.deleteTask(this.pendingDeleteId)
          this.pendingDeleteId = null
          deleteModal.classList.add('hidden')
          deleteModal.style.display = 'none'
          this.showNotification('Task deleted successfully', '🗑️')
        }
      })
    }

    if (deleteModal) {
      deleteModal.addEventListener('click', (e) => {
        if (e.target.id === 'deleteModal') {
          this.pendingDeleteId = null
          deleteModal.classList.add('hidden')
          deleteModal.style.display = 'none'
        }
      })
    }

    // Reminder modal setup
    const reminderModal = document.getElementById('reminderModal')
    const closeReminderBtn = document.getElementById('closeReminderModal')
    const createReminderBtn = document.getElementById('createReminderBtn')

    if (closeReminderBtn) {
      closeReminderBtn.addEventListener('click', () => {
        reminderModal.classList.add('hidden')
        reminderModal.style.display = 'none'
        this.clearReminderForm()
      })
    }

    if (createReminderBtn) {
      createReminderBtn.addEventListener('click', () => this.createReminderFromModal())
    }

    if (reminderModal) {
      reminderModal.addEventListener('click', (e) => {
        if (e.target.id === 'reminderModal') {
          reminderModal.classList.add('hidden')
          reminderModal.style.display = 'none'
          this.clearReminderForm()
        }
      })
    }
  }

  showDeleteConfirm(taskId) {
    if (!this.currentUser) {
      this.showAuthModal()
      this.showNotification('Please log in to delete tasks', '🔐', 3000)
      return
    }
    this.pendingDeleteId = taskId
    const deleteModal = document.getElementById('deleteModal')
    deleteModal.classList.remove('hidden')
    deleteModal.style.display = 'flex'
    deleteModal.style.zIndex = '60'
  }

  // Notifications
  setupNotifications() {
    const closeBtn = document.getElementById('closeNotification')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideNotification())
    }
  }

  showNotification(message, icon = '✓', duration = 3000) {
    const toast = document.getElementById('notificationToast')
    const text = document.getElementById('notificationText')
    const iconEl = document.getElementById('notificationIcon')

    if (text) text.textContent = message
    if (iconEl) iconEl.textContent = icon
    if (toast) toast.classList.remove('hidden')

    if (duration > 0) {
      setTimeout(() => this.hideNotification(), duration)
    }
  }

  hideNotification() {
    const toast = document.getElementById('notificationToast')
    if (toast) toast.classList.add('hidden')
  }

  // Mobile Menu
  setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn')
    const desktopMenuBtn = document.getElementById('desktopMenuBtn')
    const sidebar = document.getElementById('sidebar')
    const closeSidebarBtn = document.getElementById('closeSidebarBtn')
    const closeSidebarBtnMobile = document.getElementById('closeSidebarBtnMobile')
    const mobileOverlay = document.getElementById('mobileOverlay')

    // Mobile menu button
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.remove('hidden')
        mobileOverlay.classList.remove('hidden')
      })
    }

    // Desktop menu button (hamburger)
    if (desktopMenuBtn) {
      desktopMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('hidden')
      })
    }

    // Close sidebar button (desktop)
    if (closeSidebarBtn) {
      closeSidebarBtn.addEventListener('click', () => {
        sidebar.classList.add('hidden')
      })
    }

    // Close sidebar button (mobile)
    if (closeSidebarBtnMobile) {
      closeSidebarBtnMobile.addEventListener('click', () => {
        sidebar.classList.add('hidden')
        mobileOverlay.classList.add('hidden')
      })
    }

    // Mobile overlay click
    if (mobileOverlay) {
      mobileOverlay.addEventListener('click', () => {
        sidebar.classList.add('hidden')
        mobileOverlay.classList.add('hidden')
      })
    }

    // Auto-close on mobile when clicking nav items
    sidebar.querySelectorAll('button, a').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth < 1024) {
          sidebar.classList.add('hidden')
          mobileOverlay.classList.add('hidden')
        }
      })
    })
  }

  // Floating Task Modal
  setupFloatingTaskModal() {
    const floatingBtn = document.getElementById('floatingAddBtn')
    const modal = document.getElementById('taskModal')
    const closeBtn = document.getElementById('closeTaskModal')
    const addBtn = document.getElementById('modalAddTaskBtn')
    const input = document.getElementById('modalTaskInput')

    if (floatingBtn) {
      floatingBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        document.getElementById('aiPanel').classList.add('hidden')
        document.getElementById('aiPanel').style.display = 'none'
        document.getElementById('aiOverlay').classList.add('hidden')
        this.openTaskModal()
      })
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.closeTaskModal()
      })
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => this.addTaskFromModal())
    }

    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) this.addTaskFromModal()
      })
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        // Only close if clicking the background, not the modal content
        if (e.target.id === 'taskModal') this.closeTaskModal()
      })
    }
  }

  openTaskModal() {
    const modal = document.getElementById('taskModal')
    if (modal) {
      modal.classList.remove('hidden')
      modal.style.display = 'flex'
      document.getElementById('modalTaskInput').focus()
    }
  }

  closeTaskModal() {
    const modal = document.getElementById('taskModal')
    if (modal) {
      modal.classList.add('hidden')
      modal.style.display = 'none'
      this.clearModalForm()
    }
  }

  clearModalForm() {
    document.getElementById('modalTaskInput').value = ''
    document.getElementById('modalTaskNotes').value = ''
    document.getElementById('modalProjectSelect').value = 'personal'
    document.getElementById('modalPrioritySelect').value = 'medium'
    document.getElementById('modalDueDateInput').value = ''
    
    // Reset modal header and button
    document.querySelector('#taskModal h2').textContent = 'Create New Task'
    document.getElementById('modalAddTaskBtn').textContent = 'Create Task'
    this.editingTaskId = null
  }

  addTaskFromModal() {
    const title = document.getElementById('modalTaskInput').value.trim()
    const notes = document.getElementById('modalTaskNotes').value.trim()
    const project = document.getElementById('modalProjectSelect').value
    const priority = document.getElementById('modalPrioritySelect').value
    const dueDate = document.getElementById('modalDueDateInput').value

    if (!title) {
      this.showNotification('Please enter a task title', '⚠️', 3000)
      return
    }

    // Require authentication to save tasks
    if (!this.currentUser) {
      this.closeTaskModal()
      this.showAuthModal()
      this.showNotification('Please log in to save tasks', '🔐', 3000)
      return
    }

    if (this.editingTaskId) {
      // Update existing task
      const task = this.tasks.find(t => t.id === this.editingTaskId)
      if (task) {
        task.title = title
        task.notes = notes
        task.project = project
        task.priority = priority
        task.dueDate = dueDate || task.dueDate
      }
      this.editingTaskId = null
      this.showNotification('Task updated successfully!', '✏️', 2000)
    } else {
      // Create new task
      const task = {
        id: Date.now(),
        title,
        notes,
        completed: false,
        priority,
        project,
        dueDate: dueDate || new Date().toISOString().split('T')[0],
        createdDate: new Date().toISOString().split('T')[0],
        completedDate: null,
        labels: []
      }
      this.tasks.unshift(task)
      this.showNotification('Task created successfully!', '✨', 2000)
    }

    this.saveTasks()
    this.closeTaskModal()
    this.render()
  }

  editTask(id) {
    if (!this.currentUser) {
      this.showAuthModal()
      this.showNotification('Please log in to edit tasks', '🔐', 3000)
      return
    }
    const task = this.tasks.find(t => t.id === id)
    if (task) {
      this.editingTaskId = id
      document.getElementById('modalTaskInput').value = task.title
      document.getElementById('modalTaskNotes').value = task.notes || ''
      document.getElementById('modalProjectSelect').value = task.project
      document.getElementById('modalPrioritySelect').value = task.priority
      document.getElementById('modalDueDateInput').value = task.dueDate
      
      // Update modal header and button
      document.querySelector('#taskModal h2').textContent = 'Edit Task'
      document.getElementById('modalAddTaskBtn').textContent = 'Update Task'
      
      this.openTaskModal()
    }
  }

  // AI Assistant
  setupAIAssistant() {
    const openAIBtn = document.getElementById('openAIBtn')
    const closeAIBtn = document.getElementById('closeAIBtn')
    const clearChatBtn = document.getElementById('clearChatBtn')
    const clearChatBtnDesktop = document.getElementById('clearChatBtnDesktop')
    const aiPanel = document.getElementById('aiPanel')
    const aiOverlay = document.getElementById('aiOverlay')
    const aiSendBtn = document.getElementById('aiSendBtn')
    const aiInput = document.getElementById('aiInput')

    if (openAIBtn) {
      openAIBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        document.getElementById('taskModal').classList.add('hidden')
        document.getElementById('taskModal').style.display = 'none'
        aiPanel.classList.remove('hidden')
        aiPanel.style.display = 'flex'
        if (window.innerWidth < 1024) {
          aiOverlay.classList.remove('hidden')
        }
        // Shift floating button to avoid overlap on desktop
        document.getElementById('floatingAddBtn').classList.add('ai-panel-open')
        this.checkApiKey()
        this.scrollAIToBottom()
      })
    }

    if (closeAIBtn) {
      closeAIBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        aiPanel.classList.add('hidden')
        aiPanel.style.display = 'none'
        aiOverlay.classList.add('hidden')
        // Reset floating button position
        document.getElementById('floatingAddBtn').classList.remove('ai-panel-open')
      })
    }

    if (clearChatBtn) {
      clearChatBtn.addEventListener('click', () => this.clearAIChat())
    }

    if (clearChatBtnDesktop) {
      clearChatBtnDesktop.addEventListener('click', () => this.clearAIChat())
    }

    if (aiOverlay) {
      aiOverlay.addEventListener('click', (e) => {
        if (e.target === aiOverlay) {
          aiPanel.classList.add('hidden')
          aiPanel.style.display = 'none'
          aiOverlay.classList.add('hidden')
          // Reset floating button position
          document.getElementById('floatingAddBtn').classList.remove('ai-panel-open')
        }
      })
    }

    if (aiSendBtn && aiInput) {
      aiSendBtn.addEventListener('click', () => this.sendAIMessage())
      aiInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendAIMessage()
      })
    }
  }

  // Close AI panel when clicking outside on main content
  setupOutsideClickHandler() {
    const app = document.getElementById('app')
    const aiPanel = document.getElementById('aiPanel')
    const aiOverlay = document.getElementById('aiOverlay')

    if (app) {
      app.addEventListener('click', (e) => {
        // Check if AI panel is open and click is outside the panel
        if (!aiPanel.classList.contains('hidden')) {
          const isClickInsidePanel = aiPanel.contains(e.target)
          const isClickOnOpenBtn = e.target.closest('#openAIBtn')
          const isClickOnFloatingBtn = e.target.closest('#floatingAddBtn')
          const isClickOnTaskModal = e.target.closest('#taskModal')
          const isClickOnDeleteModal = e.target.closest('#deleteModal')

          // Close panel if click is outside and not on buttons that open other UI
          if (!isClickInsidePanel && !isClickOnOpenBtn && !isClickOnFloatingBtn && !isClickOnTaskModal && !isClickOnDeleteModal) {
            aiPanel.classList.add('hidden')
            aiPanel.style.display = 'none'
            aiOverlay.classList.add('hidden')
            document.getElementById('floatingAddBtn').classList.remove('ai-panel-open')
          }
        }
      })
    }
  }

  setupRemindersPanel() {
    const addReminderBtn = document.getElementById('addReminderBtn')
    const closeRemindersBtn = document.getElementById('closeRemindersPanel')
    const remindersPanel = document.getElementById('remindersPanel')
    const reminderModal = document.getElementById('reminderModal')

    if (addReminderBtn) {
      addReminderBtn.addEventListener('click', () => {
        reminderModal.classList.remove('hidden')
        reminderModal.style.display = 'flex'
        document.getElementById('reminderTitleInput').focus()
      })
    }

    if (closeRemindersBtn) {
      closeRemindersBtn.addEventListener('click', () => {
        remindersPanel.classList.add('hidden')
        remindersPanel.style.display = 'none'
      })
    }

    this.renderReminders()
  }

  openRemindersPanel() {
    const remindersPanel = document.getElementById('remindersPanel')
    remindersPanel.classList.remove('hidden')
    remindersPanel.style.display = 'flex'
    this.renderReminders()
  }

  clearReminderForm() {
    document.getElementById('reminderTitleInput').value = ''
    document.getElementById('reminderDateInput').value = ''
    document.getElementById('reminderTimeInput').value = ''
  }

  createReminderFromModal() {
    const title = document.getElementById('reminderTitleInput').value.trim()
    const date = document.getElementById('reminderDateInput').value
    const time = document.getElementById('reminderTimeInput').value

    if (!title || !date || !time) {
      this.showNotification('Please fill in all fields', '⚠️', 3000)
      return
    }

    const reminderDateTime = `${date}T${time}`
    this.createReminder(title, reminderDateTime)
    this.clearReminderForm()
    
    const reminderModal = document.getElementById('reminderModal')
    reminderModal.classList.add('hidden')
    reminderModal.style.display = 'none'
    
    this.renderReminders()
  }

  renderReminders() {
    const remindersList = document.getElementById('remindersList')
    if (!remindersList) return

    const reminders = this.getUpcomingReminders()

    if (reminders.length === 0) {
      remindersList.innerHTML = `
        <div class="text-center py-8">
          <p class="text-3xl mb-2">📭</p>
          <p class="text-sm text-light-600 dark:text-dark-400">No upcoming reminders</p>
        </div>
      `
    } else {
      remindersList.innerHTML = reminders.map(reminder => {
        const reminderDate = new Date(reminder.reminderDateTime)
        const now = new Date()
        const timeDiff = reminderDate - now
        const hoursLeft = Math.ceil(timeDiff / (1000 * 60 * 60))
        const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24))

        let timeDisplay = ''
        if (daysLeft > 0) {
          timeDisplay = `${daysLeft}d ${hoursLeft % 24}h`
        } else {
          timeDisplay = `${hoursLeft}h`
        }

        return `
          <div class="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm text-light-900 dark:text-white truncate">${reminder.title}</p>
                <p class="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  ${reminderDate.toLocaleString()} (${timeDisplay} left)
                </p>
              </div>
              <div class="flex gap-1 flex-shrink-0">
                <button class="complete-reminder-btn p-1 hover:bg-orange-200 dark:hover:bg-orange-800 rounded transition text-sm" data-id="${reminder.id}" title="Complete">✓</button>
                <button class="delete-reminder-btn p-1 hover:bg-red-200 dark:hover:bg-red-800 rounded transition text-sm" data-id="${reminder.id}" title="Delete">✕</button>
              </div>
            </div>
          </div>
        `
      }).join('')
    }

    this.attachReminderListeners()
  }

  attachReminderListeners() {
    document.querySelectorAll('.complete-reminder-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.completeReminder(parseInt(e.currentTarget.dataset.id))
        this.renderReminders()
      })
    })

    document.querySelectorAll('.delete-reminder-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.deleteReminder(parseInt(e.currentTarget.dataset.id))
        this.renderReminders()
      })
    })
  }

  // Close AI panel when clicking outside on main content
  setupOutsideClickHandler() {
    const app = document.getElementById('app')
    const aiPanel = document.getElementById('aiPanel')
    const aiOverlay = document.getElementById('aiOverlay')
    const remindersPanel = document.getElementById('remindersPanel')

    if (app) {
      app.addEventListener('click', (e) => {
        // Check if AI panel is open and click is outside the panel
        if (!aiPanel.classList.contains('hidden')) {
          const isClickInsidePanel = aiPanel.contains(e.target)
          const isClickOnOpenBtn = e.target.closest('#openAIBtn')
          const isClickOnFloatingBtn = e.target.closest('#floatingAddBtn')
          const isClickOnTaskModal = e.target.closest('#taskModal')
          const isClickOnDeleteModal = e.target.closest('#deleteModal')
          const isClickOnRemindersPanel = e.target.closest('#remindersPanel')

          // Close panel if click is outside and not on buttons that open other UI
          if (!isClickInsidePanel && !isClickOnOpenBtn && !isClickOnFloatingBtn && !isClickOnTaskModal && !isClickOnDeleteModal && !isClickOnRemindersPanel) {
            aiPanel.classList.add('hidden')
            aiPanel.style.display = 'none'
            aiOverlay.classList.add('hidden')
            document.getElementById('floatingAddBtn').classList.remove('ai-panel-open')
          }
        }

        // Check if reminders panel is open and click is outside the panel
        if (!remindersPanel.classList.contains('hidden')) {
          const isClickInsideReminders = remindersPanel.contains(e.target)
          const isClickOnRemindersBtn = e.target.closest('#openRemindersBtn')
          const isClickOnReminderModal = e.target.closest('#reminderModal')

          // Close panel if click is outside and not on buttons that open other UI
          if (!isClickInsideReminders && !isClickOnRemindersBtn && !isClickOnReminderModal) {
            remindersPanel.classList.add('hidden')
            remindersPanel.style.display = 'none'
          }
        }
      })
    }
  }

  checkApiKey() {
    if (!this.aiApiKey) {
      this.addAIMessage('🔑 No API key found. Please add VITE_OPENROUTER_API_KEY to your .env file and restart the dev server.', 'assistant')
      this.addAIMessage('Or type your API key here to use it temporarily:', 'assistant')
      return
    }
    this.addAIMessage('✅ Ready to help! Ask me anything about your tasks.', 'assistant')
  }

  async testApiKey() {
    if (this.aiApiKey === 'demo') return

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.aiApiKey}`,
          'HTTP-Referer': window.location.href,
          'X-Title': 'TaskFlow'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: 'Say "Hello" in one word.'
            }
          ],
          max_tokens: 50
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('API Test Failed:', data)
        this.aiApiKey = ''
        this.addAIMessage(`❌ Connection failed: ${data.error?.message || 'Invalid API key'}`, 'assistant')
        return false
      }

      this.addAIMessage('✅ Connected! I\'m ready to help you stay productive.', 'assistant')
      return true
    } catch (error) {
      console.error('API Test Error:', error)
      this.addAIMessage(`❌ Error testing connection: ${error.message}`, 'assistant')
      return false
    }
  }

  generateAIGreeting() {
    const hour = new Date().getHours()
    let greeting = '👋 Good morning!'
    if (hour >= 12 && hour < 18) greeting = '👋 Good afternoon!'
    if (hour >= 18) greeting = '👋 Good evening!'

    if (!this.currentUser) {
      this.addAIMessage(`${greeting} Welcome to TaskFlow! You're viewing in demo mode. Log in to save your tasks and get personalized AI assistance. 🚀`, 'assistant')
      return
    }

    const activeTasks = this.tasks.filter(t => !t.completed).length
    const completedToday = this.tasks.filter(t => t.completed && this.isToday(t.completedDate)).length

    let message = `${greeting} You have ${activeTasks} active tasks. `
    if (completedToday > 0) {
      message += `Great job completing ${completedToday} tasks today! Keep it up! 🚀`
    } else {
      message += `Let's make today productive! 💪`
    }

    this.addAIMessage(message, 'assistant')
  }

  async sendAIMessage() {
    const input = document.getElementById('aiInput')
    const message = input.value.trim()

    if (!message) return

    // Require authentication for AI usage
    if (!this.currentUser) {
      this.addAIMessage('Please log in to use the AI assistant', 'assistant')
      setTimeout(() => {
        this.showAuthModal()
      }, 500)
      input.value = ''
      return
    }

    this.addAIMessage(message, 'user')
    input.value = ''

    // Check if user is asking to create/add a task
    if (this.isTaskCreationRequest(message)) {
      await this.handleAITaskCreation(message)
      return
    }

    if (!this.aiApiKey) {
      this.addAIMessage('❌ API key not configured. Please add VITE_OPENROUTER_API_KEY to your .env file and restart the dev server.', 'assistant')
      return
    }

    const loadingMsg = document.createElement('div')
    loadingMsg.className = 'ai-message assistant'
    loadingMsg.innerHTML = '<p class="text-sm">🤔 Thinking...</p>'
    document.getElementById('aiMessages').appendChild(loadingMsg)

    try {
      const response = await this.callOpenRouterAPI(message)
      loadingMsg.remove()
      this.addAIMessage(response, 'assistant')
    } catch (error) {
      loadingMsg.remove()
      this.addAIMessage(`❌ Error: ${error.message}`, 'assistant')
    }
  }

  isTaskCreationRequest(message) {
    const keywords = ['add task', 'create task', 'new task', 'add a task', 'create a task', 'add to my tasks', 'remind me to', 'i need to', 'i should', 'todo:', 'task:']
    const lowerMessage = message.toLowerCase()
    return keywords.some(keyword => lowerMessage.includes(keyword))
  }

  async handleAITaskCreation(message) {
    const loadingMsg = document.createElement('div')
    loadingMsg.className = 'ai-message assistant'
    loadingMsg.innerHTML = '<p class="text-sm">🤔 Creating task...</p>'
    document.getElementById('aiMessages').appendChild(loadingMsg)

    try {
      const taskData = await this.parseTaskFromMessage(message)
      
      if (!taskData.title) {
        loadingMsg.remove()
        this.addAIMessage('❌ I couldn\'t understand what task to create. Please be more specific!', 'assistant')
        return
      }

      // Create the task
      const task = {
        id: Date.now(),
        title: taskData.title,
        notes: taskData.notes || '',
        completed: false,
        priority: taskData.priority || 'medium',
        project: taskData.project || 'personal',
        dueDate: taskData.dueDate || new Date().toISOString().split('T')[0],
        createdDate: new Date().toISOString().split('T')[0],
        completedDate: null,
        labels: taskData.labels || []
      }

      this.tasks.unshift(task)
      this.saveTasks()
      this.render()

      loadingMsg.remove()
      this.addAIMessage(`✅ Task created: "${task.title}" (${task.priority} priority, ${task.project} project)`, 'assistant')
    } catch (error) {
      loadingMsg.remove()
      this.addAIMessage(`❌ Error creating task: ${error.message}`, 'assistant')
    }
  }

  async parseTaskFromMessage(message) {
    if (!this.aiApiKey) {
      return this.parseTaskLocally(message)
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.aiApiKey}`,
          'HTTP-Referer': window.location.href,
          'X-Title': 'TaskFlow'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `Extract task details from the user message. Return a JSON object with:
- title (string, required): The task title
- notes (string, optional): Additional notes
- priority (string): 'high', 'medium', or 'low' (default: 'medium')
- project (string): 'work', 'personal', or 'learning' (default: 'personal')
- dueDate (string, optional): YYYY-MM-DD format
- labels (array, optional): Array of label strings

Only return valid JSON, no other text.`
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 200,
          temperature: 0.3
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to parse task')
      }

      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('No response from API')

      const taskData = JSON.parse(content)
      return taskData
    } catch (error) {
      console.error('Task parsing error:', error)
      return this.parseTaskLocally(message)
    }
  }

  parseTaskLocally(message) {
    // Simple local parsing as fallback
    const lowerMessage = message.toLowerCase()
    
    // Extract title by removing common keywords
    let title = message
      .replace(/^(add|create|new|add a|create a|remind me to|i need to|i should|todo:|task:)\s*/i, '')
      .trim()

    // Detect priority
    let priority = 'medium'
    if (lowerMessage.includes('urgent') || lowerMessage.includes('asap') || lowerMessage.includes('high priority')) {
      priority = 'high'
    } else if (lowerMessage.includes('low priority') || lowerMessage.includes('whenever')) {
      priority = 'low'
    }

    // Detect project
    let project = 'personal'
    if (lowerMessage.includes('work') || lowerMessage.includes('project') || lowerMessage.includes('meeting')) {
      project = 'work'
    } else if (lowerMessage.includes('learn') || lowerMessage.includes('study') || lowerMessage.includes('course')) {
      project = 'learning'
    }

    return {
      title,
      priority,
      project,
      notes: '',
      labels: []
    }
  }

  async callOpenRouterAPI(message) {
    if (this.aiApiKey === 'demo') {
      const responses = [
        '💡 Great task! Keep up the momentum.',
        '🎯 Focus on one task at a time for better results.',
        '⚡ You\'re doing amazing! Keep going!',
        '📊 Break big tasks into smaller steps.',
        '🚀 Consistency is key to productivity!'
      ]
      return responses[Math.floor(Math.random() * responses.length)]
    }

    const activeTasks = this.tasks.filter(t => !t.completed).length
    const completedTasks = this.tasks.filter(t => t.completed).length
    const context = `User has ${activeTasks} active tasks and ${completedTasks} completed tasks.`

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.aiApiKey}`,
          'HTTP-Referer': window.location.href,
          'X-Title': 'TaskFlow'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a helpful productivity assistant for a todo app called TaskFlow. ${context} Be concise, encouraging, and helpful. Keep responses under 100 words.`
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('API Error:', data)
        throw new Error(data.error?.message || 'API request failed')
      }

      if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        return data.choices[0].message.content
      }
      
      throw new Error('Invalid API response format')
    } catch (error) {
      console.error('API Error Details:', error)
      throw error
    }
  }

  addAIMessage(message, sender) {
    const messagesContainer = document.getElementById('aiMessages')
    const messageEl = document.createElement('div')
    messageEl.className = `ai-message ${sender}`
    messageEl.innerHTML = `<p class="text-sm">${message}</p>`
    messagesContainer.appendChild(messageEl)
    this.scrollAIToBottom()
  }

  scrollAIToBottom() {
    const messagesContainer = document.querySelector('.flex-1.overflow-y-auto')
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight
      }, 0)
    }
  }

  clearAIChat() {
    const messagesContainer = document.getElementById('aiMessages')
    messagesContainer.innerHTML = `
      <div class="ai-message">
        <p class="text-xs sm:text-sm text-light-700 dark:text-dark-300">👋 Hi! I'm your AI assistant. I'll help you stay on track with smart reminders and productivity insights.</p>
      </div>
    `
    this.aiMessages = []
    this.showNotification('Chat cleared', '🗑️', 2000)
  }

  // Date Management
  updateDate() {
    const now = new Date()
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    const dateStr = now.toLocaleDateString('en-US', options)

    const headerDate = document.getElementById('headerDate')
    if (headerDate) {
      headerDate.textContent = dateStr
    }
  }

  isToday(dateStr) {
    if (!dateStr) return false
    const today = new Date().toISOString().split('T')[0]
    return dateStr === today
  }

  // Event Listeners
  setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(b => {
          b.classList.remove('active')
          b.classList.remove('bg-gradient-to-r', 'from-blue-600', 'to-blue-500', 'text-white', 'shadow-lg')
          b.classList.add('text-light-700', 'dark:text-dark-300')
        })
        // Add active class to clicked item
        e.currentTarget.classList.add('active')
        e.currentTarget.classList.add('bg-gradient-to-r', 'from-blue-600', 'to-blue-500', 'text-white', 'shadow-lg')
        e.currentTarget.classList.remove('text-light-700', 'dark:text-dark-300')
        
        this.currentFilter = e.currentTarget.dataset.filter || 'today'
        this.render()
      })
    })

    document.querySelectorAll('.project-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        // Remove active from nav items
        document.querySelectorAll('.nav-item').forEach(b => {
          b.classList.remove('active')
          b.classList.remove('bg-gradient-to-r', 'from-blue-600', 'to-blue-500', 'text-white', 'shadow-lg')
          b.classList.add('text-light-700', 'dark:text-dark-300')
        })
        
        const project = e.currentTarget.dataset.project
        this.currentFilter = 'project:' + project
        this.render()
      })
    })

    const openRemindersBtn = document.getElementById('openRemindersBtn')
    if (openRemindersBtn) {
      openRemindersBtn.addEventListener('click', (e) => {
        e.preventDefault()
        // Remove active from nav items when opening reminders
        document.querySelectorAll('.nav-item').forEach(b => {
          b.classList.remove('active')
          b.classList.remove('bg-gradient-to-r', 'from-blue-600', 'to-blue-500', 'text-white', 'shadow-lg')
          b.classList.add('text-light-700', 'dark:text-dark-300')
        })
        this.openRemindersPanel()
      })
    }
  }

  // Task Management
  deleteTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id)
    this.saveTasks()
    this.render()
  }

  toggleTask(id) {
    if (!this.currentUser) {
      this.showAuthModal()
      this.showNotification('Please log in to modify tasks', '🔐', 3000)
      return
    }
    const task = this.tasks.find(t => t.id === id)
    if (task) {
      task.completed = !task.completed
      if (task.completed) {
        task.completedDate = new Date().toISOString().split('T')[0]
      }
      this.saveTasks()
      this.render()
    }
  }

  // Filtering
  getFilteredTasks() {
    let filtered = this.tasks
    const today = new Date().toISOString().split('T')[0]

    if (this.currentFilter === 'today') {
      filtered = filtered.filter(t => !t.completed && (t.dueDate === today || !t.dueDate))
    } else if (this.currentFilter === 'inbox') {
      filtered = filtered.filter(t => !t.completed)
    } else if (this.currentFilter === 'next7') {
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      filtered = filtered.filter(t => {
        if (t.completed) return false
        const taskDate = new Date(t.dueDate)
        return taskDate <= nextWeek && taskDate >= new Date()
      })
    } else if (this.currentFilter === 'completed') {
      filtered = filtered.filter(t => t.completed)
    } else if (this.currentFilter.startsWith('project:')) {
      const projectValue = this.currentFilter.replace('project:', '').trim()
      filtered = filtered.filter(t => t.project === projectValue && !t.completed)
    }

    return filtered.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }

  // Rendering
  render() {
    const tasksList = document.getElementById('tasksList')
    if (!tasksList) return

    const tasks = this.getFilteredTasks()

    if (tasks.length === 0) {
      tasksList.innerHTML = `
        <div class="text-center py-12">
          <p class="text-4xl mb-3">🎉</p>
          <p class="text-lg font-semibold text-light-700 dark:text-dark-300">No tasks here yet</p>
          <p class="text-sm text-light-600 dark:text-dark-400 mt-2">Add a new task to get started!</p>
        </div>
      `
    } else {
      tasksList.innerHTML = tasks.map(task => this.renderTask(task)).join('')
    }

    this.attachTaskListeners()
    this.updateStats()
    this.updateNavigation()
  }

  renderTask(task) {
    const priorityColors = {
      high: 'badge-high',
      medium: 'badge-medium',
      low: 'badge-low'
    }

    const projectEmojis = {
      'work': '💼',
      'personal': '🎯',
      'learning': '📚'
    }

    const dueDate = new Date(task.dueDate)
    const today = new Date()
    const isOverdue = dueDate < today && !task.completed
    const isToday = dueDate.toDateString() === today.toDateString()

    let dueDateDisplay = ''
    if (task.dueDate) {
      if (isToday) {
        dueDateDisplay = '<span class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium">Today</span>'
      } else if (isOverdue) {
        dueDateDisplay = `<span class="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg font-medium">Overdue</span>`
      } else {
        dueDateDisplay = `<span class="text-xs text-light-600 dark:text-dark-400">${dueDate.toLocaleDateString()}</span>`
      }
    }

    const notesPreview = task.notes ? `<p class="text-xs text-light-600 dark:text-dark-400 mt-1 line-clamp-2">${task.notes}</p>` : ''

    return `
      <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
        <input
          type="checkbox"
          class="task-checkbox"
          data-id="${task.id}"
          ${task.completed ? 'checked' : ''}
        >
        <div class="flex-1 min-w-0">
          <p class="font-medium ${task.completed ? 'line-through text-light-500 dark:text-dark-500' : 'text-light-900 dark:text-white'}">${task.title}</p>
          ${notesPreview}
          ${task.labels.length > 0 ? `<div class="flex gap-1 mt-2 flex-wrap">${task.labels.map(label => `<span class="text-xs px-2 py-0.5 bg-light-200 dark:bg-dark-700 text-light-700 dark:text-dark-200 rounded">${label}</span>`).join('')}</div>` : ''}
        </div>
        <div class="flex items-center gap-2 ml-2 flex-shrink-0 flex-wrap justify-end">
          <span class="badge ${priorityColors[task.priority]}">
            ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
          ${dueDateDisplay}
          <span class="text-lg" title="${task.project}">${projectEmojis[task.project] || '📋'}</span>
          <button
            class="edit-btn text-light-500 dark:text-dark-500 hover:text-blue-600 dark:hover:text-blue-400 transition p-1 hover:bg-light-200 dark:hover:bg-dark-700 rounded-lg"
            data-id="${task.id}"
            title="Edit task"
          >
            ✏️
          </button>
          <button
            class="delete-btn text-light-500 dark:text-dark-500 hover:text-red-600 dark:hover:text-red-400 transition p-1 hover:bg-light-200 dark:hover:bg-dark-700 rounded-lg"
            data-id="${task.id}"
            title="Delete task"
          >
            ✕
          </button>
        </div>
      </div>
    `
  }

  attachTaskListeners() {
    document.querySelectorAll('.task-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.toggleTask(parseInt(e.currentTarget.dataset.id))
      })
    })

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.showDeleteConfirm(parseInt(e.currentTarget.dataset.id))
      })
    })

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        this.editTask(parseInt(e.currentTarget.dataset.id))
      })
    })
  }

  updateStats() {
    const activeTasks = this.tasks.filter(t => !t.completed).length
    const completedTasks = this.tasks.filter(t => t.completed).length
    const total = this.tasks.length
    const productivity = total > 0 ? Math.round((completedTasks / total) * 100) : 0

    const activeEl = document.getElementById('activeTasks')
    const completedEl = document.getElementById('completedTasks')
    const streakEl = document.getElementById('streak')
    const productivityEl = document.getElementById('productivity')
    const todayCountEl = document.getElementById('todayCount')

    if (activeEl) activeEl.textContent = activeTasks
    if (completedEl) completedEl.textContent = completedTasks
    if (streakEl) streakEl.textContent = Math.max(0, completedTasks)
    if (productivityEl) productivityEl.textContent = productivity + '%'
    if (todayCountEl) todayCountEl.textContent = activeTasks
  }

  updateNavigation() {
    document.querySelectorAll('.nav-item').forEach(b => {
      const filterValue = b.dataset.filter || 'today'
      const isActive = (this.currentFilter === filterValue)
      
      if (isActive) {
        b.classList.add('active', 'bg-gradient-to-r', 'from-blue-600', 'to-blue-500', 'text-white', 'shadow-lg')
        b.classList.remove('text-light-700', 'dark:text-dark-300')
      } else {
        b.classList.remove('active', 'bg-gradient-to-r', 'from-blue-600', 'to-blue-500', 'text-white', 'shadow-lg')
        b.classList.add('text-light-700', 'dark:text-dark-300')
      }
    })

    document.querySelectorAll('.project-item').forEach(b => {
      const isActive = (this.currentFilter === ('project:' + (b.dataset.project || '')))
      b.classList.toggle('active', isActive)
    })
  }

  // Storage
  saveTasks() {
    if (this.currentUser) {
      this.saveTasksToSupabase().catch(error => {
        console.error('Error saving tasks to Supabase:', error)
        this.showNotification('Failed to sync tasks to cloud', '⚠️', 3000)
      })
    } else {
      localStorage.setItem('todoTasks', JSON.stringify(this.tasks))
    }
  }

  loadTasks() {
    if (this.currentUser) {
      return [] // Will be loaded from Supabase in init()
    }
    const stored = localStorage.getItem('todoTasks')
    return stored ? JSON.parse(stored) : this.getDefaultTasks()
  }

  async saveTasksToSupabase() {
    if (!SUPABASE_URL || !SUPABASE_KEY || !this.currentUser) {
      console.warn('Cannot save to Supabase: missing credentials or user')
      return
    }

    const token = localStorage.getItem('authToken')
    if (!token) {
      console.warn('Cannot save to Supabase: no auth token')
      return
    }
    
    for (const task of this.tasks) {
      try {
        const existingTask = await this.getTaskFromSupabase(task.id)
        
        const taskData = {
          title: task.title,
          notes: task.notes || '',
          completed: task.completed,
          priority: task.priority,
          project: task.project,
          due_date: task.dueDate,
          completed_date: task.completedDate,
          labels: task.labels && task.labels.length > 0 ? `{${task.labels.join(',')}}` : null
        }
        
        if (existingTask) {
          // Update existing task
          const response = await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${task.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(taskData)
          })
          
          if (!response.ok) {
            const error = await response.json()
            console.error('Error updating task:', error)
          } else {
            console.log('Task updated in Supabase:', task.title)
          }
        } else {
          // Create new task
          const response = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              id: task.id,
              user_id: this.currentUser.id,
              created_date: task.createdDate,
              ...taskData
            })
          })
          
          if (!response.ok) {
            const error = await response.json()
            console.error('Error creating task:', error)
            console.error('Task data:', { id: task.id, user_id: this.currentUser.id, ...taskData })
          } else {
            console.log('Task saved to Supabase:', task.title)
          }
        }
      } catch (error) {
        console.error('Error saving task to Supabase:', error)
      }
    }
  }

  async getTaskFromSupabase(taskId) {
    if (!SUPABASE_URL || !SUPABASE_KEY || !this.currentUser) return null

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${taskId}&user_id=eq.${this.currentUser.id}`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        console.error('Error fetching task:', await response.json())
        return null
      }

      const data = await response.json()
      return data[0] || null
    } catch (error) {
      console.error('Error in getTaskFromSupabase:', error)
      return null
    }
  }

  async loadTasksFromSupabase() {
    if (!SUPABASE_URL || !SUPABASE_KEY || !this.currentUser) return []

    const token = localStorage.getItem('authToken')
    const response = await fetch(`${SUPABASE_URL}/rest/v1/tasks?user_id=eq.${this.currentUser.id}`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.map(t => ({
      id: t.id,
      title: t.title,
      notes: t.notes || '',
      completed: t.completed,
      priority: t.priority,
      project: t.project,
      dueDate: t.due_date,
      createdDate: t.created_date,
      completedDate: t.completed_date,
      labels: t.labels || []
    }))
  }

  saveReminders() {
    if (this.currentUser) {
      this.saveRemindersToSupabase()
    } else {
      localStorage.setItem('todoReminders', JSON.stringify(this.reminders))
    }
  }

  loadReminders() {
    if (this.currentUser) {
      return [] // Will be loaded from Supabase in init()
    }
    const stored = localStorage.getItem('todoReminders')
    return stored ? JSON.parse(stored) : []
  }

  async saveRemindersToSupabase() {
    if (!SUPABASE_URL || !SUPABASE_KEY || !this.currentUser) return

    const token = localStorage.getItem('authToken')
    
    for (const reminder of this.reminders) {
      const existingReminder = await this.getReminderFromSupabase(reminder.id)
      
      if (existingReminder) {
        // Update existing reminder
        await fetch(`${SUPABASE_URL}/rest/v1/reminders?id=eq.${reminder.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: reminder.title,
            reminder_date_time: reminder.reminderDateTime,
            completed: reminder.completed
          })
        })
      } else {
        // Create new reminder
        await fetch(`${SUPABASE_URL}/rest/v1/reminders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            id: reminder.id,
            user_id: this.currentUser.id,
            title: reminder.title,
            reminder_date_time: reminder.reminderDateTime,
            completed: reminder.completed,
            created_date: reminder.createdDate
          })
        })
      }
    }
  }

  async getReminderFromSupabase(reminderId) {
    if (!SUPABASE_URL || !SUPABASE_KEY || !this.currentUser) return null

    const token = localStorage.getItem('authToken')
    const response = await fetch(`${SUPABASE_URL}/rest/v1/reminders?id=eq.${reminderId}&user_id=eq.${this.currentUser.id}`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`
      }
    })

    const data = await response.json()
    return data[0] || null
  }

  async loadRemindersFromSupabase() {
    if (!SUPABASE_URL || !SUPABASE_KEY || !this.currentUser) return []

    const token = localStorage.getItem('authToken')
    const response = await fetch(`${SUPABASE_URL}/rest/v1/reminders?user_id=eq.${this.currentUser.id}`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.map(r => ({
      id: r.id,
      title: r.title,
      reminderDateTime: r.reminder_date_time,
      taskId: r.task_id || null,
      completed: r.completed,
      createdDate: r.created_date
    }))
  }

  // Reminder System
  setupReminderSystem() {
    // Check reminders every minute
    this.reminderCheckInterval = setInterval(() => this.checkReminders(), 60000)
    // Initial check
    this.checkReminders()
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  checkReminders() {
    const now = new Date()
    
    this.reminders.forEach(reminder => {
      if (reminder.completed) return

      const reminderTime = new Date(reminder.reminderDateTime)
      const timeDiff = reminderTime - now
      const hoursLeft = timeDiff / (1000 * 60 * 60)

      // Notify if within 5 hours and hasn't been notified yet
      if (hoursLeft <= 5 && hoursLeft > 0) {
        const reminderId = `${reminder.id}-${Math.floor(hoursLeft)}`
        
        if (!this.notifiedReminders.has(reminderId)) {
          this.notifiedReminders.add(reminderId)
          this.sendReminderNotification(reminder, hoursLeft)
        }
      }

      // Clear notification tracking if reminder time has passed
      if (hoursLeft <= 0) {
        this.notifiedReminders.delete(`${reminder.id}-*`)
      }
    })
  }

  sendReminderNotification(reminder, hoursLeft) {
    const hours = Math.ceil(hoursLeft)
    const message = `⏰ Reminder: "${reminder.title}" in ${hours} hour${hours !== 1 ? 's' : ''}`
    
    this.showNotification(message, '⏰', 5000)

    // Browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('TaskFlow Reminder', {
        body: message,
        icon: '⏰'
      })
    }
  }

  createReminder(title, reminderDateTime, taskId = null) {
    const reminder = {
      id: Date.now(),
      title,
      reminderDateTime,
      taskId,
      completed: false,
      createdDate: new Date().toISOString()
    }
    
    this.reminders.unshift(reminder)
    this.saveReminders()
    this.showNotification(`Reminder set for ${new Date(reminderDateTime).toLocaleString()}`, '⏰', 3000)
    return reminder
  }

  deleteReminder(id) {
    this.reminders = this.reminders.filter(r => r.id !== id)
    this.saveReminders()
    this.showNotification('Reminder deleted', '🗑️', 2000)
  }

  completeReminder(id) {
    const reminder = this.reminders.find(r => r.id === id)
    if (reminder) {
      reminder.completed = true
      this.saveReminders()
      this.showNotification('Reminder completed!', '✓', 2000)
    }
  }

  getUpcomingReminders() {
    const now = new Date()
    return this.reminders
      .filter(r => !r.completed && new Date(r.reminderDateTime) > now)
      .sort((a, b) => new Date(a.reminderDateTime) - new Date(b.reminderDateTime))
      .slice(0, 5)
  }

  getDefaultTasks() {
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    return [
      {
        id: 1,
        title: 'Complete project proposal',
        notes: 'Include budget and timeline',
        completed: false,
        priority: 'high',
        project: 'work',
        dueDate: today,
        createdDate: today,
        completedDate: null,
        labels: ['Urgent']
      },
      {
        id: 2,
        title: 'Review design mockups',
        notes: 'Check mobile and desktop versions',
        completed: false,
        priority: 'medium',
        project: 'work',
        dueDate: tomorrow,
        createdDate: today,
        completedDate: null,
        labels: []
      },
      {
        id: 3,
        title: 'Learn React hooks',
        notes: 'Focus on useState and useEffect',
        completed: false,
        priority: 'medium',
        project: 'learning',
        dueDate: tomorrow,
        createdDate: today,
        completedDate: null,
        labels: ['Development']
      },
      {
        id: 4,
        title: 'Gym session',
        notes: 'Cardio and weights',
        completed: true,
        priority: 'low',
        project: 'personal',
        dueDate: today,
        createdDate: today,
        completedDate: today,
        labels: ['Health']
      },
      {
        id: 5,
        title: 'Plan weekend trip',
        notes: 'Book hotel and flights',
        completed: false,
        priority: 'low',
        project: 'personal',
        dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
        createdDate: today,
        completedDate: null,
        labels: []
      }
    ]
  }
}

// Initialize app
new TodoApp()