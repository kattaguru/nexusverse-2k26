import React from 'react';
import { TIMELINE } from '../data/symposiumData';
import { Clock, MapPin, Calendar } from 'lucide-react';

export const TimelineSection: React.FC = () => {
  return (
    <section id="timeline-section" className="py-20 bg-[#0a0a0d] border-b border-[#2e2b22]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#d4a935] mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Thursday, 29 October 2026</span>
          </div>
          <h2 className="font-serif-title text-4xl sm:text-5xl font-bold text-[#ffffff] tracking-tight">
            Event Schedule & Timeline
          </h2>
          <p className="text-base text-[#b9ae94] mt-2">
            A packed single-day national symposium. Please arrive by 8:30 AM for registration kit distribution.
          </p>
        </div>

        {/* Timeline List */}
        <div className="space-y-4 relative before:absolute before:left-4 sm:before:left-24 before:top-4 before:bottom-4 before:w-px before:bg-[#2e2b22]">
          {TIMELINE.map((item, idx) => (
            <div 
              key={idx}
              className="relative flex flex-col sm:flex-row items-start gap-4 sm:gap-8 bg-[#131318] p-5 rounded-2xl border border-[#2e2b22] hover:border-[#d4a935]/40 transition-colors"
            >
              {/* Time column */}
              <div className="sm:w-56 shrink-0 flex items-center gap-2 text-[#f2c14e] font-mono text-xs sm:text-sm font-bold whitespace-nowrap bg-[#1f1b0e]/70 px-3 py-1.5 rounded-xl border border-[#d4a935]/30 shadow-sm">
                <Clock className="w-4 h-4 text-[#d4a935] shrink-0" />
                <span>{item.time}</span>
              </div>

              {/* Event Content */}
              <div className="flex-1 space-y-1">
                <h3 className="font-serif-title text-xl font-bold text-[#ffffff]">
                  {item.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-[#d4a935] font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-[#d4a935] shrink-0" />
                  <span>{item.venue}</span>
                </div>
                <p className="text-xs text-[#a79f8b] mt-1 leading-relaxed">
                  {item.note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
