import './style.css'
import { DOMManager } from './core/DOMManager.js'
import { APIClient } from './core/APIClient.js'
import { PerformanceMonitor } from './core/PerformanceMonitor.js'
import { MemoryManager } from './core/MemoryManager.js'

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || ''

/**
 * Core Application Bootstrap
 * 
 * This is the minimal main.js that handles:
 * - Core infrastructure initialization (DOMManager, APIClient, PerformanceMonitor, MemoryManager)
 * - Theme management
 * - Mobile menu
 * - Notifications
 * - Lazy loading of feature modules (Auth, AI, Reminders, Tasks)
 * 
 * Feature-specific code has been extracted to feature modules:
 * - AuthModule: Authentication, login, signup, profile management
 * - AIAssistant: AI chat interface
 * - ReminderSystem: Reminders and notifications
 * - TaskManager: Task CRUD operations
 */
class App {
  constructor() {
    // Core infrastructure
    this.domManager = new DOMManager()
    this.apiClient = new APIClient(SUPABASE_URL, SUPABASE_KEY)
    this.performanceMonitor = new PerformanceMonitor()
    this.memoryManager = new MemoryManager()

    // Application state
    this.currentUser = null
    this.isDarkMode = this.loadTheme()
    this.pendingDeleteId = null

    // Feature module caches
    this.authModule = null
    this.authModuleLoading = false
    this.aiAssistant = null
    this.aiAssistantLoading = false
    this.reminderSystem = null
    this.reminderSystemLoading = false
    this.taskManager = null
    this.taskManagerLoading = false

    // Performance tracking
    this.performanceMonitor.markStart('app-init')
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      // Initialize core infrastructure
      this.domManager.init()
      this.performanceMonitor.init()

      // Set up performance budgets
      this.performanceMonitor.setBudget('app-init', 2000)
      this.performanceMonitor.setBudget('task-render', 50)
      this.performanceMonitor.setBudget('task-create', 100)
      this.performanceMonitor.setBudget('task-delete', 100)
      this.performanceMonitor.setBudget('task-toggle', 100)
      this.performanceMonitor.setBudget('load-auth-module', 200)
      this.performanceMonitor.setBudget('load-ai-module', 200)
      this.performanceMonitor.setBudget('load-reminders-module', 200)
      this.performanceMonitor.setBudget('load-tasks-module', 200)

      // Set up core UI features
      this.setupThemeToggle()
      this.setupMobileMenu()
      this.setupNotifications()
      this.setupDeleteModal()
      this.setupLogout()
      this.setupProfile()
      this.setupAIEventBridge()

      // Check authentication status
      this.checkAuth()

      // Load initial data
      await this.loadUserData()

      // Set up event listeners for feature triggers
      await this.setupFeatureTriggers()

      // Track initialization complete
      this.performanceMonitor.markEnd('app-init')

      console.log('✅ Application initialized')
    } catch (error) {
      console.error('❌ Failed to initialize application:', error)
      this.showNotification('Failed to initialize application', '⚠️', 5000)
    }
  }

  /**
   * Check authentication status
   */
  checkAuth() {
    const user = localStorage.getItem('user')
    const authToken = localStorage.getItem('authToken')
    
    // Validate that we have both user data and a valid token
    if (user && authToken) {
      try {
        this.currentUser = JSON.parse(user)
        this.showAuthenticatedUI()
      } catch (error) {
        console.error('Invalid user data in localStorage:', error)
        this.clearAuthState()
      }
    } else {
      // Missing user or token - clear everything
      this.clearAuthState()
    }
  }

  /**
   * Clear authentication state
   */
  clearAuthState() {
    this.currentUser = null
    localStorage.removeItem('user')
    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken')
    this.hideAuthenticatedUI()
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
   * Load user data from Supabase
   */
  async loadUserData() {
    if (!this.currentUser) return

    try {
      // Load user profile
      const userProfile = await this.apiClient.get('profiles', {
        id: this.currentUser.id
      })

      if (userProfile && userProfile.length > 0) {
        this.currentUser = { ...this.currentUser, ...userProfile[0] }
        localStorage.setItem('user', JSON.stringify(this.currentUser))
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
      
      // If we get a 401, the token is invalid - clear auth state
      if (error.message && error.message.includes('401')) {
        console.log('Authentication expired, clearing session...')
        this.clearAuthState()
        this.showNotification('Session expired. Please log in again.', '🔒', 5000)
      }
    }
  }

  /**
   * Set up feature module triggers
   * These listeners trigger lazy loading of feature modules on demand
   */
  async setupFeatureTriggers() {
    // Auth module trigger - load immediately if not authenticated
    if (!this.currentUser) {
      try {
        await this.loadAuthModule()
      } catch (error) {
        console.error('Failed to load AuthModule on startup:', error)
      }
    }

    // AI module trigger - only add listener once
    const aiBtn = this.domManager.get('openAIBtn')
    if (aiBtn && !aiBtn.dataset.aiTriggerAttached) {
      const aiTriggerHandler = async (e) => {
        e.stopPropagation()
        await this.loadAIAssistantModule()
        // Show the AI panel after loading
        const aiPanel = this.domManager.get('aiPanel')
        const aiOverlay = this.domManager.get('aiOverlay')
        const aiChatBubble = this.domManager.get('aiChatBubble')
        const taskModal = this.domManager.get('taskModal')
        
        if (taskModal) {
          taskModal.classList.add('hidden')
          taskModal.style.display = 'none'
        }
        if (aiPanel) {
          aiPanel.classList.remove('hidden')
          aiPanel.style.display = 'flex'
        }
        if (window.innerWidth < 1024) {
          if (aiOverlay) aiOverlay.classList.remove('hidden')
          if (aiChatBubble) aiChatBubble.classList.add('hidden')
        }
      }
      aiBtn.addEventListener('click', aiTriggerHandler)
      this.memoryManager.registerListener(aiBtn, 'click', aiTriggerHandler, 'ai-trigger')
      aiBtn.dataset.aiTriggerAttached = 'true'
    }

    // Reminders module trigger - only add listener once
    const remindersBtn = this.domManager.get('openRemindersBtn')
    if (remindersBtn && !remindersBtn.dataset.remindersTriggerAttached) {
      const remindersTriggerHandler = async (e) => {
        e.stopPropagation()
        await this.loadReminderSystemModule()
        // Show the reminders panel after loading
        const remindersPanel = this.domManager.get('remindersPanel')
        if (remindersPanel) {
          remindersPanel.classList.remove('hidden')
          remindersPanel.style.display = 'flex'
        }
      }
      remindersBtn.addEventListener('click', remindersTriggerHandler)
      this.memoryManager.registerListener(remindersBtn, 'click', remindersTriggerHandler, 'reminders-trigger')
      remindersBtn.dataset.remindersTriggerAttached = 'true'
    }

    // Tasks module trigger (load immediately as it's core functionality)
    try {
      await this.loadTaskManagerModule()
    } catch (error) {
      console.error('Failed to load TaskManager on startup:', error)
    }
  }

  /**
   * Lazy load AuthModule
   */
  async loadAuthModule() {
    if (this.authModuleLoading) return
    if (this.authModule) return this.authModule

    try {
      this.authModuleLoading = true
      console.log('🔐 Loading AuthModule...')

      this.performanceMonitor.markStart('load-auth-module')

      const { AuthModule } = await import('./features/AuthModule.js')

      this.authModule = new AuthModule(
        this.apiClient,
        this.domManager,
        this.memoryManager,
        {
          onAuthStateChange: (user) => {
            this.currentUser = user
            if (user) {
              this.showAuthenticatedUI()
            } else {
              this.hideAuthenticatedUI()
            }
          },
          onUserDataLoad: async () => {
            await this.loadUserData()
          },
          showNotification: (message, icon, duration) => {
            this.showNotification(message, icon, duration)
          }
        }
      )

      this.authModule.init()

      this.performanceMonitor.markEnd('load-auth-module')

      console.log('✅ AuthModule loaded successfully')
      return this.authModule
    } catch (error) {
      console.error('❌ Failed to load AuthModule:', error)
      this.showNotification(
        'Failed to load authentication module. Please refresh the page.',
        '⚠️',
        5000
      )
      throw error
    } finally {
      this.authModuleLoading = false
    }
  }

  /**
   * Lazy load AIAssistant module
   */
  async loadAIAssistantModule() {
    if (this.aiAssistantLoading) return
    if (this.aiAssistant) return this.aiAssistant

    try {
      this.aiAssistantLoading = true
      console.log('🤖 Loading AIAssistant module...')

      this.performanceMonitor.markStart('load-ai-module')

      const { AIAssistant } = await import('./features/AIAssistant.js')
      const { AnimationEngine } = await import('./utils/AnimationEngine.js')
      const { StorageManager } = await import('./utils/StorageManager.js')

      const animationEngine = new AnimationEngine()
      const storageManager = new StorageManager()

      // Load tasks and reminders from storage
      const tasks = storageManager.get('tasks') || []
      const reminders = storageManager.get('reminders') || []

      this.aiAssistant = new AIAssistant(
        this.apiClient,
        this.domManager,
        animationEngine,
        this.memoryManager,
        (message, icon, duration) => this.showNotification(message, icon, duration)
      )

      // Initialize with current app state
      this.aiAssistant.init(tasks, reminders, this.currentUser)

      this.performanceMonitor.markEnd('load-ai-module')

      console.log('✅ AIAssistant module loaded successfully')
      return this.aiAssistant
    } catch (error) {
      console.error('❌ Failed to load AIAssistant module:', error)
      this.showNotification(
        'Failed to load AI assistant. Please refresh the page.',
        '⚠️',
        5000
      )
      throw error
    } finally {
      this.aiAssistantLoading = false
    }
  }

  /**
   * Lazy load ReminderSystem module
   */
  async loadReminderSystemModule() {
    if (this.reminderSystemLoading) return
    if (this.reminderSystem) return this.reminderSystem

    try {
      this.reminderSystemLoading = true
      console.log('🔔 Loading ReminderSystem module...')

      this.performanceMonitor.markStart('load-reminders-module')

      const { ReminderSystem } = await import('./features/ReminderSystem.js')
      const { StorageManager } = await import('./utils/StorageManager.js')

      const storageManager = new StorageManager()

      // Load reminders from storage
      const reminders = storageManager.get('reminders') || []

      this.reminderSystem = new ReminderSystem(
        this.apiClient,
        this.domManager,
        this.memoryManager,
        storageManager,
        (message, icon, duration) => this.showNotification(message, icon, duration)
      )

      this.reminderSystem.init(reminders)

      this.performanceMonitor.markEnd('load-reminders-module')

      console.log('✅ ReminderSystem module loaded successfully')
      return this.reminderSystem
    } catch (error) {
      console.error('❌ Failed to load ReminderSystem module:', error)
      this.showNotification(
        'Failed to load reminder system. Please refresh the page.',
        '⚠️',
        5000
      )
      throw error
    } finally {
      this.reminderSystemLoading = false
    }
  }

  /**
   * Load TaskManager module (core functionality, loaded immediately)
   */
  async loadTaskManagerModule() {
    if (this.taskManagerLoading) return
    if (this.taskManager) return this.taskManager

    try {
      this.taskManagerLoading = true
      console.log('📋 Loading TaskManager module...')

      this.performanceMonitor.markStart('load-tasks-module')

      const { TaskManager } = await import('./features/TaskManager.js')
      const { AnimationEngine } = await import('./utils/AnimationEngine.js')
      const { StorageManager } = await import('./utils/StorageManager.js')

      const animationEngine = new AnimationEngine()
      const storageManager = new StorageManager()

      // Load tasks from storage
      const tasks = storageManager.get('tasks') || []

      this.taskManager = new TaskManager(
        this.apiClient,
        this.domManager,
        animationEngine,
        storageManager,
        this.memoryManager,
        (message, icon, duration) => this.showNotification(message, icon, duration),
        this.performanceMonitor
      )

      this.taskManager.init(tasks, 'inbox', this.currentUser)

      this.performanceMonitor.markEnd('load-tasks-module')

      console.log('✅ TaskManager module loaded successfully')
      return this.taskManager
    } catch (error) {
      console.error('❌ Failed to load TaskManager module:', error)
      this.showNotification(
        'Failed to load task manager. Please refresh the page.',
        '⚠️',
        5000
      )
      throw error
    } finally {
      this.taskManagerLoading = false
    }
  }

  /**
   * Theme Management
   */
  loadTheme() {
    const saved = localStorage.getItem('theme')
    if (!saved) return false
    try {
      return JSON.parse(saved)
    } catch {
      // Handle legacy "dark" string format
      return saved === 'dark'
    }
  }

  applyTheme() {
    const html = document.documentElement
    if (this.isDarkMode) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  setupThemeToggle() {
    this.applyTheme()
    const themeToggle = this.domManager.get('themeToggle')
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme())
      this.memoryManager.registerListener(themeToggle, 'click', () => this.toggleTheme(), 'theme')
    }

    // Desktop theme toggle
    const themeToggleDesktop = this.domManager.get('themeToggleDesktop')
    if (themeToggleDesktop) {
      themeToggleDesktop.addEventListener('click', () => this.toggleTheme())
      this.memoryManager.registerListener(themeToggleDesktop, 'click', () => this.toggleTheme(), 'theme-desktop')
    }
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode
    localStorage.setItem('theme', JSON.stringify(this.isDarkMode))
    this.applyTheme()
    this.updateThemeLabel()
  }

  updateThemeLabel() {
    const label = document.querySelector('[data-theme-label]')
    if (label) {
      label.textContent = this.isDarkMode ? '☀️' : '🌙'
    }
  }

  /**
   * Mobile Menu
   */
  setupMobileMenu() {
    const menuToggle = this.domManager.get('mobileMenuBtn')
    const sidebar = this.domManager.get('sidebar')
    const desktopMenuBtn = this.domManager.get('desktopMenuBtn')
    const closeSidebarBtn = this.domManager.get('closeSidebarBtnMobile')
    const mobileOverlay = this.domManager.get('mobileOverlay')

    // Ensure sidebar is hidden on mobile on initial load
    if (window.innerWidth < 1024 && sidebar) {
      sidebar.classList.add('hidden')
      if (mobileOverlay) {
        mobileOverlay.classList.add('hidden')
      }
    }

    // Mobile menu toggle
    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', (e) => {
        e.stopPropagation()
        sidebar.classList.toggle('hidden')
        if (mobileOverlay) {
          mobileOverlay.classList.toggle('hidden')
        }
        const aiPanel = this.domManager.get('aiPanel')
        const firstNavItem = document.querySelector('.nav-item')
        if (aiPanel && firstNavItem) {
          // Additional logic here if needed
        }
      })
      this.memoryManager.registerListener(menuToggle, 'click', (e) => {
        e.stopPropagation()
        sidebar.classList.toggle('hidden')
        if (mobileOverlay) {
          mobileOverlay.classList.toggle('hidden')
        }
      }, 'mobile-menu')
    }

    // Mobile close button
    if (closeSidebarBtn && sidebar) {
      closeSidebarBtn.addEventListener('click', () => {
        sidebar.classList.add('hidden')
        if (mobileOverlay) {
          mobileOverlay.classList.add('hidden')
        }
      })
      this.memoryManager.registerListener(closeSidebarBtn, 'click', () => {
        sidebar.classList.add('hidden')
        if (mobileOverlay) {
          mobileOverlay.classList.add('hidden')
        }
      }, 'mobile-menu')
    }

    // Desktop menu button - toggle sidebar visibility
    if (desktopMenuBtn && sidebar) {
      desktopMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('hidden')
      })
      this.memoryManager.registerListener(desktopMenuBtn, 'click', () => {
        sidebar.classList.toggle('hidden')
      }, 'desktop-menu')
    }

    // Close sidebar when clicking overlay
    if (mobileOverlay && sidebar) {
      mobileOverlay.addEventListener('click', () => {
        sidebar.classList.add('hidden')
        mobileOverlay.classList.add('hidden')
      })
      this.memoryManager.registerListener(mobileOverlay, 'click', () => {
        sidebar.classList.add('hidden')
        mobileOverlay.classList.add('hidden')
      }, 'mobile-overlay')
    }

    // Close overlays when clicked
    const aiOverlay = this.domManager.get('aiOverlay')

    if (mobileOverlay) {
      mobileOverlay.addEventListener('click', () => {
        sidebar.classList.add('hidden')
        mobileOverlay.classList.add('hidden')
      })
      this.memoryManager.registerListener(mobileOverlay, 'click', () => {
        sidebar.classList.add('hidden')
        mobileOverlay.classList.add('hidden')
      }, 'mobile-overlay')
    }

    if (aiOverlay) {
      aiOverlay.addEventListener('click', () => {
        const aiPanel = this.domManager.get('aiPanel')
        if (aiPanel) aiPanel.classList.add('hidden')
        aiOverlay.classList.add('hidden')
      })
      this.memoryManager.registerListener(aiOverlay, 'click', () => {
        const aiPanel = this.domManager.get('aiPanel')
        if (aiPanel) aiPanel.classList.add('hidden')
        aiOverlay.classList.add('hidden')
      }, 'ai-overlay')
    }

    // Handle window resize for responsive behavior
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) {
        // Desktop view - show sidebar
        if (sidebar) sidebar.classList.remove('hidden')
        if (mobileOverlay) mobileOverlay.classList.add('hidden')
      } else {
        // Mobile view - hide sidebar
        if (sidebar) sidebar.classList.add('hidden')
        if (mobileOverlay) mobileOverlay.classList.add('hidden')
      }
    })
  }

  /**
   * Notifications
   */
  setupNotifications() {
    // Notification system is ready
    console.log('📢 Notifications system initialized')
  }

  showNotification(message, icon = '✓', duration = 3000) {
    const toast = this.domManager.get('notificationToast')
    if (!toast) return

    const messageEl = toast.querySelector('.notification-message')
    const iconEl = toast.querySelector('.notification-icon')

    if (messageEl) messageEl.textContent = message
    if (iconEl) iconEl.textContent = icon

    toast.classList.remove('hidden')
    toast.style.display = 'flex'

    if (duration > 0) {
      const timeoutId = setTimeout(() => this.hideNotification(), duration)
      this.memoryManager.registerTimeout(timeoutId, 'notifications')
    }
  }

  hideNotification() {
    const toast = this.domManager.get('notificationToast')
    if (toast) {
      toast.classList.add('hidden')
      toast.style.display = 'none'
    }
  }

  /**
   * Delete Modal
   */
  setupDeleteModal() {
    const deleteConfirmBtn = this.domManager.get('confirmDeleteBtn')
    const deleteCancelBtn = this.domManager.get('cancelDeleteBtn')

    if (deleteConfirmBtn) {
      deleteConfirmBtn.addEventListener('click', () => this.confirmDelete())
      this.memoryManager.registerListener(deleteConfirmBtn, 'click', () => this.confirmDelete(), 'delete-modal')
    }

    if (deleteCancelBtn) {
      deleteCancelBtn.addEventListener('click', () => this.closeDeleteModal())
      this.memoryManager.registerListener(deleteCancelBtn, 'click', () => this.closeDeleteModal(), 'delete-modal')
    }
  }

  showDeleteConfirm(taskId) {
    this.pendingDeleteId = taskId
    const modal = this.domManager.get('deleteModal')
    if (modal) {
      modal.classList.remove('hidden')
      modal.style.display = 'flex'
    }
  }

  closeDeleteModal() {
    this.pendingDeleteId = null
    const modal = this.domManager.get('deleteModal')
    if (modal) {
      modal.classList.add('hidden')
      modal.style.display = 'none'
    }
  }

  confirmDelete() {
    if (this.taskManager && this.pendingDeleteId) {
      this.taskManager.deleteTask(this.pendingDeleteId)
      this.closeDeleteModal()
    }
  }

  /**
   * Logout
   */
  setupLogout() {
    const logoutBtn = this.domManager.get('logoutBtn')
    const logoutBtnDesktop = this.domManager.get('logoutBtnDesktop')

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.showLogoutModal())
      this.memoryManager.registerListener(logoutBtn, 'click', () => this.showLogoutModal(), 'logout')
    }

    if (logoutBtnDesktop) {
      logoutBtnDesktop.addEventListener('click', () => this.showLogoutModal())
      this.memoryManager.registerListener(logoutBtnDesktop, 'click', () => this.showLogoutModal(), 'logout')
    }
  }

  showLogoutModal() {
    const modal = this.domManager.get('logoutModal')
    if (modal) {
      modal.classList.remove('hidden')
      modal.style.display = 'flex'
    }

    const confirmBtn = this.domManager.get('confirmLogoutBtn')
    const cancelBtn = this.domManager.get('cancelLogoutBtn')

    if (confirmBtn) {
      // Remove old listeners to prevent duplicates
      confirmBtn.onclick = null
      confirmBtn.onclick = () => this.logout()
    }
    if (cancelBtn) {
      // Remove old listeners to prevent duplicates
      cancelBtn.onclick = null
      cancelBtn.onclick = () => this.closeLogoutModal()
    }
  }

  closeLogoutModal() {
    const modal = this.domManager.get('logoutModal')
    if (modal) {
      modal.classList.add('hidden')
      modal.style.display = 'none'
    }
  }

  logout() {
    // Cleanup all modules
    if (this.authModule) this.authModule.cleanup()
    if (this.aiAssistant) this.aiAssistant.cleanup()
    if (this.reminderSystem) this.reminderSystem.cleanup()
    if (this.taskManager) this.taskManager.cleanup()

    localStorage.removeItem('user')
    localStorage.removeItem('authToken')
    this.currentUser = null
    this.hideAuthenticatedUI()
    this.closeLogoutModal()
    this.showNotification('Logged out successfully', '✓', 3000)
    // Reload to reset all modules
    window.location.reload()
  }

  /**
   * Profile
   */
  setupProfile() {
    const profileBtn = this.domManager.get('profileBtn')
    const profileBtnDesktop = this.domManager.get('profileBtnDesktop')

    if (profileBtn) {
      profileBtn.addEventListener('click', () => this.showProfileModal())
      this.memoryManager.registerListener(profileBtn, 'click', () => this.showProfileModal(), 'profile')
    }

    if (profileBtnDesktop) {
      profileBtnDesktop.addEventListener('click', () => this.showProfileModal())
      this.memoryManager.registerListener(profileBtnDesktop, 'click', () => this.showProfileModal(), 'profile')
    }
  }

  /**
   * Bridge AI-created entities to core managers/storage
   */
  setupAIEventBridge() {
    const onAITaskCreated = (event) => {
      const task = event?.detail
      if (!task || !task.id) return

      if (this.taskManager) {
        const exists = this.taskManager.tasks.some((t) => t.id === task.id)
        if (!exists) {
          this.taskManager.tasks.unshift(task)
          this.taskManager.saveTasks()
          this.taskManager.render()
        }
        return
      }

      const existingTasks = JSON.parse(localStorage.getItem('tasks') || '[]')
      if (!existingTasks.some((t) => t.id === task.id)) {
        existingTasks.unshift(task)
        localStorage.setItem('tasks', JSON.stringify(existingTasks))
      }
    }

    const onAIReminderCreated = (event) => {
      const reminder = event?.detail
      if (!reminder || !reminder.id) return

      if (this.reminderSystem) {
        const exists = this.reminderSystem.reminders.some((r) => r.id === reminder.id)
        if (!exists) {
          this.reminderSystem.reminders.unshift(reminder)
          this.reminderSystem.saveReminders()
          this.reminderSystem.renderReminders()
        }
        return
      }

      const existingReminders = JSON.parse(localStorage.getItem('reminders') || '[]')
      if (!existingReminders.some((r) => r.id === reminder.id)) {
        existingReminders.unshift(reminder)
        localStorage.setItem('reminders', JSON.stringify(existingReminders))
      }
    }

    window.addEventListener('ai-task-created', onAITaskCreated)
    this.memoryManager.registerListener(window, 'ai-task-created', onAITaskCreated, 'ai-bridge')
    window.addEventListener('ai-reminder-created', onAIReminderCreated)
    this.memoryManager.registerListener(window, 'ai-reminder-created', onAIReminderCreated, 'ai-bridge')
  }

  showProfileModal() {
    const modal = this.domManager.get('profileModal')
    if (modal) {
      modal.classList.remove('hidden')
      modal.style.display = 'flex'
      
      // Populate profile data
      const profileName = this.domManager.get('profileName')
      const profileEmail = this.domManager.get('profileEmail')
      
      if (profileName && this.currentUser) {
        profileName.value = this.currentUser.name || ''
      }
      if (profileEmail && this.currentUser) {
        profileEmail.textContent = this.currentUser.email || '-'
      }
    }

    const closeBtn = this.domManager.get('closeProfileModal')
    const saveBtn = this.domManager.get('saveProfileBtn')

    if (closeBtn) {
      closeBtn.onclick = null
      closeBtn.onclick = () => this.closeProfileModal()
    }
    if (saveBtn) {
      saveBtn.onclick = null
      saveBtn.onclick = () => this.saveProfile()
    }
  }

  closeProfileModal() {
    const modal = this.domManager.get('profileModal')
    if (modal) {
      modal.classList.add('hidden')
      modal.style.display = 'none'
    }
  }

  async saveProfile() {
    const profileName = this.domManager.get('profileName')
    if (!profileName || !this.currentUser) return

    const newName = profileName.value.trim()
    if (!newName) {
      this.showNotification('Name cannot be empty', '⚠️', 3000)
      return
    }

    try {
      // Update in database if authModule is available
      if (this.authModule) {
        await this.authModule.updateUserProfile(this.currentUser.id, { name: newName })
      }
      
      // Update local user object
      this.currentUser.name = newName
      localStorage.setItem('user', JSON.stringify(this.currentUser))
      
      this.closeProfileModal()
      this.showNotification('Profile updated successfully', '✓', 3000)
    } catch (error) {
      console.error('Failed to update profile:', error)
      this.showNotification('Failed to update profile', '⚠️', 3000)
    }
  }

  /**
   * Cleanup on page unload
   */
  cleanup() {
    // Cleanup all modules
    if (this.authModule) this.authModule.cleanup()
    if (this.aiAssistant) this.aiAssistant.cleanup()
    if (this.reminderSystem) this.reminderSystem.cleanup()
    if (this.taskManager) this.taskManager.cleanup()

    // Log metrics
    this.performanceMonitor.logMetrics()

    // Cleanup core infrastructure
    this.memoryManager.cleanup()
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const app = new App()
  await app.init()

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => app.cleanup())
})
