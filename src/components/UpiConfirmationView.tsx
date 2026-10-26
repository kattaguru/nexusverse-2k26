import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Mail, 
  Ticket, 
  User, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageCircle, 
  Sparkles, 
  ShieldCheck, 
  Image as ImageIcon, 
  ArrowRight, 
  X,
  FileCheck,
  ChevronRight,
  Eye,
  Calendar,
  MapPin,
  School,
  Phone
} from 'lucide-react';
import { RegistrationRecord } from './TicketPass';
import { SymposiumEvent, SYMPOSIUM_CONFIG } from '../data/symposiumData';

interface UpiConfirmationViewProps {
  record: RegistrationRecord;
  events: SymposiumEvent[];
  leftLogo?: string;
  rightLogo?: string;
  onOpenParticipantSpace: () => void;
  onOpenLookup: () => void;
  onViewPass: () => void;
  onReset: () => void;
}

export const UpiConfirmationView: React.FC<UpiConfirmationViewProps> = ({
  record,
  events,
  leftLogo = '/symposium-poster.jpg',
  rightLogo = '/ieee-sb-logo.png',
  onOpenParticipantSpace,
  onOpenLookup,
  onViewPass,
  onReset
}) => {
  const [copiedRegId, setCopiedRegId] = useState(false);
  const [copiedUtr, setCopiedUtr] = useState(false);
  const [viewingReceiptModal, setViewingReceiptModal] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);

  const waGroupUrl = SYMPOSIUM_CONFIG.whatsappGroup?.url || 'https://chat.whatsapp.com/GEpv2i56odNEV0LpLizzaO';

  const copyRegId = () => {
    navigator.clipboard.writeText(record.regId);
    setCopiedRegId(true);
    setTimeout(() => setCopiedRegId(false), 2000);
  };

  const copyUtr = () => {
    navigator.clipboard.writeText(record.paymentId);
    setCopiedUtr(true);
    setTimeout(() => setCopiedUtr(false), 2000);
  };

  const copyWaLink = () => {
    navigator.clipboard.writeText(waGroupUrl);
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2000);
  };

  // Find event objects for registered IDs
  const eventObjects = (record.eventIds || [])
    .map(id => events.find(e => e.id === id))
    .filter(Boolean) as SymposiumEvent[];

  const origin = typeof window !== 'undefined' && window.location.origin 
    ? window.location.origin 
    : 'https://www.nbkristieee.in';
  const passVerificationUrl = `${origin}/register.html?passId=${encodeURIComponent(record.regId)}`;

  const getWhatsAppShareUrl = () => {
    const eventNames = eventObjects.map(e => e.name).join(', ') || record.eventIds.join(', ');
    const shareText = 
`🎟️ *NEXUSVERSE 2K26 - UPI REGISTRATION RECEIPT & PASS*
━━━━━━━━━━━━━━━━━━━━
👤 *Delegate:* ${record.name}
🆔 *Pass ID:* ${record.regId}
🎓 *Roll No:* ${record.roll || 'N/A'}
🏛️ *College:* ${record.college || 'NBKRIST'}
📚 *Branch:* ${record.dept || ''} (${record.year || ''} Year, Sec ${record.section || 'A'})
🎯 *Event(s):* ${eventNames}
💳 *Status:* Registered via Direct UPI (₹${record.totalPaid})
🍽️ *Food Token:* ${record.isIeeeMember || record.wantsFood ? '1 Delegate Meal Included' : 'Not Included (Standard ₹150 Registration without Food)'}
📍 *Venue:* N.B.K.R. Institute of Science & Technology, Vidyanagar
📅 *Date:* 29th October 2026

🔗 *View Live Ticket & QR Pass:*
${passVerificationUrl}

_(Show this pass or QR code at the registration desk for badge, kit, and meal collection)_`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  };

  return (
    <div className="py-8 sm:py-14 px-3 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#2e2b22] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-black/60 p-1 border border-[#d4a935]/40 shadow flex items-center justify-center shrink-0 overflow-hidden">
            <img src={leftLogo} alt="NexusVerse" className="max-h-full max-w-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif-title font-bold text-[#ffffff] tracking-tight">
              NexusVerse 2K26
            </h1>
            <p className="text-xs text-[#a79f8b]">
              National Level Technical Symposium · NBKRIST
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="text-xs text-[#a79f8b] hover:text-[#f3ecd9] px-3 py-1.5 rounded-lg border border-[#2e2b22] hover:bg-white/5 transition-colors cursor-pointer"
        >
          ← Register Another Participant
        </button>
      </div>

      {/* PRIMARY NOTICE BANNER - EXACT MESSAGE FROM REQUIREMENTS */}
      <div className="relative overflow-hidden p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-[#1a1506] via-[#241d08] to-[#120f04] border-2 border-[#f2c14e] shadow-2xl shadow-[#f2c14e]/10 text-center space-y-3 sm:space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f2c14e]/20 border border-[#f2c14e]/50 text-[#f2c14e] text-xs font-bold uppercase tracking-wider">
          <Clock className="w-4 h-4 animate-pulse text-[#f2c14e]" />
          <span>UPI Payment Receipt Uploaded</span>
        </div>

        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#ffffff] font-serif-title tracking-tight max-w-2xl mx-auto leading-snug">
          Your ticket will be sent to your mail at <span className="text-[#f2c14e] underline decoration-[#f2c14e]/50 underline-offset-4">8 PM</span> and you can access your ticket in <span className="text-[#f2c14e]">your space</span> / <span className="text-[#f2c14e]">find my ticket</span>
        </h2>

        <p className="text-xs sm:text-sm text-[#d8cea7] max-w-xl mx-auto leading-relaxed">
          Hello <strong className="text-white">{record.name}</strong>, your payment receipt and 12-digit UPI Transaction Reference Number (<code className="font-mono text-[#f2c14e]">{record.paymentId}</code>) have been successfully recorded. UPI verification takes place daily, and official tickets are dispatched to your email at 8:00 PM.
        </p>

        {/* Two Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onOpenParticipantSpace}
            className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs sm:text-sm bg-[#f2c14e] text-[#1a1300] hover:bg-[#d4a935] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#f2c14e]/20 cursor-pointer"
          >
            <User className="w-4 h-4" />
            <span>Open Your Space</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenLookup}
            className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs sm:text-sm bg-[#181820] text-[#f2c14e] border border-[#d4a935]/40 hover:bg-[#232330] hover:border-[#d4a935] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Ticket className="w-4 h-4" />
            <span>Find My Ticket</span>
          </button>
        </div>
      </div>

      {/* 3 HIGHLIGHT EXPLANATION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: 8 PM Email Delivery */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#131318] border border-[#2e2b22] space-y-2.5 relative overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-[#2a1b07] border border-[#d4a935]/40 text-[#f2c14e] flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
            <span>Sent to Mail at 8 PM</span>
          </h3>
          <p className="text-xs text-[#a79f8b] leading-relaxed">
            Your official PDF ticket pass with dynamic entry QR will be dispatched to <strong className="text-white break-all">{record.email}</strong> at <strong>8:00 PM</strong>.
          </p>
        </div>

        {/* Card 2: Your Space */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#131318] border border-[#2e2b22] space-y-2.5 relative overflow-hidden group hover:border-[#d4a935]/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-[#152319] border border-[#4cc38a]/40 text-[#4cc38a] flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-white flex items-center justify-between">
            <span>Access in Your Space</span>
            <ChevronRight className="w-4 h-4 text-[#a79f8b] group-hover:translate-x-1 transition-transform" />
          </h3>
          <p className="text-xs text-[#a79f8b] leading-relaxed">
            Your registration is permanently saved to your account. Log into <strong>Your Space</strong> anytime to review passes and event schedules.
          </p>
          <button
            type="button"
            onClick={onOpenParticipantSpace}
            className="text-xs text-[#4cc38a] hover:text-[#76dfa8] font-semibold flex items-center gap-1 cursor-pointer pt-1"
          >
            <span>Launch Your Space →</span>
          </button>
        </div>

        {/* Card 3: Find My Ticket */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#131318] border border-[#2e2b22] space-y-2.5 relative overflow-hidden group hover:border-[#d4a935]/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-[#19192b] border border-[#7986cb]/40 text-[#9fa8da] flex items-center justify-center">
            <Ticket className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-white flex items-center justify-between">
            <span>Find My Ticket</span>
            <ChevronRight className="w-4 h-4 text-[#a79f8b] group-hover:translate-x-1 transition-transform" />
          </h3>
          <p className="text-xs text-[#a79f8b] leading-relaxed">
            Look up your ticket anytime using your Roll Number (<code className="text-[#f2c14e] font-mono">{record.roll}</code>) or Registration ID (<code className="text-[#f2c14e] font-mono">{record.regId}</code>).
          </p>
          <button
            type="button"
            onClick={onOpenLookup}
            className="text-xs text-[#9fa8da] hover:text-[#c5cae9] font-semibold flex items-center gap-1 cursor-pointer pt-1"
          >
            <span>Lookup Pass Now →</span>
          </button>
        </div>
      </div>

      {/* Mandatory Official WhatsApp Group Notification Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0d2a1a] via-[#123824] to-[#0d2a1a] border-2 border-[#25d366]/70 shadow-xl space-y-3 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-11 h-11 rounded-2xl bg-[#25d366] text-[#052e16] flex items-center justify-center shrink-0 shadow-lg">
              <MessageCircle className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#25d366]/20 text-[#25d366] border border-[#25d366]/40">
                  Mandatory Delegate Step
                </span>
                <span className="text-xs text-[#a7f3d0] font-semibold">Join Official Community</span>
              </div>
              <h3 className="font-serif-title text-base sm:text-lg font-bold text-[#ffffff] mt-0.5">
                Join the NexusVerse 2K26 WhatsApp Group
              </h3>
              <p className="text-xs text-[#a7f3d0]/80 mt-0.5 leading-relaxed">
                Receive live coordinator announcements, lab & room allocations, and 8:00 PM pass dispatch notifications.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto shrink-0">
            <a
              href={waGroupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#25d366] text-[#052e16] font-bold text-xs sm:text-sm hover:bg-[#20ba5a] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Join WhatsApp Group</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={copyWaLink}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-[#092215] border border-[#25d366]/40 text-[#a7f3d0] hover:text-[#ffffff] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedWa ? <Check className="w-3.5 h-3.5 text-[#25d366]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedWa ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUBMISSION DETAILS SUMMARY CARD */}
      <div className="p-5 sm:p-7 rounded-2xl bg-[#131318] border border-[#2e2b22] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2e2b22] pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4a935] font-bold block">
              Official Registration Record
            </span>
            <h3 className="text-lg font-serif-title font-bold text-white flex items-center gap-2 mt-0.5">
              <span>Registration Summary</span>
              <span className="px-2 py-0.5 rounded-full bg-[#1e2f1f] text-[#81c784] border border-[#81c784]/40 text-xs font-sans font-semibold">
                Receipt Attached
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] flex items-center gap-2">
              <span className="text-xs text-[#a79f8b]">Reg ID:</span>
              <code className="text-xs font-mono font-bold text-[#f2c14e]">{record.regId}</code>
              <button
                type="button"
                onClick={copyRegId}
                className="p-1 text-[#a79f8b] hover:text-[#f2c14e] transition-colors cursor-pointer"
                title="Copy Registration ID"
              >
                {copiedRegId ? <Check className="w-3.5 h-3.5 text-[#4cc38a]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] space-y-1">
            <span className="text-[#a79f8b] block text-[11px]">Participant Name</span>
            <span className="font-bold text-white text-sm block">{record.name}</span>
            <span className="text-[#a79f8b] font-mono">{record.roll}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] space-y-1">
            <span className="text-[#a79f8b] block text-[11px]">Contact & Dispatch Email</span>
            <span className="font-bold text-white block truncate">{record.email}</span>
            <span className="text-[#a79f8b] font-mono">{record.phone}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] space-y-1">
            <span className="text-[#a79f8b] block text-[11px]">Class & Institution</span>
            <span className="font-bold text-white block">
              {record.className} {record.section} · {record.dept}
            </span>
            <span className="text-[#a79f8b] block truncate">{record.college}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] space-y-1">
            <span className="text-[#a79f8b] block text-[11px]">Payment Mode</span>
            <span className="font-bold text-[#4cc38a] flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>UPI Transfer</span>
            </span>
            <span className="text-[#a79f8b]">Amount: ₹{record.totalPaid}{record.gstAmount ? ` (Incl. ₹${record.gstAmount} GST)` : ''}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[#a79f8b] block text-[11px]">UPI Transaction ID (UTR)</span>
              <button
                type="button"
                onClick={copyUtr}
                className="text-[#a79f8b] hover:text-[#f2c14e] transition-colors"
                title="Copy UTR"
              >
                {copiedUtr ? <Check className="w-3 h-3 text-[#4cc38a]" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <code className="font-bold text-[#f2c14e] font-mono block text-xs tracking-wider break-all">
              {record.paymentId}
            </code>
            <span className="text-[10px] text-[#4cc38a]">12-Digit Reference Recorded</span>
          </div>

          {/* Payment Receipt Screenshot Thumbnail */}
          <div className="p-3.5 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] space-y-1">
            <span className="text-[#a79f8b] block text-[11px]">Payment Receipt</span>
            {record.paymentScreenshot ? (
              <div className="flex items-center gap-3 pt-0.5">
                <div 
                  onClick={() => setViewingReceiptModal(true)}
                  className="w-12 h-12 rounded-lg bg-black border border-[#2e2b22] overflow-hidden shrink-0 cursor-pointer hover:border-[#f2c14e] transition-colors relative group"
                  title="Click to view full receipt"
                >
                  <img 
                    src={record.paymentScreenshot} 
                    alt="Payment receipt preview" 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-white block text-xs truncate">Receipt Uploaded</span>
                  <button
                    type="button"
                    onClick={() => setViewingReceiptModal(true)}
                    className="text-[11px] text-[#f2c14e] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                  >
                    <span>View Receipt</span>
                    <Eye className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <span className="text-xs text-[#a79f8b]">No receipt image</span>
            )}
          </div>
        </div>

        {/* Selected Events Summary */}
        <div className="space-y-2 pt-2 border-t border-[#2e2b22]">
          <span className="text-xs font-semibold text-[#a79f8b] uppercase tracking-wider block">
            Registered Event Passes
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {eventObjects.map(ev => {
              const teamInfo = record.teamDetails?.[ev.id];
              return (
                <div key={ev.id} className="p-3 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{ev.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1f1b0e] border border-[#d4a935]/40 text-[#f2c14e] font-semibold">
                      {ev.category}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#a79f8b] flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#d4a935]" />
                      <span>{ev.time}</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#d4a935]" />
                      <span>{ev.venue}</span>
                    </span>
                  </div>
                  {teamInfo?.teamName && (
                    <div className="text-[11px] text-[#d4a935] pt-0.5">
                      Team: <span className="text-white font-medium">{teamInfo.teamName}</span>
                      {teamInfo.teamMembers && teamInfo.teamMembers.length > 0 && (
                        <span className="text-[#a79f8b]"> ({teamInfo.teamMembers.length + 1} members)</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA Row */}
        <div className="pt-4 border-t border-[#2e2b22] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#a79f8b]">
            Need immediate digital pass preview?
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={getWhatsAppShareUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#25d366] text-[#052e16] hover:bg-[#20ba5a] transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#25d366]/20"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>Share Pass to WhatsApp</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="button"
              onClick={onViewPass}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#181820] text-[#f2c14e] border border-[#d4a935]/40 hover:bg-[#20202d] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Preview Digital Pass</span>
            </button>

            <button
              type="button"
              onClick={onOpenParticipantSpace}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#f2c14e] text-[#1a1300] hover:bg-[#d4a935] transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <User className="w-3.5 h-3.5" />
              <span>Open Your Space</span>
            </button>
          </div>
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX FOR VIEWING PAYMENT RECEIPT */}
      {viewingReceiptModal && record.paymentScreenshot && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setViewingReceiptModal(false)}
        >
          <div 
            className="bg-[#111116] border border-[#2e2b22] rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#2e2b22] flex items-center justify-between bg-[#181820]">
              <div>
                <h4 className="font-bold text-white text-sm">UPI Payment Receipt Screenshot</h4>
                <p className="text-[11px] text-[#a79f8b]">
                  {record.name} · UTR: {record.paymentId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingReceiptModal(false)}
                className="p-1.5 rounded-lg border border-[#2e2b22] text-[#a79f8b] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-auto flex items-center justify-center bg-black/40">
              <img 
                src={record.paymentScreenshot} 
                alt="Full payment receipt" 
                className="max-h-[70vh] max-w-full object-contain rounded-lg border border-[#2e2b22]"
              />
            </div>

            <div className="p-3 border-t border-[#2e2b22] flex items-center justify-between bg-[#181820] text-xs">
              <span className="text-[#a79f8b]">Attached during registration</span>
              <button
                type="button"
                onClick={() => setViewingReceiptModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[#f2c14e] text-[#1a1300] font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
