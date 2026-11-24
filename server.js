// Tiny static server for LOCAL development only: npm run dev
// (On Vercel the site is served as static files from public/ — this file is not used there.)
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'public'), port = process.env.PORT || 3000;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png'
};
if (!fs.existsSync(path.join(dir, 'index.html'))) { console.error('public/ is missing. Run: npm run build (or npm run dev)'); process.exit(1); }
http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end('Bad request'); }
  if (p === '/' || p === '') p = '/index.html';
  const f = path.normalize(path.join(dir, p));
  if (f !== dir && !f.startsWith(dir + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(d);
  });
}).listen(port, () => console.log('http://localhost:' + port));
