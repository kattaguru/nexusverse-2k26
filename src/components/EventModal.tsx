import React from 'react';
import { SymposiumEvent } from '../data/symposiumData';
import { X, Trophy, Clock, MapPin, Users, CheckCircle2, ShieldAlert } from 'lucide-react';

interface EventModalProps {
  event: SymposiumEvent | null;
  onClose: () => void;
  isIeeeMember: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  event,
  onClose,
  isIeeeMember,
  isSelected,
  onToggleSelect
}) => {
  if (!event) return null;

  const currentFee = isIeeeMember ? event.feeMember : event.feeNonMember;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-event-title"
    >
      <div 
        className="bg-[#131318] text-[#f3ecd9] border border-[#2e2b22] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#2e2b22] sticky top-0 bg-[#131318]/95 backdrop-blur-md flex items-start justify-between gap-4 z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#d4a935] mb-1">
              <span>{event.category}</span>
              <span aria-hidden="true">·</span>
              <span>{event.slot}</span>
            </div>
            <h3 id="modal-event-title" className="font-serif-title text-3xl font-bold text-[#ffffff]">
              {event.name}
            </h3>
            {event.tagline && (
              <p className="text-xs sm:text-sm font-medium italic text-[#f2c14e] mt-1">
                "{event.tagline}"
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#a79f8b] hover:text-[#ffffff] rounded-lg border border-[#2e2b22] hover:bg-[#181820] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Simple Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#d4a935] font-semibold">
              Event Description
            </h4>
            <p className="text-sm sm:text-base text-[#f3ecd9] leading-relaxed">
              {event.tag}
            </p>
          </div>

          {/* Participation Details Badge */}
          {event.participationText && (
            <div className="p-3.5 rounded-xl bg-[#1f1b0e]/90 border border-[#d4a935]/40 text-xs text-[#f3ecd9] flex items-center gap-2.5 shadow-sm">
              <Users className="w-4 h-4 text-[#f2c14e] shrink-0" />
              <div>
                <span className="font-bold text-[#f2c14e]">Participation: </span>
                <span className="text-[#f3ecd9] font-medium">{event.participationText}</span>
              </div>
            </div>
          )}

          {/* Quick Specifications */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#0a0a0d] border border-[#2e2b22]">
            <div>
              <span className="text-[11px] text-[#a79f8b] block flex items-center gap-1">
                <Users className="w-3 h-3 text-[#d4a935]" /> Team Structure
              </span>
              <span className="font-semibold text-xs text-[#f3ecd9] mt-0.5 block">
                {event.teamLabel}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#a79f8b] block flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#d4a935]" /> Scheduled Time
              </span>
              <span className="font-semibold text-xs text-[#f3ecd9] mt-0.5 block">
                {event.time}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#a79f8b] block flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#d4a935]" /> Campus Venue
              </span>
              <span className="font-semibold text-xs text-[#f3ecd9] mt-0.5 block truncate">
                {event.venue}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#a79f8b] block">
                Registration Fee
              </span>
              <span className="font-mono tabular-nums font-bold text-sm text-[#f2c14e] mt-0.5 block">
                ₹{currentFee} <span className="text-[10px] text-[#a79f8b] font-normal">/ head {isIeeeMember ? '(IEEE)' : '(Standard)'}</span>
              </span>
            </div>
          </div>

          {/* Awards & Recognition */}
          <div className="p-4 rounded-xl bg-[#1f1b0e]/70 border border-[#d4a935]/30">
            <h4 className="text-xs font-semibold text-[#f2c14e] uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Trophy className="w-4 h-4 text-[#f2c14e]" />
              <span>Event Awards & Recognition</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between p-2 rounded bg-[#131318] border border-[#2e2b22]">
                <span className="text-xs text-[#a79f8b]">1st Place Winner</span>
                <span className="font-semibold text-xs text-[#f3ecd9]">{event.prizes.first}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#131318] border border-[#2e2b22]">
                <span className="text-xs text-[#a79f8b]">2nd Place Runner-Up</span>
                <span className="font-semibold text-xs text-[#f3ecd9]">{event.prizes.second}</span>
              </div>
            </div>
          </div>

          {/* Rounds */}
          <div>
            <h4 className="font-serif-title text-xl font-bold text-[#ffffff] mb-3">
              Competition Format & Rounds
            </h4>
            <div className="space-y-3">
              {event.rounds.map((round, idx) => (
                <div key={idx} className="p-3.5 rounded-lg bg-[#0a0a0d] border border-[#2e2b22]">
                  <span className="font-semibold text-xs text-[#d4a935] block mb-1">
                    {round.title}
                  </span>
                  <p className="text-xs text-[#a79f8b] leading-relaxed">
                    {round.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Rules & Guidelines */}
          <div>
            <h4 className="font-serif-title text-xl font-bold text-[#ffffff] mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#d4a935]" />
              <span>Rules & Guidelines</span>
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[#b9ae94]">
              {event.rules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#4cc38a] shrink-0 mt-0.5" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-[#2e2b22] bg-[#181820]/80 flex items-center justify-between gap-4">
          <div className="text-xs text-[#a79f8b]">
            Fee: <span className="font-mono tabular-nums font-bold text-[#f2c14e]">₹{currentFee} per head</span> {isIeeeMember ? '(IEEE Member Discount)' : '(Standard Delegate)'}
          </div>
          <button
            type="button"
            onClick={() => {
              onToggleSelect(event.id);
              onClose();
            }}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all cursor-pointer ${
              isSelected
                ? 'bg-[#1f1b0e] border border-[#f2c14e] text-[#f2c14e]'
                : 'bg-[#f2c14e] text-[#1a1300] hover:bg-[#d4a935]'
            }`}
          >
            {isSelected ? 'Currently Selected Event' : 'Choose this event'}
          </button>
        </div>
      </div>
    </div>
  );
};
