# Implementation Plan: Performance Optimization

## Overview

This implementation plan transforms the monolithic 3250-line main.js into a modular, performance-optimized architecture. The approach focuses on creating core infrastructure modules first (DOMManager, APIClient, PerformanceMonitor, MemoryManager), then implementing utility modules (AnimationEngine, StorageManager), followed by refactoring the TodoApp class into feature modules with lazy loading. Each step builds incrementally, ensuring the application remains functional throughout the refactoring process.

## Tasks

- [x] 1. Set up module architecture and build configuration
  - Create directory structure: src/core/, src/features/, src/utils/
  - Configure Vite for code splitting and chunk optimization
  - Set up build size analysis and warnings for chunks > 200KB
  - Enable tree-shaking, minification, and gzip compression
  - Configure source maps for development only
  - _Requirements: 1.1, 1.3, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2. Implement DOMManager with element caching
  - [x] 2.1 Create DOMManager class with cache initialization
    - Implement constructor with Map-based cache
    - Create init() method to cache critical elements (taskList, sidebar, taskModal, aiPanel, deleteModal, authModal, notificationToast)
    - Implement get() method with cache validation
    - Implement getAll() method for selector queries
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ]* 2.2 Write property test for DOM cache identity
    - **Property 2: DOM Cache Identity**
    - **Validates: Requirements 2.3**
  
  - [ ]* 2.3 Write property test for DOM cache validation
    - **Property 3: DOM Cache Validation**
    - **Validates: Requirements 2.4**
  
  - [x] 2.4 Implement event delegation system
    - Create delegate() method for parent-level event attachment
    - Create undelegate() method for cleanup
    - Implement delegated event registry with Map storage
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ]* 2.5 Write unit tests for DOMManager
    - Test cache initialization with critical elements
    - Test get() returns cached references
    - Test cache invalidation when elements removed
    - Test event delegation attachment and cleanup
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2_

- [x] 3. Implement APIClient with optimization features
  - [x] 3.1 Create APIClient base class with Supabase integration
    - Implement constructor with URL, key, and cache initialization
    - Create buildUrl() helper for query string construction
    - Implement basic get(), post(), patch(), delete() methods
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 3.2 Add debouncing logic to APIClient
    - Implement debounceRequest() method with timer management
    - Add debounce option to request methods
    - Set default debounce delay to 300ms
    - _Requirements: 3.1_
  
  - [ ]* 3.3 Write property test for API request batching
    - **Property 4: API Request Batching**
    - **Validates: Requirements 3.2**
  
  - [x] 3.4 Implement retry logic with exponential backoff
    - Create fetchWithRetry() method
    - Implement exponential backoff: 1s, 2s, 4s delays
    - Set max retries to 3 (4 total attempts)
    - Handle authentication token refresh on 401 errors
    - _Requirements: 3.3, 3.4_
  
  - [ ]* 3.5 Write property test for API retry exhaustion
    - **Property 5: API Retry Exhaustion**
    - **Validates: Requirements 3.4**
  
  - [x] 3.6 Add response caching with TTL
    - Implement cache storage with timestamp tracking
    - Set default cache TTL to 60 seconds
    - Add cache invalidation methods
    - Implement clearCache() for manual cache clearing
    - _Requirements: 3.5_
  
  - [ ]* 3.7 Write property test for API response caching
    - **Property 6: API Response Caching**
    - **Validates: Requirements 3.5**
  
  - [x] 3.8 Implement batch operations
    - Create batchGet() method for multiple ID lookups
    - Create batchPost() method for bulk inserts
    - Combine requests within batching window
    - _Requirements: 3.2_
  
  - [ ]* 3.9 Write unit tests for APIClient
    - Test debounce delay is 300ms
    - Test exponential backoff delays (1s, 2s, 4s)
    - Test cache TTL is 60 seconds
    - Test retry count is exactly 4 attempts
    - Test batch operations combine requests
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure core infrastructure tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement PerformanceMonitor for metrics tracking
  - [x] 5.1 Create PerformanceMonitor class with metrics collection
    - Implement constructor with metrics storage
    - Create init() method using Navigation Timing API
    - Track page load time on window load event
    - Track time-to-interactive using PerformanceObserver
    - _Requirements: 7.1, 7.2_
  
  - [x] 5.2 Add operation tracking methods
    - Implement markStart() using performance.mark()
    - Implement markEnd() using performance.mark()
    - Implement measure() using performance.measure()
    - Store operation durations in Map
    - _Requirements: 7.3_
  
  - [ ]* 5.3 Write property test for performance measurement
    - **Property 10: Performance Measurement**
    - **Validates: Requirements 7.3**
  
  - [x] 5.4 Add performance budget monitoring
    - Implement setBudget() for operation thresholds
    - Implement checkBudget() with violation tracking
    - Log budget violations to console
    - _Requirements: 7.4_
  
  - [x] 5.5 Add metrics reporting
    - Implement getMetrics() to return all collected data
    - Implement logMetrics() for development mode logging
    - Format output with operation averages
    - _Requirements: 7.4, 7.5_
  
  - [ ]* 5.6 Write unit tests for PerformanceMonitor
    - Test page load time is recorded
    - Test TTI is recorded
    - Test operation durations are tracked
    - Test budget violations are logged
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6. Implement MemoryManager for resource cleanup
  - [x] 6.1 Create MemoryManager class with resource registries
    - Implement constructor with Map/Set storage for listeners, intervals, timeouts
    - Create registerListener() method with scope tracking
    - Create registerInterval() method with scope tracking
    - Create registerTimeout() method with scope tracking
    - Create registerResource() method for custom cleanup functions
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 6.2 Implement cleanup methods
    - Create cleanup() method with optional scope parameter
    - Implement cleanupListeners() to remove event listeners
    - Implement cleanupIntervals() to clear intervals
    - Implement cleanupTimeouts() to clear timeouts
    - Execute custom cleanup functions
    - _Requirements: 5.1, 5.2, 5.4, 5.5_
  
  - [ ]* 6.3 Write property test for resource cleanup completeness
    - **Property 8: Resource Cleanup Completeness**
    - **Validates: Requirements 5.1, 5.2**
  
  - [x] 6.4 Add resource monitoring
    - Implement getActiveResources() to return counts
    - Track listeners, intervals, timeouts, custom resources
    - _Requirements: 5.3_
  
  - [ ]* 6.5 Write unit tests for MemoryManager
    - Test drag-and-drop cleanup removes listeners
    - Test notification cleanup clears references
    - Test scope-based cleanup only affects target scope
    - Test getActiveResources returns accurate counts
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 7. Implement AnimationEngine for GPU-optimized animations
  - [x] 7.1 Create AnimationEngine class with will-change management
    - Implement constructor
    - Create prepareAnimation() to apply will-change hints
    - Create cleanupAnimation() to remove will-change hints
    - Implement animate() method using Web Animations API
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 7.2 Write property test for animation will-change lifecycle
    - **Property 7: Animation will-change Lifecycle**
    - **Validates: Requirements 4.2, 4.3**
  
  - [x] 7.3 Add animation helper methods
    - Implement fadeIn() using opacity transform
    - Implement fadeOut() using opacity transform
    - Implement slideIn() using translate transform
    - Ensure all helpers use GPU-accelerated properties only
    - _Requirements: 4.1_
  
  - [x] 7.4 Add reduced motion support
    - Implement respectReducedMotion() to check user preference
    - Disable non-essential animations when reduced motion preferred
    - _Requirements: 4.5_
  
  - [ ]* 7.5 Write unit tests for AnimationEngine
    - Test will-change applied at animation start
    - Test will-change removed at animation end
    - Test reduced motion disables animations
    - Test helpers use only transform and opacity
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [x] 8. Implement StorageManager for LocalStorage optimization
  - [x] 8.1 Create StorageManager class with caching
    - Implement constructor with memory cache Map
    - Create get() method with cache-first strategy
    - Create set() method with debouncing
    - Set debounce delay to 500ms
    - _Requirements: 9.1, 9.3_
  
  - [ ]* 8.2 Write property test for storage read caching
    - **Property 12: Storage Read Caching**
    - **Validates: Requirements 9.3**
  
  - [x] 8.3 Add delta serialization
    - Implement setMultiple() for batch updates
    - Track changed keys only
    - Serialize only modified data
    - _Requirements: 9.2_
  
  - [x] 8.4 Add quota management
    - Implement getUsage() to calculate storage usage
    - Implement cleanup() with LRU eviction
    - Handle QuotaExceededError gracefully
    - Remove oldest cached data first when quota exceeded
    - _Requirements: 9.5_
  
  - [x] 8.5 Add compression for large data
    - Detect large data structures (> 10KB)
    - Apply compression before storing
    - Decompress on retrieval
    - _Requirements: 9.4_
  
  - [ ]* 8.6 Write unit tests for StorageManager
    - Test debounce delay is 500ms
    - Test cache-first reads avoid re-parsing
    - Test LRU cleanup on quota exceeded
    - Test compression applied to large data
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 9. Checkpoint - Ensure all utility modules tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Refactor TodoApp class - Extract AuthModule
  - [x] 10.1 Create AuthModule feature class
    - Extract authentication methods from TodoApp
    - Move showAuthModal, hideAuthModal, setupAuthModal, toggleAuthMode
    - Move handleAuth, signUp, signIn, refreshSession, logout
    - Move storeUserProfile, getUserProfile, updateUserProfile
    - Integrate with APIClient for Supabase calls
    - Integrate with DOMManager for element access
    - Integrate with MemoryManager for event listener cleanup
    - _Requirements: 1.1, 1.4, 8.3_
  
  - [x] 10.2 Update main.js to lazy load AuthModule
    - Add dynamic import for AuthModule
    - Trigger load on login button click
    - Handle module load errors with user-friendly message
    - _Requirements: 1.2, 8.3, 8.5_
  
  - [ ]* 10.3 Write unit tests for AuthModule
    - Test authentication flow
    - Test session refresh
    - Test profile management
    - Test integration with APIClient
    - _Requirements: 8.3_

- [-] 11. Refactor TodoApp class - Extract AIAssistant
  - [ ] 11.1 Create AIAssistant feature class
    - Extract AI chat methods from TodoApp
    - Move setupAIAssistant, setupAIPanelDrag, setupAIChatBubbleDrag
    - Move checkApiKey, testApiKey, generateAIGreeting, sendAIMessage
    - Move isDateTimeRequest, handleDateTimeRequest, isTaskCreationRequest
    - Move handleAITaskCreation, parseTaskFromMessage, parseTaskLocally
    - Move isReminderCreationRequest, handleAIReminderCreation, parseReminderFromMessage
    - Move callOpenRouterAPI, addAIMessage, scrollAIToBottom, clearAIChat
    - Integrate with APIClient for Cerebras API calls
    - Integrate with DOMManager for panel manipulation
    - Integrate with AnimationEngine for panel animations
    - Integrate with MemoryManager for drag event cleanup
    - _Requirements: 1.1, 1.4, 8.2_
  
  - [ ] 11.2 Update main.js to lazy load AIAssistant
    - Add dynamic import for AIAssistant
    - Trigger load on AI chat panel open
    - Handle module load errors with user-friendly message
    - _Requirements: 1.2, 8.2, 8.5_
  
  - [ ]* 11.3 Write unit tests for AIAssistant
    - Test chat message handling
    - Test task creation from AI
    - Test reminder creation from AI
    - Test panel drag functionality
    - _Requirements: 8.2_

- [ ] 12. Refactor TodoApp class - Extract ReminderSystem
  - [ ] 12.1 Create ReminderSystem feature class
    - Extract reminder methods from TodoApp
    - Move setupRemindersPanel, openRemindersPanel, clearReminderForm
    - Move createReminderFromModal, renderReminders, attachReminderListeners
    - Move setupReminderSystem, requestNotificationPermission, checkReminders
    - Move sendReminderNotification, createReminder, deleteReminder, completeReminder
    - Move getUpcomingReminders, saveReminders, loadReminders
    - Move saveRemindersToSupabase, getReminderFromSupabase, deleteReminderFromSupabase
    - Move updateReminderInSupabase, loadRemindersFromSupabase
    - Integrate with APIClient for Supabase operations
    - Integrate with DOMManager for panel rendering
    - Integrate with MemoryManager for interval cleanup
    - Integrate with StorageManager for local persistence
    - _Requirements: 1.1, 1.4, 8.4_
  
  - [ ] 12.2 Update main.js to lazy load ReminderSystem
    - Add dynamic import for ReminderSystem
    - Trigger load on first reminder creation
    - Handle module load errors with user-friendly message
    - _Requirements: 1.2, 8.4, 8.5_
  
  - [ ]* 12.3 Write unit tests for ReminderSystem
    - Test reminder creation and deletion
    - Test notification scheduling
    - Test reminder persistence
    - Test integration with StorageManager
    - _Requirements: 8.4_

- [ ] 13. Refactor TodoApp class - Extract TaskManager
  - [ ] 13.1 Create TaskManager feature class
    - Extract task CRUD methods from TodoApp
    - Move setupFloatingTaskModal, openTaskModal, closeTaskModal, clearModalForm
    - Move addTaskFromModal, editTask, deleteTask, toggleTask
    - Move getFilteredTasks, render, renderTask, attachTaskListeners
    - Move updateStats, updateNavigation, saveTasks, loadTasks
    - Move saveTasksToSupabase, getTaskFromSupabase, deleteTaskFromSupabase
    - Move updateTaskInSupabase, loadTasksFromSupabase
    - Integrate with APIClient for Supabase operations
    - Integrate with DOMManager for task list rendering and event delegation
    - Integrate with AnimationEngine for task animations
    - Integrate with StorageManager for local persistence
    - Integrate with MemoryManager for event cleanup on re-render
    - _Requirements: 1.1, 8.1_
  
  - [ ]* 13.2 Write property test for event listener stability
    - **Property 9: Event Listener Stability**
    - **Validates: Requirements 6.3**
  
  - [ ]* 13.3 Write unit tests for TaskManager
    - Test task CRUD operations
    - Test filtering and sorting
    - Test event delegation for task items
    - Test integration with DOMManager
    - Test root listener count <= 20
    - _Requirements: 8.1, 6.3, 6.5_

- [-] 14. Update main.js to core bootstrap only
  - [ ] 14.1 Refactor main.js to minimal bootstrap
    - Keep only core initialization logic
    - Import and initialize DOMManager, APIClient, PerformanceMonitor, MemoryManager
    - Set up lazy loading functions for Auth, AI, Reminders, Tasks
    - Keep theme management, mobile menu, notifications in main.js
    - Remove all feature-specific code
    - Ensure main.js is under 20KB
    - _Requirements: 1.1, 1.2, 8.1_
  
  - [ ]* 14.2 Write property test for module load performance
    - **Property 1: Module Load Performance**
    - **Validates: Requirements 1.5**
  
  - [ ]* 14.3 Write property test for module load error handling
    - **Property 11: Module Load Error Handling**
    - **Validates: Requirements 8.5**

- [x] 15. Checkpoint - Ensure refactored modules work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Integrate PerformanceMonitor into application lifecycle
  - [ ] 16.1 Add performance tracking to main.js
    - Track page load time on initialization
    - Track time-to-interactive
    - Set performance budgets for key operations
    - _Requirements: 7.1, 7.2, 7.4_
  
  - [ ] 16.2 Add performance tracking to TaskManager
    - Track task render duration
    - Track task CRUD operation durations
    - Set budget: render < 50ms, CRUD < 100ms
    - _Requirements: 7.3, 7.4_
  
  - [ ] 16.3 Add performance tracking to module loading
    - Track lazy load duration for each feature module
    - Set budget: module load < 200ms
    - _Requirements: 1.5, 7.3_
  
  - [ ] 16.4 Add metrics logging in development mode
    - Log all metrics on page unload
    - Display budget violations prominently
    - _Requirements: 7.4, 7.5_

- [ ] 17. Integrate MemoryManager into application lifecycle
  - [ ] 17.1 Add cleanup to TaskManager
    - Register event listeners with MemoryManager
    - Clean up on task list re-render
    - Clean up drag-and-drop listeners after operations
    - _Requirements: 5.1, 5.4, 6.3_
  
  - [ ] 17.2 Add cleanup to AIAssistant
    - Register drag event listeners with MemoryManager
    - Clean up on panel close
    - _Requirements: 5.1, 5.4_
  
  - [ ] 17.3 Add cleanup to ReminderSystem
    - Register notification intervals with MemoryManager
    - Clean up notification references after dismissal
    - Clean up on panel close
    - _Requirements: 5.2, 5.5_
  
  - [ ] 17.4 Add cleanup to AuthModule
    - Register auth modal listeners with MemoryManager
    - Clean up on modal close
    - _Requirements: 5.1_

- [ ] 18. Configure Vite for optimal production builds
  - [ ] 18.1 Update vite.config.js with code splitting
    - Configure manual chunks for auth, ai, reminders, tasks
    - Set chunk size warning threshold to 200KB
    - Enable CSS code splitting
    - _Requirements: 1.3, 1.4, 10.5_
  
  - [ ] 18.2 Add build optimization plugins
    - Enable rollup tree-shaking
    - Configure minification options
    - Enable gzip compression
    - Configure source map generation for dev only
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [ ] 18.3 Add bundle size analysis
    - Install and configure rollup-plugin-visualizer
    - Generate bundle analysis report
    - Add size warnings to build output
    - _Requirements: 10.5_
  
  - [ ]* 18.4 Write build validation tests
    - Test main bundle < 100KB uncompressed
    - Test separate chunks exist for auth, ai, reminders, tasks
    - Test source maps not included in production bundle
    - Test gzip compression enabled
    - _Requirements: 1.3, 1.4, 10.3, 10.4_

- [x] 19. Performance testing and validation
  - [ ]* 19.1 Run all property-based tests
    - Execute all 12 property tests with 100+ iterations
    - Verify all properties pass
    - Document any failures
  
  - [ ]* 19.2 Run all unit tests
    - Execute complete unit test suite
    - Verify > 80% code coverage
    - Fix any failing tests
  
  - [ ]* 19.3 Perform build size validation
    - Build production bundle
    - Verify main bundle < 100KB
    - Verify total initial load < 150KB
    - Verify lazy chunks load within 200ms
    - _Requirements: 1.3, 1.5_
  
  - [ ]* 19.4 Perform runtime performance validation
    - Test page load time improvement (target: 40-60% reduction)
    - Test memory usage over 30-minute session
    - Test animation frame rates (target: 60fps)
    - Test API call reduction (target: 30-50% fewer calls)
    - _Requirements: 7.1, 7.2, 4.1, 3.1, 3.2_
  
  - [ ]* 19.5 Perform memory leak testing
    - Run application for extended session (1+ hour)
    - Monitor memory usage with Chrome DevTools
    - Verify no memory growth over time
    - Verify all resources cleaned up properly
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 20. Final checkpoint - Ensure all optimizations complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and integration points
- The refactoring maintains application functionality throughout the process
- All modules integrate with core infrastructure (DOMManager, APIClient, PerformanceMonitor, MemoryManager)
- Performance budgets are enforced: main bundle < 100KB, module load < 200ms, render < 50ms
