import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { 
  Download, 
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
  Layers 
} from 'lucide-react';
import { SymposiumEvent, SYMPOSIUM_CONFIG, SPOT_EVENT } from '../data/symposiumData';

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
  paymentId: string;
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
  totalPaid: number;
  promoCode?: string;
  timestamp: string;
}

interface TicketPassProps {
  record: RegistrationRecord;
  events: SymposiumEvent[];
  onReset: () => void;
  leftLogo?: string;
  rightLogo?: string;
}

export const TicketPass: React.FC<TicketPassProps> = ({ 
  record, 
  events, 
  onReset,
  leftLogo = '/symposium-poster.jpg',
  rightLogo = '/ieee-sb-logo.png'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Generate QR Code onto canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const qrPayload = `NEXUSVERSE2K26|${record.regId}|${record.roll}|${record.phone}|${record.email}|${record.eventIds.join(',')}|PAY:${record.paymentId}`;
    
    QRCode.toCanvas(canvasRef.current, qrPayload, {
      width: 170,
      margin: 1,
      color: {
        dark: '#0a0a0d',
        light: '#f2c14e'
      }
    }, (error) => {
      if (error) console.error('QR code generation error:', error);
    });
  }, [record]);

  const copyRegId = () => {
    navigator.clipboard.writeText(record.regId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const allKnownEvents = events.some(e => e.id === 'spot') ? events : [...events, SPOT_EVENT];
  const registeredEvents = allKnownEvents.filter(e => record.eventIds.includes(e.id));
  const hasTech = registeredEvents.some(e => e.id !== 'spot');
  const hasSpot = registeredEvents.some(e => e.id === 'spot') || record.eventIds.includes('spot');

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
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in-50 duration-300">
      {/* Success Notification Banner */}
      <div className="text-center space-y-3 no-print">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#4cc38a]/15 text-[#4cc38a] border border-[#4cc38a]/30 shadow-lg">
          <Check className="w-8 h-8" />
        </div>
        <h2 className="font-serif-title text-3xl sm:text-4xl font-extrabold text-[#ffffff] tracking-tight">
          Registration Confirmed!
        </h2>
        <p className="text-sm text-[#a79f8b] max-w-md mx-auto">
          Payment authorized via Razorpay. Your official delegate pass has been generated. Keep this pass handy for entry on event day.
        </p>

        {/* Reg ID Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#131318] border border-[#2e2b22] text-[#f2c14e] font-mono text-lg font-bold">
          <span>{record.regId}</span>
          <button
            type="button"
            onClick={copyRegId}
            className="p-1 text-[#a79f8b] hover:text-[#f3ecd9] transition-colors cursor-pointer"
            title="Copy Registration ID"
          >
            {copied ? <Check className="w-4 h-4 text-[#4cc38a]" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* The Printable Digital Pass */}
      <div 
        ref={ticketRef}
        className="bg-[#131318] border-2 border-[#d4a935]/50 rounded-3xl overflow-hidden shadow-2xl relative text-[#f3ecd9]"
      >
        {/* Pass Header */}
        <div className="bg-gradient-to-r from-[#181820] via-[#1f1b0e] to-[#181820] p-6 sm:p-8 border-b-2 border-dashed border-[#2e2b22] relative">
          {/* Side Cutouts */}
          <div className="absolute -bottom-4 -left-4 w-8 h-8 rounded-full bg-[#0a0a0d] border border-[#2e2b22]" />
          <div className="absolute -bottom-4 -right-4 w-8 h-8 rounded-full bg-[#0a0a0d] border border-[#2e2b22]" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-black/60 p-1 border border-[#d4a935]/40 shadow flex items-center justify-center shrink-0 overflow-hidden">
                <img src={leftLogo || '/symposium-poster.jpg'} alt="NexusVerse" className="max-h-full max-w-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#d4a935]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>IEEE-SB NBKRIST PRESENTS</span>
                </div>
                <h3 className="font-serif-title text-2xl sm:text-3xl font-black text-[#ffffff] tracking-tight mt-0.5">
                  NexusVerse 2K26
                </h3>
                <p className="text-xs text-[#a79f8b]">
                  National Level Technical Symposium · 29 October 2026
                </p>
              </div>
            </div>

            <div className="flex items-center sm:flex-col sm:items-end justify-between gap-3">
              <div className="w-12 h-12 rounded-full bg-white p-1 border border-[#2e2b22] shadow flex items-center justify-center shrink-0">
                <img src={rightLogo} alt="IEEE-SB" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#a79f8b] block">PASS ID</span>
                <span className="font-mono text-xl font-bold text-[#f2c14e]">{record.regId}</span>
                <span className="text-[10px] font-mono text-[#4cc38a] block mt-0.5">● PAYMENT VERIFIED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pass Main Grid */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Attendee Details */}
          <div className="md:col-span-8 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[#a79f8b] block flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#d4a935]" /> Delegate Name
                </span>
                <span className="font-bold text-sm text-[#ffffff] block mt-0.5">{record.name}</span>
              </div>
              <div>
                <span className="text-[#a79f8b] block">Roll Number</span>
                <span className="font-mono font-bold text-xs text-[#f2c14e] block mt-0.5">
                  {record.roll}
                </span>
              </div>
              <div>
                <span className="text-[#a79f8b] block flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#d4a935]" /> Phone Number
                </span>
                <span className="font-mono text-xs text-[#f3ecd9] block mt-0.5">
                  {record.phone}
                </span>
              </div>
              <div>
                <span className="text-[#a79f8b] block flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-[#d4a935]" /> Class & Section
                </span>
                <span className="font-semibold text-xs text-[#f3ecd9] block mt-0.5">
                  {record.className} · Sec {record.section}
                </span>
              </div>
              <div>
                <span className="text-[#a79f8b] block">Branch & Year</span>
                <span className="font-semibold text-xs text-[#f3ecd9] block mt-0.5">
                  {record.dept} ({record.year})
                </span>
              </div>
              <div>
                <span className="text-[#a79f8b] block flex items-center gap-1">
                  <School className="w-3.5 h-3.5 text-[#d4a935]" /> College / Inst.
                </span>
                <span className="font-semibold text-xs text-[#f3ecd9] block mt-0.5 truncate" title={record.college}>
                  {record.college}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="text-[#a79f8b] block flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-[#d4a935]" /> Pass Category
                </span>
                <span className="font-semibold text-xs text-[#f2c14e] bg-[#1f1b0e] px-2.5 py-0.5 rounded border border-[#d4a935]/30 inline-block mt-0.5">
                  {hasTech && hasSpot 
                    ? `Tech + Spot Pass (${record.isIeeeMember ? 'IEEE' : 'Regular'})` 
                    : hasSpot 
                    ? 'Spot Events Pass (Non-Technical)' 
                    : `Technical Event (${record.isIeeeMember ? 'IEEE' : 'Regular'})`}
                </span>
              </div>

              {record.isIeeeMember && (
                <div className="col-span-2 sm:col-span-2 p-2 rounded-lg bg-[#1f1b0e] border border-[#d4a935]/30 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-[#f2c14e] font-semibold">
                    <Award className="w-4 h-4" />
                    <span>IEEE Student Member</span>
                  </div>
                  <span className="font-mono text-xs text-[#a79f8b]">ID: {record.ieeeId}</span>
                </div>
              )}
            </div>

            {/* Registered Events */}
            <div className="space-y-3 pt-2 border-t border-[#2e2b22]">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#d4a935] flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-[#d4a935]" />
                <span>
                  {hasTech && hasSpot 
                    ? 'Confirmed Registrations (Technical + Spot Events)'
                    : hasSpot 
                    ? 'Confirmed Spot Events Registration'
                    : 'Confirmed Technical Event'}
                </span>
              </div>
              <div className="space-y-3 text-xs">
                {registeredEvents.map((ev) => {
                  if (ev.id === 'spot') {
                    return (
                      <div key={ev.id} className="p-4 rounded-xl bg-gradient-to-r from-[#0d1e34] via-[#091524] to-[#070e17] border border-[#0088d4]/50 shadow-md space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-sm text-[#ffffff] flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-[#70baff]" />
                              <span>{ev.name}</span>
                              <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#0088d4]/20 text-[#70baff] border border-[#0088d4]/40 font-mono">
                                Non-Technical
                              </span>
                            </div>
                            <div className="text-[#8ea8c9] text-[11px] mt-0.5">{ev.slot} · {ev.venue}</div>
                          </div>
                          <span className="px-2.5 py-1 rounded-md bg-[#00629b]/30 text-[#70baff] border border-[#0088d4]/40 font-semibold text-xs font-mono">
                            ₹100 · Spot Pass
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8ea8c9] leading-relaxed">
                          {ev.tag}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#1b324d]/60">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#0b1726] border border-[#1b324d] text-[#9fc7e8]">
                            Afternoon Session: 01:30 PM – 03:30 PM
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#0b1726] border border-[#1b324d] text-[#4cc38a] font-medium flex items-center gap-1">
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
                    <div key={ev.id} className="p-4 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-[#ffffff] flex items-center gap-2">
                            <span>{ev.name}</span>
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#d4a935]/20 text-[#f2c14e] border border-[#d4a935]/40 font-mono">
                              Technical Event
                            </span>
                          </div>
                          <div className="text-[#a79f8b] text-[11px] mt-0.5">{ev.slot} · {ev.time} · {ev.venue}</div>
                        </div>
                        {teamInfo?.teamName && (
                          <span className="px-2.5 py-1 rounded-md bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/30 font-semibold text-xs">
                            Team: {teamInfo.teamName}
                          </span>
                        )}
                      </div>

                      {teamInfo?.projectTitle && (
                        <div className="text-[11px] text-[#b9ae94] italic bg-[#131318] p-2 rounded-lg border border-[#2e2b22]">
                          Project Title: &quot;{teamInfo.projectTitle}&quot;
                        </div>
                      )}

                      {/* Structured Team Members List if present */}
                      {structuredMembers.length > 0 && (
                        <div className="pt-2 border-t border-[#2e2b22] space-y-2">
                          <div className="flex items-center gap-1.5 text-[11px] text-[#d4a935] font-semibold">
                            <Users className="w-3.5 h-3.5" />
                            <span>Team Members ({structuredMembers.length + 1} Total with Lead):</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Member 1 (Lead) */}
                            <div className="p-2.5 rounded-lg bg-[#131318] border border-[#d4a935]/30 text-[11px] space-y-0.5">
                              <div className="flex items-center justify-between font-bold text-[#ffffff]">
                                <span>{record.name}</span>
                                <span className="text-[10px] text-[#f2c14e] font-mono">LEAD</span>
                              </div>
                              <div className="text-[#a79f8b] font-mono">Roll: {record.roll} · {record.phone}</div>
                              <div className="text-[#a79f8b]">{record.className} {record.section} · {record.dept} ({record.year})</div>
                              <div className="text-[10px] pt-0.5">
                                {record.isIeeeMember ? (
                                  <span className="text-[#f2c14e] font-medium flex items-center gap-1">
                                    <Award className="w-3 h-3 text-[#f2c14e]" />
                                    <span>IEEE Member: {record.ieeeId || 'Verified'}</span>
                                  </span>
                                ) : (
                                  <span className="text-[#a79f8b]">Non-IEEE Member</span>
                                )}
                              </div>
                            </div>

                            {/* Additional Members */}
                            {structuredMembers.map((m, idx) => (
                              <div key={idx} className="p-2.5 rounded-lg bg-[#131318] border border-[#2e2b22] text-[11px] space-y-0.5">
                                <div className="flex items-center justify-between font-bold text-[#ffffff]">
                                  <span>{m.name || `Member ${idx + 2}`}</span>
                                  <span className="text-[10px] text-[#a79f8b] font-mono">MEMBER {idx + 2}</span>
                                </div>
                                <div className="text-[#a79f8b] font-mono">Roll: {m.roll || 'N/A'} {m.phone ? `· ${m.phone}` : ''}</div>
                                <div className="text-[#a79f8b]">
                                  {m.className || 'Class'} {m.section ? `Sec ${m.section}` : ''} {m.branch ? `· ${m.branch}` : ''} {m.year ? `(${m.year})` : ''}
                                </div>
                                <div className="text-[10px] pt-0.5">
                                  {m.isIeeeMember ? (
                                    <span className="text-[#f2c14e] font-medium flex items-center gap-1">
                                      <Award className="w-3 h-3 text-[#f2c14e]" />
                                      <span>IEEE Member: {m.ieeeId || 'Verified'}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[#a79f8b]">Non-IEEE Member</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* QR Code & Scan verification */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-[#0a0a0d] rounded-2xl border border-[#2e2b22] text-center space-y-3">
            <div className="p-2 rounded-xl bg-[#f2c14e] shadow-md inline-block">
              <canvas ref={canvasRef} className="block rounded-lg" />
            </div>
            <div className="text-center">
              <span className="text-[11px] font-mono text-[#a79f8b] block">SCAN AT RECEPTION DESK</span>
              <span className="text-[10px] text-[#a79f8b] block mt-1">29 Oct 2026, 8:30 AM onwards</span>
              <span className="text-[10px] font-mono text-[#4cc38a] block mt-1">Authorized Entry Pass</span>
            </div>
          </div>
        </div>

        {/* Pass Footer */}
        <div className="bg-[#181820] px-6 py-4 border-t border-[#2e2b22] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#a79f8b]">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#d4a935]" />
            <span>Bring this pass & original College Identity Card</span>
          </div>
          <div className="font-mono text-[11px]">
            Amount Paid: <span className="text-[#f2c14e] font-bold">₹{record.totalPaid}</span> (Razorpay Ref: {record.paymentId})
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-4 no-print">
        <button
          type="button"
          onClick={handlePrint}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] font-medium text-sm hover:bg-[#181820] hover:border-[#d4a935] transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4 text-[#d4a935]" />
          <span>Print Pass / Save PDF</span>
        </button>

        <button
          type="button"
          onClick={handleAddToCalendar}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] font-medium text-sm hover:bg-[#181820] hover:border-[#d4a935] transition-all cursor-pointer"
        >
          <CalendarPlus className="w-4 h-4 text-[#d4a935]" />
          <span>Add to Calendar</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#f2c14e] text-[#1a1300] font-semibold text-sm hover:bg-[#d4a935] transition-all cursor-pointer"
        >
          <span>Register Another Delegate</span>
        </button>
      </div>
    </div>
  );
};
