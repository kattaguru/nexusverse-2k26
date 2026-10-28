import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isMemberFoodEligible, getRecordLunchStats, getRecordTeammates, isRecordFoodRequired, computeDelegatesStats } from '../src/utils/delegateStats.js';
import { RegistrationRecord } from '../src/components/TicketPass.js';
import { mergeRegistrationLists } from '../src/services/api.js';

describe('Dedicated QR Codes & Checkpoint Routing Unit Tests', () => {
  it('should correctly determine eligibility for Technical, Food Token, and Spot events', () => {
    // 1. Delegate registered for Tech Event with food add-on
    const techWithFoodRecord: RegistrationRecord = {
      regId: 'NV26-TECH-01',
      paymentId: 'PAY-1',
      name: 'Alice Tech',
      email: 'alice@test.com',
      phone: '9876543210',
      college: 'NBKRIST',
      className: 'B.Tech',
      section: 'A',
      dept: 'CSE',
      year: 'IV',
      roll: '2201A0501',
      isIeeeMember: false,
      wantsFood: true,
      eventIds: ['innovrush'],
      totalPaid: 204,
      timestamp: '2026-10-27T06:00:00.000Z'
    };

    const hasTech1 = techWithFoodRecord.eventIds.some(id => id !== 'spot');
    const hasSpot1 = techWithFoodRecord.eventIds.includes('spot');
    const isFoodEligible1 = isMemberFoodEligible(techWithFoodRecord, 'lead');

    assert.strictEqual(hasTech1, true, 'Should be flagged as having technical events');
    assert.strictEqual(hasSpot1, false, 'Should not have spot events');
    assert.strictEqual(isFoodEligible1, true, 'Should be food eligible because wantsFood is true');

    // 2. Delegate registered for Tech Event WITHOUT food add-on (₹150 base non-IEEE)
    const techNoFoodRecord: RegistrationRecord = {
      regId: 'NV26-TECH-02',
      paymentId: 'PAY-2',
      name: 'Bob Standard',
      email: 'bob@test.com',
      phone: '9876543211',
      college: 'NBKRIST',
      className: 'B.Tech',
      section: 'B',
      dept: 'ECE',
      year: 'III',
      roll: '2201A0401',
      isIeeeMember: false,
      wantsFood: false,
      eventIds: ['flaghunt'],
      totalPaid: 153,
      timestamp: '2026-10-27T06:00:00.000Z'
    };

    const hasTech2 = techNoFoodRecord.eventIds.some(id => id !== 'spot');
    const isFoodEligible2 = isMemberFoodEligible(techNoFoodRecord, 'lead');
    assert.strictEqual(hasTech2, true);
    assert.strictEqual(isFoodEligible2, false, 'Standard ₹150 non-IEEE delegate without food must not be food eligible');

    // 3. Delegate registered for Spot Events ONLY with food add-on (+₹50)
    const spotWithFoodRecord: RegistrationRecord = {
      regId: 'NV26-SPOT-01',
      paymentId: 'PAY-3',
      name: 'Charlie Spot',
      email: 'charlie@test.com',
      phone: '9876543212',
      college: 'NBKRIST',
      className: 'B.Tech',
      section: 'A',
      dept: 'MECH',
      year: 'II',
      roll: '2301A0301',
      isIeeeMember: false,
      wantsFood: true,
      eventIds: ['spot'],
      totalPaid: 153,
      timestamp: '2026-10-27T06:00:00.000Z'
    };

    const hasTech3 = spotWithFoodRecord.eventIds.some(id => id !== 'spot');
    const hasSpot3 = spotWithFoodRecord.eventIds.includes('spot');
    const isFoodEligible3 = isMemberFoodEligible(spotWithFoodRecord, 'lead');

    assert.strictEqual(hasTech3, false, 'Spot-only participant must not have technical events');
    assert.strictEqual(hasSpot3, true, 'Should be flagged as having spot events');
    assert.strictEqual(isFoodEligible3, true, 'Spot with food add-on must be food eligible');

    // 4. Delegate registered for Spot Events ONLY WITHOUT food add-on (₹100 base)
    const spotNoFoodRecord: RegistrationRecord = {
      regId: 'NV26-SPOT-02',
      paymentId: 'PAY-4',
      name: 'Dave Spot',
      email: 'dave@test.com',
      phone: '9876543213',
      college: 'NBKRIST',
      className: 'B.Tech',
      section: 'C',
      dept: 'CIVIL',
      year: 'I',
      roll: '2401A0101',
      isIeeeMember: false,
      wantsFood: false,
      eventIds: ['spot'],
      totalPaid: 102,
      timestamp: '2026-10-27T06:00:00.000Z'
    };

    const isFoodEligible4 = isMemberFoodEligible(spotNoFoodRecord, 'lead');
    assert.strictEqual(isFoodEligible4, false, 'Standard spot pass without food must not be food eligible');
  });

  it('should parse checkpoint URL parameters correctly for scanner auto-routing', () => {
    const parseUrl = (urlString: string) => {
      const url = new URL(urlString);
      const passId = url.searchParams.get('passId') || url.searchParams.get('regId');
      const member = url.searchParams.get('member');
      const roll = url.searchParams.get('roll');
      const type = url.searchParams.get('type') || url.searchParams.get('desk');
      return { passId, member, roll, type };
    };

    // Test Technical QR
    const techUrl = 'https://www.nbkristieee.in/register.html?passId=NV26-1234&member=1&roll=2201A0501&type=tech';
    const techParsed = parseUrl(techUrl);
    assert.strictEqual(techParsed.passId, 'NV26-1234');
    assert.strictEqual(techParsed.member, '1');
    assert.strictEqual(techParsed.roll, '2201A0501');
    assert.strictEqual(techParsed.type, 'tech');

    // Test Food Token QR
    const foodUrl = 'https://www.nbkristieee.in/register.html?passId=NV26-1234&member=2&roll=2201A0502&type=lunch';
    const foodParsed = parseUrl(foodUrl);
    assert.strictEqual(foodParsed.passId, 'NV26-1234');
    assert.strictEqual(foodParsed.member, '2');
    assert.strictEqual(foodParsed.roll, '2201A0502');
    assert.strictEqual(foodParsed.type, 'lunch');

    // Test Spot Event QR
    const spotUrl = 'https://www.nbkristieee.in/register.html?passId=NV26-9999&member=1&roll=2201A0410&type=spot';
    const spotParsed = parseUrl(spotUrl);
    assert.strictEqual(spotParsed.passId, 'NV26-9999');
    assert.strictEqual(spotParsed.type, 'spot');

    // Test Master QR
    const masterUrl = 'https://www.nbkristieee.in/register.html?passId=NV26-9999&member=1&roll=2201A0410&type=all';
    const masterParsed = parseUrl(masterUrl);
    assert.strictEqual(masterParsed.passId, 'NV26-9999');
    assert.strictEqual(masterParsed.type, 'all');
  });

  it('should support multi-member teams with individual food and tech status', () => {
    const teamRecord: RegistrationRecord = {
      regId: 'NV26-TEAM-01',
      paymentId: 'PAY-TEAM',
      name: 'Lead Member',
      email: 'lead@test.com',
      phone: '9876543200',
      college: 'NBKRIST',
      className: 'B.Tech',
      section: 'A',
      dept: 'CSE',
      year: 'IV',
      roll: '2201A0501',
      isIeeeMember: true, // IEEE member has food included
      eventIds: ['innovrush'],
      totalPaid: 450,
      timestamp: '2026-10-27T06:00:00.000Z',
      teamDetails: {
        innovrush: {
          teamName: 'CyberKnights',
          teamMembers: [
            {
              name: 'Second Member',
              roll: '2201A0502',
              className: 'B.Tech',
              section: 'A',
              branch: 'CSE',
              year: 'IV',
              phone: '9876543202',
              isIeeeMember: false,
              wantsFood: false // Non-IEEE without food
            },
            {
              name: 'Third Member',
              roll: '2201A0503',
              className: 'B.Tech',
              section: 'A',
              branch: 'CSE',
              year: 'IV',
              phone: '9876543203',
              isIeeeMember: false,
              wantsFood: true // Non-IEEE with food add-on
            }
          ]
        }
      }
    };

    const teammates = getRecordTeammates(teamRecord);
    assert.strictEqual(teammates.length, 2);

    const lunchStats = getRecordLunchStats(teamRecord);
    // Lead is IEEE (eligible = true)
    assert.strictEqual(lunchStats.memberEligibility['lead'], true);
    // Teammate 0 wantsFood is false (eligible = false)
    assert.strictEqual(lunchStats.memberEligibility['teammate_0'], false);
    // Teammate 1 wantsFood is true (eligible = true)
    assert.strictEqual(lunchStats.memberEligibility['teammate_1'], true);

    // Total allocated meals should be 2 (Lead + Teammate 1)
    assert.strictEqual(lunchStats.totalMealsAllocated, 2);
  });

  it('should accurately compute totalFoodRequiredDelegates and foodRequiredRegistrations in delegateStats', () => {
    // 1. Single non-IEEE participant WITH food
    const rec1: RegistrationRecord = {
      regId: 'NV26-F1',
      paymentId: 'PAY-F1',
      name: 'Single Food User',
      email: 'f1@test.com',
      phone: '9000000001',
      college: 'NBKRIST',
      className: 'B.Tech',
      section: 'A',
      dept: 'CSE',
      year: 'IV',
      roll: '2201A0510',
      isIeeeMember: false,
      wantsFood: true,
      eventIds: ['innovrush'],
      totalPaid: 204,
      timestamp: '2026-10-27T06:00:00.000Z'
    };

    // 2. Single non-IEEE participant WITHOUT food
    const rec2: RegistrationRecord = {
      regId: 'NV26-F2',
      paymentId: 'PAY-F2',
      name: 'Single No Food User',
      email: 'f2@test.com',
      phone: '9000000002',
      college: 'NBKRIST',
      className: 'B.Tech',
      section: 'B',
      dept: 'ECE',
      year: 'III',
      roll: '2201A0410',
      isIeeeMember: false,
      wantsFood: false,
      eventIds: ['flaghunt'],
      totalPaid: 153,
      timestamp: '2026-10-27T06:00:00.000Z'
    };

    // 3. Team participant where Lead (IEEE) gets food, Member 1 no food, Member 2 gets food (total = 2 food delegates)
    const rec3: RegistrationRecord = {
      regId: 'NV26-F3',
      paymentId: 'PAY-F3',
      name: 'Team Lead Food',
      email: 'f3@test.com',
      phone: '9000000003',
      college: 'NBKRIST',
      className: 'B.Tech',
      section: 'A',
      dept: 'CSE',
      year: 'IV',
      roll: '2201A0520',
      isIeeeMember: true, // IEEE gets food in tech event
      wantsFood: true,
      eventIds: ['innovrush'],
      totalPaid: 350,
      timestamp: '2026-10-27T06:00:00.000Z',
      teamDetails: {
        innovrush: {
          teamName: 'Foodies',
          teamMembers: [
            {
              name: 'Teammate No Food',
              roll: '2201A0521',
              className: 'B.Tech',
              section: 'A',
              branch: 'CSE',
              year: 'IV',
              phone: '9000000004',
              isIeeeMember: false,
              wantsFood: false
            },
            {
              name: 'Teammate With Food',
              roll: '2201A0522',
              className: 'B.Tech',
              section: 'A',
              branch: 'CSE',
              year: 'IV',
              phone: '9000000005',
              isIeeeMember: false,
              wantsFood: true
            }
          ]
        }
      }
    };

    assert.strictEqual(isRecordFoodRequired(rec1), true);
    assert.strictEqual(isRecordFoodRequired(rec2), false);
    assert.strictEqual(isRecordFoodRequired(rec3), true);

    const stats = computeDelegatesStats([rec1, rec2, rec3]);

    // Total delegates: rec1 (1) + rec2 (1) + rec3 (3) = 5 total
    assert.strictEqual(stats.totalDelegates, 5);
    // Food required delegates: rec1 (1) + rec2 (0) + rec3 (2: lead + teammate 2) = 3 total delegates
    assert.strictEqual(stats.totalFoodRequiredDelegates, 3);
    // No food delegates: rec2 (1) + rec3 teammate 1 (1) = 2 total
    assert.strictEqual(stats.totalNoFoodDelegates, 2);
    // Registrations requiring food: rec1 and rec3 = 2
    assert.strictEqual(stats.foodRequiredRegistrations, 2);
  });

  it('mergeRegistrationLists should prevent data loss and intelligently combine local and remote registrations', () => {
    const localList: RegistrationRecord[] = [
      {
        regId: 'NV26-ALPHA',
        paymentId: 'PAY-1',
        name: 'Alpha User',
        email: 'alpha@test.com',
        phone: '9111111111',
        college: 'NBKRIST',
        className: 'B.Tech',
        section: 'A',
        dept: 'CSE',
        year: 'IV',
        roll: '2201A0588',
        isIeeeMember: false,
        eventIds: ['innovrush'],
        totalPaid: 200,
        timestamp: '2026-10-27T08:00:00.000Z',
        checkedIn: true // checked in locally at desk
      }
    ];

    const remoteList: RegistrationRecord[] = [
      {
        regId: 'NV26-ALPHA',
        paymentId: 'PAY-1',
        name: 'Alpha User',
        email: 'alpha@test.com',
        phone: '9111111111',
        college: 'NBKRIST',
        className: 'B.Tech',
        section: 'A',
        dept: 'CSE',
        year: 'IV',
        roll: '2201A0588',
        isIeeeMember: false,
        eventIds: ['innovrush'],
        totalPaid: 200,
        timestamp: '2026-10-27T08:00:00.000Z',
        lunchCollected: true // collected lunch in cloud
      },
      {
        regId: 'NV26-BETA',
        paymentId: 'PAY-2',
        name: 'Beta User',
        email: 'beta@test.com',
        phone: '9222222222',
        college: 'NBKRIST',
        className: 'B.Tech',
        section: 'B',
        dept: 'ECE',
        year: 'III',
        roll: '2201A0488',
        isIeeeMember: true,
        eventIds: ['flaghunt'],
        totalPaid: 150,
        timestamp: '2026-10-27T09:00:00.000Z'
      }
    ];

    // Merge both
    const merged = mergeRegistrationLists(localList, remoteList);

    // Both Alpha and Beta must exist (no data lost!)
    assert.strictEqual(merged.length, 2);

    const mergedAlpha = merged.find(r => r.regId === 'NV26-ALPHA');
    assert.ok(mergedAlpha);
    // Both local checkedIn AND remote lunchCollected should be preserved
    assert.strictEqual(mergedAlpha.checkedIn, true);
    assert.strictEqual(mergedAlpha.lunchCollected, true);

    // When an empty remote list is passed (e.g. temporary network hiccup), local list must NOT be wiped
    const fallbackMerged = mergeRegistrationLists(localList, []);
    assert.strictEqual(fallbackMerged.length, 1);
    assert.strictEqual(fallbackMerged[0].regId, 'NV26-ALPHA');
  });
});


