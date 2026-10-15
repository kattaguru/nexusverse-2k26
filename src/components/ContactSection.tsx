import React from 'react';
import { SYMPOSIUM_CONFIG } from '../data/symposiumData';
import { Phone, MessageSquare, Mail, MapPin, ExternalLink } from 'lucide-react';

export const ContactSection: React.FC = () => {
  return (
    <section id="contact-section" className="py-20 bg-[#0a0a0d] border-b border-[#2e2b22]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#d4a935] mb-2">
            <Phone className="w-3.5 h-3.5" />
            <span>Connect With Us</span>
          </div>
          <h2 className="font-serif-title text-4xl sm:text-5xl font-bold text-[#ffffff] tracking-tight">
            Contact the Coordinators
          </h2>
          <p className="text-base text-[#b9ae94] mt-2">
            Have questions about events, team formations, or payment queries? Reach out to our organizing team via Call or WhatsApp.
          </p>
        </div>

        {/* Coordinators Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SYMPOSIUM_CONFIG.coordinators.map((c, idx) => (
            <div 
              key={idx}
              className="bg-[#131318] p-6 rounded-2xl border border-[#2e2b22] hover:border-[#d4a935]/40 transition-colors flex flex-col justify-between"
            >
              <div>
                <h3 className="font-serif-title text-2xl font-bold text-[#ffffff]">
                  {c.name}
                </h3>
                <span className="text-xs text-[#d4a935] block mt-0.5">{c.role}</span>
                <span className="font-mono text-xs text-[#a79f8b] block mt-2">
                  {c.phoneFormatted}
                </span>
              </div>

              <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-[#2e2b22]">
                <a
                  href={`tel:+91${c.phone}`}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] hover:border-[#f2c14e] text-xs font-semibold text-[#f3ecd9] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-[#d4a935]" />
                  <span>Call</span>
                </a>
                <a
                  href={`https://wa.me/91${c.phone}?text=Hi%20${encodeURIComponent(c.name)}%2C%20I%20have%20a%20query%20about%20NexusVerse%202K26.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-[#1f1b0e] border border-[#d4a935]/40 hover:bg-[#d4a935] hover:text-[#1a1300] text-xs font-semibold text-[#f2c14e] flex items-center justify-center gap-1.5 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          ))}

          {/* Email & Venue Card */}
          <div className="bg-[#131318] p-6 rounded-2xl border border-[#2e2b22] flex flex-col justify-between">
            <div>
              <h3 className="font-serif-title text-2xl font-bold text-[#ffffff]">
                Helpdesk & Venue
              </h3>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[#b9ae94]">
                  <Mail className="w-4 h-4 text-[#d4a935] shrink-0" />
                  <a href={`mailto:${SYMPOSIUM_CONFIG.email}`} className="hover:text-[#f2c14e] transition-colors underline">
                    {SYMPOSIUM_CONFIG.email}
                  </a>
                </div>
                <div className="flex items-start gap-2 text-[#a79f8b]">
                  <MapPin className="w-4 h-4 text-[#d4a935] shrink-0 mt-0.5" />
                  <span>{SYMPOSIUM_CONFIG.location}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-[#2e2b22]">
              <a
                href="https://maps.google.com/?q=NBKRIST+Vidyanagar"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] hover:border-[#f2c14e] text-xs font-semibold text-[#f3ecd9] flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Google Maps Directions</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#d4a935]" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
