import express, { Request, Response, NextFunction } from 'express';
import { apiRouter } from '../server/apiRouter.js';

const app = express();

app.use(express.json({ 
  limit: '50mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Handle routes whether dispatched via /api/* or direct serverless routing
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Vercel API Handler Error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

export default function handler(req: any, res: any) {
  return app(req, res);
}
