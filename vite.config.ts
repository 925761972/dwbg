import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// https://vite.dev/config/
export default defineConfig({
  // 使用相对路径，确保在飞书CDN或自定义路径下静态资源能正确加载
  base: './',
  plugins: [preact()],
})
