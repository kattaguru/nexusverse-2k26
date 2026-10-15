import React from 'react';
import { EVENTS } from '../data/symposiumData';
import { ArrowRight, Sparkles, MapPin, Calendar, Trophy } from 'lucide-react';

interface HeroProps {
  onRegisterClick?: () => void;
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
  selectedEventIds = [],
  attendeeName = '',
  isIeeeMember = false,
  leftLogo = '/symposium-poster.jpg',
  rightLogo = '/ieee-sb-logo.png'
}) => {
  const displayEvents = selectedEventIds && selectedEventIds.length > 0
    ? EVENTS.filter(e => selectedEventIds.includes(e.id))
    : EVENTS;

  return (
    <section className="relative overflow-hidden bg-[#050507] text-[#ffffff] min-h-[calc(100vh-4.5rem)] flex flex-col justify-center py-10 sm:py-14 lg:py-16 border-b border-[#2e2b22]">
      {/* ===== ANIMATED EVENT POSTER BACKGROUND ===== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none" aria-hidden="true">
        {/* Floating Glowing Ambient Orbs */}
        <div 
          className="absolute rounded-full blur-[85px] w-[46vmax] h-[46vmax] -left-[12vmax] -top-[14vmax] bg-[#1d4ed8]/35"
          style={{ animation: 'd1 18s ease-in-out infinite alternate' }}
        />
        <div 
          className="absolute rounded-full blur-[85px] w-[40vmax] h-[40vmax] -right-[12vmax] -bottom-[12vmax] bg-[#b4831e]/30"
          style={{ animation: 'd2 22s ease-in-out infinite alternate' }}
        />
        <div 
          className="absolute rounded-full blur-[75px] w-[26vmax] h-[26vmax] left-[42%] top-[34%] bg-[#0e7490]/22"
          style={{ animation: 'd3 26s ease-in-out infinite alternate' }}
        />

        {/* Sweeping Radiant Light Beams */}
        <div 
          className="absolute -top-[20%] left-[10%] w-[18vmax] h-[140%] bg-gradient-to-r from-transparent via-[#f0c96a]/10 to-transparent rotate-[18deg]"
          style={{ animation: 'sweepBeam 9s ease-in-out infinite alternate' }}
        />
        <div 
          className="absolute -top-[20%] left-[62%] w-[18vmax] h-[140%] bg-gradient-to-r from-transparent via-[#f0c96a]/8 to-transparent rotate-[18deg]"
          style={{ animation: 'sweepBeam 12s ease-in-out infinite alternate -4s' }}
        />

        {/* Celestial Orbital Rings */}
        <div 
          className="absolute left-1/2 top-1/2 w-[min(88vmin,760px)] aspect-square rounded-full border border-dashed border-[#f0c96a]/25"
          style={{ animation: 'spinOrbit 60s linear infinite' }}
        />
        <div 
          className="absolute left-1/2 top-1/2 w-[min(64vmin,540px)] aspect-square rounded-full border border-solid border-[#f0c96a]/15"
          style={{ animation: 'spinOrbitReverse 40s linear infinite' }}
        />

        {/* Animated Event Poster Graphic Silhouette Watermark */}
        <div 
          className="absolute left-1/2 top-1/2 w-[min(96vmin,860px)] max-w-4xl"
          style={{ 
            animation: 'breathePoster 8s ease-in-out infinite alternate',
            mixBlendMode: 'screen'
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
          className="absolute -left-[50%] -right-[50%] bottom-0 h-[42%] opacity-40"
          style={{
            perspective: '420px',
            maskImage: 'linear-gradient(to top, black 20%, transparent 95%)',
            WebkitMaskImage: 'linear-gradient(to top, black 20%, transparent 95%)'
          }}
        >
          <div 
            className="absolute inset-0"
            style={{
              transform: 'rotateX(62deg)',
              transformOrigin: 'bottom',
              backgroundImage: 'linear-gradient(rgba(240, 201, 106, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(240, 201, 106, 0.4) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
              animation: 'gridFloor 3.2s linear infinite'
            }}
          />
        </div>

        {/* Dark Radial Contrast Vignette to Guarantee Crystal-Clear Text & Form Readability */}
        <div 
          className="absolute inset-0" 
          style={{
            background: 'radial-gradient(ellipse at center, rgba(5, 5, 7, 0.45) 0%, rgba(5, 5, 7, 0.8) 65%, #050507 98%)'
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Heading and Event Highlights */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-black/60 p-1 border border-[#d4a935]/40 shadow flex items-center justify-center overflow-hidden">
                  <img src={leftLogo || '/symposium-poster.jpg'} alt="NexusVerse" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="w-9 h-9 rounded-xl bg-white p-1 border border-[#2e2b22] shadow flex items-center justify-center overflow-hidden">
                  <img src={rightLogo} alt="IEEE-SB" className="max-h-full max-w-full object-contain" />
                </div>
              </div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#d4a935] bg-[#1f1b0e] px-3 py-1 rounded-full border border-[#d4a935]/30">
                <Sparkles className="w-3.5 h-3.5 text-[#f2c14e]" />
                <span>IEEE Student Branch NBKRIST Presents</span>
              </div>
            </div>

            <h1 className="font-serif-title text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-[#ffffff] leading-none text-balance">
              NexusVerse<span className="text-[#f2c14e]">-2K26</span>
            </h1>

            <p className="text-base sm:text-lg text-[#b9ae94] leading-relaxed max-w-xl">
              A premier national-level technical symposium gathering visionary engineering minds on <span className="text-[#f3ecd9] font-medium">29 October 2026</span> at 9:00 AM. Compete across 5 flagship challenges, present breakthrough innovations, and compete for a prize pool exceeding ₹25,000.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={onRegisterClick}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#f2c14e] text-[#1a1300] font-semibold text-base hover:bg-[#d4a935] transition-all shadow-md hover:shadow-[#f2c14e]/25 cursor-pointer"
              >
                <span>Register now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <a
                href="#timeline-section"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-transparent text-[#f3ecd9] font-semibold text-base border border-[#ffffff]/25 hover:bg-[#ffffff]/5 hover:border-[#ffffff]/40 transition-colors"
              >
                <span>Symposium Timeline</span>
              </a>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-6 border-t border-[#2e2b22]">
              <div>
                <span className="block text-2xl sm:text-3xl font-serif-title font-bold text-[#ffffff]">
                  5 Flagships
                </span>
                <span className="text-xs text-[#a79f8b]">CTF, Expo, Code, Quiz, UI</span>
              </div>
              <div>
                <span className="block text-2xl sm:text-3xl font-serif-title font-bold text-[#ffffff] flex items-center gap-1.5">
                  <Calendar className="w-5 h-5 text-[#f2c14e]" />
                  <span>29 Oct 2026</span>
                </span>
                <span className="text-xs text-[#a79f8b]">Starts 9:00 AM Sharp</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="block text-2xl sm:text-3xl font-serif-title font-bold text-[#ffffff] flex items-center gap-1.5">
                  <MapPin className="w-5 h-5 text-[#f2c14e]" />
                  <span>NBKRIST</span>
                </span>
                <span className="text-xs text-[#a79f8b]">Vidyanagar, Tirupati</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Pass Preview */}
          <div className="lg:col-span-5">
            <aside 
              aria-label="NexusVerse Pass Preview" 
              className="bg-[#131318] text-[#f3ecd9] rounded-2xl border border-[#2e2b22] shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-[#d4a935]/40"
            >
              {/* Top Section */}
              <div className="p-6 pb-5 border-b-2 border-dashed border-[#2e2b22] relative bg-[#181820]/60">
                {/* Left & Right Circular Ticket Cutouts */}
                <div 
                  className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-[#050507] border border-[#2e2b22]"
                  aria-hidden="true" 
                />
                <div 
                  className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-[#050507] border border-[#2e2b22]" 
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
                  <span>Selected Event (1 Event Max)</span>
                  <span>Fee ({isIeeeMember ? 'Member' : 'Regular'})</span>
                </div>

                <ul className="space-y-2 text-sm divide-y divide-[#2e2b22]/50 max-h-56 overflow-y-auto pr-1">
                  {EVENTS.map((ev) => {
                    const fee = isIeeeMember ? ev.feeMember : ev.feeNonMember;
                    const isSelected = selectedEventIds.includes(ev.id);
                    return (
                      <li key={ev.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-[#f2c14e] ring-2 ring-[#f2c14e]/30' : 'bg-[#2e2b22]'}`} />
                          <span className={`font-medium ${isSelected ? 'text-[#f2c14e] font-semibold' : 'text-[#a79f8b]'}`}>
                            {ev.name}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[#f2c14e]/15 text-[#f2c14e]">
                              Selected
                            </span>
                          )}
                        </div>
                        <span className={`font-mono tabular-nums text-xs ${isSelected ? 'text-[#f2c14e] font-bold' : 'text-[#a79f8b]'}`}>
                          ₹{fee} <span className="font-sans font-normal text-[10px]">/ head</span>
                        </span>
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
