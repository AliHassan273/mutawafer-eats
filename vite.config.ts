import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import net from 'net';
import {defineConfig} from 'vite';

async function findAvailablePort(startPort: number, maxAttempts = 30): Promise<number> {
  const hosts = ["0.0.0.0", "127.0.0.1", "::1"];

  for (let port = startPort; port < startPort + maxAttempts; port++) {
    let allFree = true;

    for (const host of hosts) {
      const free = await new Promise<boolean>((resolve) => {
        const tester = net.createServer();
        tester.once('error', () => resolve(false));
        tester.once('listening', () => tester.close(() => resolve(true)));
        tester.listen({ port, host, exclusive: true });
      });

      if (!free) {
        allFree = false;
        break;
      }
    }

    if (allFree) return port;
  }
  return startPort;
}

export default defineConfig(async () => {
  const preferredPort = process.env.VITE_HMR_PORT ? Number(process.env.VITE_HMR_PORT) : Number(process.env.HMR_PORT || 24678);
  const hmrPort = await findAvailablePort(preferredPort, 50);
  if (hmrPort !== preferredPort) {
    console.log(`⚠️ Vite HMR port ${preferredPort} is already in use. Using ${hmrPort} instead.`);
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '127.0.0.1',
      // HMR is disabled when DISABLE_HMR env var is 'true'.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      hmr: ((): any => {
        const disabled = process.env.DISABLE_HMR === 'true';
        if (disabled) return false;
        return { protocol: 'ws', host: '127.0.0.1', port: hmrPort, clientPort: hmrPort };
      })(),
    },
    preview: {
      host: '127.0.0.1',
    },
  };
});
