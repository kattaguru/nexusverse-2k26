import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { 
  Printer, 
  CalendarPlus, 
  Copy, 
  Check, 
  Sparkles, 
  MapPin, 
  User, 
  School, 
  Trophy, 
  Award, 
  Phone, 
  Users, 
  Layers,
  MessageCircle,
  ExternalLink,
  Clock,
  ShieldCheck,
  QrCode as QrIcon,
  CheckCircle2,
  Hash,
  BookOpen,
  Utensils,
  Share2
} from 'lucide-react';
import { SymposiumEvent, SYMPOSIUM_CONFIG, SPOT_EVENT } from '../data/symposiumData';
import { getRecordTeammates, getRecordMemberCount, getRecordLunchStats } from '../utils/delegateStats';

export interface TeamMemberInfo {
  name: string;
  roll: string;
  className: string;
  section: string;
  branch: string;
  year: string;
  phone: string;
  isIeeeMember?: boolean;
  ieeeId?: string;
}

export interface RegistrationRecord {
  regId: string;
  userId?: string;
  paymentId: string;
  paymentScreenshot?: string;
  paymentMode?: 'upi' | 'razorpay';
  name: string;
  email: string;
  phone: string;
  college: string;
  className: string; // Class / Degree e.g. B.Tech
  section: string;   // Section e.g. A, B
  dept: string;      // Branch / Department
  year: string;      // Year of study
  roll: string;      // Roll No
  isIeeeMember: boolean;
  ieeeId?: string;
  eventIds: string[];
  teamDetails?: Record<string, { 
    teamName?: string; 
    members?: string[]; 
    teamMembers?: TeamMemberInfo[];
    projectTitle?: string;
  }>;
  spotPassCount?: number;
  spotMembers?: string[];
  subtotal?: number;
  gstAmount?: number;
  totalPaid: number;
  promoCode?: string;
  timestamp: string;
  isVerified?: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  checkedIn?: boolean;
  checkInTime?: string;
  checkedInBy?: string;
  attendedEvents?: string[];
  kitIssued?: boolean;
  checkInNotes?: string;
  lunchCollected?: boolean;
  lunchCollectedTime?: string;
  lunchCollectedBy?: string;
  lunchCollectedCount?: number;
  memberLunchStatus?: Record<string, boolean>;
}

interface TicketPassProps {
  record: RegistrationRecord;
  events: SymposiumEvent[];
  onReset: () => void;
  onOpenParticipantSpace?: () => void;
  leftLogo?: string;
  rightLogo?: string;
}

export const TicketPass: React.FC<TicketPassProps> = ({ 
  record, 
  events, 
  onReset,
  onOpenParticipantSpace,
  leftLogo = '/symposium-poster.jpg',
  rightLogo = '/ieee-sb-logo.png'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);

  const teammates = getRecordTeammates(record);
  const totalMembers = 1 + teammates.length;
  const lunchStats = getRecordLunchStats(record);

  // Parse if URL opened with a specific member (?member=2)
  const initialMemberIdx = (() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const mNum = parseInt(p.get('member') || '1', 10);
      if (!isNaN(mNum) && mNum >= 1 && mNum <= totalMembers) {
        return mNum - 1;
      }
    }
    return 0;
  })();

  const [selectedMemberIdx, setSelectedMemberIdx] = useState<number>(initialMemberIdx);
  const [memberQrMap, setMemberQrMap] = useState<Record<string, string>>({});

  // Compute live verification URL origin
  const origin = typeof window !== 'undefined' && window.location.origin 
    ? window.location.origin 
    : 'https://www.nbkristieee.in';

  // Build structured Member List with individual passCodes & verifyUrls
  const memberList = [
    {
      key: 'lead',
      index: 1,
      role: totalMembers > 1 ? 'Team Lead (Member 1)' : 'Lead Delegate',
      name: record.name,
      roll: record.roll || '',
      phone: record.phone || '',
      branch: record.dept || '',
      year: record.year || '',
      className: record.className || '',
      section: record.section || '',
      isIeeeMember: record.isIeeeMember,
      ieeeId: record.ieeeId,
      passCode: totalMembers > 1 ? `${record.regId}-M1` : record.regId,
      verifyUrl: `${origin}/register.html?passId=${encodeURIComponent(record.regId)}&member=1&roll=${encodeURIComponent(record.roll || '')}`,
      isLunchCollected: Boolean(lunchStats.memberStatus['lead'] || lunchStats.isFullyCollected)
    },
    ...teammates.map((m, idx) => {
      const mIdx = idx + 2;
      const key = `teammate_${idx}`;
      return {
        key,
        index: mIdx,
        role: `Team Member ${mIdx}`,
        name: m.name || `Member ${mIdx}`,
        roll: m.roll || '',
        phone: m.phone || '',
        branch: m.branch || record.dept || '',
        year: m.year || record.year || '',
        className: m.className || record.className || '',
        section: m.section || record.section || '',
        isIeeeMember: m.isIeeeMember,
        ieeeId: m.ieeeId,
        passCode: `${record.regId}-M${mIdx}`,
        verifyUrl: `${origin}/register.html?passId=${encodeURIComponent(record.regId)}&member=${mIdx}&roll=${encodeURIComponent(m.roll || '')}`,
        isLunchCollected: Boolean(lunchStats.memberStatus[key] || lunchStats.isFullyCollected)
      };
    })
  ];

  const selectedMember = memberList[selectedMemberIdx] || memberList[0];
  const passVerificationUrl = selectedMember.verifyUrl;

  // Pre-generate crisp QR Data URLs for all members
  useEffect(() => {
    let isMounted = true;
    const generateAll = async () => {
      const map: Record<string, string> = {};
      for (const m of memberList) {
        try {
          const url = await QRCode.toDataURL(m.verifyUrl, {
            width: 280,
            margin: 2,
            errorCorrectionLevel: 'H',
            color: { dark: '#000000', light: '#ffffff' }
          });
          map[m.key] = url;
        } catch (e) {
          console.error('Failed QR generation for', m.passCode, e);
        }
      }
      if (isMounted) {
        setMemberQrMap(map);
      }
    };
    generateAll();
    return () => { isMounted = false; };
  }, [record.regId, teammates.length, origin]);

  // Generate crisp, high-contrast QR Code onto canvas for active member
  useEffect(() => {
    if (!canvasRef.current || !selectedMember) return;
    
    QRCode.toCanvas(
      canvasRef.current, 
      selectedMember.verifyUrl, 
      {
        width: 210,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, 
      (error) => {
        if (error) console.error('QR code generation error:', error);
      }
    );
  }, [selectedMemberIdx, selectedMember?.verifyUrl]);

  const copyRegId = () => {
    navigator.clipboard.writeText(selectedMember.passCode || record.regId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyPassUrl = () => {
    navigator.clipboard.writeText(selectedMember.verifyUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const waGroupUrl = SYMPOSIUM_CONFIG.whatsappGroup?.url || "https://chat.whatsapp.com/GEpv2i56odNEV0LpLizzaO?s=cl&p=a&mlu=4&ilr=4&iam=2";

  const copyWaLink = () => {
    navigator.clipboard.writeText(waGroupUrl);
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const allKnownEvents = events.some(e => e.id === 'spot') ? events : [...events, SPOT_EVENT];
  const registeredEvents = allKnownEvents.filter(e => record.eventIds.includes(e.id));
  const hasTech = registeredEvents.some(e => e.id !== 'spot');
  const hasSpot = registeredEvents.some(e => e.id === 'spot') || record.eventIds.includes('spot');

  // Generate WhatsApp Direct Share link for Participant Ticket (Customized per member)
  const getWhatsAppShareUrl = (memberIdx?: number) => {
    const target = memberList[memberIdx ?? selectedMemberIdx] || memberList[0];
    const eventNames = record.eventIds
      .map(id => allKnownEvents.find(e => e.id === id)?.name || id)
      .join(', ');

    const shareText = 
`🎟️ *NEXUSVERSE 2K26 - OFFICIAL ENTRY PASS*
━━━━━━━━━━━━━━━━━━━━
👤 *Delegate:* ${target.name} (${target.role})
🆔 *Pass ID:* ${target.passCode}
🎓 *Roll No:* ${target.roll || 'N/A'}
🏛️ *College:* ${record.college || 'NBKRIST'}
📚 *Branch:* ${target.branch || record.dept || ''} (${target.year || record.year || ''} Year, Sec ${target.section || record.section || 'A'})
🎯 *Event(s):* ${eventNames}
👥 *Team Registration:* ${totalMembers > 1 ? `${totalMembers} Members Registered` : 'Single Delegate'}
💳 *Status:* ${record.isVerified || record.paymentMode === 'razorpay' ? 'Confirmed & Verified ✅' : 'Registered ⏳'} (₹${record.totalPaid})
🍽️ *Food Token:* 1 Delegate Meal Tray Included (${target.name})
📍 *Venue:* N.B.K.R. Institute of Science & Technology, Vidyanagar
📅 *Date:* 29th October 2026

🔗 *View Live Ticket & Individual QR Pass:*
${target.verifyUrl}

_(Show this pass or QR code at the registration desk for badge, kit, and meal tray collection)_`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  };

  // Generate and download .ics calendar invite
  const handleAddToCalendar = () => {
    const eventTitle = `NexusVerse 2K26 - National Tech Symposium`;
    const eventNames = record.eventIds.map(id => allKnownEvents.find(e => e.id === id)?.name || id).join(', ');
    const description = `NexusVerse 2K26 at NBKRIST, Vidyanagar. Registered Event(s): ${eventNames}. Pass ID: ${record.regId}. Roll: ${record.roll}. Class: ${record.className} ${record.section}`;
    const location = `N.B.K.R. Institute of Science & Technology, Vidyanagar, Tirupati`;
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//NexusVerse//NBKRIST//EN',
      'BEGIN:VEVENT',
      `UID:${record.regId}@nbkrist.org`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      'DTSTART:20261029T033000Z',
      'DTEND:20261029T120000Z',
      `SUMMARY:${eventTitle}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `NexusVerse-2K26-${record.regId}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-3 sm:px-6 space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Banner / Confirmation Notice */}
      <div className="text-center space-y-3 no-print">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#4cc38a]/15 text-[#4cc38a] border border-[#4cc38a]/40 shadow-xl shadow-[#4cc38a]/10">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="font-serif-title text-3xl sm:text-4xl font-extrabold text-[#ffffff] tracking-tight">
          Official Delegate Pass Generated!
        </h2>
        <p className="text-xs sm:text-sm text-[#b9ae94] max-w-lg mx-auto">
          Your registration has been confirmed. Below is your official authenticated QR Delegate Pass for <strong>NexusVerse 2K26</strong>.
        </p>

        {/* Pass ID Pill & Actions */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-[#14141b] border-2 border-[#d4a935]/40 text-[#f2c14e] shadow-lg">
            <span className="text-[11px] uppercase tracking-wider text-[#a79f8b] font-semibold">Pass ID:</span>
            <span className="font-mono text-lg sm:text-xl font-black text-[#f2c14e] tracking-wider">{record.regId}</span>
            <button
              type="button"
              onClick={copyRegId}
              className="p-1.5 text-[#a79f8b] hover:text-[#f3ecd9] bg-white/5 rounded-lg border border-white/10 hover:border-[#d4a935]/50 transition-colors cursor-pointer"
              title="Copy Registration Pass ID"
            >
              {copied ? <Check className="w-4 h-4 text-[#4cc38a]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <a
            href={getWhatsAppShareUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#25d366] to-[#128c7e] text-white font-bold text-xs hover:opacity-95 active:scale-95 transition-all shadow-lg shadow-[#25d366]/20 cursor-pointer"
            title="Share or backup this ticket directly to WhatsApp"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>Send Ticket to WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </div>
      </div>

      {/* UPI Notice Banner (if UPI was used) */}
      {record.paymentMode === 'upi' && (
        <div className={`no-print p-4 sm:p-5 rounded-2xl border text-xs sm:text-sm text-[#f3ecd9] flex items-center gap-3.5 shadow-xl ${
          record.isVerified
            ? 'bg-gradient-to-r from-[#0d2a1c] via-[#143a28] to-[#0d2a1c] border-[#4cc38a]/70'
            : 'bg-gradient-to-r from-[#1f1b0e] via-[#2a2211] to-[#1f1b0e] border-[#d4a935]/70'
        }`}>
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
            record.isVerified
              ? 'bg-[#4cc38a]/20 border-[#4cc38a]/50 text-[#4cc38a]'
              : 'bg-[#d4a935]/20 border-[#d4a935]/50 text-[#f2c14e]'
          }`}>
            {record.isVerified ? <ShieldCheck className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </div>
          <div>
            <span className={`font-bold block text-sm ${record.isVerified ? 'text-[#4cc38a]' : 'text-[#f2c14e]'}`}>
              {record.isVerified ? 'UPI Payment Verified ✓ · Official Entry Authorized' : 'UPI Payment Recorded · Official Ticket Access'}
            </span>
            <span className="text-[#d8cea7] text-xs">
              {record.isVerified
                ? 'Your payment has been officially verified by the desk. This ticket pass is active and fully authorized for venue entry, event participation, and lunch meal trays.'
                : (
                  <>Your ticket will be sent to your mail at <strong>8 PM</strong> and you can access your live ticket anytime in <strong>your space</strong> (<strong>find my ticket</strong>).</>
                )}
            </span>
          </div>
        </div>
      )}

      {/* Official WhatsApp Group Notification Banner */}
      <div className="no-print p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0d2a1a] via-[#123824] to-[#0d2a1a] border-2 border-[#25d366]/70 shadow-2xl shadow-[#25d366]/20 space-y-3 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[#25d366]/10 blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#25d366] text-[#052e16] flex items-center justify-center shrink-0 shadow-lg shadow-[#25d366]/40">
              <MessageCircle className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#25d366]/20 text-[#25d366] border border-[#25d366]/40">
                  Mandatory Participant Step
                </span>
                <span className="text-xs text-[#a7f3d0] font-semibold">Join Official Community</span>
              </div>
              <h3 className="font-serif-title text-lg sm:text-xl font-bold text-[#ffffff] mt-0.5">
                Join the NexusVerse 2K26 WhatsApp Group
              </h3>
              <p className="text-xs text-[#a7f3d0]/80 mt-0.5 leading-relaxed">
                Stay updated with live event schedules, room & lab allocations, and coordinator announcements.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto shrink-0">
            <a
              href={waGroupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#25d366] text-[#052e16] font-bold text-sm hover:bg-[#20ba5a] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#25d366]/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Join WhatsApp Group</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={copyWaLink}
              className="w-full sm:w-auto px-3.5 py-3 rounded-xl bg-[#092215] border border-[#25d366]/40 text-[#a7f3d0] hover:text-[#ffffff] hover:border-[#25d366] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Copy WhatsApp Group Link"
            >
              {copiedWa ? <Check className="w-4 h-4 text-[#25d366]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedWa ? 'Copied Link!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          THE LUXURY VIP BOARDING PASS / SYMPOSIUM BADGE (PRINTABLE & SCANNABLE)
          ========================================================================= */}
      <div 
        id="nexusverse-printable-ticket"
        ref={ticketRef}
        className="ticket-pass-card bg-gradient-to-b from-[#161620] via-[#101017] to-[#0a0a0e] border-2 border-[#d4a935]/80 rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(212,169,53,0.3)] relative text-[#f3ecd9]"
      >
        {/* Top Gold Shimmer Line */}
        <div className="h-2 w-full bg-gradient-to-r from-[#d4a935] via-[#ffe599] via-[#f2c14e] to-[#d4a935]" />

        {/* ==================== PASS STUB HEADER ==================== */}
        <div className="bg-gradient-to-r from-[#191924] via-[#241f12] to-[#191924] p-5 sm:p-7 border-b-2 border-dashed border-[#d4a935]/40 relative ticket-pass-top">
          {/* Perforated Ticket Notches */}
          <div className="absolute -bottom-4 -left-4 w-8 h-8 rounded-full bg-[#0a0a0d] border border-[#d4a935]/50 shadow-inner ticket-pass-cutout" />
          <div className="absolute -bottom-4 -right-4 w-8 h-8 rounded-full bg-[#0a0a0d] border border-[#d4a935]/50 shadow-inner ticket-pass-cutout" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            {/* Logos & Institution Branding */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 shrink-0">
                {/* College / Symposium Crest */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#0a0a0d] p-1.5 border-2 border-[#d4a935]/60 shadow-xl flex items-center justify-center overflow-hidden">
                  <img 
                    src={leftLogo || '/symposium-poster.jpg'} 
                    alt="NBKRIST NexusVerse" 
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                </div>
                {/* IEEE Student Branch Crest */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-1.5 border-2 border-[#00629b] shadow-xl flex items-center justify-center overflow-hidden">
                  <img 
                    src={rightLogo || '/ieee-sb-logo.png'} 
                    alt="IEEE Student Branch" 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#f2c14e]">
                  <Sparkles className="w-3.5 h-3.5 text-[#f2c14e]" />
                  <span>IEEE-SB NBKRIST · NATIONAL SYMPOSIUM</span>
                </div>
                <h1 className="font-serif-title text-2xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ffffff] via-[#ffe599] to-[#f2c14e] tracking-tight leading-tight mt-0.5">
                  NexusVerse 2K26
                </h1>
                <p className="text-[11px] sm:text-xs text-[#d8cea7] font-medium leading-relaxed mt-0.5">
                  N.B.K.R. Institute of Science & Technology · Vidyanagar, Tirupati
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-[#a79f8b]">
                  <span className="font-semibold text-[#f2c14e]">Event Date:</span> 29 October 2026 (Thursday) · 08:30 AM Onwards
                </div>
              </div>
            </div>

            {/* VIP Pass ID Holographic Box */}
            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center p-3 sm:p-4 rounded-2xl bg-[#0f0f15] border-2 border-[#d4a935]/50 shadow-inner">
              <div className="text-left md:text-right">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#a79f8b] block">
                  OFFICIAL DELEGATE PASS
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black text-[#f2c14e] tracking-wider block">
                  {record.regId}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1b5e39]/30 border border-[#4cc38a]/50 text-[#4cc38a] text-[10px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#4cc38a]" />
                <span>{record.isVerified ? 'VERIFIED ENTRY' : 'OFFICIAL PASS'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Perforated Security Micro-Stripe */}
        <div className="bg-[#12121a] px-6 py-1.5 border-b border-[#2e2b22] flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-[#a79f8b] tracking-wider uppercase">
          <span>✦ AUTHENTICATED ENTRY BADGE ✦</span>
          <span className="hidden sm:inline">REPORTING TIME: 08:30 AM · ORIGINAL COLLEGE ID REQUIRED</span>
          <span>STB 00000 · VIDYANAGAR</span>
        </div>

        {/* ==================== PASS MAIN CONTENT ==================== */}
        <div className="p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Attendee Credentials & Events (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Delegate Details Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#d4a935] flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#d4a935]" />
                  <span>Delegate Credentials</span>
                </span>
                <span className="text-[11px] font-mono text-[#a79f8b]">
                  Status: <strong className="text-[#4cc38a]">Active Delegate</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {/* 1. Delegate Name */}
                <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-[#13131b] border border-[#2e2b22]">
                  <span className="text-[#a79f8b] text-[10px] block font-medium uppercase tracking-wider">
                    Delegate Name
                  </span>
                  <span className="font-bold text-sm text-[#ffffff] block mt-0.5 truncate" title={record.name}>
                    {record.name}
                  </span>
                </div>

                {/* 2. Roll Number */}
                <div className="p-3 rounded-xl bg-[#13131b] border border-[#2e2b22]">
                  <span className="text-[#a79f8b] text-[10px] block font-medium uppercase tracking-wider flex items-center gap-1">
                    <Hash className="w-3 h-3 text-[#d4a935]" /> Roll Number
                  </span>
                  <span className="font-mono font-bold text-xs text-[#f2c14e] block mt-0.5">
                    {record.roll}
                  </span>
                </div>

                {/* 3. Phone */}
                <div className="p-3 rounded-xl bg-[#13131b] border border-[#2e2b22]">
                  <span className="text-[#a79f8b] text-[10px] block font-medium uppercase tracking-wider flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#d4a935]" /> Phone
                  </span>
                  <span className="font-mono text-xs text-[#f3ecd9] block mt-0.5">
                    {record.phone}
                  </span>
                </div>

                {/* 4. Branch & Year */}
                <div className="p-3 rounded-xl bg-[#13131b] border border-[#2e2b22]">
                  <span className="text-[#a79f8b] text-[10px] block font-medium uppercase tracking-wider flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-[#d4a935]" /> Branch & Year
                  </span>
                  <span className="font-semibold text-xs text-[#f3ecd9] block mt-0.5">
                    {record.dept} ({record.year})
                  </span>
                </div>

                {/* 5. Class & Section */}
                <div className="p-3 rounded-xl bg-[#13131b] border border-[#2e2b22]">
                  <span className="text-[#a79f8b] text-[10px] block font-medium uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[#d4a935]" /> Class & Sec
                  </span>
                  <span className="font-semibold text-xs text-[#f3ecd9] block mt-0.5">
                    {record.className} · Sec {record.section}
                  </span>
                </div>

                {/* 6. College */}
                <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-[#13131b] border border-[#2e2b22]">
                  <span className="text-[#a79f8b] text-[10px] block font-medium uppercase tracking-wider flex items-center gap-1">
                    <School className="w-3 h-3 text-[#d4a935]" /> Institution
                  </span>
                  <span className="font-semibold text-xs text-[#f3ecd9] block mt-0.5 truncate" title={record.college}>
                    {record.college}
                  </span>
                </div>
              </div>

              {/* Membership Status Badge Bar */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-[#17161f] via-[#1c1912] to-[#17161f] border border-[#d4a935]/40 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#f2c14e]" />
                  <span className="text-xs font-bold text-[#ffffff]">
                    Pass Category:
                  </span>
                  <span className="text-xs text-[#f2c14e] font-semibold">
                    {hasTech && hasSpot 
                      ? `Tech + Spot Pass (${record.isIeeeMember ? 'IEEE Student' : 'Standard'})` 
                      : hasSpot 
                      ? 'Spot Events Pass (Non-Technical)' 
                      : `Technical Symposium Pass (${record.isIeeeMember ? 'IEEE' : 'Standard'})`}
                  </span>
                </div>

                {record.isIeeeMember ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#00629b]/30 text-[#70baff] border border-[#0088d4]/40 font-mono text-[11px] font-bold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>IEEE Member ID: {record.ieeeId || 'Verified'}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-[#a79f8b] border border-white/10 font-mono text-[11px]">
                    Non-IEEE Delegate
                  </span>
                )}
              </div>
            </div>

            {/* Confirmed Events & Schedules */}
            <div className="space-y-3 pt-3 border-t border-[#2e2b22]">
              <div className="text-xs font-bold uppercase tracking-wider text-[#d4a935] flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-[#d4a935]" />
                <span>Confirmed Event Access & Schedule</span>
              </div>

              <div className="space-y-3 text-xs">
                {registeredEvents.map((ev) => {
                  if (ev.id === 'spot') {
                    return (
                      <div key={ev.id} className="p-4 rounded-2xl bg-gradient-to-r from-[#0d1e34] via-[#091524] to-[#070e17] border-2 border-[#0088d4]/60 shadow-lg space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-sm text-[#ffffff] flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-[#70baff]" />
                              <span>{ev.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0088d4]/20 text-[#70baff] border border-[#0088d4]/40 font-mono font-bold">
                                Non-Technical
                              </span>
                            </div>
                            <div className="text-[#8ea8c9] text-[11px] mt-0.5 font-medium">
                              {ev.slot} · {ev.venue}
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-lg bg-[#00629b]/40 text-[#70baff] border border-[#0088d4]/50 font-bold text-xs font-mono shadow-sm">
                            ₹{(record.spotPassCount || 1) * 100} · {record.spotPassCount || 1} {(record.spotPassCount || 1) === 1 ? 'Spot Pass' : 'Spot Passes'} Included
                          </span>
                        </div>

                        <p className="text-[11px] text-[#8ea8c9] leading-relaxed">
                          {ev.tag}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-[#1b324d]/60">
                          <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-[#0b1726] border border-[#1b324d] text-[#9fc7e8] font-mono">
                            Session: 01:30 PM – 03:30 PM
                          </span>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-[#0b1726] border border-[#1b324d] text-[#4cc38a] font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3 text-[#4cc38a]" />
                            <span>Entry to All Non-Technical Spot Competitions</span>
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const teamInfo = record.teamDetails?.[ev.id];
                  const structuredMembers = teamInfo?.teamMembers || [];

                  return (
                    <div key={ev.id} className="p-4 rounded-2xl bg-[#0d0d12] border-2 border-[#d4a935]/30 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-[#ffffff] flex items-center gap-2">
                            <span>{ev.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#d4a935]/20 text-[#f2c14e] border border-[#d4a935]/40 font-mono font-bold">
                              Technical Event
                            </span>
                          </div>
                          <div className="text-[#d8cea7] text-[11px] mt-0.5 font-medium">
                            {ev.slot} · {ev.time} · {ev.venue}
                          </div>
                        </div>

                        {teamInfo?.teamName && (
                          <span className="px-3 py-1 rounded-lg bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/40 font-bold text-xs">
                            Team: {teamInfo.teamName}
                          </span>
                        )}
                      </div>

                      {teamInfo?.projectTitle && (
                        <div className="text-[11px] text-[#f3ecd9] italic bg-[#15151e] p-2.5 rounded-xl border border-[#2e2b22]">
                          Project Title: &quot;{teamInfo.projectTitle}&quot;
                        </div>
                      )}

                      {/* Structured Team Members Roster */}
                      {structuredMembers.length > 0 && (
                        <div className="pt-2 border-t border-[#2e2b22] space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-[#d4a935] font-semibold">
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              <span>Registered Team Members ({structuredMembers.length + 1} Total with Lead):</span>
                            </span>
                            <span className="text-[10px] text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-0.5 rounded border border-[#f59e0b]/30">
                              {totalMembers} Meal Trays Allocated
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Member 1 (Lead) */}
                            <div className={`p-3 rounded-2xl border text-[11px] space-y-2 transition-all ${
                              selectedMemberIdx === 0
                                ? 'bg-[#1a1711] border-[#f2c14e] shadow-lg shadow-[#d4a935]/15'
                                : 'bg-[#14141d] border-[#d4a935]/40'
                            }`}>
                              <div className="flex items-center justify-between font-bold text-[#ffffff]">
                                <span className="text-sm truncate" title={record.name}>{record.name}</span>
                                <span className="text-[10px] text-[#f2c14e] font-mono px-2 py-0.5 rounded-full bg-[#f2c14e]/10 border border-[#f2c14e]/30 font-bold shrink-0">
                                  LEAD (M1)
                                </span>
                              </div>
                              <div className="text-[#a79f8b] font-mono">Roll: {record.roll} · {record.phone}</div>
                              <div className="text-[#a79f8b]">{record.className} {record.section} · {record.dept} ({record.year})</div>
                              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-[#2e2b22]">
                                <div className="flex items-center gap-1">
                                  <Utensils className="w-3.5 h-3.5 text-[#f59e0b]" />
                                  <span className={`text-[10px] font-bold ${
                                    lunchStats.memberStatus['lead'] || lunchStats.isFullyCollected
                                      ? 'text-[#4cc38a]'
                                      : 'text-[#f59e0b]'
                                  }`}>
                                    {lunchStats.memberStatus['lead'] || lunchStats.isFullyCollected
                                      ? '1 Meal Tray Claimed ✓'
                                      : '1 Meal Tray Included'}
                                  </span>
                                </div>
                                {record.isIeeeMember ? (
                                  <span className="text-[#f2c14e] font-medium flex items-center gap-1 text-[10px]">
                                    <Award className="w-3 h-3 text-[#f2c14e]" />
                                    <span>IEEE: {record.ieeeId || 'Verified'}</span>
                                  </span>
                                ) : (
                                  <span className="text-[#a79f8b] text-[10px]">Non-IEEE</span>
                                )}
                              </div>

                              {/* Individual QR Preview & WhatsApp Quick Share */}
                              <div className="pt-2 border-t border-[#2e2b22] flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedMemberIdx(0)}
                                  className="flex items-center gap-2 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left cursor-pointer transition-all flex-1"
                                  title="View Lead Individual QR Code"
                                >
                                  {memberQrMap['lead'] ? (
                                    <img 
                                      src={memberQrMap['lead']} 
                                      alt={`${record.name} QR`} 
                                      className="w-10 h-10 rounded-lg bg-white p-0.5 shrink-0 border border-[#d4a935]" 
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                      <QrIcon className="w-5 h-5 text-[#f2c14e]" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-bold text-white block truncate">Individual QR Pass</span>
                                    <span className="text-[9px] text-[#f2c14e] font-mono block">
                                      {selectedMemberIdx === 0 ? '● Active in View' : 'Click to View Pass'}
                                    </span>
                                  </div>
                                </button>

                                <a
                                  href={getWhatsAppShareUrl(0)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2.5 rounded-xl bg-[#25d366]/15 hover:bg-[#25d366] text-[#25d366] hover:text-[#052e16] border border-[#25d366]/40 transition-all cursor-pointer flex items-center justify-center shrink-0"
                                  title={`Share ${record.name}'s pass on WhatsApp`}
                                >
                                  <MessageCircle className="w-4 h-4 fill-current" />
                                </a>
                              </div>
                            </div>

                            {/* Additional Members */}
                            {structuredMembers.map((m, idx) => {
                              const mIdx = idx + 2;
                              const key = `teammate_${idx}`;
                              const isSelected = selectedMemberIdx === idx + 1;
                              const isCollected = Boolean(lunchStats.memberStatus[key] || lunchStats.isFullyCollected);

                              return (
                                <div 
                                  key={idx} 
                                  className={`p-3 rounded-2xl border text-[11px] space-y-2 transition-all ${
                                    isSelected
                                      ? 'bg-[#1a1711] border-[#f2c14e] shadow-lg shadow-[#d4a935]/15'
                                      : 'bg-[#14141d] border-[#2e2b22]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between font-bold text-[#ffffff]">
                                    <span className="text-sm truncate" title={m.name || `Member ${mIdx}`}>
                                      {m.name || `Member ${mIdx}`}
                                    </span>
                                    <span className="text-[10px] text-[#a79f8b] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-bold shrink-0">
                                      MEMBER {mIdx}
                                    </span>
                                  </div>

                                  <div className="text-[#a79f8b] font-mono">Roll: {m.roll || 'N/A'} {m.phone ? `· ${m.phone}` : ''}</div>
                                  <div className="text-[#a79f8b]">
                                    {m.className || record.className} {m.section ? `Sec ${m.section}` : record.section} {m.branch ? `· ${m.branch}` : `· ${record.dept}`} {m.year ? `(${m.year})` : ''}
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-[#2e2b22]">
                                    <div className="flex items-center gap-1">
                                      <Utensils className="w-3.5 h-3.5 text-[#f59e0b]" />
                                      <span className={`text-[10px] font-bold ${
                                        isCollected ? 'text-[#4cc38a]' : 'text-[#f59e0b]'
                                      }`}>
                                        {isCollected ? '1 Meal Tray Claimed ✓' : '1 Meal Tray Included'}
                                      </span>
                                    </div>

                                    {m.isIeeeMember ? (
                                      <span className="text-[#f2c14e] font-medium flex items-center gap-1 text-[10px]">
                                        <Award className="w-3 h-3 text-[#f2c14e]" />
                                        <span>IEEE: {m.ieeeId || 'Verified'}</span>
                                      </span>
                                    ) : (
                                      <span className="text-[#a79f8b] text-[10px]">Non-IEEE</span>
                                    )}
                                  </div>

                                  {/* Individual QR Preview & WhatsApp Quick Share */}
                                  <div className="pt-2 border-t border-[#2e2b22] flex items-center justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedMemberIdx(idx + 1)}
                                      className="flex items-center gap-2 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left cursor-pointer transition-all flex-1"
                                      title={`View ${m.name || `Member ${mIdx}`} Individual QR Code`}
                                    >
                                      {memberQrMap[key] ? (
                                        <img 
                                          src={memberQrMap[key]} 
                                          alt={`${m.name || `Member ${mIdx}`} QR`} 
                                          className="w-10 h-10 rounded-lg bg-white p-0.5 shrink-0 border border-[#d4a935]" 
                                        />
                                      ) : (
                                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                          <QrIcon className="w-5 h-5 text-[#f2c14e]" />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <span className="text-[10px] font-bold text-white block truncate">Individual QR Pass</span>
                                        <span className="text-[9px] text-[#f2c14e] font-mono block">
                                          {isSelected ? '● Active in View' : 'Click to View Pass'}
                                        </span>
                                      </div>
                                    </button>

                                    <a
                                      href={getWhatsAppShareUrl(idx + 1)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-2.5 rounded-xl bg-[#25d366]/15 hover:bg-[#25d366] text-[#25d366] hover:text-[#052e16] border border-[#25d366]/40 transition-all cursor-pointer flex items-center justify-center shrink-0"
                                      title={`Share ${m.name || `Member ${mIdx}`}'s pass on WhatsApp`}
                                    >
                                      <MessageCircle className="w-4 h-4 fill-current" />
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: High-Contrast Scannable QR Security Column (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-5 bg-[#0e0e14] rounded-2xl border-2 border-[#d4a935]/50 text-center space-y-4 shadow-xl">
            {/* Member Switcher Tabs (When Team Pass has > 1 member) */}
            {totalMembers > 1 && (
              <div className="w-full space-y-2 no-print">
                <div className="flex items-center justify-between text-[11px] text-[#f2c14e] font-semibold">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>Select Member QR Pass:</span>
                  </span>
                  <span className="text-[10px] text-[#a79f8b] font-mono">
                    {selectedMemberIdx + 1} of {totalMembers}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-1 bg-[#14141d] rounded-xl border border-[#2e2b22]">
                  {memberList.map((m, idx) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setSelectedMemberIdx(idx)}
                      className={`flex-1 min-w-[100px] px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        selectedMemberIdx === idx
                          ? 'bg-gradient-to-r from-[#d4a935] to-[#f2c14e] text-[#1a1300] shadow-md shadow-[#d4a935]/20'
                          : 'text-[#d8cea7] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{idx === 0 ? '👑 Lead' : `M${idx + 1}`}:</span>
                      <span className="truncate max-w-[80px]">{m.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Scannable QR Container with Crisp White Background */}
            <div className="p-3 bg-white rounded-2xl shadow-2xl border-2 border-[#d4a935] ring-4 ring-[#d4a935]/20 flex flex-col items-center w-full max-w-[240px]">
              <canvas 
                ref={canvasRef} 
                className="block w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] rounded-lg" 
              />
              <div className="mt-2 text-center w-full px-1">
                <span className="text-[10px] font-mono font-bold tracking-wider text-black block uppercase">
                  {totalMembers > 1 ? `${selectedMember.role.toUpperCase()} QR PASS` : 'INSTANT CAMERA SCAN'}
                </span>
                <span className="text-[10px] font-bold text-[#1f2937] block mt-0.5 truncate" title={selectedMember.name}>
                  {selectedMember.name}
                </span>
                <span className="text-[9px] text-[#555] font-mono block">
                  {selectedMember.roll ? `Roll: ${selectedMember.roll}` : selectedMember.passCode}
                </span>
              </div>
            </div>

            {/* QR Instructions & Actions */}
            <div className="w-full space-y-2.5">
              <div className="text-center">
                <span className="text-[11px] font-mono font-bold text-[#f2c14e] block flex items-center justify-center gap-1.5">
                  <QrIcon className="w-3.5 h-3.5 text-[#f2c14e]" />
                  <span>INDIVIDUAL VERIFIED PASS</span>
                </span>
                <p className="text-[10px] text-[#a79f8b] mt-1 leading-relaxed">
                  Scan at admin desk to verify {selectedMember.name}&apos;s identity, lab attendance, and meal tray dispensing.
                </p>
              </div>

              {/* Direct Link Preview & Copy Link Button */}
              <div className="pt-2 border-t border-[#2e2b22] space-y-2">
                <a
                  href={getWhatsAppShareUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#25d366] to-[#128c7e] text-white hover:brightness-105 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-[#25d366]/20 no-print"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>Share {totalMembers > 1 ? `${selectedMember.name.split(' ')[0]}'s Pass` : 'Pass'} on WhatsApp</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>

                <a
                  href={selectedMember.verifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-[#1f1b0e] border border-[#d4a935]/60 text-[#f2c14e] hover:bg-[#f2c14e] hover:text-[#1a1300] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm no-print"
                >
                  <span>Open {totalMembers > 1 ? `${selectedMember.name.split(' ')[0]}'s Link` : 'Live Pass Link'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={copyPassUrl}
                  className="w-full py-1.5 px-3 rounded-xl bg-white/5 border border-white/10 text-[#d8cea7] hover:text-white hover:border-[#d4a935]/40 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer no-print"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-[#4cc38a]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied Link!' : 'Copy Verification URL'}</span>
                </button>
              </div>

              {/* Security Authorization Stamp */}
              <div className="p-2.5 rounded-xl bg-[#14141d] border border-[#2e2b22] text-[10px] text-[#a79f8b] space-y-1">
                <div className="flex items-center justify-between">
                  <span>Authorized Reception:</span>
                  <strong className="text-white">Desk 1 / Desk 2</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Entry Status:</span>
                  <strong className="text-[#4cc38a]">AUTHORIZED ✓</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Food / Lunch Tokens:</span>
                  <strong className={lunchStats.isFullyCollected ? 'text-[#4cc38a]' : 'text-[#f2c14e]'}>
                    {lunchStats.isFullyCollected
                      ? `ALL ${totalMembers} MEALS CLAIMED ✓`
                      : `${lunchStats.mealsDispensed} / ${totalMembers} MEALS CLAIMED`}
                  </strong>
                </div>
                <div className="text-[9px] text-[#d4a935] text-right font-medium">
                  ({totalMembers} {totalMembers === 1 ? 'Meal Tray' : 'Meal Trays'} Included · 1 per member)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== PASS FOOTER ==================== */}
        <div className="bg-[#14141d] px-5 sm:px-7 py-4 border-t-2 border-[#2e2b22] flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#a79f8b]">
          <div className="flex items-center gap-2 text-center md:text-left">
            <MapPin className="w-4 h-4 text-[#d4a935] shrink-0" />
            <span>
              <strong>Mandatory:</strong> Bring this pass & original College Identity Card for gate verification.
            </span>
          </div>
          <div className="font-mono text-[11px] text-center md:text-right">
            Amount Paid: <span className="text-[#f2c14e] font-bold">₹{record.totalPaid}</span>
            {record.gstAmount ? (
              <span className="text-[#a79f8b] text-[10px] ml-1">
                (Base: ₹{record.subtotal || (record.totalPaid - record.gstAmount)} + 5% GST: ₹{record.gstAmount})
              </span>
            ) : null}
            {' '}({record.paymentMode === 'upi' ? 'UPI UTR' : 'Razorpay Ref'}: <span className="text-white">{record.paymentId}</span>)
          </div>
        </div>
      </div>

      {/* ==================== ACTION BUTTONS (NO-PRINT) ==================== */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2 no-print">
        <a
          href={getWhatsAppShareUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#25d366] to-[#1ebe5d] text-[#052e16] font-extrabold text-sm hover:brightness-105 active:scale-95 transition-all shadow-lg shadow-[#25d366]/25 cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 fill-current" />
          <span>Share Ticket on WhatsApp</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
        </a>

        <a
          href={waGroupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0d2a1a] border border-[#25d366]/60 text-[#25d366] font-semibold text-sm hover:bg-[#25d366] hover:text-[#052e16] transition-all cursor-pointer"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Join WhatsApp Group</span>
        </a>

        <button
          type="button"
          onClick={handlePrint}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#171720] border border-[#d4a935]/50 text-[#f3ecd9] font-medium text-sm hover:bg-[#20202c] hover:border-[#d4a935] transition-all cursor-pointer shadow-md"
        >
          <Printer className="w-4 h-4 text-[#d4a935]" />
          <span>Print Pass / Save PDF</span>
        </button>

        <button
          type="button"
          onClick={handleAddToCalendar}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#171720] border border-[#2e2b22] text-[#f3ecd9] font-medium text-sm hover:bg-[#20202c] hover:border-[#d4a935] transition-all cursor-pointer"
        >
          <CalendarPlus className="w-4 h-4 text-[#d4a935]" />
          <span>Add to Calendar</span>
        </button>

        {onOpenParticipantSpace && (
          <button
            type="button"
            onClick={onOpenParticipantSpace}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#1f1b0e] border border-[#d4a935] text-[#f2c14e] font-bold text-sm hover:bg-[#d4a935] hover:text-[#1a1300] active:scale-95 transition-all cursor-pointer shadow-md shadow-[#d4a935]/15"
          >
            <User className="w-4 h-4" />
            <span>Open Your Space / My Dashboard</span>
          </button>
        )}

        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#f2c14e] text-[#1a1300] font-bold text-sm hover:bg-[#d4a935] active:scale-95 transition-all cursor-pointer shadow-md shadow-[#f2c14e]/20"
        >
          <span>Register Another Delegate</span>
        </button>
      </div>
    </div>
  );
};
