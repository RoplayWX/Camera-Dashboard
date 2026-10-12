import express from 'express';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';

async function startServer() {
  const app = express();
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  // Stream proxy with HazCams referrer header injection
  app.get('/api/proxy-stream', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      res.status(400).send('Invalid url parameter');
      return;
    }

    try {
      const isM3u8 = targetUrl.includes('.m3u8');
      const response = await axios({
        method: 'get',
        url: targetUrl,
        headers: {
          'Referer': 'https://hazcams.com/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
        },
        responseType: isM3u8 ? 'text' : 'stream',
        timeout: 12000,
        validateStatus: () => true,
      });

      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Headers', '*');
      res.set('Cache-Control', isM3u8 ? 'no-cache, no-store, must-revalidate' : 'public, max-age=60');

      if (response.status >= 400) {
        res.status(response.status).send(typeof response.data === 'string' ? response.data : 'Media not found');
        return;
      }

      if (isM3u8) {
        res.set('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        const content = typeof response.data === 'string' ? response.data : '';
        const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
        const lines = content.split('\n');
        const rewritten = lines
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) {
              return line;
            }
            const fullUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://')
              ? trimmed
              : baseUrl + trimmed;
            return `/api/proxy-stream?url=${encodeURIComponent(fullUrl)}`;
          })
          .join('\n');
        res.send(rewritten);
      } else {
        const contentType = typeof response.headers['content-type'] === 'string'
          ? response.headers['content-type']
          : 'video/mp2t';
        res.set('Content-Type', contentType);
        if (response.data && typeof response.data.pipe === 'function') {
          response.data.pipe(res);
        } else {
          res.send(response.data);
        }
      }
    } catch {
      res.status(502).send('Stream temporarily unreachable');
    }
  });

  app.use(vite.middlewares);

  app.listen(3000, () => console.log('Server running on port 3000'));
}

startServer();
