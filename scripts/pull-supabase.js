import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://nfkyzozrreardklsoehb.supabase.co';
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('Connecting to Supabase at:', url);

const supabase = createClient(url, key, {
  auth: { persistSession: false }
});

async function pullAll() {
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('reg_id, payment_id, name, email, phone, college, class_name, section, dept, year, roll, is_ieee_member, ieee_id, event_ids, total_paid, promo_code, timestamp, is_verified, checked_in, check_in_time, kit_issued, lunch_collected, lunch_collected_time, certificate_issued')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('❌ Supabase query error:', error.message);
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      console.log('⚠️ No rows returned from Supabase.');
      return;
    }

    console.log(`✅ Successfully fetched ${data.length} registrations from Supabase!`);

    // Map DB snake_case to frontend/server camelCase
    const pulledRecords = data.map(row => ({
      regId: row.reg_id || row.regId,
      paymentId: row.payment_id || row.paymentId || '',
      paymentScreenshot: row.payment_screenshot || row.team_details?._paymentScreenshot || '',
      paymentMode: row.payment_mode || row.team_details?._paymentMode || 'upi',
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      college: row.college || '',
      className: row.class_name || row.className || '',
      section: row.section || '',
      dept: row.dept || '',
      year: row.year || '',
      roll: row.roll || '',
      isIeeeMember: Boolean(row.is_ieee_member ?? row.isIeeeMember),
      ieeeId: row.ieee_id || row.ieeeId || '',
      eventIds: Array.isArray(row.event_ids) ? row.event_ids : (row.eventIds || []),
      teamDetails: row.team_details || row.teamDetails || {},
      totalPaid: Number(row.total_paid || row.totalPaid || 0),
      promoCode: row.promo_code || row.promoCode || '',
      timestamp: row.timestamp || row.created_at || new Date().toISOString(),
      isVerified: Boolean(row.is_verified ?? row.isVerified),
      checkedIn: Boolean(row.checked_in ?? row.checkedIn),
      checkInTime: row.check_in_time || row.checkInTime || '',
      kitIssued: Boolean(row.kit_issued ?? row.kitIssued),
      lunchCollected: Boolean(row.lunch_collected ?? row.lunchCollected),
      lunchCollectedTime: row.lunch_collected_time || row.lunchCollectedTime || '',
      certificateIssued: Boolean(row.certificate_issued ?? row.certificateIssued)
    }));

    // Read current database.json
    const dbPath = path.resolve(process.cwd(), 'server', 'data', 'database.json');
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    // Merge by regId
    const map = new Map();
    (db.registrations || []).forEach(r => {
      if (r && r.regId) map.set(r.regId, r);
    });

    pulledRecords.forEach(r => {
      if (r && r.regId) {
        const existing = map.get(r.regId);
        map.set(r.regId, { ...(existing || {}), ...r });
      }
    });

    const merged = Array.from(map.values()).sort((a, b) => {
      return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
    });

    db.registrations = merged;
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');

    console.log(`💾 Saved ${merged.length} registrations permanently to server/data/database.json!`);

    // Also write a dedicated snapshot to backups/
    const backupDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(path.resolve(backupDir, 'supabase-synced-registrations.json'), JSON.stringify(merged, null, 2), 'utf8');
    console.log(`📁 Backup snapshot created at backups/supabase-synced-registrations.json`);
  } catch (err) {
    console.error('❌ Exception pulling from Supabase:', err.message);
  }
}

pullAll();
