import './style.css'

class TodoApp {
  constructor() {
    this.tasks = this.loadTasks()
    this.currentFilter = 'today'
    this.init()
  }

  init() {
    this.setupMobileMenu()
    this.setupEventListeners()
    this.render()
  }

  setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn')
    const sidebar = document.getElementById('sidebar')
    const closeSidebarBtn = document.getElementById('closeSidebarBtn')

    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('hidden')
      })
    }

    if (closeSidebarBtn) {
      closeSidebarBtn.addEventListener('click', () => {
        sidebar.classList.add('hidden')
      })
    }

    // Close sidebar when clicking on a nav item on mobile
    sidebar.querySelectorAll('button, a').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth < 768) {
          sidebar.classList.add('hidden')
        }
      })
    })
  }

  setupEventListeners() {
    const addBtn = document.getElementById('addTaskBtn')
    const input = document.getElementById('newTaskInput')

    if (addBtn && input) {
      addBtn.addEventListener('click', () => this.addTask())
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.addTask()
      })
    }

    // Navigation - main filters
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        document.querySelectorAll('.nav-item').forEach(b => {
          b.classList.remove('bg-blue-600', 'text-white')
          b.classList.add('text-dark-400')
        })
        e.currentTarget.classList.remove('text-dark-400')
        e.currentTarget.classList.add('bg-blue-600', 'text-white')
        this.currentFilter = e.currentTarget.dataset.filter || 'today'
        this.render()
      })
    })

    // Project buttons
    document.querySelectorAll('.project-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        const project = e.currentTarget.dataset.project
        this.currentFilter = 'project:' + project
        this.render()
      })
    })
  }

  addTask() {
    const input = document.getElementById('newTaskInput')
    const project = document.getElementById('projectSelect').value
    const priority = document.getElementById('prioritySelect').value

    if (!input.value.trim()) return

    const task = {
      id: Date.now(),
      title: input.value,
      completed: false,
      priority: priority || 'medium',
      project: project || 'portfolio',
      dueDate: new Date().toLocaleDateString(),
      labels: []
    }

    this.tasks.unshift(task)
    this.saveTasks()
    input.value = ''
    document.getElementById('projectSelect').value = ''
    document.getElementById('prioritySelect').value = 'medium'
    this.render()
  }

  deleteTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id)
    this.saveTasks()
    this.render()
  }

  toggleTask(id) {
    const task = this.tasks.find(t => t.id === id)
    if (task) {
      task.completed = !task.completed
      this.saveTasks()
      this.render()
    }
  }

  getFilteredTasks() {
    let filtered = this.tasks

    if (this.currentFilter === 'today') {
      filtered = filtered.filter(t => !t.completed)
    } else if (this.currentFilter === 'completed') {
      filtered = filtered.filter(t => t.completed)
    } else if (this.currentFilter.startsWith('project:')) {
      const projectValue = this.currentFilter.replace('project:', '').trim()
      filtered = filtered.filter(t => t.project === projectValue)
    }

    return filtered
  }

  render() {
    const tasksList = document.getElementById('tasksList')
    if (!tasksList) return

    const tasks = this.getFilteredTasks()

    if (tasks.length === 0) {
      tasksList.innerHTML = '<div class="text-center py-12 text-dark-400"><p class="text-lg">No tasks here yet</p><p class="text-sm mt-2">Add a new task to get started!</p></div>'
    } else {
      tasksList.innerHTML = tasks.map(task => this.renderTask(task)).join('')
    }

    // Reattach event listeners to checkboxes and delete buttons
    document.querySelectorAll('.task-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.toggleTask(parseInt(e.currentTarget.dataset.id))
      })
    })

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        this.deleteTask(parseInt(e.currentTarget.dataset.id))
      })
    })

    // Update active states for nav items
    document.querySelectorAll('.nav-item').forEach(b => {
      const isActive = (this.currentFilter === (b.dataset.filter || 'today'))
      if (isActive) {
        b.classList.add('bg-blue-600', 'text-white')
        b.classList.remove('text-dark-300')
      } else {
        b.classList.remove('bg-blue-600', 'text-white')
        b.classList.add('text-dark-300')
      }
    })

    // Update active states for project items
    document.querySelectorAll('.project-item').forEach(b => {
      const isActive = (this.currentFilter === ('project:' + (b.dataset.project || '')))
      if (isActive) {
        b.classList.add('bg-blue-600', 'text-white')
        b.classList.remove('text-dark-300')
      } else {
        b.classList.remove('bg-blue-600', 'text-white')
        b.classList.add('text-dark-300')
      }
    })

    // Update stats
    const activeTasks = this.tasks.filter(t => !t.completed).length
    const completedTasks = this.tasks.filter(t => t.completed).length
    
    const activeElement = document.getElementById('activeTasks')
    const completedElement = document.getElementById('completedTasks')
    
    if (activeElement) activeElement.textContent = activeTasks
    if (completedElement) completedElement.textContent = completedTasks
  }

  renderTask(task) {
    const priorityColors = {
      high: 'badge-high',
      medium: 'badge-medium',
      low: 'badge-low'
    }

    const projectLabels = {
      'app-dev': '📱',
      'portfolio': '🌐',
      'marketing': '📢'
    }

    return `
      <div class="task-item ${task.completed ? 'opacity-50' : ''}" data-task-id="${task.id}">
        <input 
          type="checkbox" 
          class="task-checkbox" 
          data-id="${task.id}"
          ${task.completed ? 'checked' : ''}
        >
        <div class="flex-1 min-w-0">
          <p class="text-white ${task.completed ? 'line-through text-dark-500' : ''} break-words">${task.title}</p>
          ${task.labels.length > 0 ? `<div class="flex gap-1 mt-2 flex-wrap">${task.labels.map(label => `<span class="text-xs px-2 py-0.5 bg-dark-700 text-dark-200 rounded">${label}</span>`).join('')}</div>` : ''}
        </div>
        <div class="flex items-center gap-2 ml-2 flex-shrink-0">
          <span class="badge ${priorityColors[task.priority]} whitespace-nowrap">
            ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
          <span class="text-lg opacity-75" title="${task.project}">${projectLabels[task.project] || '📋'}</span>
          <span class="text-xs text-dark-500 whitespace-nowrap">${task.dueDate}</span>
          <button 
            class="delete-btn text-dark-500 hover:text-red-400 transition p-1 hover:bg-dark-700 rounded"
            data-id="${task.id}"
            title="Delete task"
          >
            ✕
          </button>
        </div>
      </div>
    `
  }

  saveTasks() {
    localStorage.setItem('todoTasks', JSON.stringify(this.tasks))
  }

  loadTasks() {
    const stored = localStorage.getItem('todoTasks')
    return stored ? JSON.parse(stored) : this.getDefaultTasks()
  }

  getDefaultTasks() {
    return [
      {
        id: 1,
        title: 'Finalize user authentication module',
        completed: false,
        priority: 'high',
        project: 'app-dev',
        dueDate: '3/16/2025',
        labels: ['App Dev']
      },
      {
        id: 2,
        title: 'Design dark mode UI',
        completed: false,
        priority: 'medium',
        project: 'portfolio',
        dueDate: '3/16/2025',
        labels: ['Portfolio']
      },
      {
        id: 3,
        title: 'Implement drag-and-drop task ordering',
        completed: false,
        priority: 'high',
        project: 'app-dev',
        dueDate: '3/15/2025',
        labels: ['Portfolio', 'Today']
      },
      {
        id: 4,
        title: 'Deploy alpha version 1.2',
        completed: true,
        priority: 'low',
        project: 'app-dev',
        dueDate: '3/14/2025',
        labels: []
      },
      {
        id: 5,
        title: 'Create data visualizations for dashboard',
        completed: false,
        priority: 'medium',
        project: 'portfolio',
        dueDate: '3/17/2025',
        labels: ['UI']
      }
    ]
  }
}

// Initialize app after class definition
const app = new TodoApp()
