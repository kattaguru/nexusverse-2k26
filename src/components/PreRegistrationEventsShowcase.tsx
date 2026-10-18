import React, { useState } from 'react';
import { 
  Trophy, 
  Clock, 
  MapPin, 
  Users, 
  Award, 
  Sparkles, 
  Shield, 
  Code2, 
  Palette, 
  Lightbulb, 
  CheckCircle2, 
  ArrowRight, 
  Eye,
  Gamepad2,
  HelpCircle,
  FileText,
  Flame,
  ChevronRight
} from 'lucide-react';
import { SymposiumEvent, EVENTS, SPOT_EVENT, ALL_EVENTS } from '../data/symposiumData';

interface PreRegistrationEventsShowcaseProps {
  onInspectEvent: (event: SymposiumEvent) => void;
  onSelectEventAndRegister: (eventId: string) => void;
  onSelectSpotAndRegister: () => void;
  onOpenGoogleSignIn: () => void;
  onOpenCreateSpace: () => void;
}

export const PreRegistrationEventsShowcase: React.FC<PreRegistrationEventsShowcaseProps> = ({
  onInspectEvent,
  onSelectEventAndRegister,
  onSelectSpotAndRegister,
  onOpenGoogleSignIn,
  onOpenCreateSpace
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'technical' | 'spot'>('all');

  // Helper to get thematic event icon
  const getEventIcon = (id: string) => {
    switch (id) {
      case 'ctf':
        return <Shield className="w-5 h-5 text-[#f2c14e]" />;
      case 'code':
        return <Code2 className="w-5 h-5 text-[#4cc38a]" />;
      case 'innovrush':
        return <Sparkles className="w-5 h-5 text-[#70baff]" />;
      case 'bug':
        return <Lightbulb className="w-5 h-5 text-[#ffb74d]" />;
      case 'canva':
        return <Palette className="w-5 h-5 text-[#f06292]" />;
      case 'spot':
        return <Gamepad2 className="w-5 h-5 text-[#81c784]" />;
      default:
        return <Trophy className="w-5 h-5 text-[#f2c14e]" />;
    }
  };

  return (
    <section className="space-y-8 pt-4 pb-8 animate-in fade-in duration-300">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#2e2b22] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1f1b0e] border border-[#d4a935]/50 text-[#f2c14e] text-xs font-bold uppercase tracking-wider mb-2">
            <Flame className="w-3.5 h-3.5 text-[#f2c14e]" />
            <span>Official Event Lineup · 29 October 2026</span>
          </div>
          <h3 className="font-serif-title text-2xl sm:text-3xl lg:text-4xl font-bold text-[#ffffff] tracking-tight">
            5 Flagship Technical Events + Spot Arena
          </h3>
          <p className="text-sm text-[#b9ae94] mt-2 max-w-2xl leading-relaxed">
            Explore event descriptions, team formats, rules, prize pools, venues, and timings. You can view complete guidelines or click <strong>Register for this Event</strong> to jump directly into registration!
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 bg-[#0a0a0d] p-1.5 rounded-2xl border border-[#2e2b22] shrink-0 self-start md:self-end">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/40 shadow-sm'
                : 'text-[#a79f8b] hover:text-white'
            }`}
          >
            All Events (6)
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('technical')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'technical'
                ? 'bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/40 shadow-sm'
                : 'text-[#a79f8b] hover:text-white'
            }`}
          >
            Technical (5)
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('spot')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'spot'
                ? 'bg-[#0f2419] text-[#86efac] border border-[#4cc38a]/40 shadow-sm'
                : 'text-[#a79f8b] hover:text-white'
            }`}
          >
            Spot Pass (1)
          </button>
        </div>
      </div>

      {/* TRACK 1: 5 TECHNICAL EVENTS SHOWCASE */}
      {(filterTab === 'all' || filterTab === 'technical') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#d4a935]">
              <Trophy className="w-4 h-4 text-[#d4a935]" />
              <span>Track 1: Morning Flagship Technical Events (10:00 AM – 12:00 PM)</span>
            </div>
            <span className="text-xs font-mono text-[#f2c14e] bg-[#1f1b0e] px-2.5 py-1 rounded-lg border border-[#d4a935]/30">
              ₹150 IEEE Member · ₹200 Non-Member
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {EVENTS.map((event) => (
              <div
                key={event.id}
                className="rounded-3xl bg-[#131318] border border-[#2e2b22] hover:border-[#d4a935]/60 transition-all duration-300 p-6 flex flex-col justify-between space-y-5 shadow-xl hover:shadow-2xl hover:shadow-[#d4a935]/10 group relative overflow-hidden"
              >
                {/* Subtle top gold glow accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d4a935]/40 to-transparent group-hover:via-[#d4a935] transition-all" />

                <div className="space-y-3.5">
                  {/* Category, Icon & Timing Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-[#1c1b16] border border-[#d4a935]/40 flex items-center justify-center shrink-0 shadow-md">
                        {getEventIcon(event.id)}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#d4a935] block">
                          {event.category}
                        </span>
                        <h4 className="font-serif-title text-xl sm:text-2xl font-bold text-white group-hover:text-[#f2c14e] transition-colors">
                          {event.name}
                        </h4>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-[#f2c14e] block">
                        ₹150 <span className="text-[10px] text-[#a79f8b] font-normal">IEEE</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#a79f8b] block">
                        ₹200 Non-IEEE
                      </span>
                    </div>
                  </div>

                  {/* Tagline */}
                  {event.tagline && (
                    <p className="text-xs font-semibold text-[#f2c14e] italic leading-snug">
                      "{event.tagline}"
                    </p>
                  )}

                  {/* Description */}
                  <p className="text-xs text-[#b9ae94] leading-relaxed line-clamp-3">
                    {event.tag}
                  </p>

                  {/* Metadata Chips: Time, Venue, Team Structure */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#a79f8b]">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0a0a0d] border border-[#2e2b22]">
                      <Clock className="w-3.5 h-3.5 text-[#d4a935]" />
                      <span>{event.slot}</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0a0a0d] border border-[#2e2b22]">
                      <MapPin className="w-3.5 h-3.5 text-[#d4a935]" />
                      <span>{event.venue}</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9]">
                      <Users className="w-3.5 h-3.5 text-[#d4a935]" />
                      <span>{event.teamLabel}</span>
                    </span>
                  </div>

                  {/* Prize Box */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-[#1b170a] to-[#12110c] border border-[#d4a935]/30 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#f2c14e]">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Cash Prizes & Recognition</span>
                    </div>
                    <div className="text-[11px] text-[#d8cea7] flex flex-col gap-0.5 pl-5">
                      <span>• <strong>1st Prize:</strong> Winner Trophy + Cash Award + Merit Certificate</span>
                      <span>• <strong>2nd Prize:</strong> Runner-up Trophy + Cash Award + Merit Certificate</span>
                    </div>
                  </div>

                  {/* Highlights / Topics Pills */}
                  {event.highlights && event.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {event.highlights.slice(0, 3).map((hl, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[#d8cea7] truncate max-w-full">
                          ✓ {hl}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 border-t border-[#2e2b22] flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onInspectEvent(event)}
                    className="w-full sm:flex-1 py-2 px-3 rounded-xl bg-[#1a1a24] hover:bg-[#252533] border border-[#2e2b22] hover:border-[#d4a935]/50 text-[#f3ecd9] hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#d4a935]" />
                    <span>View Rules & Rounds</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectEventAndRegister(event.id)}
                    className="w-full sm:flex-1 py-2 px-3 rounded-xl bg-[#f2c14e] hover:bg-[#d4a935] text-[#1a1300] font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#f2c14e]/20 cursor-pointer active:scale-95"
                  >
                    <span>Register for {event.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TRACK 2: SPOT EVENTS (NON-TECHNICAL ARENA) SHOWCASE */}
      {(filterTab === 'all' || filterTab === 'spot') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#70baff]">
              <Sparkles className="w-4 h-4 text-[#70baff]" />
              <span>Track 2: Afternoon Spot Events Arena (01:30 PM – 03:30 PM)</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#86efac] bg-[#0f2419] px-2.5 py-1 rounded-lg border border-[#4cc38a]/40">
              Flat ₹100/- Spot Pass
            </span>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-[#0c1928] via-[#101e33] to-[#0a1422] border-2 border-[#0088d4]/50 hover:border-[#0088d4] transition-all p-6 sm:p-8 shadow-2xl relative overflow-hidden group space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3.5 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#0088d4]/20 border border-[#0088d4]/40 text-[#70baff] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span>Non-Technical Campus Arena</span>
                  </span>
                  <span className="text-xs text-[#a79f8b]">· Open to all students, zero coding required!</span>
                </div>

                <h4 className="font-serif-title text-2xl sm:text-3xl font-bold text-white group-hover:text-[#70baff] transition-colors">
                  {SPOT_EVENT.name}
                </h4>

                <p className="text-xs sm:text-sm font-semibold text-[#f2c14e] italic">
                  "{SPOT_EVENT.tagline}"
                </p>

                <p className="text-xs sm:text-sm text-[#b9ae94] leading-relaxed">
                  {SPOT_EVENT.tag}
                </p>

                {/* Spot Details Chips */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#a79f8b]">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/40 border border-white/10 text-white font-mono">
                    <Clock className="w-3.5 h-3.5 text-[#70baff]" />
                    <span>01:30 PM – 03:30 PM</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/40 border border-white/10 text-white">
                    <MapPin className="w-3.5 h-3.5 text-[#70baff]" />
                    <span>{SPOT_EVENT.venue}</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0f2419] border border-[#4cc38a]/40 text-[#86efac] font-bold">
                    <span>Entry Fee: ₹100 Flat</span>
                  </span>
                </div>

                {/* Spot Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/10 text-[#d8cea7]">
                    <strong className="text-white block mb-0.5">🎮 Gaming Arenas</strong>
                    Instant multiplayer battles & tech trivia sprints.
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/10 text-[#d8cea7]">
                    <strong className="text-white block mb-0.5">💰 Instant Cash Gifts</strong>
                    On-spot cash prizes, gift cards & hampers for winners.
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/10 text-[#d8cea7]">
                    <strong className="text-white block mb-0.5">📜 Official Certificate</strong>
                    Every spot participant receives an authentic certificate.
                  </div>
                </div>
              </div>

              {/* Spot Action Buttons */}
              <div className="flex flex-col gap-3 shrink-0 lg:w-64">
                <button
                  type="button"
                  onClick={onSelectSpotAndRegister}
                  className="w-full py-3.5 px-5 rounded-xl bg-[#0088d4] hover:bg-[#0099ee] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#0088d4]/30 cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Register for Spot Pass</span>
                </button>

                <button
                  type="button"
                  onClick={() => onInspectEvent(SPOT_EVENT)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#d8cea7] hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[#70baff]" />
                  <span>View Spot Event Details</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM REGISTRATION CALL-TO-ACTION CARD */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#171724] via-[#1f1b0e] to-[#171724] border border-[#d4a935]/50 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl text-center md:text-left">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#f2c14e] flex items-center justify-center md:justify-start gap-1.5">
            <Sparkles className="w-4 h-4 text-[#f2c14e]" />
            <span>Ready to Join NexusVerse 2K26?</span>
          </span>
          <h4 className="font-serif-title text-xl sm:text-2xl font-bold text-white">
            Sign in with Google or Create Your Space to Register
          </h4>
          <p className="text-xs sm:text-sm text-[#b9ae94] max-w-xl">
            Takes less than 60 seconds. Once signed in, you can pick your technical competition, add teammates, and download your VIP digital QR pass.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={onOpenGoogleSignIn}
            className="w-full sm:w-auto py-3 px-5 rounded-xl font-bold text-xs sm:text-sm bg-white text-gray-800 hover:bg-gray-100 transition-all flex items-center justify-center gap-2.5 shadow-lg cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateSpace}
            className="w-full sm:w-auto py-3 px-5 rounded-xl font-bold text-xs sm:text-sm bg-[#f2c14e] text-[#1a1300] hover:bg-[#d4a935] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#f2c14e]/20 cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <span>Create Your Space</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
