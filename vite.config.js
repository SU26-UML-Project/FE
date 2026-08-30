import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_PROXY_TARGET || 'http://192.168.1.5:8088'

  return {
    plugins: [react()],
    optimizeDeps: {
      include: ['@dagrejs/dagre'],
    },
    server: {
      host: true, // cho phép mở FE từ thiết bị khác trong LAN (http://<LAN-IP>:5173)
      proxy: {
        // FE gọi cùng origin /api/uml -> proxy sang backend, tránh CORS
        // và biến cookie thành first-party (bắt buộc khi chạy http qua LAN IP)
        '/api/uml': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  }
})