import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'ocr',
              test: /node_modules[\\/]tesseract\.js/,
              priority: 30,
            },
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom)[\\/]/,
              priority: 20,
            },
            {
              name: 'vendor',
              test: /node_modules/,
              minSize: 50_000,
              maxSize: 250_000,
              priority: 10,
            },
          ],
        },
      },
    },
  },
})
