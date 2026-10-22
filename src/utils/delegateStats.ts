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

export interface DelegateStats {
  totalRegistrations: number;
  totalDelegates: number;
  totalIeeeDelegates: number;
  totalNonIeeeDelegates: number;
  checkedInRegistrations: number;
  checkedInDelegates: number;
  totalRevenue: number;
  upiPendingCount: number;
  verifiedCount: number;
  upiTotalCount: number;
  razorpayTotalCount: number;
  totalLunchMealsDispensed: number;
}

/**
 * Computes symposium-wide delegate metrics including all team members across all records.
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

    // Checked In
    if (r.checkedIn) {
      checkedInRegistrations++;
      checkedInDelegates += memberCount;
    }

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
    totalRevenue,
    upiPendingCount,
    verifiedCount,
    upiTotalCount,
    razorpayTotalCount,
    totalLunchMealsDispensed
  };
}
