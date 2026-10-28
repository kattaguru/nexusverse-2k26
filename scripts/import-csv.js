import fs from 'fs';
import path from 'path';

function parseCSVLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

function importCSV() {
  const rootDir = process.cwd();
  const dbPath = path.resolve(rootDir, 'server', 'data', 'database.json');

  // Find candidate CSV files in root, downloads, or backups
  const candidates = [
    path.resolve(rootDir, 'registrations.csv'),
    path.resolve(rootDir, 'backups', 'registrations.csv'),
    path.resolve(rootDir, 'supabase-registrations.csv'),
    path.resolve(process.env.USERPROFILE || '', 'Downloads', 'registrations.csv'),
    path.resolve(process.env.USERPROFILE || '', 'Downloads', 'registrations_rows.csv')
  ];

  let targetCsv = '';
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      targetCsv = c;
      break;
    }
  }

  if (!targetCsv) {
    console.log('ℹ️ Looking for registrations.csv in:');
    candidates.forEach(c => console.log('   -', c));
    console.log('\n👉 To import from Supabase:');
    console.log('1. In your Supabase dashboard, click the "..." menu next to "Role postgres" and select "Export to CSV"');
    console.log('2. Save the downloaded file as "registrations.csv" in this project folder');
    console.log('3. Run "npm run import:csv" again!\n');
    return;
  }

  console.log('📥 Found registrations CSV at:', targetCsv);
  const content = fs.readFileSync(targetCsv, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

  if (lines.length <= 1) {
    console.log('⚠️ CSV file is empty.');
    return;
  }

  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  console.log('📋 Columns detected:', header.join(', '));

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const map = new Map();
  (db.registrations || []).forEach(r => {
    if (r && r.regId) map.set(r.regId, r);
  });

  let importedCount = 0;
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 2) continue;

    const row = {};
    header.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });

    const regId = row.reg_id || row.regid || row.id;
    if (!regId) continue;

    let eventIds = [];
    try {
      if (row.event_ids && row.event_ids.startsWith('[')) {
        eventIds = JSON.parse(row.event_ids);
      } else if (row.event_ids) {
        eventIds = row.event_ids.split(/[;,]/).map(s => s.trim()).filter(Boolean);
      }
    } catch (e) {
      eventIds = [row.event_ids];
    }

    let teamDetails = {};
    try {
      if (row.team_details && row.team_details.startsWith('{')) {
        teamDetails = JSON.parse(row.team_details);
      }
    } catch (e) {}

    const record = {
      regId: regId,
      paymentId: row.payment_id || row.paymentid || '',
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      college: row.college || '',
      className: row.class_name || row.classname || '',
      section: row.section || '',
      dept: row.dept || '',
      year: row.year || '',
      roll: row.roll || '',
      isIeeeMember: row.is_ieee_member === 'true' || row.is_ieee_member === 't' || row.is_ieee_member === '1' || row.is_ieee_member === 'YES',
      ieeeId: row.ieee_id || row.ieeeid || '',
      eventIds: eventIds,
      teamDetails: teamDetails,
      totalPaid: Number(row.total_paid || row.totalpaid || 0),
      promoCode: row.promo_code || '',
      timestamp: row.timestamp || row.created_at || new Date().toISOString(),
      checkedIn: row.checked_in === 'true' || row.checked_in === 't' || row.checked_in === 'YES',
      lunchCollected: row.lunch_collected === 'true' || row.lunch_collected === 't' || row.lunch_collected === 'YES',
      kitIssued: row.kit_issued === 'true' || row.kit_issued === 't' || row.kit_issued === 'YES',
      certificateIssued: row.certificate_issued === 'true' || row.certificate_issued === 't' || row.certificate_issued === 'YES'
    };

    const existing = map.get(regId);
    map.set(regId, { ...(existing || {}), ...record });
    importedCount++;
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
  });

  db.registrations = merged;
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');

  console.log(`✅ Successfully imported ${importedCount} records from CSV!`);
  console.log(`💾 Total registrations now in server/data/database.json: ${merged.length}`);
}

importCSV();
