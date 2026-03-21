/**
 * TaskManager Module
 * Handles task CRUD operations, filtering, sorting, and rendering
 */

export class TaskManager {
  constructor(apiClient, domManager, animationEngine, storageManager, memoryManager, showNotification, performanceMonitor = null) {
    this.apiClient = apiClient
    this.domManager = domManager
    this.animationEngine = animationEngine
    this.storageManager = storageManager
    this.memoryManager = memoryManager
    this.showNotification = showNotification
    this.performanceMonitor = performanceMonitor
    
    this.tasks = []
    this.currentFilter = 'inbox'
    this.editingTaskId = null
    this.pendingDeleteId = null
    this.currentUser = null
  }

  /**
   * Initialize TaskManager
   */
  init(tasks, currentFilter, currentUser) {
    this.tasks = tasks
    this.currentFilter = currentFilter
    this.currentUser = currentUser
    
    try {
      // Only setup listeners once
      if (!this.listenersSetup) {
        this.setupFloatingTaskModal()
        this.setupEventListeners()
        this.listenersSetup = true
      }
      this.render()
    } catch (error) {
      console.error('Error initializing TaskManager:', error)
    }
  }

  /**
   * Setup floating task modal
   */
  setupFloatingTaskModal() {
    const floatingAddBtn = this.domManager.get('floatingAddBtn')
    const taskModal = this.domManager.get('taskModal')
    const closeTaskBtn = this.domManager.get('closeTaskModal')
    const submitTaskBtn = this.domManager.get('modalAddTaskBtn')

    if (floatingAddBtn) {
      const openHandler = () => this.openTaskModal()
      floatingAddBtn.addEventListener('click', openHandler)
      this.memoryManager.registerListener(floatingAddBtn, 'click', openHandler, 'TaskManager')
    }

    if (closeTaskBtn) {
      const closeHandler = () => this.closeTaskModal()
      closeTaskBtn.addEventListener('click', closeHandler)
      this.memoryManager.registerListener(closeTaskBtn, 'click', closeHandler, 'TaskManager')
    }

    if (submitTaskBtn) {
      const submitHandler = () => this.addTaskFromModal()
      submitTaskBtn.addEventListener('click', submitHandler)
      this.memoryManager.registerListener(submitTaskBtn, 'click', submitHandler, 'TaskManager')
    }

    if (taskModal) {
      const modalHandler = (e) => {
        if (e.target === taskModal) {
          this.closeTaskModal()
        }
      }
      taskModal.addEventListener('click', modalHandler)
      this.memoryManager.registerListener(taskModal, 'click', modalHandler, 'TaskManager')
    }
  }

  /**
   * Open task modal
   */
  openTaskModal() {
    const taskModal = this.domManager.get('taskModal')
    if (taskModal) {
      taskModal.classList.remove('hidden')
      taskModal.style.display = 'flex'
      const titleInput = this.domManager.get('modalTaskInput')
      if (titleInput) titleInput.focus()
    }
  }

  /**
   * Close task modal
   */
  closeTaskModal() {
    const taskModal = this.domManager.get('taskModal')
    if (taskModal) {
      taskModal.classList.add('hidden')
      taskModal.style.display = 'none'
    }
    this.clearModalForm()
    this.editingTaskId = null
  }

  /**
   * Clear modal form
   */
  clearModalForm() {
    const titleInput = this.domManager.get('modalTaskInput')
    const notesInput = this.domManager.get('modalTaskNotes')
    const projectSelect = this.domManager.get('modalProjectSelect')
    const prioritySelect = this.domManager.get('modalPrioritySelect')
    const dueDateInput = this.domManager.get('modalDueDateInput')

    if (titleInput) titleInput.value = ''
    if (notesInput) notesInput.value = ''
    if (projectSelect) projectSelect.value = 'personal'
    if (prioritySelect) prioritySelect.value = 'medium'
    if (dueDateInput) dueDateInput.value = ''
  }

  /**
   * Add task from modal
   */
  addTaskFromModal() {
    if (this.performanceMonitor) {
      this.performanceMonitor.markStart('task-create')
    }

    const titleInput = this.domManager.get('modalTaskInput')
    const notesInput = this.domManager.get('modalTaskNotes')
    const projectSelect = this.domManager.get('modalProjectSelect')
    const prioritySelect = this.domManager.get('modalPrioritySelect')
    const dueDateInput = this.domManager.get('modalDueDateInput')

    const title = titleInput?.value.trim() || ''
    const notes = notesInput?.value.trim() || ''
    const project = projectSelect?.value || 'personal'
    const priority = prioritySelect?.value || 'medium'
    const dueDate = dueDateInput?.value || ''

    if (!title) {
      this.showNotification('Please enter a task title', '⚠️', 2000)
      return
    }

    if (this.editingTaskId) {
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

    if (this.performanceMonitor) {
      this.performanceMonitor.markEnd('task-create')
    }
  }

  /**
   * Edit task
   */
  editTask(id) {
    if (!this.currentUser) {
      this.showNotification('Please log in to edit tasks', '🔐', 2000)
      return
    }

    const task = this.tasks.find(t => t.id === id)
    if (!task) return

    const titleInput = this.domManager.get('modalTaskInput')
    const notesInput = this.domManager.get('modalTaskNotes')
    const projectSelect = this.domManager.get('modalProjectSelect')
    const prioritySelect = this.domManager.get('modalPrioritySelect')
    const dueDateInput = this.domManager.get('modalDueDateInput')

    if (titleInput) titleInput.value = task.title
    if (notesInput) notesInput.value = task.notes
    if (projectSelect) projectSelect.value = task.project
    if (prioritySelect) prioritySelect.value = task.priority
    if (dueDateInput) dueDateInput.value = task.dueDate

    this.editingTaskId = id
    this.openTaskModal()
  }

  /**
   * Setup event listeners for task list
   */
  setupEventListeners() {
    const taskList = this.domManager.get('tasksList')
    if (!taskList) return

    // Use event delegation for task items
    const delegateHandler = (e) => {
      const deleteBtn = e.target.closest('.delete-task-btn')
      const toggleBtn = e.target.closest('.toggle-task-btn')
      const editBtn = e.target.closest('.edit-task-btn')

      if (deleteBtn) {
        const taskId = parseInt(deleteBtn.dataset.id)
        this.showDeleteConfirm(taskId)
      } else if (toggleBtn) {
        const taskId = parseInt(toggleBtn.dataset.id)
        this.toggleTask(taskId)
      } else if (editBtn) {
        const taskId = parseInt(editBtn.dataset.id)
        this.editTask(taskId)
      }
    }

    taskList.addEventListener('click', delegateHandler)
    this.memoryManager.registerListener(taskList, 'click', delegateHandler, 'TaskManager')

    // Setup delete modal buttons
    const confirmDeleteBtn = this.domManager.get('confirmDeleteBtn')
    const cancelDeleteBtn = this.domManager.get('cancelDeleteBtn')

    if (confirmDeleteBtn) {
      const confirmHandler = () => {
        if (this.pendingDeleteId) {
          this.deleteTask(this.pendingDeleteId)
          this.closeDeleteModal()
        }
      }
      confirmDeleteBtn.addEventListener('click', confirmHandler)
      this.memoryManager.registerListener(confirmDeleteBtn, 'click', confirmHandler, 'TaskManager')
    }

    if (cancelDeleteBtn) {
      const cancelHandler = () => this.closeDeleteModal()
      cancelDeleteBtn.addEventListener('click', cancelHandler)
      this.memoryManager.registerListener(cancelDeleteBtn, 'click', cancelHandler, 'TaskManager')
    }

    // Setup navigation filter buttons
    const navItems = document.querySelectorAll('[data-filter]')
    navItems.forEach(item => {
      const filterHandler = () => {
        this.currentFilter = item.dataset.filter
        this.render()
      }
      item.addEventListener('click', filterHandler)
      this.memoryManager.registerListener(item, 'click', filterHandler, 'TaskManager')
    })

    // Setup project filter buttons
    const projectItems = document.querySelectorAll('[data-project]')
    projectItems.forEach(item => {
      const projectHandler = () => {
        this.currentProject = item.dataset.project
        this.render()
      }
      item.addEventListener('click', projectHandler)
      this.memoryManager.registerListener(item, 'click', projectHandler, 'TaskManager')
    })
  }

  /**
   * Show delete confirmation
   */
  showDeleteConfirm(taskId) {
    this.pendingDeleteId = taskId
    const deleteModal = this.domManager.get('deleteModal')
    if (deleteModal) {
      deleteModal.classList.remove('hidden')
      deleteModal.style.display = 'flex'
    }
  }

  /**
   * Close delete modal
   */
  closeDeleteModal() {
    this.pendingDeleteId = null
    const deleteModal = this.domManager.get('deleteModal')
    if (deleteModal) {
      deleteModal.classList.add('hidden')
      deleteModal.style.display = 'none'
    }
  }

  /**
   * Delete task
   */
  async deleteTask(id) {
    if (this.performanceMonitor) {
      this.performanceMonitor.markStart('task-delete')
    }

    const index = this.tasks.findIndex(t => t.id === id)
    if (index !== -1) {
      this.tasks.splice(index, 1)
      await this.saveTasks()
      this.render()
      this.showNotification('Task deleted', '🗑️', 2000)
    }

    if (this.performanceMonitor) {
      this.performanceMonitor.markEnd('task-delete')
    }
  }

  /**
   * Toggle task completion
   */
  toggleTask(id) {
    if (this.performanceMonitor) {
      this.performanceMonitor.markStart('task-toggle')
    }

    const task = this.tasks.find(t => t.id === id)
    if (task) {
      task.completed = !task.completed
      if (task.completed) {
        task.completedDate = new Date().toISOString().split('T')[0]
      } else {
        task.completedDate = null
      }
      this.saveTasks()
      this.render()
    }

    if (this.performanceMonitor) {
      this.performanceMonitor.markEnd('task-toggle')
    }
  }

  /**
   * Get filtered tasks
   */
  getFilteredTasks() {
    let filtered = this.tasks

    if (this.currentFilter === 'completed') {
      filtered = filtered.filter(t => t.completed)
    } else if (this.currentFilter === 'active') {
      filtered = filtered.filter(t => !t.completed)
    }

    return filtered
  }

  /**
   * Render task list
   */
  render() {
    if (this.performanceMonitor) {
      this.performanceMonitor.markStart('task-render')
    }

    const taskList = this.domManager.get('tasksList')
    if (!taskList) return

    const filtered = this.getFilteredTasks()

    if (filtered.length === 0) {
      taskList.innerHTML = `
        <div class="text-center py-12">
          <p class="text-4xl mb-2">📭</p>
          <p class="text-light-600 dark:text-dark-400">No tasks yet. Create one to get started!</p>
        </div>
      `
    } else {
      taskList.innerHTML = filtered.map(task => this.renderTask(task)).join('')
    }

    this.attachTaskListeners()
    this.updateStats()
    this.updateNavigation()

    if (this.performanceMonitor) {
      this.performanceMonitor.markEnd('task-render')
    }
  }

  /**
   * Render individual task
   */
  renderTask(task) {
    const priorityColors = {
      high: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      low: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    }

    const projectColors = {
      work: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      personal: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      learning: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
    }

    return `
      <div class="task-item p-4 bg-light-50 dark:bg-dark-700 border border-light-200 dark:border-dark-600 rounded-lg hover:shadow-md transition ${task.completed ? 'opacity-60' : ''}">
        <div class="flex items-start gap-3">
          <button class="toggle-task-btn flex-shrink-0 mt-1 w-6 h-6 rounded border-2 ${task.completed ? 'bg-green-500 border-green-500' : 'border-light-300 dark:border-dark-500'} flex items-center justify-center transition" data-id="${task.id}">
            ${task.completed ? '✓' : ''}
          </button>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-light-900 dark:text-white ${task.completed ? 'line-through' : ''}">${task.title}</h3>
            ${task.notes ? `<p class="text-sm text-light-600 dark:text-dark-400 mt-1">${task.notes}</p>` : ''}
            <div class="flex flex-wrap gap-2 mt-2">
              <span class="text-xs px-2 py-1 rounded ${priorityColors[task.priority] || priorityColors.medium}">${task.priority}</span>
              <span class="text-xs px-2 py-1 rounded ${projectColors[task.project] || projectColors.personal}">${task.project}</span>
              ${task.dueDate ? `<span class="text-xs px-2 py-1 rounded bg-light-100 dark:bg-dark-600 text-light-700 dark:text-dark-300">📅 ${task.dueDate}</span>` : ''}
            </div>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button class="edit-task-btn p-2 hover:bg-light-200 dark:hover:bg-dark-600 rounded transition" data-id="${task.id}" title="Edit">✏️</button>
            <button class="delete-task-btn p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition" data-id="${task.id}" title="Delete">🗑️</button>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Attach task listeners
   */
  attachTaskListeners() {
    // Listeners are now attached via event delegation in setupEventListeners
  }

  /**
   * Update task statistics
   */
  updateStats() {
    const totalTasks = this.tasks.length
    const completedTasks = this.tasks.filter(t => t.completed).length
    const activeTasks = totalTasks - completedTasks

    const totalEl = document.getElementById('totalTasks')
    const activeEl = document.getElementById('activeTasks')
    const completedEl = document.getElementById('completedTasks')

    if (totalEl) totalEl.textContent = totalTasks
    if (activeEl) activeEl.textContent = activeTasks
    if (completedEl) completedEl.textContent = completedTasks
  }

  /**
   * Update navigation
   */
  updateNavigation() {
    const navItems = document.querySelectorAll('[data-filter]')
    navItems.forEach(item => {
      if (item.dataset.filter === this.currentFilter) {
        item.classList.add('active')
      } else {
        item.classList.remove('active')
      }
    })
  }

  /**
   * Save tasks to local storage
   */
  saveTasks() {
    this.storageManager.set('tasks', this.tasks)
  }

  /**
   * Load tasks from local storage
   */
  loadTasks() {
    const tasks = this.storageManager.get('tasks')
    return tasks || []
  }

  /**
   * Cleanup TaskManager resources
   */
  cleanup() {
    this.memoryManager.cleanup('TaskManager')
  }
}
