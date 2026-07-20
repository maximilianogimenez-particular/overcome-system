import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-db-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/data') {
            const dbPath = path.resolve(__dirname, 'db.json');
            
            if (req.method === 'GET') {
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              if (fs.existsSync(dbPath)) {
                res.end(fs.readFileSync(dbPath, 'utf-8'));
              } else {
                res.end(JSON.stringify({}));
              }
            } else if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.end(JSON.stringify({ status: 'success' }));
                } catch (e: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: e.message }));
                }
              });
            }
          } else {
            next();
          }
        });
      }
    }
  ],
})
