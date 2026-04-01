import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { type Plugin } from 'vite'

function removeModuleType(): Plugin {
  return {
    name: 'remove-module-type',
    transformIndexHtml(html) {
      return html
        .replace(/ type="module"/g, ' defer')
        .replace(/ crossorigin/g, '')
    },
  }
}

export default defineConfig({
  plugins: [react(), removeModuleType()],
  base: './',
  build: {
    outDir: '../ios/ForNow/ForNow/dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
      },
    },
  },
})
