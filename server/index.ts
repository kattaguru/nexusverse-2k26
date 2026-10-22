import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import dotenv from 'dotenv';
import { apiRouter } from './apiRouter.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware for parsing JSON & URL-encoded data with high limits for photo uploads
app.use(express.json({ 
  limit: '50mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Robust HTTP Security Headers (Defend against MIME sniffing, clickjacking, and referrer leaks)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// CORS headers for development if running on different ports
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Admin-Key, X-Admin-Password');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Mount the API Router
app.use('/api', apiRouter);

// Gracefully handle malformed JSON requests
app.use((err: any, _req: any, res: any, next: any) => {
  if (err) {
    return res.status(400).json({ success: false, error: err.message || 'Invalid JSON format' });
  }
  next();
});

// Serve static assets if dist exists (production mode)
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// Route handling for multi-page site
app.get('/register', (_req, res) => {
  res.sendFile(path.resolve(distPath, 'register.html'));
});

// Secure executive portal (nbkristieee.in/nexusadmin & /nexusadmin/scan)
app.get([
  '/nexusadmin', 
  '/nexusadmin/*', 
  '/nexusadmin.html', 
  '/nexusscan', 
  '/scan'
], (_req, res) => {
  res.sendFile(path.resolve(distPath, 'register.html'));
});

// Legacy /admin access blocked & redirected to home
app.get(['/admin', '/admin.html'], (_req, res) => {
  res.redirect(301, '/');
});

// Direct Ticket Pass verification shortcuts (e.g. /pass/NV26-101)
app.get(['/pass/:regId', '/verify/:regId'], (req, res) => {
  res.redirect(`/register.html?passId=${encodeURIComponent(req.params.regId)}`);
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.resolve(distPath, 'index.html'));
});

function getCampusNetworkIps(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

const campusIps = getCampusNetworkIps();

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 NexusVerse 2K26 Campus Backend Server Active`);
  console.log(`🏠 Local Host:         http://localhost:${PORT}`);
  if (campusIps.length > 0) {
    campusIps.forEach(ip => {
      console.log(`📶 Campus Wi-Fi / LAN: http://${ip}:${PORT}`);
    });
    console.log(`📱 All participants on same Wi-Fi can open: http://${campusIps[0]}:${PORT}`);
  }
  console.log(`🔗 API Base:           http://localhost:${PORT}/api`);
  console.log(`💾 Database:           server/data/database.json`);
  console.log(`=======================================================`);
});
