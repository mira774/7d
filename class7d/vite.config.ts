import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/7d/', // <--- Обязательно укажи путь к репозиторию
  plugins: [react()],
})
