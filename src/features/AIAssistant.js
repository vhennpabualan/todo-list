/**
 * AIAssistant Module
 * Handles AI chat interface, message processing, and integration with Cerebras API
 */

export class AIAssistant {
  constructor(apiClient, domManager, animationEngine, memoryManager, showNotification) {
    this.apiClient = apiClient
    this.domManager = domManager
    this.animationEngine = animationEngine
    this.memoryManager = memoryManager
    this.showNotification = showNotification
    
    this.aiApiKey = import.meta.env.VITE_CEREBRAS_API_KEY || ''
    this.aiMessages = []
    this.lastApiCall = 0
    this.apiCallDelay = 1000 // 1 second between API calls
    this.apiRetryCount = 0
    this.maxRetries = 3
    this.tasks = []
    this.reminders = []
    this.currentUser = null
  }

  /**
   * Initialize AI Assistant with event listeners
   */
  init(tasks, reminders, currentUser) {
    this.tasks = tasks
    this.reminders = reminders
    this.currentUser = currentUser
    
    // Only setup listeners once
    if (!this.listenersSetup) {
      this.setupAIAssistant()
      this.setupAIPanelDrag()
      this.setupAIChatBubbleDrag()
      this.setupOutsideClickHandler()
      this.listenersSetup = true
    }
  }

  /**
   * Setup main AI panel event listeners
   */
  setupAIAssistant() {
    const openAIBtn = this.domManager.get('openAIBtn')
    const closeAIBtn = this.domManager.get('closeAIBtn')
    const minimizeAIBtn = this.domManager.get('minimizeAIBtn')
    const aiChatBubble = this.domManager.get('aiChatBubble')
    const clearChatBtn = this.domManager.get('clearChatBtn')
    const clearChatBtnDesktop = this.domManager.get('clearChatBtnDesktop')
    const aiPanel = this.domManager.get('aiPanel')
    const aiOverlay = this.domManager.get('aiOverlay')
    const aiSendBtn = this.domManager.get('aiSendBtn')
    const aiInput = this.domManager.get('aiInput')

    if (openAIBtn) {
      const openHandler = (e) => {
        e.stopPropagation()
        this.checkApiKey()
        this.scrollAIToBottom()
      }
      openAIBtn.addEventListener('click', openHandler)
      this.memoryManager.registerListener(openAIBtn, 'click', openHandler, 'AIAssistant')
    }

    if (closeAIBtn) {
      const closeHandler = (e) => {
        e.stopPropagation()
        aiPanel.classList.add('hidden')
        aiPanel.style.display = 'none'
        aiOverlay.classList.add('hidden')
        if (window.innerWidth < 1024) {
          aiChatBubble.classList.remove('hidden')
        }
      }
      closeAIBtn.addEventListener('click', closeHandler)
      this.memoryManager.registerListener(closeAIBtn, 'click', closeHandler, 'AIAssistant')
    }

    if (minimizeAIBtn) {
      const minimizeHandler = (e) => {
        e.stopPropagation()
        aiPanel.classList.add('hidden')
        aiPanel.style.display = 'none'
        aiOverlay.classList.add('hidden')
        aiChatBubble.classList.remove('hidden')
      }
      minimizeAIBtn.addEventListener('click', minimizeHandler)
      this.memoryManager.registerListener(minimizeAIBtn, 'click', minimizeHandler, 'AIAssistant')
    }

    if (aiChatBubble) {
      const bubbleHandler = (e) => {
        e.stopPropagation()
        aiPanel.classList.remove('hidden')
        aiPanel.style.display = 'flex'
        aiOverlay.classList.remove('hidden')
        aiChatBubble.classList.add('hidden')
        this.scrollAIToBottom()
      }
      aiChatBubble.addEventListener('click', bubbleHandler)
      this.memoryManager.registerListener(aiChatBubble, 'click', bubbleHandler, 'AIAssistant')
    }

    if (clearChatBtn) {
      const clearHandler = () => this.clearAIChat()
      clearChatBtn.addEventListener('click', clearHandler)
      this.memoryManager.registerListener(clearChatBtn, 'click', clearHandler, 'AIAssistant')
    }

    if (clearChatBtnDesktop) {
      const clearHandler = () => this.clearAIChat()
      clearChatBtnDesktop.addEventListener('click', clearHandler)
      this.memoryManager.registerListener(clearChatBtnDesktop, 'click', clearHandler, 'AIAssistant')
    }

    if (aiOverlay) {
      const overlayHandler = (e) => {
        if (e.target === aiOverlay) {
          aiPanel.classList.add('hidden')
          aiPanel.style.display = 'none'
          aiOverlay.classList.add('hidden')
          if (window.innerWidth < 1024) {
            aiChatBubble.classList.remove('hidden')
          }
        }
      }
      aiOverlay.addEventListener('click', overlayHandler)
      this.memoryManager.registerListener(aiOverlay, 'click', overlayHandler, 'AIAssistant')
    }

    if (aiSendBtn && aiInput) {
      const sendHandler = () => this.sendAIMessage()
      aiSendBtn.addEventListener('click', sendHandler)
      this.memoryManager.registerListener(aiSendBtn, 'click', sendHandler, 'AIAssistant')
      
      const keyHandler = (e) => {
        if (e.key === 'Enter') this.sendAIMessage()
      }
      aiInput.addEventListener('keypress', keyHandler)
      this.memoryManager.registerListener(aiInput, 'keypress', keyHandler, 'AIAssistant')
    }
  }

  /**
   * Setup AI panel drag functionality for desktop
   */
  setupAIPanelDrag() {
    const aiPanel = this.domManager.get('aiPanel')
    const header = aiPanel?.querySelector('div:first-child')

    if (!aiPanel || !header || window.innerWidth < 1024) return

    let isDragging = false
    let currentX
    let currentY
    let initialX
    let initialY

    const mouseDownHandler = (e) => {
      if (e.target.closest('button')) return
      
      isDragging = true
      initialX = e.clientX - aiPanel.offsetLeft
      initialY = e.clientY - aiPanel.offsetTop
      aiPanel.classList.add('dragging')
      e.preventDefault()
    }

    const handleMouseMove = (e) => {
      if (!isDragging) return

      currentX = e.clientX - initialX
      currentY = e.clientY - initialY

      const maxX = window.innerWidth - aiPanel.offsetWidth
      const maxY = window.innerHeight - aiPanel.offsetHeight

      currentX = Math.max(0, Math.min(currentX, maxX))
      currentY = Math.max(0, Math.min(currentY, maxY))

      aiPanel.style.position = 'fixed'
      aiPanel.style.left = currentX + 'px'
      aiPanel.style.right = 'auto'
      aiPanel.style.top = currentY + 'px'
      aiPanel.style.bottom = 'auto'
    }

    const handleMouseUp = () => {
      isDragging = false
      aiPanel.classList.remove('dragging')
    }

    header.addEventListener('mousedown', mouseDownHandler)
    this.memoryManager.registerListener(header, 'mousedown', mouseDownHandler, 'AIAssistant')
    
    document.addEventListener('mousemove', handleMouseMove)
    this.memoryManager.registerListener(document, 'mousemove', handleMouseMove, 'AIAssistant')
    
    document.addEventListener('mouseup', handleMouseUp)
    this.memoryManager.registerListener(document, 'mouseup', handleMouseUp, 'AIAssistant')

    const resizeHandler = () => {
      if (window.innerWidth < 1024) {
        isDragging = false
        aiPanel.classList.remove('dragging')
      }
    }
    window.addEventListener('resize', resizeHandler)
    this.memoryManager.registerListener(window, 'resize', resizeHandler, 'AIAssistant')
  }

  /**
   * Setup AI chat bubble drag functionality for mobile
   */
  setupAIChatBubbleDrag() {
    const aiChatBubble = this.domManager.get('aiChatBubble')

    if (!aiChatBubble) return

    let isDragging = false
    let currentX
    let currentY
    let initialX
    let initialY
    let startX
    let startY
    const dragThreshold = 10

    const touchStartHandler = (e) => {
      const touch = e.touches[0]
      startX = touch.clientX
      startY = touch.clientY
      initialX = touch.clientX - aiChatBubble.offsetLeft
      initialY = touch.clientY - aiChatBubble.offsetTop
      isDragging = false
    }

    const touchMoveHandler = (e) => {
      const touch = e.touches[0]
      const deltaX = Math.abs(touch.clientX - startX)
      const deltaY = Math.abs(touch.clientY - startY)
      
      if (deltaX > dragThreshold || deltaY > dragThreshold) {
        isDragging = true
        aiChatBubble.classList.add('dragging')
        
        currentX = touch.clientX - initialX
        currentY = touch.clientY - initialY

        const maxX = window.innerWidth - aiChatBubble.offsetWidth
        const maxY = window.innerHeight - aiChatBubble.offsetHeight

        currentX = Math.max(0, Math.min(currentX, maxX))
        currentY = Math.max(0, Math.min(currentY, maxY))

        aiChatBubble.style.position = 'fixed'
        aiChatBubble.style.left = currentX + 'px'
        aiChatBubble.style.right = 'auto'
        aiChatBubble.style.top = currentY + 'px'
        aiChatBubble.style.bottom = 'auto'
      }
    }

    const touchEndHandler = (e) => {
      aiChatBubble.classList.remove('dragging')
      
      if (!isDragging) {
        const aiPanel = this.domManager.get('aiPanel')
        const aiOverlay = this.domManager.get('aiOverlay')
        aiPanel.classList.remove('hidden')
        aiPanel.style.display = 'flex'
        aiOverlay.classList.remove('hidden')
        aiChatBubble.classList.add('hidden')
        this.scrollAIToBottom()
      }
      isDragging = false
    }

    aiChatBubble.addEventListener('touchstart', touchStartHandler, { passive: true })
    this.memoryManager.registerListener(aiChatBubble, 'touchstart', touchStartHandler, 'AIAssistant')
    
    aiChatBubble.addEventListener('touchmove', touchMoveHandler, { passive: true })
    this.memoryManager.registerListener(aiChatBubble, 'touchmove', touchMoveHandler, 'AIAssistant')
    
    aiChatBubble.addEventListener('touchend', touchEndHandler)
    this.memoryManager.registerListener(aiChatBubble, 'touchend', touchEndHandler, 'AIAssistant')

    // Mouse events for desktop testing
    const mouseDownHandler = (e) => {
      if (window.innerWidth >= 1024) return
      
      startX = e.clientX
      startY = e.clientY
      initialX = e.clientX - aiChatBubble.offsetLeft
      initialY = e.clientY - aiChatBubble.offsetTop
      isDragging = false
      e.preventDefault()
    }

    const handleMouseMove = (e) => {
      if (window.innerWidth >= 1024) return
      
      const deltaX = Math.abs(e.clientX - startX)
      const deltaY = Math.abs(e.clientY - startY)
      
      if (deltaX > dragThreshold || deltaY > dragThreshold) {
        isDragging = true
        aiChatBubble.classList.add('dragging')

        currentX = e.clientX - initialX
        currentY = e.clientY - initialY

        const maxX = window.innerWidth - aiChatBubble.offsetWidth
        const maxY = window.innerHeight - aiChatBubble.offsetHeight

        currentX = Math.max(0, Math.min(currentX, maxX))
        currentY = Math.max(0, Math.min(currentY, maxY))

        aiChatBubble.style.position = 'fixed'
        aiChatBubble.style.left = currentX + 'px'
        aiChatBubble.style.right = 'auto'
        aiChatBubble.style.top = currentY + 'px'
        aiChatBubble.style.bottom = 'auto'
      }
    }

    const handleMouseUp = (e) => {
      if (window.innerWidth >= 1024) return
      
      aiChatBubble.classList.remove('dragging')
      
      if (!isDragging) {
        const aiPanel = this.domManager.get('aiPanel')
        const aiOverlay = this.domManager.get('aiOverlay')
        aiPanel.classList.remove('hidden')
        aiPanel.style.display = 'flex'
        aiOverlay.classList.remove('hidden')
        aiChatBubble.classList.add('hidden')
        this.scrollAIToBottom()
      }
      isDragging = false
      
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    aiChatBubble.addEventListener('mousedown', mouseDownHandler)
    this.memoryManager.registerListener(aiChatBubble, 'mousedown', mouseDownHandler, 'AIAssistant')
  }

  /**
   * Setup outside click handler to close AI panel
   */
  setupOutsideClickHandler() {
    const app = this.domManager.get('app')
    const aiPanel = this.domManager.get('aiPanel')
    const aiOverlay = this.domManager.get('aiOverlay')
    const remindersPanel = this.domManager.get('remindersPanel')

    if (app) {
      const clickHandler = (e) => {
        if (!aiPanel.classList.contains('hidden')) {
          const isClickInsidePanel = aiPanel.contains(e.target)
          const isClickOnOpenBtn = e.target.closest('#openAIBtn')
          const isClickOnFloatingBtn = e.target.closest('#floatingAddBtn')
          const isClickOnTaskModal = e.target.closest('#taskModal')
          const isClickOnDeleteModal = e.target.closest('#deleteModal')
          const isClickOnRemindersPanel = e.target.closest('#remindersPanel')

          if (!isClickInsidePanel && !isClickOnOpenBtn && !isClickOnFloatingBtn && !isClickOnTaskModal && !isClickOnDeleteModal && !isClickOnRemindersPanel) {
            aiPanel.classList.add('hidden')
            aiPanel.style.display = 'none'
            aiOverlay.classList.add('hidden')
            const floatingBtn = this.domManager.get('floatingAddBtn')
            if (floatingBtn) floatingBtn.classList.remove('ai-panel-open')
          }
        }

        if (!remindersPanel.classList.contains('hidden')) {
          const isClickInsideReminders = remindersPanel.contains(e.target)
          const isClickOnRemindersBtn = e.target.closest('#openRemindersBtn')
          const isClickOnReminderModal = e.target.closest('#reminderModal')

          if (!isClickInsideReminders && !isClickOnRemindersBtn && !isClickOnReminderModal) {
            remindersPanel.classList.add('hidden')
            remindersPanel.style.display = 'none'
          }
        }
      }
      app.addEventListener('click', clickHandler)
      this.memoryManager.registerListener(app, 'click', clickHandler, 'AIAssistant')
    }
  }

  /**
   * Check if API key is configured
   */
  checkApiKey() {
    if (!this.aiApiKey) {
      this.addAIMessage('🔑 No API key found. Please add VITE_CEREBRAS_API_KEY to your .env file and restart the dev server.', 'assistant')
      this.addAIMessage('Get your key from: https://console.cerebras.ai', 'assistant')
      this.addAIMessage('Or type your API key here to use it temporarily:', 'assistant')
      return
    }
  }

  /**
   * Test API key connectivity
   */
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
          model: 'cerebras/llama3.1-8b',
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

  /**
   * Generate AI greeting message
   */
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

  /**
   * Send AI message and process response
   */
  async sendAIMessage() {
    const input = this.domManager.get('aiInput')
    const message = input.value.trim()

    if (!message) return

    if (!this.currentUser) {
      this.addAIMessage('Please log in to use the AI assistant', 'assistant')
      setTimeout(() => {
        // Trigger auth modal from parent
        const authModal = this.domManager.get('authModal')
        if (authModal) authModal.classList.remove('hidden')
      }, 500)
      input.value = ''
      return
    }

    this.addAIMessage(message, 'user')
    input.value = ''

    console.log('🤖 Processing message:', message)

    if (this.isDateTimeRequest(message)) {
      console.log('✅ Detected: Date/Time request')
      this.handleDateTimeRequest(message)
      return
    }

    if (this.isTaskCreationRequest(message)) {
      console.log('✅ Detected: Task creation request')
      await this.handleAITaskCreation(message)
      return
    }

    if (this.isReminderCreationRequest(message)) {
      console.log('✅ Detected: Reminder creation request')
      await this.handleAIReminderCreation(message)
      return
    }

    console.log('ℹ️ No special request detected, calling AI API')

    if (!this.aiApiKey) {
      this.addAIMessage('❌ API key not configured. Please add VITE_CEREBRAS_API_KEY to your .env file and restart the dev server.', 'assistant')
      return
    }

    const loadingMsg = document.createElement('div')
    loadingMsg.className = 'ai-message assistant'
    loadingMsg.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>'
    document.getElementById('aiMessages').appendChild(loadingMsg)
    this.scrollAIToBottom()

    try {
      const response = await this.callOpenRouterAPI(message)
      loadingMsg.remove()
      this.addAIMessage(response, 'assistant')
    } catch (error) {
      loadingMsg.remove()
      this.addAIMessage(`❌ Error: ${error.message}`, 'assistant')
    }
  }

  /**
   * Check if message is a date/time request
   */
  isDateTimeRequest(message) {
    const keywords = [
      'what date', 'what\'s the date', 'whats the date', 'current date', 'today\'s date', 'todays date',
      'what time', 'what\'s the time', 'whats the time', 'current time',
      'what day', 'what\'s the day', 'whats the day', 'day is it', 'day today',
      'what year', 'what\'s the year', 'whats the year', 'current year',
      'date today', 'time now', 'today date', 'date and time'
    ]
    const lowerMessage = message.toLowerCase()
    return keywords.some(keyword => lowerMessage.includes(keyword))
  }

  /**
   * Handle date/time request
   */
  handleDateTimeRequest(message) {
    const now = new Date()
    const lowerMessage = message.toLowerCase()
    
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }
    
    const fullDate = now.toLocaleDateString('en-US', dateOptions)
    const time = now.toLocaleTimeString('en-US', timeOptions)
    const year = now.getFullYear()
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
    
    let response = ''
    
    if (lowerMessage.includes('time') && lowerMessage.includes('date')) {
      response = `📅 Today is ${fullDate}\n⏰ Current time is ${time}`
    } else if (lowerMessage.includes('time')) {
      response = `⏰ The current time is ${time}`
    } else if (lowerMessage.includes('year')) {
      response = `📅 The current year is ${year}`
    } else if (lowerMessage.includes('day') && !lowerMessage.includes('date')) {
      response = `📅 Today is ${dayName}`
    } else {
      response = `📅 Today is ${fullDate}`
    }
    
    this.addAIMessage(response, 'assistant')
  }

  /**
   * Check if message is a task creation request
   */
  isTaskCreationRequest(message) {
    const keywords = ['add task', 'create task', 'new task', 'add a task', 'create a task', 'add to my tasks', 'remind me to', 'i need to', 'i should', 'todo:', 'task:']
    const lowerMessage = message.toLowerCase()
    return keywords.some(keyword => lowerMessage.includes(keyword))
  }

  /**
   * Check if message is a reminder creation request
   */
  isReminderCreationRequest(message) {
    const keywords = [
      'set reminder', 'create reminder', 'remind me', 'add reminder', 'new reminder', 'schedule reminder',
      'set a reminder', 'create a reminder', 'add a reminder', 'make a reminder', 'make reminder',
      'reminder for', 'reminder at', 'reminder on', 'reminder about',
      'can you remind', 'could you remind', 'please remind', 'i need a reminder'
    ]
    const lowerMessage = message.toLowerCase()
    return keywords.some(keyword => lowerMessage.includes(keyword))
  }

  /**
   * Handle AI task creation request
   */
  async handleAITaskCreation(message) {
    const loadingMsg = document.createElement('div')
    loadingMsg.className = 'ai-message assistant'
    loadingMsg.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>'
    document.getElementById('aiMessages').appendChild(loadingMsg)
    this.scrollAIToBottom()

    try {
      const taskData = await this.parseTaskFromMessage(message)
      
      if (!taskData.title) {
        loadingMsg.remove()
        this.addAIMessage('❌ I couldn\'t understand what task to create. Please be more specific!', 'assistant')
        return
      }

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
      // Trigger parent to save tasks
      window.dispatchEvent(new CustomEvent('ai-task-created', { detail: task }))

      loadingMsg.remove()
      this.addAIMessage(`✅ Task created: "${task.title}" (${task.priority} priority, ${task.project} project)`, 'assistant')
    } catch (error) {
      loadingMsg.remove()
      this.addAIMessage(`❌ Error creating task: ${error.message}`, 'assistant')
    }
  }

  /**
   * Parse task details from message using AI or local parsing
   */
  async parseTaskFromMessage(message) {
    if (!this.aiApiKey) {
      return this.parseTaskLocally(message)
    }

    const now = Date.now()
    const timeSinceLastCall = now - this.lastApiCall
    
    if (timeSinceLastCall < this.apiCallDelay) {
      const waitTime = this.apiCallDelay - timeSinceLastCall
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before API call`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    this.lastApiCall = Date.now()

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
          model: 'cerebras/llama3.1-8b',
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
        console.warn('API error, falling back to local parsing:', data)
        return this.parseTaskLocally(message)
      }

      const content = data.choices?.[0]?.message?.content
      if (!content) {
        console.warn('No content in API response, falling back to local parsing')
        return this.parseTaskLocally(message)
      }

      const taskData = JSON.parse(content)
      return taskData
    } catch (error) {
      console.error('Task parsing error, falling back to local parsing:', error)
      return this.parseTaskLocally(message)
    }
  }

  /**
   * Parse task locally as fallback
   */
  parseTaskLocally(message) {
    const lowerMessage = message.toLowerCase()
    
    let title = message
      .replace(/^(can you|could you|please|i need|i want|would you)\s+/i, '')
      .replace(/^(add|create|new|make)\s+(a\s+)?(task|todo)\s*/i, '')
      .replace(/^(task|todo):\s*/i, '')
      .replace(/^(remind me to|i need to|i should|i have to)\s*/i, '')
      .replace(/^(to|for)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim()

    let priority = 'medium'
    if (lowerMessage.includes('urgent') || lowerMessage.includes('asap') || lowerMessage.includes('high priority')) {
      priority = 'high'
    } else if (lowerMessage.includes('low priority') || lowerMessage.includes('whenever')) {
      priority = 'low'
    }

    let project = 'personal'
    if (lowerMessage.includes('work') || lowerMessage.includes('project') || lowerMessage.includes('meeting')) {
      project = 'work'
    } else if (lowerMessage.includes('learn') || lowerMessage.includes('study') || lowerMessage.includes('course')) {
      project = 'learning'
    }

    console.log('📝 Parsed task locally:', {
      original: message,
      title: title || 'New Task',
      priority,
      project
    })

    return {
      title: title || 'New Task',
      priority,
      project,
      notes: '',
      labels: []
    }
  }

  /**
   * Handle AI reminder creation request
   */
  async handleAIReminderCreation(message) {
    console.log('🔔 AI Reminder Creation Request:', message)
    
    const loadingMsg = document.createElement('div')
    loadingMsg.className = 'ai-message assistant'
    loadingMsg.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>'
    document.getElementById('aiMessages').appendChild(loadingMsg)
    this.scrollAIToBottom()

    try {
      const reminderData = await this.parseReminderFromMessage(message)
      console.log('📝 Parsed reminder data:', reminderData)
      
      if (!reminderData.title || !reminderData.reminderDateTime) {
        loadingMsg.remove()
        this.addAIMessage('❌ I couldn\'t understand when to remind you. Please specify a date and time!', 'assistant')
        return
      }

      const reminderDate = new Date(reminderData.reminderDateTime)
      const now = new Date()
      
      if (reminderDate <= now) {
        loadingMsg.remove()
        console.warn('⚠️ Reminder date is in the past:', reminderDate)
        this.addAIMessage('⚠️ Cannot create reminder for a past date. Please choose a future date and time!', 'assistant')
        this.showNotification('Reminder must be in the future', '⚠️', 3000)
        return
      }

      const reminder = {
        id: Date.now(),
        title: reminderData.title,
        reminderDateTime: reminderData.reminderDateTime,
        taskId: null,
        completed: false,
        createdDate: new Date().toISOString()
      }

      console.log('➕ Adding reminder to memory:', reminder)
      this.reminders.unshift(reminder)
      
      // Trigger parent to save reminders
      window.dispatchEvent(new CustomEvent('ai-reminder-created', { detail: reminder }))

      loadingMsg.remove()
      this.addAIMessage(`✅ Reminder set: "${reminder.title}" for ${new Date(reminderData.reminderDateTime).toLocaleString()}`, 'assistant')
      this.showNotification(`Reminder set for ${new Date(reminderData.reminderDateTime).toLocaleString()}`, '⏰', 3000)
    } catch (error) {
      console.error('❌ Error creating reminder:', error)
      loadingMsg.remove()
      this.addAIMessage(`❌ Error creating reminder: ${error.message}`, 'assistant')
    }
  }

  /**
   * Parse reminder details from message using AI or local parsing
   */
  async parseReminderFromMessage(message) {
    if (!this.aiApiKey) {
      return this.parseReminderLocally(message)
    }

    const now = Date.now()
    const timeSinceLastCall = now - this.lastApiCall
    
    if (timeSinceLastCall < this.apiCallDelay) {
      const waitTime = this.apiCallDelay - timeSinceLastCall
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before API call`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    this.lastApiCall = Date.now()

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
          model: 'cerebras/llama3.1-8b',
          messages: [
            {
              role: 'system',
              content: `Extract reminder details from the user message. Return a JSON object with:
- title (string, required): The reminder title
- reminderDateTime (string, required): ISO datetime format (YYYY-MM-DDTHH:mm:ss)

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
        console.warn('API error, falling back to local parsing:', data)
        return this.parseReminderLocally(message)
      }

      const content = data.choices?.[0]?.message?.content
      if (!content) {
        console.warn('No content in API response, falling back to local parsing')
        return this.parseReminderLocally(message)
      }

      const reminderData = JSON.parse(content)
      return reminderData
    } catch (error) {
      console.error('Reminder parsing error, falling back to local parsing:', error)
      return this.parseReminderLocally(message)
    }
  }

  /**
   * Parse reminder locally as fallback
   */
  parseReminderLocally(message) {
    const lowerMessage = message.toLowerCase()
    
    let title = message
      .replace(/^(can you|could you|please|i need|i want|would you)\s+/i, '')
      .replace(/^(set|create|add|make)\s+(a\s+)?(reminder|remind me)\s*/i, '')
      .replace(/^(reminder)\s+(for|about|to|at|on)\s*/i, '')
      .replace(/^(remind me)\s+(for|about|to|at|on)?\s*/i, '')
      .replace(/\s*(tomorrow|today|bukas|ngayon)\s*/gi, ' ')
      .replace(/\s*(at|ng|on|by)\s*\d{1,2}(:\d{2})?\s*(am|pm)?\s*/gi, ' ')
      .replace(/\s*\d{1,2}(:\d{2})?\s*(am|pm)\s*/gi, ' ')
      .replace(/^(for|about|to)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim()

    let reminderDateTime = new Date()
    let timeSet = false
    
    const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i
    const timeMatch = message.match(timePattern)
    
    if (timeMatch) {
      let hours = parseInt(timeMatch[1])
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
      const meridiem = timeMatch[3] ? timeMatch[3].toLowerCase() : null
      
      if (meridiem === 'pm' && hours < 12) {
        hours += 12
      } else if (meridiem === 'am' && hours === 12) {
        hours = 0
      } else if (!meridiem && hours < 12) {
        hours += 12
      }
      
      reminderDateTime.setHours(hours, minutes, 0, 0)
      timeSet = true
    }
    
    if (lowerMessage.includes('tomorrow') || lowerMessage.includes('bukas')) {
      reminderDateTime.setDate(reminderDateTime.getDate() + 1)
      if (!timeSet) {
        reminderDateTime.setHours(9, 0, 0, 0)
      }
    } else if (lowerMessage.includes('today') || lowerMessage.includes('ngayon')) {
      if (!timeSet) {
        reminderDateTime.setHours(9, 0, 0, 0)
      }
    } else if (lowerMessage.includes('in 1 hour')) {
      reminderDateTime.setHours(reminderDateTime.getHours() + 1)
    } else if (lowerMessage.includes('in 2 hours')) {
      reminderDateTime.setHours(reminderDateTime.getHours() + 2)
    } else if (!timeSet) {
      reminderDateTime.setHours(reminderDateTime.getHours() + 1)
    }

    console.log('📝 Parsed locally:', { 
      original: message,
      title: title || 'Reminder', 
      reminderDateTime: reminderDateTime.toISOString() 
    })

    return {
      title: title || 'Reminder',
      reminderDateTime: reminderDateTime.toISOString()
    }
  }

  /**
   * Call OpenRouter API for AI responses
   */
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

    const now = Date.now()
    const timeSinceLastCall = now - this.lastApiCall
    
    if (timeSinceLastCall < this.apiCallDelay) {
      const waitTime = this.apiCallDelay - timeSinceLastCall
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before API call`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    this.lastApiCall = Date.now()

    const activeTasks = this.tasks.filter(t => !t.completed).length
    const completedTasks = this.tasks.filter(t => t.completed).length
    
    const now2 = new Date()
    const currentDate = now2.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const currentTime = now2.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    
    const context = `User has ${activeTasks} active tasks and ${completedTasks} completed tasks. Current date and time: ${currentDate}, ${currentTime}.`

    try {
      const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.aiApiKey}`
        },
        body: JSON.stringify({
          model: 'llama3.1-8b',
          messages: [
            {
              role: 'system',
              content: `You are a helpful productivity assistant for a todo app called TaskFlow. ${context} Be concise, encouraging, and helpful. Keep responses under 100 words. When users ask about the current date or time, use the date/time provided in the context above.`
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
        
        if (response.status === 429) {
          this.apiRetryCount++
          
          if (this.apiRetryCount <= this.maxRetries) {
            const retryDelay = this.apiCallDelay * this.apiRetryCount * 2
            console.log(`⏳ Rate limited. Retrying in ${retryDelay}ms (attempt ${this.apiRetryCount}/${this.maxRetries})`)
            
            await new Promise(resolve => setTimeout(resolve, retryDelay))
            return await this.callOpenRouterAPI(message)
          } else {
            this.apiRetryCount = 0
            throw new Error('Rate limit exceeded. Please wait a moment and try again.')
          }
        }
        
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your configuration.')
        }
        
        if (response.status === 402) {
          throw new Error('Insufficient credits. Please add credits to your Cerebras account.')
        }
        
        throw new Error(data.error?.message || 'API request failed')
      }

      this.apiRetryCount = 0

      if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        return data.choices[0].message.content
      }
      
      throw new Error('Invalid API response format')
    } catch (error) {
      console.error('API Error Details:', error)
      
      if (error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection.')
      }
      
      throw error
    }
  }

  /**
   * Add message to AI chat
   */
  addAIMessage(message, sender) {
    const messagesContainer = document.getElementById('aiMessages')
    const messageEl = document.createElement('div')
    messageEl.className = `ai-message ${sender}`
    const textNode = document.createElement('p')
    textNode.className = 'text-xs sm:text-sm'
    textNode.textContent = message
    messageEl.appendChild(textNode)
    messagesContainer.appendChild(messageEl)
    this.scrollAIToBottom()
  }

  /**
   * Scroll AI chat to bottom
   */
  scrollAIToBottom() {
    const aiPanel = this.domManager.get('aiPanel')
    const messagesContainer = aiPanel?.querySelector('.flex-1.overflow-y-auto')
    if (messagesContainer) {
      requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight
      })
    }
  }

  /**
   * Clear AI chat history
   */
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

  /**
   * Check if date is today
   */
  isToday(dateStr) {
    if (!dateStr) return false
    const date = new Date(dateStr)
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  /**
   * Cleanup AI Assistant resources
   */
  cleanup() {
    this.memoryManager.cleanup('AIAssistant')
  }
}
