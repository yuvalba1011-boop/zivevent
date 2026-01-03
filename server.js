const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname; // serve files relative to workspace folder
const FALLBACK_ROOT_INDEX = path.join('/', 'index.html'); // fallback absolute path if file not present in workspace

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const joined = path.join(root, decoded);
  const normalized = path.normalize(joined);
  if (!normalized.startsWith(path.normalize(root))) return null;
  return normalized;
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase() || '.html';
  const type = MIME[ext] || 'application/octet-stream';
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': type });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', () => {
      res.statusCode = 500;
      res.end('Internal Server Error');
    });
  });
}

const server = http.createServer((req, res) => {
  let urlPath = req.url === '/' ? '/index.html' : req.url;

  // Try workspace-relative file first
  const workspacePath = safeJoin(ROOT, urlPath);
  if (workspacePath) {
    if (fs.existsSync(workspacePath) && fs.statSync(workspacePath).isFile()) {
      serveFile(res, workspacePath);
      return;
    }
  }

  // Fallback: try absolute path at repository root (e.g. /index.html)
  const absPath = safeJoin('/', urlPath);
  if (absPath && fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
    serveFile(res, absPath);
    return;
  }

  // Not found
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log(`Static server running on http://localhost:${PORT}/`);
});
