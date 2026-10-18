import React from 'react';
import { EVENTS, ALL_EVENTS } from '../data/symposiumData';
import { ArrowRight, Sparkles, MapPin, Calendar, Trophy } from 'lucide-react';

interface HeroProps {
  onRegisterClick?: () => void;
  onSelectEvent?: (eventId: string) => void;
  selectedEventIds?: string[];
  attendeeName?: string;
  isIeeeMember?: boolean;
  leftLogo?: string;
  rightLogo?: string;
}

export const Hero: React.FC<HeroProps> = ({
  onRegisterClick = () => {
    document.getElementById('register-section')?.scrollIntoView({ behavior: 'smooth' });
  },
  onSelectEvent,
  selectedEventIds = [],
  attendeeName = '',
  isIeeeMember = false,
  leftLogo = '/symposium-poster.jpg',
  rightLogo = '/ieee-sb-logo.png'
}) => {
  const displayEvents = selectedEventIds && selectedEventIds.length > 0
    ? ALL_EVENTS.filter(e => selectedEventIds.includes(e.id))
    : ALL_EVENTS;

  return (
    <section className="relative w-full max-w-full overflow-hidden overflow-x-clip bg-[#050507] text-[#ffffff] min-h-[calc(100vh-4.5rem)] flex flex-col justify-center py-8 sm:py-14 lg:py-16 border-b border-[#2e2b22] hero-section-container transition-colors">
      {/* ===== ANIMATED EVENT POSTER BACKGROUND ===== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none max-w-full" aria-hidden="true">
        {/* Floating Glowing Ambient Orbs */}
        <div 
          className="absolute rounded-full blur-[85px] w-[46vmax] h-[46vmax] -left-[12vmax] -top-[14vmax] bg-[#1d4ed8]/35 hero-ambient-orb-1"
          style={{ animation: 'd1 18s ease-in-out infinite alternate' }}
        />
        <div 
          className="absolute rounded-full blur-[85px] w-[40vmax] h-[40vmax] -right-[12vmax] -bottom-[12vmax] bg-[#b4831e]/30 hero-ambient-orb-2"
          style={{ animation: 'd2 22s ease-in-out infinite alternate' }}
        />
        <div 
          className="absolute rounded-full blur-[75px] w-[26vmax] h-[26vmax] left-[42%] top-[34%] bg-[#0e7490]/22 hero-ambient-orb-3"
          style={{ animation: 'd3 26s ease-in-out infinite alternate' }}
        />

        {/* Sweeping Radiant Light Beams */}
        <div 
          className="absolute -top-[20%] left-[10%] w-[18vmax] h-[140%] bg-gradient-to-r from-transparent via-[#f0c96a]/10 to-transparent rotate-[18deg] hero-light-beam"
          style={{ animation: 'sweepBeam 9s ease-in-out infinite alternate' }}
        />
        <div 
          className="absolute -top-[20%] left-[62%] w-[18vmax] h-[140%] bg-gradient-to-r from-transparent via-[#f0c96a]/8 to-transparent rotate-[18deg] hero-light-beam"
          style={{ animation: 'sweepBeam 12s ease-in-out infinite alternate -4s' }}
        />

        {/* Celestial Orbital Rings */}
        <div 
          className="absolute left-1/2 top-1/2 w-[min(88vmin,760px)] aspect-square rounded-full border border-dashed border-[#f0c96a]/25 hero-orbital-ring"
          style={{ animation: 'spinOrbit 60s linear infinite' }}
        />
        <div 
          className="absolute left-1/2 top-1/2 w-[min(64vmin,540px)] aspect-square rounded-full border border-solid border-[#f0c96a]/15 hero-orbital-ring"
          style={{ animation: 'spinOrbitReverse 40s linear infinite' }}
        />

        {/* Animated Event Poster Graphic Silhouette Watermark */}
        <div 
          className="absolute left-1/2 top-1/2 w-[min(96vmin,860px)] max-w-4xl hero-poster-silhouette"
          style={{ 
            animation: 'breathePoster 8s ease-in-out infinite alternate',
          }}
        >
          <img 
            src="/symposium-poster.jpg" 
            alt="NexusVerse 2K26 Poster Background" 
            className="w-full h-auto object-contain"
            style={{
              maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 30%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 30%, transparent 70%)'
            }}
          />
        </div>

        {/* 3D Perspective Cyber Floor Grid */}
        <div 
          className="absolute left-0 right-0 bottom-0 h-[42%] opacity-40 hero-cyber-grid overflow-hidden"
          style={{
            perspective: '420px',
            maskImage: 'linear-gradient(to top, black 20%, transparent 95%)',
            WebkitMaskImage: 'linear-gradient(to top, black 20%, transparent 95%)'
          }}
        >
          <div 
            className="absolute -left-[30%] -right-[30%] inset-y-0"
            style={{
              transform: 'rotateX(62deg)',
              transformOrigin: 'bottom',
              backgroundImage: 'linear-gradient(rgba(240, 201, 106, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(240, 201, 106, 0.4) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
              animation: 'gridFloor 3.2s linear infinite'
            }}
          />
        </div>

        {/* Dynamic Contrast Vignette to Guarantee Crystal-Clear Text & Form Readability */}
        <div className="absolute inset-0 hero-contrast-vignette" />
      </div>

      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* Left Column: Heading and Event Highlights */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-black/60 p-1 border border-[#d4a935]/40 shadow flex items-center justify-center overflow-hidden logo-animated-badge shrink-0">
                  <img src={leftLogo || '/symposium-poster.jpg'} alt="NexusVerse" className="max-h-full max-w-full object-contain logo-glow-effect" />
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white p-1 border border-[#2e2b22] shadow flex items-center justify-center overflow-hidden logo-animated-badge-right shrink-0">
                  <img src={rightLogo} alt="IEEE-SB" className="max-h-full max-w-full object-contain" />
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#d4a935] bg-[#1f1b0e] px-2.5 sm:px-3 py-1 rounded-full border border-[#d4a935]/30 max-w-full">
                <Sparkles className="w-3.5 h-3.5 text-[#f2c14e] shrink-0" />
                <span className="truncate">IEEE Student Branch NBKRIST Presents</span>
              </div>
            </div>

            <h1 className="font-serif-title text-3xl xs:text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-[#ffffff] leading-tight break-words">
              NexusVerse<span className="text-[#f2c14e]">-2K26</span>
            </h1>

            <p className="text-sm sm:text-lg text-[#b9ae94] leading-relaxed max-w-xl">
              A premier national-level technical symposium gathering visionary engineering minds on <span className="text-[#f3ecd9] font-medium">29 October 2026</span> at 9:00 AM. Compete across 5 flagship challenges, win exciting cash prizes (to be revealed!), trophies, and earn prestigious IEEE merit certificates.
            </p>

            <div className="flex flex-wrap gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={onRegisterClick}
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-[#f2c14e] text-[#1a1300] font-semibold text-sm sm:text-base hover:bg-[#d4a935] transition-all shadow-md hover:shadow-[#f2c14e]/25 cursor-pointer"
              >
                <span>Register now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <a
                href="#timeline-section"
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg bg-transparent text-[#f3ecd9] font-semibold text-sm sm:text-base border border-[#ffffff]/25 hover:bg-[#ffffff]/5 hover:border-[#ffffff]/40 transition-colors"
              >
                <span>Symposium Timeline</span>
              </a>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 pt-5 sm:pt-6 border-t border-[#2e2b22]">
              <div>
                <span className="block text-lg sm:text-2xl lg:text-3xl font-serif-title font-bold text-[#ffffff]">
                  5 Tech + Spot
                </span>
                <span className="text-[11px] sm:text-xs text-[#a79f8b]">₹150/₹200 Tech · ₹100 Spot Events</span>
              </div>
              <div>
                <span className="block text-lg sm:text-2xl lg:text-3xl font-serif-title font-bold text-[#ffffff] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#f2c14e] shrink-0" />
                  <span className="truncate">29 Oct 2026</span>
                </span>
                <span className="text-[11px] sm:text-xs text-[#a79f8b]">Starts 9:00 AM Sharp</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="block text-lg sm:text-2xl lg:text-3xl font-serif-title font-bold text-[#ffffff] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-[#f2c14e] shrink-0" />
                  <span>NBKRIST</span>
                </span>
                <span className="text-[11px] sm:text-xs text-[#a79f8b]">Vidyanagar, Tirupati</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Pass Preview */}
          <div className="lg:col-span-5">
            <aside 
              aria-label="NexusVerse Pass Preview" 
              className="bg-[#131318] text-[#f3ecd9] rounded-2xl border border-[#2e2b22] shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-[#d4a935]/40 hero-ticket-card"
            >
              {/* Top Section */}
              <div className="p-6 pb-5 border-b-2 border-dashed border-[#2e2b22] relative bg-[#181820]/60 hero-ticket-top">
                {/* Left & Right Circular Ticket Cutouts */}
                <div 
                  className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-[#050507] border border-[#2e2b22] hero-ticket-cutout"
                  aria-hidden="true" 
                />
                <div 
                  className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-[#050507] border border-[#2e2b22] hero-ticket-cutout" 
                  aria-hidden="true" 
                />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-[#d4a935] font-semibold">Official Entry Pass</span>
                    <h3 className="font-serif-title text-2xl font-bold text-[#ffffff] mt-0.5">
                      NexusVerse 2K26
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[#a79f8b] block">Category</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/30">
                      {isIeeeMember ? 'IEEE Member' : 'Standard'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-[#a79f8b]">
                  Delegate: <span className="font-semibold text-[#f3ecd9]">{attendeeName.trim() || 'Your Name Here'}</span>
                </div>
              </div>

              {/* Pass Body: Event Roster */}
              <div className="p-6 space-y-4">
                <div className="text-xs font-medium text-[#a79f8b] flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span>Symposium Tracks & Events</span>
                    <span className="text-[10px] text-[#f2c14e]/80 font-normal hidden sm:inline">(Tap to select)</span>
                  </div>
                  <span>Fee ({isIeeeMember ? 'Member' : 'Regular'})</span>
                </div>

                <ul className="space-y-1.5 text-sm max-h-56 overflow-y-auto pr-1 select-none">
                  {ALL_EVENTS.map((ev) => {
                    const fee = isIeeeMember ? ev.feeMember : ev.feeNonMember;
                    const isSelected = selectedEventIds.includes(ev.id);
                    return (
                      <li key={ev.id}>
                        <button
                          type="button"
                          onClick={() => onSelectEvent?.(ev.id)}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer group focus:outline-none focus-visible:ring-1 focus-visible:ring-[#f2c14e] ${
                            isSelected
                              ? 'bg-[#f2c14e]/15 border border-[#f2c14e]/40 shadow-sm shadow-[#f2c14e]/10'
                              : 'bg-transparent border border-transparent hover:bg-white/5 hover:border-white/10'
                          }`}
                          title={`Click to select ${ev.name}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span 
                              className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${
                                isSelected 
                                  ? 'bg-[#f2c14e] ring-2 ring-[#f2c14e]/40 scale-110' 
                                  : 'bg-[#2e2b22] group-hover:bg-[#a79f8b]'
                              }`} 
                            />
                            <span className={`font-medium truncate transition-colors ${
                              isSelected ? 'text-[#f2c14e] font-semibold' : 'text-[#a79f8b] group-hover:text-[#f3ecd9]'
                            }`}>
                              {ev.name}
                            </span>
                            {isSelected && (
                              <span className="shrink-0 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[#f2c14e]/20 text-[#f2c14e] border border-[#f2c14e]/30">
                                Selected
                              </span>
                            )}
                          </div>
                          <span className={`shrink-0 font-mono tabular-nums text-xs transition-colors ${
                            isSelected ? 'text-[#f2c14e] font-bold' : 'text-[#a79f8b] group-hover:text-[#f2c14e]'
                          }`}>
                            ₹{fee} <span className="font-sans font-normal text-[10px]">/ head</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="pt-4 border-t border-[#2e2b22] flex items-center justify-between text-xs text-[#a79f8b]">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-[#d4a935]" />
                    <span>Includes Certificate & Kit</span>
                  </div>
                  <span className="text-[11px] text-[#f2c14e]">Bring College ID</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
};
