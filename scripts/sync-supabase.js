import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://nfkyzozrreardklsoehb.supabase.co';
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(url, key);

async function syncAll() {
  console.log('🚀 Starting NexusVerse 2K26 Supabase Cloud Sync...');
  console.log('🔗 Target Supabase URL:', url);

  const dbPath = path.resolve(process.cwd(), 'server', 'data', 'database.json');
  if (!fs.existsSync(dbPath)) {
    console.error('❌ Database file not found at:', dbPath);
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  // 1. Sync Registrations
  console.log(`\n📋 [1/3] Syncing Registrations (${db.registrations?.length || 0} local records)...`);
  if (db.registrations && db.registrations.length > 0) {
    const regRows = db.registrations.map((r) => ({
      reg_id: r.regId,
      payment_id: r.paymentId || '',
      name: r.name,
      email: r.email || '',
      phone: r.phone || '',
      college: r.college || '',
      class_name: r.className || '',
      section: r.section || '',
      dept: r.dept || '',
      year: r.year || '',
      roll: r.roll,
      is_ieee_member: Boolean(r.isIeeeMember),
      ieee_id: r.ieeeId || '',
      event_ids: r.eventIds || [],
      team_details: r.teamDetails || {},
      total_paid: Number(r.totalPaid || 0),
      promo_code: r.promoCode || '',
      timestamp: r.timestamp || new Date().toISOString(),
    }));

    const { data: regData, error: regError } = await supabase
      .from('registrations')
      .upsert(regRows, { onConflict: 'reg_id' })
      .select('reg_id');

    if (regError) {
      console.error('❌ Registrations sync failed:', regError.message);
    } else {
      console.log(`✅ Registrations synced successfully! Count: ${regData?.length || regRows.length}`);
    }
  }

  // 2. Sync Participant Users
  console.log(`\n👥 [2/3] Syncing Participant Users (${db.users?.length || 0} local accounts)...`);
  if (db.users && db.users.length > 0) {
    const userRows = db.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      username: u.username,
      password_hash: u.passwordHash || '',
      phone: u.phone || '',
      college: u.college || '',
      roll: u.roll || '',
      branch: u.branch || '',
      year: u.year || '',
      is_ieee_member: Boolean(u.isIeeeMember),
      ieee_id: u.ieeeId || '',
      avatar_url: u.avatarUrl || '',
      auth_provider: u.authProvider || 'local',
      created_at: u.createdAt || new Date().toISOString(),
      updated_at: u.updatedAt || new Date().toISOString()
    }));

    const { data: userData, error: userError } = await supabase
      .from('participant_users')
      .upsert(userRows, { onConflict: 'email' })
      .select('id');

    if (userError) {
      if (userError.code === 'PGRST205') {
        console.warn('⚠️ Table "public.participant_users" does not exist yet in Supabase.');
        console.warn('👉 Please run "create-participant-users.sql" in your Supabase SQL Editor:');
        console.warn('   https://supabase.com/dashboard/project/nfkyzozrreardklsoehb/sql/new\n');
      } else {
        console.error('❌ Participant users sync notice:', userError.message);
      }
    } else {
      console.log(`✅ Participant users synced successfully! Count: ${userData?.length || userRows.length}`);
    }
  }

  // 3. Sync Portal Settings
  console.log('\n⚙️ [3/3] Syncing Portal Settings...');
  const { error: settingsError } = await supabase
    .from('portal_settings')
    .upsert({
      id: 'current',
      is_reg_closed: Boolean(db.settings?.isRegClosed),
      closed_message: db.settings?.closedMessage || 'Registration is currently closed.',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (settingsError) {
    console.error('❌ Portal settings sync notice:', settingsError.message);
  } else {
    console.log('✅ Portal settings synced successfully!');
  }

  console.log('\n🎉 Supabase synchronization check complete!\n');
}

syncAll().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
