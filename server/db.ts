import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

export interface ParticipantUser {
  id: string;
  name: string;
  email: string;
  username: string;
  passwordHash?: string;
  phone?: string;
  college?: string;
  roll?: string;
  branch?: string;
  year?: string;
  isIeeeMember?: boolean;
  ieeeId?: string;
  avatarUrl?: string;
  authProvider: 'local' | 'google';
  createdAt: string;
  updatedAt?: string;
}

export interface DatabaseSchema {
  registrations: any[];
  settings: {
    isRegClosed: boolean;
    closedMessage: string;
    adminPassword?: string;
    paymentMode?: 'razorpay' | 'upi';
    upiVpa?: string;
    upiPayeeName?: string;
    razorpayKeyId?: string;
    razorpayKeySecret?: string;
    razorpayMeLink?: string;
    razorpayMeName?: string;
    totalSlotsLimit?: number;
    ieeeSlotsLimit?: number;
    nonIeeeSlotsLimit?: number;
  };
  photos: any[];
  users: ParticipantUser[];
}

export const DEFAULT_DB: DatabaseSchema = {
  registrations: [],
  settings: {
    isRegClosed: true,
    closedMessage: 'Registration is currently closed. For inquiries or spot availability, contact the IEEE-SB desk.',
    paymentMode: 'upi',
    upiVpa: '9441759500@ptyes',
    upiPayeeName: 'NexusVerse 2K26',
    razorpayMeLink: 'https://razorpay.me/@veluriprasanth',
    razorpayMeName: 'VELURI PRASANTH',
    totalSlotsLimit: 0,
    ieeeSlotsLimit: 0,
    nonIeeeSlotsLimit: 0
  },
  photos: [
    {
      id: 'symp-1',
      url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
      title: 'Inaugural Keynote & National Tech Symposium Hall',
      category: 'Symposium Highlights',
      uploadedAt: '2026-10-10T09:30:00Z'
    },
    {
      id: 'symp-2',
      url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80',
      title: 'Coding Sprints & Flaghunt 24H Cyber CTF Arena',
      category: 'Technical Events',
      uploadedAt: '2026-10-11T14:15:00Z'
    },
    {
      id: 'symp-3',
      url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&auto=format&fit=crop&q=80',
      title: 'Hardware Expo & IoT Autonomous Robotics Prototype',
      category: 'Expo & Projects',
      uploadedAt: '2026-10-12T11:45:00Z'
    },
    {
      id: 'symp-4',
      url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&auto=format&fit=crop&q=80',
      title: 'IEEE Distinguished Faculty & Chief Guest Address',
      category: 'Guest Dignitaries',
      uploadedAt: '2026-10-12T16:00:00Z'
    },
    {
      id: 'symp-5',
      url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1200&auto=format&fit=crop&q=80',
      title: 'Innovrush Grand Finale Project Presentation & Jury Defense',
      category: 'Technical Events',
      uploadedAt: '2026-10-13T10:20:00Z'
    },
    {
      id: 'symp-6',
      url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80',
      title: 'Grand Award Felicitation & Valedictory Ceremony',
      category: 'Symposium Highlights',
      uploadedAt: '2026-10-13T17:30:00Z'
    },
    {
      id: 'symp-7',
      url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200&auto=format&fit=crop&q=80',
      title: 'Technical Panel Discussion & Emerging Tech Fireside',
      category: 'Guest Dignitaries',
      uploadedAt: '2026-10-13T14:40:00Z'
    },
    {
      id: 'symp-8',
      url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80',
      title: 'Code Genesis Live Hackathon Showdown & Mentorship',
      category: 'Technical Events',
      uploadedAt: '2026-10-14T11:00:00Z'
    }
  ],
  users: []
};

const IS_VERCEL = !!process.env.VERCEL;
const VERCEL_TMP_FILE = path.resolve('/tmp', 'database.json');
let memoryDb: DatabaseSchema | null = null;
let lastDbMtime = 0;

function getActiveDbPath(): string {
  if (process.env.TEST_DB_FILE) {
    return process.env.TEST_DB_FILE;
  }
  if (IS_VERCEL && fs.existsSync(VERCEL_TMP_FILE)) {
    return VERCEL_TMP_FILE;
  }
  return DB_FILE;
}

export function resetMemoryDb(): void {
  memoryDb = null;
  lastDbMtime = 0;
}

function ensureDbExists() {
  if (IS_VERCEL) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    }
  } catch (e) {
    // Read-only filesystem warning
  }
}

export function readDatabase(): DatabaseSchema {
  try {
    const targetFile = getActiveDbPath();
    if (fs.existsSync(targetFile)) {
      const stat = fs.statSync(targetFile);
      if (!memoryDb || stat.mtimeMs > lastDbMtime) {
        const data = fs.readFileSync(targetFile, 'utf-8');
        memoryDb = JSON.parse(data);
        if (!memoryDb!.users) memoryDb!.users = [];
        lastDbMtime = stat.mtimeMs;
      }
      return memoryDb!;
    }
    ensureDbExists();
    if (fs.existsSync(DB_FILE)) {
      const stat = fs.statSync(DB_FILE);
      if (!memoryDb || stat.mtimeMs > lastDbMtime) {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        memoryDb = JSON.parse(data);
        if (!memoryDb!.users) memoryDb!.users = [];
        lastDbMtime = stat.mtimeMs;
      }
      return memoryDb!;
    }
    if (memoryDb) {
      if (!memoryDb.users) memoryDb.users = [];
      return memoryDb;
    }
    memoryDb = { ...DEFAULT_DB, users: [] };
    return memoryDb;
  } catch (err) {
    console.error('Error reading database file:', err);
    if (memoryDb) return memoryDb;
    memoryDb = { ...DEFAULT_DB, users: [] };
    return memoryDb;
  }
}

let writeTimeout: any = null;
let isWriting = false;

function flushToDisk(data: DatabaseSchema): void {
  if (isWriting) return;
  isWriting = true;
  try {
    const targetFile = getActiveDbPath();
    const tempFile = `${targetFile}.tmp.${Date.now()}`;
    const payload = JSON.stringify(data, null, 2);

    if (IS_VERCEL) {
      try {
        fs.writeFileSync(tempFile, payload, 'utf-8');
        fs.renameSync(tempFile, targetFile);
      } catch (writeErr) {
        // Vercel serverless ephemeral filesystem notice
      }
    } else {
      ensureDbExists();
      fs.writeFileSync(tempFile, payload, 'utf-8');
      fs.renameSync(tempFile, targetFile);
    }
    try {
      lastDbMtime = fs.statSync(targetFile).mtimeMs;
    } catch {}
  } catch (err) {
    console.warn('Error flushing database to disk, in-memory state preserved:', err);
  } finally {
    isWriting = false;
  }
}

export function writeDatabase(data: DatabaseSchema, immediate: boolean = false): boolean {
  try {
    memoryDb = data;
    // For test suites or explicit immediate requests, flush synchronously
    if (immediate || process.env.NODE_ENV === 'test') {
      flushToDisk(data);
      return true;
    }
    // High-concurrency debounced write to coalesce hundreds of simultaneous writes safely
    if (writeTimeout) clearTimeout(writeTimeout);
    writeTimeout = setTimeout(() => {
      flushToDisk(data);
    }, 50);
    if (writeTimeout && writeTimeout.unref) writeTimeout.unref();
    return true;
  } catch (err) {
    console.warn('Error scheduling database write:', err);
    return true;
  }
}
