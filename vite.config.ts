import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// Fail the BUILD (not the live site) if the Bohr contract addresses are missing,
// so a misconfigured Netlify deploy never ships a blank page.
const REQUIRED_ENV: Record<string, string[]> = {
  bohr: ['VITE_SPRAY_ADDRESS', 'VITE_TOKEN_ADDRESS', 'VITE_SPRAY_DEPLOY_BLOCK'],
  botmainnet: ['VITE_SPRAY_ADDRESS', 'VITE_SPRAY_DEPLOY_BLOCK'],
}

export default defineConfig(({ mode, command }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  const network = (env.VITE_NETWORK as string | undefined) ?? 'bohr'
  if (command === 'build' && REQUIRED_ENV[network]) {
    const missing = REQUIRED_ENV[network].filter(k => !env[k])
    if (missing.length) {
      throw new Error(`Missing ${missing.join(', ')}. Run the deploy script first (npm run deploy:bohr writes them to .env), or set them in your host's environment variables.`)
    }
  }
  return config
})

const config = {
  plugins: [react(), nodePolyfills()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      '@tanstack/react-query',
      'wagmi',
      'wagmi/chains',
      'wagmi/connectors',
      'viem',
      'viem/chains',
      'connectkit',
      'framer-motion',
      'lucide-react',
      'sonner',
      'clsx',
      'tailwind-merge',
      'vite-plugin-node-polyfills/shims/buffer',
      'vite-plugin-node-polyfills/shims/global',
      'vite-plugin-node-polyfills/shims/process',
    ],
  },
  server: {
    allowedHosts: true,
    cors: true,
  },
}
