import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { join } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // 构建后插件：复制 index.html 为 404.html（GitHub Pages 需要）
    {
      name: 'copy-404',
      closeBundle() {
        if (process.env.NODE_ENV === 'production') {
          const distPath = join(process.cwd(), 'dist')
          copyFileSync(
            join(distPath, 'index.html'),
            join(distPath, '404.html')
          )
        }
      },
    },
  ],
  base: process.env.NODE_ENV === 'production' ? '/ClaudeGames/' : '/',
})
