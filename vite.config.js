import { defineConfig } from 'vite'

export default defineConfig({
  base: '/todo-list/',
  server: {
    port: 5173,
    open: true
  }
})
