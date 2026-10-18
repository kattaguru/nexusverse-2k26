import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, SYMPOSIUM_CONFIG, TIMELINE } from '../src/data/symposiumData.ts';

describe('Symposium Data & Configuration Unit Tests', () => {
  it('should have general symposium configuration correctly configured', () => {
    assert.equal(SYMPOSIUM_CONFIG.name, 'NexusVerse 2K26');
    assert.equal(SYMPOSIUM_CONFIG.organizer, 'IEEE-SB NBKRIST');
    assert.equal(SYMPOSIUM_CONFIG.institution, 'N.B.K.R. Institute of Science & Technology');
    assert.equal(SYMPOSIUM_CONFIG.date, '29 October 2026');
    assert.equal(SYMPOSIUM_CONFIG.totalPrizePool, 'Exciting Cash Prizes & Awards (Revealing Soon!)');
  });

  it('should include cash prizes for all events without exposing numeric amounts', () => {
    for (const event of EVENTS) {
      assert.ok(event.prizes.first.includes('Cash Prize'), `${event.name} 1st prize should include Cash Prize`);
      assert.ok(event.prizes.second.includes('Cash Prize'), `${event.name} 2nd prize should include Cash Prize`);
      assert.ok(!event.prizes.first.includes('₹'), `${event.name} 1st prize must not reveal specific cash amounts`);
      assert.ok(!event.prizes.second.includes('₹'), `${event.name} 2nd prize must not reveal specific cash amounts`);
    }
  });

  it('should have valid Razorpay.me UPI handle configured', () => {
    assert.ok(SYMPOSIUM_CONFIG.razorpayMe, 'razorpayMe should be defined');
    assert.equal(SYMPOSIUM_CONFIG.razorpayMe.url, 'https://razorpay.me/@veluriprasanth');
    assert.equal(SYMPOSIUM_CONFIG.razorpayMe.handle, '@veluriprasanth');
    assert.equal(SYMPOSIUM_CONFIG.razorpayMe.name, 'VELURI PRASANTH');
  });

  it('should have valid official WhatsApp group configuration for participants', () => {
    assert.ok(SYMPOSIUM_CONFIG.whatsappGroup, 'whatsappGroup should be defined');
    assert.ok(SYMPOSIUM_CONFIG.whatsappGroup.url.includes('chat.whatsapp.com'), 'WhatsApp group must be a valid chat invite URL');
    assert.equal(SYMPOSIUM_CONFIG.whatsappGroup.url, 'https://chat.whatsapp.com/GEpv2i56odNEV0LpLizzaO?s=cl&p=a&mlu=4&ilr=4&iam=2');
  });

  it('should have designated symposium coordinators: Chair, Vice Chair, and Secretary', () => {
    const coords = SYMPOSIUM_CONFIG.coordinators;
    assert.equal(coords.length, 3);
    const upali = coords.find(c => c.name.includes('Upali'));
    assert.ok(upali);
    assert.equal(upali.role, 'Chair');

    const guravaiah = coords.find(c => c.name.includes('Guravaiah'));
    assert.ok(guravaiah);
    assert.equal(guravaiah.role, 'Vice Chair');

    const rithika = coords.find(c => c.name.includes('Rithika'));
    assert.ok(rithika);
    assert.equal(rithika.role, 'Secretary');
  });

  it('should contain all 5 required technical events with correct IDs', () => {
    const eventIds = EVENTS.map(e => e.id);
    assert.equal(EVENTS.length, 5);
    assert.ok(eventIds.includes('ctf'), 'FLAGHUNT (ctf) must exist');
    assert.ok(eventIds.includes('expo'), 'INNOVRUSH (expo) must exist');
    assert.ok(eventIds.includes('code'), 'CODENANO (code) must exist');
    assert.ok(eventIds.includes('bug'), 'TECHQUEST (bug) must exist');
    assert.ok(eventIds.includes('canva'), 'DESIGNOVA (canva) must exist');
  });

  it('should enforce ₹200 fee for non-members and ₹150 for IEEE members across all events', () => {
    for (const event of EVENTS) {
      assert.equal(
        event.feeNonMember, 
        200, 
        `${event.name} non-member fee should be ₹200`
      );
      assert.equal(
        event.feeMember, 
        150, 
        `${event.name} IEEE member fee should be ₹150`
      );
    }
  });

  it('should validate team size constraints for events', () => {
    const flaghunt = EVENTS.find(e => e.id === 'ctf');
    assert.ok(flaghunt);
    assert.equal(flaghunt.min, 2);
    assert.equal(flaghunt.max, 2, 'FLAGHUNT requires exactly 2 members');

    const codenano = EVENTS.find(e => e.id === 'code');
    assert.ok(codenano);
    assert.equal(codenano.min, 1);
    assert.equal(codenano.max, 1, 'CODENANO must be individual participation');

    const innovrush = EVENTS.find(e => e.id === 'expo');
    assert.ok(innovrush);
    assert.equal(innovrush.min, 1);
    assert.equal(innovrush.max, 2, 'INNOVRUSH allows 1 to 2 members');

    const techquest = EVENTS.find(e => e.id === 'bug');
    assert.ok(techquest);
    assert.equal(techquest.min, 1);
    assert.equal(techquest.max, 2, 'TECHQUEST allows 1 to 2 members');
  });

  it('should have valid promo codes configured with percentage discounts', () => {
    const promos = SYMPOSIUM_CONFIG.promoCodes;
    assert.equal(promos['IEEE10'], 10);
    assert.equal(promos['NEXUS20'], 20);
    assert.equal(promos['NBKRIST'], 15);
    assert.equal(promos['EARLYBIRD'], 10);
  });

  it('should have 6 chronological symposium timeline phases with correct venues', () => {
    assert.equal(TIMELINE.length, 6);
    
    // Inauguration
    const inauguration = TIMELINE[0];
    assert.equal(inauguration.title, 'Inauguration Ceremony');
    assert.equal(inauguration.time, '09:00 AM – 09:40 AM');
    assert.equal(inauguration.venue, 'Seminar Hall, NBKRIST');

    // Allocation
    const allocation = TIMELINE[1];
    assert.equal(allocation.time, '09:40 AM – 10:00 AM');

    // Technical Events
    const techEvents = TIMELINE[2];
    assert.equal(techEvents.title, 'Technical Events');
    assert.equal(techEvents.time, '10:00 AM – 12:00 PM');

    // Lunch Break
    const lunch = TIMELINE[3];
    assert.equal(lunch.time, '12:00 PM – 01:30 PM');

    // Spot Events
    const spotEvents = TIMELINE[4];
    assert.equal(spotEvents.time, '01:30 PM – 03:30 PM');

    // Prize Distribution
    const valedictory = TIMELINE[5];
    assert.equal(valedictory.title, 'Prize Distribution & Valedictory');
    assert.equal(valedictory.time, '03:30 PM – 04:00 PM');
  });
});
