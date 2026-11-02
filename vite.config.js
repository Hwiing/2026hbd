import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig(({ command, isPreview }) => ({
  plugins: [vue()],
  base: command === 'build' || isPreview ? '/2026hbd/' : '/',
}))
