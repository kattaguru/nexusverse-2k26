import React, { useState } from 'react';
import { FAQS } from '../data/symposiumData';
import { HelpCircle, ChevronDown, Search } from 'lucide-react';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [search, setSearch] = useState('');

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section id="faq-section" className="py-20 bg-[#131318] border-b border-[#2e2b22]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#d4a935] mb-2">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Everything You Need To Know</span>
            </div>
            <h2 className="font-serif-title text-4xl sm:text-5xl font-bold text-[#ffffff] tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-base text-[#b9ae94] mt-2">
              Got queries regarding teams, pricing, rules, or certificates? Check below.
            </p>
          </div>

          <div className="relative w-full sm:w-72 shrink-0">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search FAQs..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] focus:outline-none focus:border-[#d4a935]"
            />
            <Search className="w-3.5 h-3.5 text-[#a79f8b] absolute left-3 top-2.5" />
          </div>
        </div>

        {/* FAQ Accordion list */}
        <div className="divide-y divide-[#2e2b22] border-y border-[#2e2b22]">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full text-left flex items-center justify-between gap-4 py-2 cursor-pointer group"
                >
                  <span className="font-serif-title text-xl font-bold text-[#f3ecd9] group-hover:text-[#f2c14e] transition-colors">
                    {faq.q}
                  </span>
                  <div className={`p-1.5 rounded-lg border border-[#2e2b22] text-[#d4a935] group-hover:bg-[#181820] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
                {isOpen && (
                  <p className="mt-3 text-sm text-[#b9ae94] leading-relaxed pr-8 animate-in fade-in duration-200">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
          {filteredFaqs.length === 0 && (
            <div className="py-10 text-center text-sm text-[#a79f8b]">
              No questions matched your search query. Feel free to contact our student coordinators!
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
