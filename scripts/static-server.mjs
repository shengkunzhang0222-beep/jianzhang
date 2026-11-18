import http from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] ?? '.pages-test')
const port = Number(process.argv[3] ?? 4180)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

http
  .createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (p.endsWith('/')) p += 'index.html'
    const file = path.join(root, p)
    if (!file.startsWith(root)) {
      res.statusCode = 403
      res.end()
      return
    }
    try {
      const st = statSync(file)
      if (!st.isFile()) throw new Error('not a file')
      res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream')
      res.setHeader('Cache-Control', 'no-cache')
      createReadStream(file).pipe(res)
    } catch {
      res.statusCode = 404
      res.end('not found')
    }
  })
  .listen(port, () => console.log(`static server on http://localhost:${port}`))
