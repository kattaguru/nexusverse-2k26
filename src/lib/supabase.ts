import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RegistrationRecord } from '../components/TicketPass';

// Read environment variables (supports VITE_, NEXT_PUBLIC_, and standard names)
const supabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).trim();

const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ''
).trim();

// Determine if valid Supabase credentials have been supplied
export function isSupabaseConfigured(): boolean {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseAnonKey.includes('your-anon-key')
  );
}

// Create and export singleton client instance (or null if unconfigured)
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Format database snake_case row to frontend camelCase RegistrationRecord
 */
export function mapDbToRegistrationRecord(row: any): RegistrationRecord {
  return {
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
    totalPaid: Number(row.total_paid ?? row.totalPaid ?? 0),
    promoCode: row.promo_code || row.promoCode || '',
    timestamp: row.timestamp || row.created_at || new Date().toISOString(),
    isVerified: Boolean(row.is_verified ?? row.isVerified ?? (row.team_details?._isVerified)),
    verifiedAt: row.verified_at || row.verifiedAt || row.team_details?._verifiedAt,
    verifiedBy: row.verified_by || row.verifiedBy || row.team_details?._verifiedBy,
    checkedIn: Boolean(row.checked_in ?? row.checkedIn ?? row.team_details?._checkedIn),
    checkInTime: row.check_in_time || row.checkInTime || row.team_details?._checkInTime,
    checkedInBy: row.checked_in_by || row.checkedInBy || row.team_details?._checkedInBy,
    attendedEvents: Array.isArray(row.attended_events) ? row.attended_events : (row.attendedEvents || row.team_details?._attendedEvents || []),
    kitIssued: Boolean(row.kit_issued ?? row.kitIssued ?? row.team_details?._kitIssued),
    checkInNotes: row.check_in_notes || row.checkInNotes || row.team_details?._checkInNotes,
    lunchCollected: Boolean(row.lunch_collected ?? row.lunchCollected ?? row.team_details?._lunchCollected),
    lunchCollectedTime: row.lunch_collected_time || row.lunchCollectedTime || row.team_details?._lunchCollectedTime,
    lunchCollectedBy: row.lunch_collected_by || row.lunchCollectedBy || row.team_details?._lunchCollectedBy,
    lunchCollectedCount: Number(row.lunch_collected_count ?? row.lunchCollectedCount ?? row.team_details?._lunchCollectedCount ?? (Boolean(row.lunch_collected ?? row.lunchCollected ?? row.team_details?._lunchCollected) ? 1 : 0)),
    memberLunchStatus: row.member_lunch_status || row.memberLunchStatus || row.team_details?._memberLunchStatus || {},
    memberCheckInStatus: row.member_check_in_status || row.memberCheckInStatus || row.team_details?._memberCheckInStatus || {},
    memberCheckInTimes: row.member_check_in_times || row.memberCheckInTimes || row.team_details?._memberCheckInTimes || {},
    memberTechStatus: row.member_tech_status || row.memberTechStatus || row.team_details?._memberTechStatus || {},
    memberTechTimes: row.member_tech_times || row.memberTechTimes || row.team_details?._memberTechTimes || {},
    memberSpotStatus: row.member_spot_status || row.memberSpotStatus || row.team_details?._memberSpotStatus || {},
    memberSpotTimes: row.member_spot_times || row.memberSpotTimes || row.team_details?._memberSpotTimes || {},
    memberCertStatus: row.member_cert_status || row.memberCertStatus || row.team_details?._memberCertStatus || {},
    memberCertTimes: row.member_cert_times || row.memberCertTimes || row.team_details?._memberCertTimes || {},
    certificateIssued: Boolean(row.certificate_issued ?? row.certificateIssued ?? row.team_details?._certificateIssued),
    certificateIssuedTime: row.certificate_issued_time || row.certificateIssuedTime || row.team_details?._certificateIssuedTime,
    certificateIssuedBy: row.certificate_issued_by || row.certificateIssuedBy || row.team_details?._certificateIssuedBy,
    deskScans: row.desk_scans || row.deskScans || row.team_details?._deskScans || {}
  };
}

/**
 * Format frontend camelCase RegistrationRecord to database snake_case row
 */
export function mapRegistrationRecordToDb(record: RegistrationRecord): Record<string, any> {
  const teamDetailsWithPayment = {
    ...(record.teamDetails || {}),
    ...(record.paymentScreenshot ? { _paymentScreenshot: record.paymentScreenshot } : {}),
    ...(record.paymentMode ? { _paymentMode: record.paymentMode } : {}),
    ...(record.isVerified !== undefined ? { _isVerified: record.isVerified } : {}),
    ...(record.verifiedAt ? { _verifiedAt: record.verifiedAt } : {}),
    ...(record.verifiedBy ? { _verifiedBy: record.verifiedBy } : {}),
    ...(record.checkedIn !== undefined ? { _checkedIn: record.checkedIn } : {}),
    ...(record.checkInTime ? { _checkInTime: record.checkInTime } : {}),
    ...(record.checkedInBy ? { _checkedInBy: record.checkedInBy } : {}),
    ...(record.attendedEvents ? { _attendedEvents: record.attendedEvents } : {}),
    ...(record.kitIssued !== undefined ? { _kitIssued: record.kitIssued } : {}),
    ...(record.checkInNotes ? { _checkInNotes: record.checkInNotes } : {}),
    ...(record.lunchCollected !== undefined ? { _lunchCollected: record.lunchCollected } : {}),
    ...(record.lunchCollectedTime ? { _lunchCollectedTime: record.lunchCollectedTime } : {}),
    ...(record.lunchCollectedBy ? { _lunchCollectedBy: record.lunchCollectedBy } : {}),
    ...(record.lunchCollectedCount !== undefined ? { _lunchCollectedCount: record.lunchCollectedCount } : {}),
    ...(record.memberLunchStatus ? { _memberLunchStatus: record.memberLunchStatus } : {}),
    ...(record.memberCheckInStatus ? { _memberCheckInStatus: record.memberCheckInStatus } : {}),
    ...(record.memberCheckInTimes ? { _memberCheckInTimes: record.memberCheckInTimes } : {}),
    ...(record.memberTechStatus ? { _memberTechStatus: record.memberTechStatus } : {}),
    ...(record.memberTechTimes ? { _memberTechTimes: record.memberTechTimes } : {}),
    ...(record.memberSpotStatus ? { _memberSpotStatus: record.memberSpotStatus } : {}),
    ...(record.memberSpotTimes ? { _memberSpotTimes: record.memberSpotTimes } : {}),
    ...(record.memberCertStatus ? { _memberCertStatus: record.memberCertStatus } : {}),
    ...(record.memberCertTimes ? { _memberCertTimes: record.memberCertTimes } : {}),
    ...(record.certificateIssued !== undefined ? { _certificateIssued: record.certificateIssued } : {}),
    ...(record.certificateIssuedTime ? { _certificateIssuedTime: record.certificateIssuedTime } : {}),
    ...(record.certificateIssuedBy ? { _certificateIssuedBy: record.certificateIssuedBy } : {}),
    ...(record.deskScans ? { _deskScans: record.deskScans } : {})
  };
  return {
    reg_id: record.regId,
    payment_id: record.paymentId || '',
    name: record.name,
    email: record.email || '',
    phone: record.phone || '',
    college: record.college || '',
    class_name: record.className || '',
    section: record.section || '',
    dept: record.dept || '',
    year: record.year || '',
    roll: record.roll,
    is_ieee_member: Boolean(record.isIeeeMember),
    ieee_id: record.ieeeId || '',
    event_ids: record.eventIds || [],
    team_details: teamDetailsWithPayment,
    total_paid: Number(record.totalPaid || 0),
    promo_code: record.promoCode || '',
    timestamp: record.timestamp || new Date().toISOString(),
  };
}

/**
 * Ping Supabase to verify connectivity and schema readiness
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  error?: string;
  url?: string;
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      message: 'Supabase credentials are missing or still set to placeholders in .env.',
      error: 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be configured in .env',
    };
  }

  try {
    const startTime = performance.now();
    const { data, error } = await supabase.from('registrations').select('reg_id').limit(1);
    const latency = Math.round(performance.now() - startTime);

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          url: supabaseUrl,
          message: 'Connected to Supabase project, but the "registrations" table has not been created yet.',
          error: 'Please execute the supabase-schema.sql script in your Supabase SQL Editor.',
        };
      }
      return {
        success: false,
        url: supabaseUrl,
        message: `Connection failed: ${error.message}`,
        error: error.message,
      };
    }

    return {
      success: true,
      url: supabaseUrl,
      message: `Successfully connected to Supabase PostgreSQL database (${latency}ms latency).`,
    };
  } catch (err: any) {
    return {
      success: false,
      url: supabaseUrl,
      message: `Network error connecting to Supabase: ${err.message}`,
      error: err.message,
    };
  }
}
