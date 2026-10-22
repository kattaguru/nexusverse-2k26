import { RegistrationRecord, TeamMemberInfo } from '../components/TicketPass';

/**
 * Extracts all teammates from a registration record, handling different
 * formats of teamDetails (by non-spot eventId, primary eventId, or any valid event key).
 */
export function getRecordTeammates(record: RegistrationRecord | undefined | null): TeamMemberInfo[] {
  if (!record || !record.teamDetails || typeof record.teamDetails !== 'object') {
    return [];
  }

  // 1. Try finding by technical eventId (excluding 'spot')
  const nonSpotEvent = record.eventIds?.find(id => id !== 'spot');
  if (nonSpotEvent && record.teamDetails[nonSpotEvent]?.teamMembers?.length) {
    return record.teamDetails[nonSpotEvent].teamMembers!;
  }

  // 2. Try primary/first eventId
  const firstEvent = record.eventIds?.[0];
  if (firstEvent && record.teamDetails[firstEvent]?.teamMembers?.length) {
    return record.teamDetails[firstEvent].teamMembers!;
  }

  // 3. Fallback: check any key in teamDetails that has a teamMembers array
  for (const [key, details] of Object.entries(record.teamDetails)) {
    if (!key.startsWith('_') && details && Array.isArray(details.teamMembers) && details.teamMembers.length > 0) {
      return details.teamMembers;
    }
  }

  // 4. Fallback: if only details.members (string array) exists without structured objects
  for (const [key, details] of Object.entries(record.teamDetails)) {
    if (!key.startsWith('_') && details && Array.isArray(details.members) && details.members.length > 0) {
      // Exclude lead name if it is the first element
      const extraNames = details.members.filter(
        (m, idx) => !(idx === 0 && m.trim().toLowerCase() === (record.name || '').trim().toLowerCase())
      );
      if (extraNames.length > 0) {
        return extraNames.map(name => ({
          name,
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
    const lunchStats = getRecordLunchStats(record);
    const primaryEventId = record.eventIds?.[0] || '';
    const teamName = record.teamDetails?.[primaryEventId]?.teamName || 
      Object.values(record.teamDetails || {}).find(t => t?.teamName)?.teamName || '';

    // 1. Lead / Solo Participant
    const leadCheckedIn = Boolean(checkInStats.memberStatus['lead']);
    const leadCheckInTime = checkInStats.memberTimes['lead'] || (leadCheckedIn ? record.checkInTime : undefined);
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
      paymentMode: record.paymentMode,
      totalPaid: record.totalPaid,
      isVerified: Boolean(record.isVerified),
      isCheckedIn: leadCheckedIn,
      checkInTime: leadCheckInTime,
      isLunchCollected: Boolean(lunchStats.memberStatus['lead'] || lunchStats.isFullyCollected),
      record
    });

    // 2. Teammates
    teammates.forEach((m, idx) => {
      const mIdx = idx + 2;
      const key = `teammate_${idx}`;
      const isCheckedIn = Boolean(checkInStats.memberStatus[key]);
      const checkInTime = checkInStats.memberTimes[key] || (isCheckedIn ? record.checkInTime : undefined);

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
        paymentMode: record.paymentMode,
        totalPaid: record.totalPaid,
        isVerified: Boolean(record.isVerified),
        isCheckedIn,
        checkInTime,
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
    if (checkInStats.checkedInCount > 0) {
      checkedInRegistrations++;
    }
    checkedInDelegates += checkInStats.checkedInCount;

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
    totalRevenue,
    upiPendingCount,
    verifiedCount,
    upiTotalCount,
    razorpayTotalCount,
    totalLunchMealsDispensed
  };
}
