import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const devServerHost = env.VITE_DEV_SERVER_HOST || '0.0.0.0';
  const devServerPort = Number(env.VITE_DEV_SERVER_PORT || 3000);
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5000';

  return {
    plugins: [react()],
    server: {
      host: devServerHost,
      port: devServerPort,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true
        },
        '/uploads': {
          target: apiProxyTarget,
          changeOrigin: true
        }
      }
    }
  };
});
