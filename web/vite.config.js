import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // 실제 서버 모드(VITE_USE_DUMMY=false)에서 /api 요청을 Spring Boot(8080)로 전달 → CORS 문제 없음
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
});
