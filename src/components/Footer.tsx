import React from 'react';
import { SYMPOSIUM_CONFIG } from '../data/symposiumData';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#050507] text-[#a79f8b] py-12 border-t border-[#2e2b22] text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[#2e2b22]">
          <div>
            <div className="font-serif-title text-2xl font-bold text-[#ffffff]">
              {SYMPOSIUM_CONFIG.name}
            </div>
            <p className="text-xs text-[#b9ae94] mt-1 max-w-md">
              Presented by {SYMPOSIUM_CONFIG.organizer}, {SYMPOSIUM_CONFIG.institution}. Advancing technology for humanity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#a79f8b]">
            <a href="#events-section" className="hover:text-[#f3ecd9] transition-colors">Events</a>
            <a href="#timeline-section" className="hover:text-[#f3ecd9] transition-colors">Timeline</a>
            <a href="#faq-section" className="hover:text-[#f3ecd9] transition-colors">FAQs</a>
            <a href="#contact-section" className="hover:text-[#f3ecd9] transition-colors">Contact</a>
            <a href={`mailto:${SYMPOSIUM_CONFIG.email}`} className="text-[#d4a935] hover:underline">
              {SYMPOSIUM_CONFIG.email}
            </a>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#a79f8b]">
          <div>
            © 2026 IEEE Student Branch NBKRIST (STB10061). All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span>Rules & Guidelines</span>
            <span>·</span>
            <span>Refund Policy</span>
            <span>·</span>
            <span>Code of Conduct</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
