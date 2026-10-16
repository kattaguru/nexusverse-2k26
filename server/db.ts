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
    razorpayKeyId?: string;
    razorpayKeySecret?: string;
    razorpayMeLink?: string;
    razorpayMeName?: string;
  };
  photos: any[];
  users: ParticipantUser[];
}

const DEFAULT_DB: DatabaseSchema = {
  registrations: [],
  settings: {
    isRegClosed: false,
    closedMessage: 'Registration is currently closed. For inquiries or spot availability, contact the IEEE-SB desk.'
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

function getActiveDbPath(): string {
  if (IS_VERCEL && fs.existsSync(VERCEL_TMP_FILE)) {
    return VERCEL_TMP_FILE;
  }
  return DB_FILE;
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
  if (memoryDb) {
    if (!memoryDb.users) memoryDb.users = [];
    return memoryDb;
  }
  try {
    const targetFile = getActiveDbPath();
    if (fs.existsSync(targetFile)) {
      const data = fs.readFileSync(targetFile, 'utf-8');
      memoryDb = JSON.parse(data);
      if (!memoryDb!.users) memoryDb!.users = [];
      return memoryDb!;
    }
    ensureDbExists();
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      memoryDb = JSON.parse(data);
      if (!memoryDb!.users) memoryDb!.users = [];
      return memoryDb!;
    }
    memoryDb = { ...DEFAULT_DB, users: [] };
    return memoryDb;
  } catch (err) {
    console.error('Error reading database file:', err);
    memoryDb = { ...DEFAULT_DB, users: [] };
    return memoryDb;
  }
}

export function writeDatabase(data: DatabaseSchema): boolean {
  try {
    memoryDb = data;
    if (IS_VERCEL) {
      try {
        fs.writeFileSync(VERCEL_TMP_FILE, JSON.stringify(data, null, 2), 'utf-8');
      } catch (writeErr) {
        console.warn('Vercel /tmp write notice:', writeErr);
      }
      return true;
    }
    ensureDbExists();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.warn('Error writing database file, falling back to memory state:', err);
    return true;
  }
}
