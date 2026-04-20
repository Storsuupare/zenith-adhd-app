import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // This forces the value into the app, bypassing .env entirely
    'process.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify('pk_test_bWFnbmV0aWMtamF5YmlyZC0xNi5jbGVyay5hY2NvdW50cy5kZXYk'),
    'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify('pk_test_bWFnbmV0aWMtamF5YmlyZC0xNi5jbGVyay5hY2NvdW50cy5kZXYk')
  }
})