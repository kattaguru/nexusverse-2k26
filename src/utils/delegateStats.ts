import { RegistrationRecord, TeamMemberInfo } from '../components/TicketPass';
import { ALL_EVENTS } from '../data/symposiumData';

/**
 * Extracts all teammates from a registration record, handling different
 * formats of teamDetails (by non-spot eventId, primary eventId, or any valid event key).
 */
export function getRecordTeammates(record: RegistrationRecord | undefined | null): TeamMemberInfo[] {
  if (!record || !record.teamDetails || typeof record.teamDetails !== 'object') {
    return [];
  }

  const isValidMember = (m: TeamMemberInfo | any): boolean => {
    if (!m) return false;
    const name = typeof m === 'object' ? (m.name || '').trim() : String(m).trim();
    const roll = typeof m === 'object' ? (m.roll || '').trim() : '';
    return Boolean(name || roll);
  };

  // 1. Try finding by technical eventId (excluding 'spot')
  const nonSpotEvent = record.eventIds?.find(id => id !== 'spot');
  if (nonSpotEvent && Array.isArray(record.teamDetails[nonSpotEvent]?.teamMembers)) {
    const valid = record.teamDetails[nonSpotEvent].teamMembers!.filter(isValidMember);
    if (valid.length > 0) return valid;
  }

  // 2. Try primary/first eventId
  const firstEvent = record.eventIds?.[0];
  if (firstEvent && Array.isArray(record.teamDetails[firstEvent]?.teamMembers)) {
    const valid = record.teamDetails[firstEvent].teamMembers!.filter(isValidMember);
    if (valid.length > 0) return valid;
  }

  // 3. Fallback: check any key in teamDetails that has a teamMembers array
  for (const [key, details] of Object.entries(record.teamDetails)) {
    if (!key.startsWith('_') && details && Array.isArray(details.teamMembers) && details.teamMembers.length > 0) {
      const valid = details.teamMembers.filter(isValidMember);
      if (valid.length > 0) return valid;
    }
  }

  // 4. Fallback: if only details.members (string array) exists without structured objects
  for (const [key, details] of Object.entries(record.teamDetails)) {
    if (!key.startsWith('_') && details && Array.isArray(details.members) && details.members.length > 0) {
      // Exclude lead name if it is the first element
      const extraNames = details.members.filter(
        (m, idx) => !(idx === 0 && String(m).trim().toLowerCase() === (record.name || '').trim().toLowerCase()) && String(m).trim().length > 0
      );
      if (extraNames.length > 0) {
        return extraNames.map(name => ({
          name: String(name).trim(),
          roll: '',
          className: record.className || 'B.Tech',
          section: record.section || '',
          branch: record.dept || '',
          year: record.year || '',
          phone: '',
          isIeeeMember: false
        }));
      }
    }
  }

  return [];
}

/**
 * Returns total number of delegates (Lead + Teammates) in a registration record.
 */
export function getRecordMemberCount(record: RegistrationRecord | undefined | null): number {
  if (!record) return 0;
  return 1 + getRecordTeammates(record).length;
}

/**
 * Returns total number of IEEE members in this registration record (Lead + IEEE Teammates).
 */
export function getRecordIeeeMemberCount(record: RegistrationRecord | undefined | null): number {
  if (!record) return 0;
  const leadCount = record.isIeeeMember ? 1 : 0;
  const teammates = getRecordTeammates(record);
  const teammateCount = teammates.filter(m => !!m.isIeeeMember).length;
  return leadCount + teammateCount;
}

/**
 * Returns total number of Non-IEEE members in this registration record (Lead + Non-IEEE Teammates).
 */
export function getRecordNonIeeeMemberCount(record: RegistrationRecord | undefined | null): number {
  if (!record) return 0;
  const leadCount = !record.isIeeeMember ? 1 : 0;
  const teammates = getRecordTeammates(record);
  const teammateCount = teammates.filter(m => !m.isIeeeMember).length;
  return leadCount + teammateCount;
}

export interface RecordLunchStats {
  totalMealsAllocated: number;
  mealsDispensed: number;
  mealsRemaining: number;
  isFullyCollected: boolean;
  memberStatus: Record<string, boolean>;
}

/**
 * Computes individual and total lunch meal tray allocation and redemption state for a record.
 */
export function getRecordLunchStats(record: RegistrationRecord | undefined | null): RecordLunchStats {
  if (!record) {
    return {
      totalMealsAllocated: 0,
      mealsDispensed: 0,
      mealsRemaining: 0,
      isFullyCollected: false,
      memberStatus: {}
    };
  }

  const memberCount = getRecordMemberCount(record);
  const statusMap = record.memberLunchStatus || {};

  const hasMemberMap = Object.keys(statusMap).length > 0;
  let dispensed = 0;

  if (hasMemberMap) {
    dispensed = Object.values(statusMap).filter(Boolean).length;
  } else if (record.lunchCollectedCount !== undefined) {
    dispensed = Math.min(memberCount, Math.max(0, record.lunchCollectedCount));
  } else if (record.lunchCollected) {
    dispensed = memberCount;
  }

  return {
    totalMealsAllocated: memberCount,
    mealsDispensed: dispensed,
    mealsRemaining: Math.max(0, memberCount - dispensed),
    isFullyCollected: dispensed >= memberCount && memberCount > 0,
    memberStatus: statusMap
  };
}

export interface RecordCheckInStats {
  totalMembers: number;
  checkedInCount: number;
  absentCount: number;
  isFullyCheckedIn: boolean;
  isPartiallyCheckedIn: boolean;
  memberStatus: Record<string, boolean>;
  memberTimes: Record<string, string>;
}

/**
 * Computes individual and total check-in attendance stats for a record.
 * Tracks each member (lead, teammate_0, etc.) separately.
 */
export function getRecordCheckInStats(record: RegistrationRecord | undefined | null): RecordCheckInStats {
  if (!record) {
    return {
      totalMembers: 0,
      checkedInCount: 0,
      absentCount: 0,
      isFullyCheckedIn: false,
      isPartiallyCheckedIn: false,
      memberStatus: {},
      memberTimes: {}
    };
  }

  const teammates = getRecordTeammates(record);
  const totalMembers = 1 + teammates.length;
  const statusMap: Record<string, boolean> = { ...(record.memberCheckInStatus || {}) };
  const timesMap: Record<string, string> = { ...(record.memberCheckInTimes || {}) };

  const memberKeys = ['lead', ...teammates.map((_, i) => `teammate_${i}`)];

  // Legacy fallback: if record.checkedIn is true but memberCheckInStatus has no keys at all
  if (record.checkedIn && Object.keys(statusMap).length === 0) {
    statusMap['lead'] = true;
    if (record.checkInTime) timesMap['lead'] = record.checkInTime;
    teammates.forEach((_, i) => {
      const k = `teammate_${i}`;
      statusMap[k] = true;
      if (record.checkInTime) timesMap[k] = record.checkInTime;
    });
  }

  const checkedInCount = memberKeys.filter(k => Boolean(statusMap[k])).length;
  const absentCount = Math.max(0, totalMembers - checkedInCount);
  const isFullyCheckedIn = checkedInCount >= totalMembers && totalMembers > 0;
  const isPartiallyCheckedIn = checkedInCount > 0 && checkedInCount < totalMembers;

  return {
    totalMembers,
    checkedInCount,
    absentCount,
    isFullyCheckedIn,
    isPartiallyCheckedIn,
    memberStatus: statusMap,
    memberTimes: timesMap
  };
}

export interface RecordTrackAttendanceStats {
  hasTech: boolean;
  hasSpot: boolean;
  techEventName: string;
  totalMembers: number;
  techAttendedCount: number;
  techMemberStatus: Record<string, boolean>;
  techMemberTimes: Record<string, string>;
  isFullyTechAttended: boolean;
  spotAttendedCount: number;
  spotMemberStatus: Record<string, boolean>;
  spotMemberTimes: Record<string, string>;
  isFullySpotAttended: boolean;
}

/**
 * Computes individual and team-level attendance states specifically for
 * Technical Events (Track 1) vs Spot Events (Track 2).
 */
export function getRecordTrackAttendanceStats(record: RegistrationRecord | undefined | null): RecordTrackAttendanceStats {
  if (!record) {
    return {
      hasTech: false,
      hasSpot: false,
      techEventName: 'Technical Event',
      totalMembers: 0,
      techAttendedCount: 0,
      techMemberStatus: {},
      techMemberTimes: {},
      isFullyTechAttended: false,
      spotAttendedCount: 0,
      spotMemberStatus: {},
      spotMemberTimes: {},
      isFullySpotAttended: false
    };
  }

  const teammates = getRecordTeammates(record);
  const totalMembers = 1 + teammates.length;
  const memberKeys = ['lead', ...teammates.map((_, i) => `teammate_${i}`)];

  const eventIds = record.eventIds || [];
  const techEvents = eventIds.filter(id => id !== 'spot' && id !== 'spot-pass');
  const hasTech = techEvents.length > 0 || 
    Boolean(record.teamDetails && Object.keys(record.teamDetails).some(k => !k.startsWith('_') && k !== 'spot' && k !== 'spot-pass'));
  const hasSpot = eventIds.some(id => id === 'spot' || id === 'spot-pass' || id === 'spot_pass' || id === 'spot-events') ||
    Boolean(record.spotPassCount && record.spotPassCount > 0) ||
    Boolean((record as any).includeSpotEvents) ||
    Boolean(record.teamDetails && record.teamDetails['spot']);

  const primaryTechId = techEvents[0] || (record.teamDetails ? Object.keys(record.teamDetails).find(k => !k.startsWith('_') && k !== 'spot' && k !== 'spot-pass') || '' : '');
  const techEventName = ALL_EVENTS.find(e => e.id === primaryTechId)?.name || (hasTech ? 'Technical Event' : 'None');

  // Tech status map
  const techStatus: Record<string, boolean> = { ...(record.memberTechStatus || {}) };
  const techTimes: Record<string, string> = { ...(record.memberTechTimes || {}) };

  const techAttendedCount = hasTech ? memberKeys.filter(k => Boolean(techStatus[k])).length : 0;
  const isFullyTechAttended = hasTech && techAttendedCount >= totalMembers && totalMembers > 0;

  // Spot status map
  const spotStatus: Record<string, boolean> = { ...(record.memberSpotStatus || {}) };
  const spotTimes: Record<string, string> = { ...(record.memberSpotTimes || {}) };

  const spotAttendedCount = hasSpot ? memberKeys.filter(k => Boolean(spotStatus[k])).length : 0;
  const isFullySpotAttended = hasSpot && spotAttendedCount >= totalMembers && totalMembers > 0;

  return {
    hasTech,
    hasSpot,
    techEventName,
    totalMembers,
    techAttendedCount,
    techMemberStatus: techStatus,
    techMemberTimes: techTimes,
    isFullyTechAttended,
    spotAttendedCount,
    spotMemberStatus: spotStatus,
    spotMemberTimes: spotTimes,
    isFullySpotAttended
  };
}

export interface IndividualParticipant {
  id: string;
  regId: string;
  memberKey: string;
  memberIndex: number;
  passCode: string;
  role: string;
  name: string;
  roll: string;
  phone: string;
  email: string;
  college: string;
  dept: string;
  className: string;
  section: string;
  year: string;
  isIeeeMember: boolean;
  ieeeId?: string;
  teamName?: string;
  totalTeamMembers: number;
  eventIds: string[];
  isTechRegistered: boolean;
  techEventName: string;
  isTechAttended: boolean;
  techAttendedTime?: string;
  isSpotRegistered: boolean;
  isSpotAttended: boolean;
  spotAttendedTime?: string;
  paymentMode?: string;
  totalPaid: number;
  isVerified?: boolean;
  isCheckedIn: boolean;
  checkInTime?: string;
  isLunchCollected: boolean;
  record: RegistrationRecord;
}

/**
 * Flattens all registration records into an array of individual participants,
 * allowing individual delegate tracking (Present vs Absent) across teams and solo delegates.
 */
export function flattenToIndividualParticipants(records: RegistrationRecord[]): IndividualParticipant[] {
  const participants: IndividualParticipant[] = [];

  for (const record of records) {
    const teammates = getRecordTeammates(record);
    const totalMembers = 1 + teammates.length;
    const checkInStats = getRecordCheckInStats(record);
    const trackStats = getRecordTrackAttendanceStats(record);
    const lunchStats = getRecordLunchStats(record);
    const primaryEventId = record.eventIds?.[0] || '';
    const teamName = record.teamDetails?.[primaryEventId]?.teamName || 
      Object.values(record.teamDetails || {}).find(t => t?.teamName)?.teamName || '';

    // 1. Lead / Solo Participant
    const leadCheckedIn = Boolean(checkInStats.memberStatus['lead']);
    const leadCheckInTime = checkInStats.memberTimes['lead'] || (leadCheckedIn ? record.checkInTime : undefined);
    const leadTechAttended = Boolean(trackStats.techMemberStatus['lead']);
    const leadTechTime = trackStats.techMemberTimes['lead'];
    const leadSpotAttended = Boolean(trackStats.spotMemberStatus['lead']);
    const leadSpotTime = trackStats.spotMemberTimes['lead'];

    participants.push({
      id: `${record.regId}-lead`,
      regId: record.regId,
      memberKey: 'lead',
      memberIndex: 1,
      passCode: totalMembers > 1 ? `${record.regId}-M1` : record.regId,
      role: totalMembers > 1 ? 'Team Lead (Member 1)' : 'Solo Delegate',
      name: record.name,
      roll: record.roll || '',
      phone: record.phone || '',
      email: record.email || '',
      college: record.college || '',
      dept: record.dept || '',
      className: record.className || '',
      section: record.section || '',
      year: record.year || '',
      isIeeeMember: Boolean(record.isIeeeMember),
      ieeeId: record.ieeeId || '',
      teamName: teamName || undefined,
      totalTeamMembers: totalMembers,
      eventIds: record.eventIds || [],
      isTechRegistered: trackStats.hasTech,
      techEventName: trackStats.techEventName,
      isTechAttended: leadTechAttended,
      techAttendedTime: leadTechTime,
      isSpotRegistered: trackStats.hasSpot,
      isSpotAttended: leadSpotAttended,
      spotAttendedTime: leadSpotTime,
      paymentMode: record.paymentMode,
      totalPaid: record.totalPaid,
      isVerified: Boolean(record.isVerified),
      isCheckedIn: leadCheckedIn || leadTechAttended || leadSpotAttended,
      checkInTime: leadCheckInTime || leadTechTime || leadSpotTime,
      isLunchCollected: Boolean(lunchStats.memberStatus['lead'] || lunchStats.isFullyCollected),
      record
    });

    // 2. Teammates
    teammates.forEach((m, idx) => {
      const mIdx = idx + 2;
      const key = `teammate_${idx}`;
      const isCheckedIn = Boolean(checkInStats.memberStatus[key]);
      const checkInTime = checkInStats.memberTimes[key] || (isCheckedIn ? record.checkInTime : undefined);
      const isTechAttended = Boolean(trackStats.techMemberStatus[key]);
      const techAttendedTime = trackStats.techMemberTimes[key];
      const isSpotAttended = Boolean(trackStats.spotMemberStatus[key]);
      const spotAttendedTime = trackStats.spotMemberTimes[key];

      participants.push({
        id: `${record.regId}-${key}`,
        regId: record.regId,
        memberKey: key,
        memberIndex: mIdx,
        passCode: `${record.regId}-M${mIdx}`,
        role: `Team Member ${mIdx}`,
        name: m.name || `Member ${mIdx}`,
        roll: m.roll || '',
        phone: m.phone || record.phone || '',
        email: record.email || '',
        college: record.college || '',
        dept: m.branch || record.dept || '',
        className: m.className || record.className || '',
        section: m.section || record.section || '',
        year: m.year || record.year || '',
        isIeeeMember: Boolean(m.isIeeeMember),
        ieeeId: m.ieeeId || '',
        teamName: teamName || undefined,
        totalTeamMembers: totalMembers,
        eventIds: record.eventIds || [],
        isTechRegistered: trackStats.hasTech,
        techEventName: trackStats.techEventName,
        isTechAttended,
        techAttendedTime,
        isSpotRegistered: trackStats.hasSpot,
        isSpotAttended,
        spotAttendedTime,
        paymentMode: record.paymentMode,
        totalPaid: record.totalPaid,
        isVerified: Boolean(record.isVerified),
        isCheckedIn: isCheckedIn || isTechAttended || isSpotAttended,
        checkInTime: checkInTime || techAttendedTime || spotAttendedTime,
        isLunchCollected: Boolean(lunchStats.memberStatus[key] || lunchStats.isFullyCollected),
        record
      });
    });
  }

  return participants;
}

export interface DelegateStats {
  totalRegistrations: number;
  totalDelegates: number;
  totalIeeeDelegates: number;
  totalNonIeeeDelegates: number;
  checkedInRegistrations: number;
  checkedInDelegates: number;
  absentDelegates: number;
  totalTechDelegates: number;
  techAttendedDelegates: number;
  totalSpotDelegates: number;
  spotAttendedDelegates: number;
  totalRevenue: number;
  upiPendingCount: number;
  verifiedCount: number;
  upiTotalCount: number;
  razorpayTotalCount: number;
  totalLunchMealsDispensed: number;
}

/**
 * Computes symposium-wide delegate metrics including all team members across all records.
 * Accurately tracks individual delegate attendance.
 */
export function computeDelegatesStats(records: RegistrationRecord[]): DelegateStats {
  let totalDelegates = 0;
  let totalIeeeDelegates = 0;
  let totalNonIeeeDelegates = 0;
  let checkedInRegistrations = 0;
  let checkedInDelegates = 0;
  let totalTechDelegates = 0;
  let techAttendedDelegates = 0;
  let totalSpotDelegates = 0;
  let spotAttendedDelegates = 0;
  let totalRevenue = 0;
  let upiPendingCount = 0;
  let verifiedCount = 0;
  let upiTotalCount = 0;
  let razorpayTotalCount = 0;
  let totalLunchMealsDispensed = 0;

  for (const r of records) {
    const teammates = getRecordTeammates(r);
    const memberCount = 1 + teammates.length;
    totalDelegates += memberCount;

    // Lead
    if (r.isIeeeMember) {
      totalIeeeDelegates++;
    } else {
      totalNonIeeeDelegates++;
    }

    // Teammates
    for (const m of teammates) {
      if (m.isIeeeMember) {
        totalIeeeDelegates++;
      } else {
        totalNonIeeeDelegates++;
      }
    }

    // Individual Checked In Counting
    const checkInStats = getRecordCheckInStats(r);
    const trackStats = getRecordTrackAttendanceStats(r);

    if (trackStats.hasTech) {
      totalTechDelegates += memberCount;
      techAttendedDelegates += trackStats.techAttendedCount;
    }
    if (trackStats.hasSpot) {
      totalSpotDelegates += memberCount;
      spotAttendedDelegates += trackStats.spotAttendedCount;
    }

    const effectiveCheckedInCount = Math.max(
      checkInStats.checkedInCount,
      trackStats.techAttendedCount,
      trackStats.spotAttendedCount
    );

    if (effectiveCheckedInCount > 0) {
      checkedInRegistrations++;
    }
    checkedInDelegates += effectiveCheckedInCount;

    // Lunch Trays
    totalLunchMealsDispensed += getRecordLunchStats(r).mealsDispensed;

    // Revenue
    totalRevenue += r.totalPaid || 0;

    // Payment modes & verification
    if (r.paymentMode === 'upi') {
      upiTotalCount++;
      if (!r.isVerified) {
        upiPendingCount++;
      } else {
        verifiedCount++;
      }
    } else {
      razorpayTotalCount++;
      verifiedCount++;
    }
  }

  return {
    totalRegistrations: records.length,
    totalDelegates,
    totalIeeeDelegates,
    totalNonIeeeDelegates,
    checkedInRegistrations,
    checkedInDelegates,
    absentDelegates: Math.max(0, totalDelegates - checkedInDelegates),
    totalTechDelegates,
    techAttendedDelegates,
    totalSpotDelegates,
    spotAttendedDelegates,
    totalRevenue,
    upiPendingCount,
    verifiedCount,
    upiTotalCount,
    razorpayTotalCount,
    totalLunchMealsDispensed
  };
}

// =========================================================================
// 5-DESK SYMPOSIUM ATTENDANCE & VERIFICATION SYSTEM
// =========================================================================

export type DeskId = 'desk1_reception' | 'desk2_tech' | 'desk3_lunch' | 'desk4_spot' | 'desk5_cert';
export type DeskKey = 'reception' | 'tech' | 'lunch' | 'spot' | 'cert';

export interface DeskDefinition {
  id: DeskId;
  deskNumber: number;
  key: DeskKey;
  defaultTitle: string;
  shortLabel: string;
  badgeLabel: string;
  description: string;
  color: string;
  borderColor: string;
  bgLight: string;
  bgDark: string;
  iconName: 'UserCheck' | 'Zap' | 'Utensils' | 'Sparkles' | 'Award';
}

export const SYMPOSIUM_DESKS: DeskDefinition[] = [
  {
    id: 'desk1_reception',
    deskNumber: 1,
    key: 'reception',
    defaultTitle: 'Reception & Kit Desk',
    shortLabel: 'Desk 1 · Reception',
    badgeLabel: 'D1: Reception',
    description: 'Main Entry Verification & Delegate Welcome Kit Issuance',
    color: '#22c55e',
    borderColor: '#22c55e',
    bgLight: '#f0fdf4',
    bgDark: '#06180f',
    iconName: 'UserCheck'
  },
  {
    id: 'desk2_tech',
    deskNumber: 2,
    key: 'tech',
    defaultTitle: 'Technical Events Desk',
    shortLabel: 'Desk 2 · Technical',
    badgeLabel: 'D2: Tech Event',
    description: 'Morning Technical Competition Verification & Lab Seating',
    color: '#0088d4',
    borderColor: '#0088d4',
    bgLight: '#f0f9ff',
    bgDark: '#071829',
    iconName: 'Zap'
  },
  {
    id: 'desk3_lunch',
    deskNumber: 3,
    key: 'lunch',
    defaultTitle: 'Food & Lunch Desk',
    shortLabel: 'Desk 3 · Food/Lunch',
    badgeLabel: 'D3: Lunch Token',
    description: 'Campus Dining Hall Meal Tray & Refreshment Token Dispenser',
    color: '#f59e0b',
    borderColor: '#f59e0b',
    bgLight: '#fffbeb',
    bgDark: '#1c1305',
    iconName: 'Utensils'
  },
  {
    id: 'desk4_spot',
    deskNumber: 4,
    key: 'spot',
    defaultTitle: 'Spot Events Desk',
    shortLabel: 'Desk 4 · Spot Events',
    badgeLabel: 'D4: Spot Arena',
    description: 'Track 2 Non-Technical Arena Games & Courtyard Activities',
    color: '#8b5cf6',
    borderColor: '#8b5cf6',
    bgLight: '#faf5ff',
    bgDark: '#1a0e2e',
    iconName: 'Sparkles'
  },
  {
    id: 'desk5_cert',
    deskNumber: 5,
    key: 'cert',
    defaultTitle: 'Certificates & Valedictory Desk',
    shortLabel: 'Desk 5 · Certificates',
    badgeLabel: 'D5: Certificate',
    description: 'Official Participation Certificate, Merit Shields & Valedictory Exit',
    color: '#ec4899',
    borderColor: '#ec4899',
    bgLight: '#fdf2f8',
    bgDark: '#240718',
    iconName: 'Award'
  }
];

export const DEFAULT_DESK_TITLES: Record<DeskId, string> = {
  desk1_reception: 'Reception & Kit Desk',
  desk2_tech: 'Technical Events Desk',
  desk3_lunch: 'Food & Lunch Desk',
  desk4_spot: 'Spot Events Desk',
  desk5_cert: 'Certificates & Valedictory Desk'
};

export interface RecordCertStats {
  totalCertificates: number;
  certificatesIssuedCount: number;
  certificatesRemaining: number;
  isFullyIssued: boolean;
  memberStatus: Record<string, boolean>;
  memberTimes: Record<string, string>;
}

export function getRecordCertStats(record: RegistrationRecord | undefined | null): RecordCertStats {
  if (!record) {
    return {
      totalCertificates: 0,
      certificatesIssuedCount: 0,
      certificatesRemaining: 0,
      isFullyIssued: false,
      memberStatus: {},
      memberTimes: {}
    };
  }

  const teammates = getRecordTeammates(record);
  const totalMembers = 1 + teammates.length;
  const statusMap: Record<string, boolean> = { ...(record.memberCertStatus || {}) };
  const timesMap: Record<string, string> = { ...(record.memberCertTimes || {}) };
  const memberKeys = ['lead', ...teammates.map((_, i) => `teammate_${i}`)];

  if (record.certificateIssued && Object.keys(statusMap).length === 0) {
    statusMap['lead'] = true;
    if (record.certificateIssuedTime) timesMap['lead'] = record.certificateIssuedTime;
    teammates.forEach((_, i) => {
      const k = `teammate_${i}`;
      statusMap[k] = true;
      if (record.certificateIssuedTime) timesMap[k] = record.certificateIssuedTime;
    });
  }

  const issuedCount = memberKeys.filter(k => Boolean(statusMap[k])).length;
  const isFullyIssued = issuedCount >= totalMembers && totalMembers > 0;

  return {
    totalCertificates: totalMembers,
    certificatesIssuedCount: issuedCount,
    certificatesRemaining: Math.max(0, totalMembers - issuedCount),
    isFullyIssued,
    memberStatus: statusMap,
    memberTimes: timesMap
  };
}

export interface RecordDeskItem {
  id: DeskId;
  deskNumber: number;
  key: DeskKey;
  title: string;
  shortLabel: string;
  badgeLabel: string;
  color: string;
  isApplicable: boolean;
  isScanned: boolean;
  isFullyScanned: boolean;
  scannedCount: number;
  totalMembers: number;
  primaryTime?: string;
  operator?: string;
  memberStatus: Record<string, boolean>;
  memberTimes: Record<string, string>;
}

export interface Record5DeskSummary {
  completedDesksCount: number;
  applicableDesksCount: number;
  allApplicableCompleted: boolean;
  desks: RecordDeskItem[];
}

export function getRecord5DeskSummary(record: RegistrationRecord | undefined | null): Record5DeskSummary {
  if (!record) {
    return {
      completedDesksCount: 0,
      applicableDesksCount: 0,
      allApplicableCompleted: false,
      desks: []
    };
  }

  const teammates = getRecordTeammates(record);
  const totalMembers = 1 + teammates.length;
  const checkInStats = getRecordCheckInStats(record);
  const trackStats = getRecordTrackAttendanceStats(record);
  const lunchStats = getRecordLunchStats(record);
  const certStats = getRecordCertStats(record);

  const desks: RecordDeskItem[] = [
    {
      id: 'desk1_reception',
      deskNumber: 1,
      key: 'reception',
      title: 'Reception & Kit Desk',
      shortLabel: 'Desk 1 · Reception',
      badgeLabel: 'D1: Reception',
      color: '#22c55e',
      isApplicable: true,
      isScanned: checkInStats.checkedInCount > 0,
      isFullyScanned: checkInStats.isFullyCheckedIn,
      scannedCount: checkInStats.checkedInCount,
      totalMembers,
      primaryTime: record.checkInTime || checkInStats.memberTimes['lead'],
      operator: record.checkedInBy || 'Reception Desk',
      memberStatus: checkInStats.memberStatus,
      memberTimes: checkInStats.memberTimes
    },
    {
      id: 'desk2_tech',
      deskNumber: 2,
      key: 'tech',
      title: 'Technical Events Desk',
      shortLabel: 'Desk 2 · Technical',
      badgeLabel: 'D2: Tech Event',
      color: '#0088d4',
      isApplicable: trackStats.hasTech,
      isScanned: trackStats.techAttendedCount > 0,
      isFullyScanned: trackStats.isFullyTechAttended,
      scannedCount: trackStats.techAttendedCount,
      totalMembers,
      primaryTime: trackStats.techMemberTimes['lead'],
      operator: 'Technical Desk Scanner',
      memberStatus: trackStats.techMemberStatus,
      memberTimes: trackStats.techMemberTimes
    },
    {
      id: 'desk3_lunch',
      deskNumber: 3,
      key: 'lunch',
      title: 'Food & Lunch Desk',
      shortLabel: 'Desk 3 · Food/Lunch',
      badgeLabel: 'D3: Lunch Token',
      color: '#f59e0b',
      isApplicable: true,
      isScanned: lunchStats.mealsDispensed > 0,
      isFullyScanned: lunchStats.isFullyCollected,
      scannedCount: lunchStats.mealsDispensed,
      totalMembers,
      primaryTime: record.lunchCollectedTime,
      operator: record.lunchCollectedBy || 'Catering Counter',
      memberStatus: lunchStats.memberStatus,
      memberTimes: record.lunchCollectedTime ? { lead: record.lunchCollectedTime } : {}
    },
    {
      id: 'desk4_spot',
      deskNumber: 4,
      key: 'spot',
      title: 'Spot Events Desk',
      shortLabel: 'Desk 4 · Spot Events',
      badgeLabel: 'D4: Spot Arena',
      color: '#8b5cf6',
      isApplicable: trackStats.hasSpot,
      isScanned: trackStats.spotAttendedCount > 0,
      isFullyScanned: trackStats.isFullySpotAttended,
      scannedCount: trackStats.spotAttendedCount,
      totalMembers,
      primaryTime: trackStats.spotMemberTimes['lead'],
      operator: 'Spot Desk Scanner',
      memberStatus: trackStats.spotMemberStatus,
      memberTimes: trackStats.spotMemberTimes
    },
    {
      id: 'desk5_cert',
      deskNumber: 5,
      key: 'cert',
      title: 'Certificates & Valedictory Desk',
      shortLabel: 'Desk 5 · Certificates',
      badgeLabel: 'D5: Certificate',
      color: '#ec4899',
      isApplicable: true,
      isScanned: certStats.certificatesIssuedCount > 0,
      isFullyScanned: certStats.isFullyIssued,
      scannedCount: certStats.certificatesIssuedCount,
      totalMembers,
      primaryTime: record.certificateIssuedTime || certStats.memberTimes['lead'],
      operator: record.certificateIssuedBy || 'Valedictory Desk',
      memberStatus: certStats.memberStatus,
      memberTimes: certStats.memberTimes
    }
  ];

  const applicableDesks = desks.filter(d => d.isApplicable);
  const completedDesksCount = desks.filter(d => d.isApplicable && d.isScanned).length;
  const allApplicableCompleted = applicableDesks.length > 0 && applicableDesks.every(d => d.isScanned);

  return {
    completedDesksCount,
    applicableDesksCount: applicableDesks.length,
    allApplicableCompleted,
    desks
  };
}

export interface FiveDesksGlobalStats {
  desk1ScannedDelegates: number;
  desk2ScannedDelegates: number;
  desk3ScannedDelegates: number;
  desk4ScannedDelegates: number;
  desk5ScannedDelegates: number;
  fullyCompletedRegistrations: number;
}

export function get5DesksGlobalStats(records: RegistrationRecord[]): FiveDesksGlobalStats {
  let d1 = 0;
  let d2 = 0;
  let d3 = 0;
  let d4 = 0;
  let d5 = 0;
  let allDone = 0;

  for (const r of records) {
    const summary = getRecord5DeskSummary(r);
    d1 += summary.desks[0]?.scannedCount || 0;
    d2 += summary.desks[1]?.scannedCount || 0;
    d3 += summary.desks[2]?.scannedCount || 0;
    d4 += summary.desks[3]?.scannedCount || 0;
    d5 += summary.desks[4]?.scannedCount || 0;
    if (summary.allApplicableCompleted) {
      allDone++;
    }
  }

  return {
    desk1ScannedDelegates: d1,
    desk2ScannedDelegates: d2,
    desk3ScannedDelegates: d3,
    desk4ScannedDelegates: d4,
    desk5ScannedDelegates: d5,
    fullyCompletedRegistrations: allDone
  };
}
