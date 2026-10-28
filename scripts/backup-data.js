import fs from 'fs';
import path from 'path';

function runBackup() {
  const rootDir = process.cwd();
  const dbPath = path.resolve(rootDir, 'server', 'data', 'database.json');
  const backupDir = path.resolve(rootDir, 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  if (!fs.existsSync(dbPath)) {
    console.error('❌ database.json not found at:', dbPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(dbPath, 'utf8');
  const data = JSON.parse(raw);

  const now = new Date();
  const timestampStr = now.toISOString().replace(/[:.]/g, '-');
  const backupFile = path.resolve(backupDir, `database-backup-${timestampStr}.json`);
  const latestFile = path.resolve(backupDir, 'database-backup-latest.json');

  fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf8');
  fs.writeFileSync(latestFile, JSON.stringify(data, null, 2), 'utf8');

  // Also create a CSV backup of all registrations
  const regs = Array.isArray(data.registrations) ? data.registrations : [];
  const csvRows = [
    'Registration ID,Name,Roll Number,Phone,Email,College,Branch,Year,Section,IEEE Member,Total Paid,Payment Mode,Payment Ref,Events,Timestamp,Checked In,Lunch Collected'
  ];

  for (const r of regs) {
    const events = (r.eventIds || []).join('; ');
    const row = [
      `"${r.regId || ''}"`,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${r.roll || ''}"`,
      `"${r.phone || ''}"`,
      `"${r.email || ''}"`,
      `"${(r.college || '').replace(/"/g, '""')}"`,
      `"${r.dept || ''}"`,
      `"${r.year || ''}"`,
      `"${r.section || ''}"`,
      `"${r.isIeeeMember ? 'YES' : 'NO'}"`,
      `"${r.totalPaid || 0}"`,
      `"${r.paymentMode || 'upi'}"`,
      `"${r.paymentId || ''}"`,
      `"${events}"`,
      `"${r.timestamp || ''}"`,
      `"${r.checkedIn ? 'YES' : 'NO'}"`,
      `"${r.lunchCollected ? 'YES' : 'NO'}"`
    ];
    csvRows.push(row.join(','));
  }

  const csvFile = path.resolve(backupDir, `registrations-backup-${timestampStr}.csv`);
  fs.writeFileSync(csvFile, csvRows.join('\n'), 'utf8');

  console.log('✅ BACKUP SUCCESSFUL!');
  console.log(`📁 Timestamped JSON Backup: ${backupFile}`);
  console.log(`📁 Latest JSON Snapshot:   ${latestFile}`);
  console.log(`📊 Registrations CSV Roster: ${csvFile}`);
  console.log(`🔢 Total Registrations Saved: ${regs.length}`);
}

runBackup();
