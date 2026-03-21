/**
 * ReminderSystem Module
 * Handles reminder creation, notifications, and scheduling
 */

export class ReminderSystem {
  constructor(apiClient, domManager, memoryManager, storageManager, showNotification) {
    this.apiClient = apiClient
    this.domManager = domManager
    this.memoryManager = memoryManager
    this.storageManager = storageManager
    this.showNotification = showNotification
    
    this.reminders = []
    this.reminderCheckInterval = null
    this.notifiedReminders = new Set()
  }

  /**
   * Initialize ReminderSystem
   */
  init(reminders) {
    this.reminders = reminders
    // Only setup listeners once
    if (!this.listenersSetup) {
      this.setupRemindersPanel()
      this.setupReminderSystem()
      this.listenersSetup = true
    }
  }

  /**
   * Setup reminders panel UI
   */
  setupRemindersPanel() {
    const addReminderBtn = this.domManager.get('addReminderBtn')
    const closeRemindersBtn = this.domManager.get('closeRemindersPanel')
    const remindersPanel = this.domManager.get('remindersPanel')
    const reminderModal = this.domManager.get('reminderModal')
    const createReminderBtn = this.domManager.get('createReminderBtn')
    const closeReminderModalBtn = this.domManager.get('closeReminderModal')

    if (addReminderBtn) {
      const addHandler = (e) => {
        e.stopPropagation()
        reminderModal.classList.remove('hidden')
        reminderModal.style.display = 'flex'
        const titleInput = this.domManager.get('reminderTitleInput')
        if (titleInput) titleInput.focus()
      }
      addReminderBtn.addEventListener('click', addHandler)
      this.memoryManager.registerListener(addReminderBtn, 'click', addHandler, 'ReminderSystem')
    }

    // Create reminder button in modal
    if (createReminderBtn) {
      const createHandler = () => {
        this.createReminderFromModal()
      }
      createReminderBtn.addEventListener('click', createHandler)
      this.memoryManager.registerListener(createReminderBtn, 'click', createHandler, 'ReminderSystem')
    }

    // Close reminder modal button
    if (closeReminderModalBtn) {
      const closeModalHandler = () => {
        reminderModal.classList.add('hidden')
        reminderModal.style.display = 'none'
      }
      closeReminderModalBtn.addEventListener('click', closeModalHandler)
      this.memoryManager.registerListener(closeReminderModalBtn, 'click', closeModalHandler, 'ReminderSystem')
    }

    if (closeRemindersBtn) {
      const closeHandler = (e) => {
        e.stopPropagation()
        remindersPanel.classList.add('hidden')
        remindersPanel.style.display = 'none'
      }
      closeRemindersBtn.addEventListener('click', closeHandler)
      this.memoryManager.registerListener(closeRemindersBtn, 'click', closeHandler, 'ReminderSystem')
    }

    this.renderReminders()
  }

  /**
   * Open reminders panel
   */
  openRemindersPanel() {
    const remindersPanel = this.domManager.get('remindersPanel')
    remindersPanel.classList.remove('hidden')
    remindersPanel.style.display = 'flex'
    this.renderReminders()
  }

  /**
   * Clear reminder form
   */
  clearReminderForm() {
    const titleInput = this.domManager.get('reminderTitleInput')
    const dateInput = this.domManager.get('reminderDateInput')
    const timeInput = this.domManager.get('reminderTimeInput')
    
    if (titleInput) titleInput.value = ''
    if (dateInput) dateInput.value = ''
    if (timeInput) timeInput.value = ''
  }

  /**
   * Create reminder from modal
   */
  createReminderFromModal() {
    const titleInput = this.domManager.get('reminderTitleInput')
    const dateInput = this.domManager.get('reminderDateInput')
    const timeInput = this.domManager.get('reminderTimeInput')
    
    const title = titleInput?.value.trim() || ''
    const date = dateInput?.value || ''
    const time = timeInput?.value || ''

    if (!title || !date || !time) {
      this.showNotification('Please fill in all fields', '⚠️', 3000)
      return
    }

    const reminderDateTime = `${date}T${time}`
    
    const reminderDate = new Date(reminderDateTime)
    const now = new Date()
    
    if (reminderDate <= now) {
      console.warn('⚠️ Reminder date is in the past:', reminderDate)
      this.showNotification('⚠️ Cannot create reminder for a past date. Please choose a future date and time!', '⚠️', 4000)
      return
    }
    
    this.createReminder(title, reminderDateTime)
    this.clearReminderForm()
    
    const reminderModal = this.domManager.get('reminderModal')
    if (reminderModal) {
      reminderModal.classList.add('hidden')
      reminderModal.style.display = 'none'
    }
    
    this.renderReminders()
  }

  /**
   * Render reminders list
   */
  renderReminders() {
    const remindersList = this.domManager.get('remindersList')
    if (!remindersList) {
      console.warn('⚠️ remindersList element not found')
      return
    }

    const reminders = this.reminders
      .filter(r => !r.completed)
      .sort((a, b) => new Date(a.reminderDateTime) - new Date(b.reminderDateTime))
    console.log('🎨 Rendering', reminders.length, 'active reminders')

    if (reminders.length === 0) {
      remindersList.innerHTML = `
        <div class="text-center py-8">
          <p class="text-3xl mb-2">📭</p>
          <p class="text-sm text-light-600 dark:text-dark-400">No active reminders</p>
        </div>
      `
    } else {
      remindersList.innerHTML = reminders.map(reminder => {
        const reminderDate = new Date(reminder.reminderDateTime)
        const now = new Date()
        const timeDiff = reminderDate - now
        const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
        const hoursLeft = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutesLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
        const isOverdue = timeDiff < 0

        let timeDisplay = ''
        if (isOverdue) {
          const absDiff = Math.abs(timeDiff)
          const overdueMins = Math.floor(absDiff / (1000 * 60))
          const overdueHours = Math.floor(absDiff / (1000 * 60 * 60))
          const overdueDays = Math.floor(absDiff / (1000 * 60 * 60 * 24))
          
          if (overdueDays > 0) {
            timeDisplay = `${overdueDays}d ${overdueHours % 24}h overdue`
          } else if (overdueHours > 0) {
            timeDisplay = `${overdueHours}h ${overdueMins % 60}m overdue`
          } else {
            timeDisplay = `${overdueMins}m overdue`
          }
        } else {
          if (daysLeft > 0) {
            timeDisplay = `${daysLeft}d ${hoursLeft}h ${minutesLeft}m left`
          } else if (hoursLeft > 0) {
            timeDisplay = `${hoursLeft}h ${minutesLeft}m left`
          } else {
            timeDisplay = `${minutesLeft}m left`
          }
        }

        return `
          <div class="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg ${isOverdue ? 'animate-pulse border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/20' : ''}">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm text-light-900 dark:text-white truncate">${reminder.title}</p>
                <p class="text-xs ${isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-orange-600 dark:text-orange-400'} mt-1">
                  ${reminderDate.toLocaleString()} (${timeDisplay})
                </p>
              </div>
              <div class="flex gap-1 flex-shrink-0">
                ${isOverdue ? '<span class="px-2 py-1 bg-red-500 text-white text-xs rounded font-bold animate-pulse">!</span>' : ''}
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

  /**
   * Attach event listeners to reminder buttons
   */
  attachReminderListeners() {
    document.querySelectorAll('.complete-reminder-btn').forEach(btn => {
      const handler = (e) => {
        this.completeReminder(parseInt(e.currentTarget.dataset.id))
        this.renderReminders()
      }
      btn.addEventListener('click', handler)
      this.memoryManager.registerListener(btn, 'click', handler, 'ReminderSystem')
    })

    document.querySelectorAll('.delete-reminder-btn').forEach(btn => {
      const handler = (e) => {
        this.deleteReminder(parseInt(e.currentTarget.dataset.id))
        this.renderReminders()
      }
      btn.addEventListener('click', handler)
      this.memoryManager.registerListener(btn, 'click', handler, 'ReminderSystem')
    })
  }

  /**
   * Setup reminder system (notifications and checking)
   */
  setupReminderSystem() {
    this.requestNotificationPermission()
    
    // Check reminders every minute
    const checkHandler = () => this.checkReminders()
    this.reminderCheckInterval = setInterval(checkHandler, 60000)
    this.memoryManager.registerInterval(this.reminderCheckInterval, 'ReminderSystem')
    
    // Initial check
    this.checkReminders()
  }

  /**
   * Request notification permission
   */
  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  /**
   * Check for reminders that need to be notified
   */
  checkReminders() {
    const now = new Date()
    const upcomingReminders = this.getUpcomingReminders()

    upcomingReminders.forEach(reminder => {
      const reminderDate = new Date(reminder.reminderDateTime)
      const timeDiff = reminderDate - now
      const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60))

      // Notify at 1 hour, 30 minutes, and 5 minutes before
      const notifyTimes = [1, 0.5, 0.083] // hours
      
      notifyTimes.forEach(notifyTime => {
        const notifyKey = `${reminder.id}-${notifyTime}`
        if (!this.notifiedReminders.has(notifyKey) && hoursLeft <= notifyTime && hoursLeft > notifyTime - 0.02) {
          this.sendReminderNotification(reminder, hoursLeft)
          this.notifiedReminders.add(notifyKey)
        }
      })
    })
  }

  /**
   * Send reminder notification
   */
  sendReminderNotification(reminder, hoursLeft) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const timeText = hoursLeft >= 1 ? `${Math.round(hoursLeft)} hour(s)` : `${Math.round(hoursLeft * 60)} minute(s)`
      new Notification('TaskFlow Reminder', {
        body: `${reminder.title} - in ${timeText}`,
        icon: '⏰'
      })
    }
  }

  /**
   * Create a new reminder
   */
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
    
    return reminder
  }

  /**
   * Delete a reminder
   */
  async deleteReminder(id) {
    const index = this.reminders.findIndex(r => r.id === id)
    if (index !== -1) {
      this.reminders.splice(index, 1)
      await this.saveReminders()
    }
  }

  /**
   * Complete a reminder
   */
  async completeReminder(id) {
    const reminder = this.reminders.find(r => r.id === id)
    if (reminder) {
      reminder.completed = true
      await this.saveReminders()
    }
  }

  /**
   * Get upcoming reminders
   */
  getUpcomingReminders() {
    const now = new Date()
    return this.reminders.filter(r => {
      const reminderDate = new Date(r.reminderDateTime)
      return !r.completed && reminderDate > now
    })
  }

  /**
   * Save reminders to local storage
   */
  saveReminders() {
    this.storageManager.set('reminders', this.reminders)
  }

  /**
   * Load reminders from local storage
   */
  loadReminders() {
    const reminders = this.storageManager.get('reminders')
    return reminders || []
  }

  /**
   * Cleanup ReminderSystem resources
   */
  cleanup() {
    if (this.reminderCheckInterval) {
      clearInterval(this.reminderCheckInterval)
    }
    this.memoryManager.cleanup('ReminderSystem')
  }
}
