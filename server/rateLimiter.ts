/**
 * NexusVerse 2K26 High-Concurrency In-Memory Rate Limiter
 * Implements sliding window rate-limiting per IP address with auto-purging,
 * standard RFC 6585 headers, and granular endpoint policies.
 */
import { Request, Response, NextFunction } from 'express';

export interface RateLimiterOptions {
  windowMs: number;       // Time window in ms (e.g. 60_000 for 1 minute)
  max: number;            // Max allowed requests within window
  message?: string;       // Custom error message
  keyGenerator?: (req: Request) => string;
}

interface WindowData {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private hits: Map<string, WindowData> = new Map();
  private windowMs: number;
  private max: number;
  private message: string;
  private keyGenerator: (req: Request) => string;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs || 60_000;
    this.max = options.max || 100;
    this.message = options.message || 'Too many requests. Please wait and try again.';
    this.keyGenerator = options.keyGenerator || this.defaultKeyGenerator;

    // Periodic sweep every 30 seconds to prevent memory growth under high traffic
    if (typeof setInterval !== 'undefined') {
      const timer = setInterval(() => {
        this.cleanup();
      }, 30_000);
      if (timer.unref) timer.unref();
    }
  }

  private defaultKeyGenerator(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') ||
               (typeof realIp === 'string' ? realIp.trim() : '') ||
               req.ip ||
               req.socket?.remoteAddress ||
               'unknown-ip';
    return ip;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.hits.entries()) {
      if (data.resetAt <= now) {
        this.hits.delete(key);
      }
    }
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.keyGenerator(req);
      const now = Date.now();
      let record = this.hits.get(key);

      if (!record || record.resetAt <= now) {
        record = {
          count: 1,
          resetAt: now + this.windowMs
        };
        this.hits.set(key, record);
      } else {
        record.count++;
      }

      const remaining = Math.max(0, this.max - record.count);
      const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

      // Standard RateLimit Headers (RFC 6585)
      res.setHeader('X-RateLimit-Limit', this.max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

      if (record.count > this.max) {
        res.setHeader('Retry-After', resetSeconds);
        return res.status(429).json({
          success: false,
          error: this.message,
          retryAfterSeconds: resetSeconds
        });
      }

      next();
    };
  }

  public reset(key: string): void {
    this.hits.delete(key);
  }

  public getStats() {
    return {
      activeIps: this.hits.size,
      windowMs: this.windowMs,
      max: this.max
    };
  }
}

// 1. Global API rate limit: 300 requests / 1 minute (high concurrency threshold)
export const globalRateLimiter = new RateLimiter({
  windowMs: 60_000,
  max: 300,
  message: 'Global request rate limit exceeded. Please wait a moment before retrying.'
});

// 2. Registration submissions: 20 per minute per IP
export const registrationRateLimiter = new RateLimiter({
  windowMs: 60_000,
  max: 20,
  message: 'Too many registration requests. Please wait a moment before trying again.'
});

// 3. Payment order generation: 25 per minute per IP
export const paymentRateLimiter = new RateLimiter({
  windowMs: 60_000,
  max: 25,
  message: 'Payment order generation limit reached. Please wait before creating new orders.'
});

// 4. Participant auth / login / signup: 20 per minute per IP
export const authRateLimiter = new RateLimiter({
  windowMs: 60_000,
  max: 20,
  message: 'Too many authentication attempts. Please wait 60 seconds.'
});

// 5. Pass lookup / ticket searching: 35 per minute per IP
export const lookupRateLimiter = new RateLimiter({
  windowMs: 60_000,
  max: 35,
  message: 'Too many ticket lookup requests. Please wait a moment.'
});
