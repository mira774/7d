import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// base './' — сайт работает из любой папки, в том числе на username.github.io/репозиторий/
export default defineConfig({ base: './', plugins: [react()] })
