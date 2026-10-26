import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isMemberFoodEligible, getRecordLunchStats, getRecordTeammates } from '../src/utils/delegateStats.js';
import { RegistrationRecord } from '../src/components/TicketPass.js';

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
      totalPaid: 204
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
      totalPaid: 153
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
      totalPaid: 153
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
      totalPaid: 102
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
});
