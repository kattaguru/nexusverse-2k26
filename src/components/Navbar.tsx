import React, { useState } from 'react';
import { Ticket, Menu, X, Shield, Lock, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  onOpenLookup: () => void;
  onRegisterClick: () => void;
  onOpenAdmin: () => void;
  leftLogo: string;
  rightLogo: string;
  isRegClosed?: boolean;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenLookup, 
  onRegisterClick, 
  onOpenAdmin,
  leftLogo,
  rightLogo,
  isRegClosed = false,
  theme = 'dark',
  onToggleTheme
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#050507]/95 backdrop-blur-md border-b border-[#2e2b22] transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-18 flex items-center justify-between gap-4">
        {/* TOP LEFT SIDE: Image 1 (NBKRIST Logo) & Brand Title */}
        <div className="flex items-center gap-3 shrink-0">
          <a 
            href="#top" 
            className="flex items-center gap-2.5 group cursor-pointer"
            title="N.B.K.R. Institute of Science & Technology"
          >
            {/* Top Left Logo: Main Logo from Background Poster */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-black/60 p-1 border border-[#d4a935]/40 shadow-md flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
              <img 
                src={leftLogo || '/symposium-poster.jpg'} 
                alt="NexusVerse 2K26 Main Logo" 
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div>
              <span className="text-lg sm:text-xl font-serif-title font-bold tracking-tight text-[#f3ecd9] group-hover:text-[#f2c14e] transition-colors block leading-tight">
                NexusVerse 2K26
              </span>
              <span className="text-[10px] sm:text-[11px] font-sans font-medium text-[#a79f8b] block">
                NBKRIST · IEEE-SB
              </span>
            </div>
          </a>
        </div>

        {/* Center Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#a79f8b]" aria-label="Main Navigation">
          <a href="/" className="text-xs text-[#d4a935] hover:text-[#f2c14e] transition-colors flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-md bg-[#1f1b0e] border border-[#d4a935]/30 font-semibold" title="Return to Main Starting Poster">
            <span>← Home Poster</span>
          </a>
          <a href="#gallery-section" className="hover:text-[#f3ecd9] transition-colors whitespace-nowrap">
            Gallery
          </a>
          <a href="#events-section" className="hover:text-[#f3ecd9] transition-colors whitespace-nowrap">
            Events
          </a>
          <a href="#timeline-section" className="hover:text-[#f3ecd9] transition-colors whitespace-nowrap">
            Schedule
          </a>
          <a href="#faq-section" className="hover:text-[#f3ecd9] transition-colors whitespace-nowrap">
            FAQs
          </a>
          <a href="#contact-section" className="hover:text-[#f3ecd9] transition-colors whitespace-nowrap">
            Contact
          </a>
          <button
            type="button"
            onClick={onOpenLookup}
            className="text-xs text-[#d4a935] hover:text-[#f2c14e] transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer px-2.5 py-1 rounded-md bg-[#1f1b0e] border border-[#d4a935]/30"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Find My Pass</span>
          </button>
        </nav>

        {/* TOP RIGHT SIDE: Primary Action, Theme Toggle, Admin Button & Image 2 (IEEE-SB Logo) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Dark / Light Theme Toggle Button */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 sm:px-2.5 sm:py-1.5 text-xs font-semibold rounded-lg bg-[#181820] text-[#d4a935] hover:text-[#f2c14e] border border-[#2e2b22] hover:border-[#d4a935]/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle dark/light theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-[#f2c14e]" />
                  <span className="hidden md:inline text-[11px] font-medium">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-[#a16207]" />
                  <span className="hidden md:inline text-[11px] font-medium">Dark</span>
                </>
              )}
            </button>
          )}


          {/* Registration Button or Closed Badge */}
          {isRegClosed ? (
            <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#2a1315] border border-[#ff8a80]/40 text-[#ff8a80]">
              Closed
            </span>
          ) : (
            <button
              type="button"
              onClick={onRegisterClick}
              className="px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg bg-[#f2c14e] text-[#1a1300] hover:bg-[#d4a935] transition-all cursor-pointer whitespace-nowrap shadow-sm hover:shadow-[#f2c14e]/20"
            >
              Register Now
            </button>
          )}

          {/* Top Right Logo: Image-2 (IEEE Student Branch NBKRIST) */}
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white p-1 border border-[#2e2b22] shadow-md flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
            title="IEEE Student Branch NBKRIST"
          >
            <img 
              src={rightLogo} 
              alt="IEEE Student Branch NBKRIST Seal" 
              className="max-h-full max-w-full object-contain"
            />
          </div>
          
          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-[#a79f8b] hover:text-[#f3ecd9] rounded-lg border border-[#2e2b22] focus:outline-none cursor-pointer"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[#2e2b22] bg-[#0a0a0d] px-4 py-4 space-y-3">
          <a 
            href="/" 
            className="block text-sm font-semibold text-[#f2c14e] py-1"
          >
            ← Return to Home Poster
          </a>
          <a 
            href="#gallery-section" 
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-[#f3ecd9] py-1"
          >
            Memories Gallery
          </a>
          <a 
            href="#events-section" 
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-[#f3ecd9] py-1"
          >
            Events
          </a>
          <a 
            href="#timeline-section" 
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-[#f3ecd9] py-1"
          >
            Schedule
          </a>
          <a 
            href="#faq-section" 
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-[#f3ecd9] py-1"
          >
            FAQs
          </a>
          <a 
            href="#contact-section" 
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-[#f3ecd9] py-1"
          >
            Contact
          </a>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenLookup();
            }}
            className="w-full text-left py-2 text-sm text-[#d4a935] flex items-center gap-2"
          >
            <Ticket className="w-4 h-4" />
            <span>Find My Pass</span>
          </button>
          {onToggleTheme && (
            <button
              type="button"
              onClick={() => {
                onToggleTheme();
              }}
              className="w-full text-left py-2 text-sm text-[#d4a935] flex items-center justify-between border-t border-[#2e2b22] pt-2"
            >
              <span className="flex items-center gap-2">
                {theme === 'dark' ? <Sun className="w-4 h-4 text-[#f2c14e]" /> : <Moon className="w-4 h-4 text-[#a16207]" />}
                <span>Appearance: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#1f1b0e] border border-[#d4a935]/30">
                Switch to {theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
