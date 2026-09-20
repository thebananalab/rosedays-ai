import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// VITE_BASE=/rosedays-ai/ for GitHub Pages; defaults to / (local, Vercel)
export default defineConfig({ base: process.env.VITE_BASE || '/', plugins: [react()] })
