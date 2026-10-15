import React, { useState } from 'react';
import { X, Search, Ticket, ArrowRight, AlertCircle } from 'lucide-react';
import { RegistrationRecord } from './TicketPass';

interface PassLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecord: (record: RegistrationRecord) => void;
  savedRecords: RegistrationRecord[];
}

export const PassLookupModal: React.FC<PassLookupModalProps> = ({
  isOpen,
  onClose,
  onSelectRecord,
  savedRecords
}) => {
  const [query, setQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim().toLowerCase();
    if (!clean) {
      setErrorMsg('Please enter your Registration ID, Roll Number, Phone, or Email.');
      return;
    }

    const cleanNum = clean.replace(/\s+/g, '');
    const found = savedRecords.find(
      (r) => 
        r.regId.toLowerCase() === clean || 
        r.email.toLowerCase() === clean ||
        (r.roll && r.roll.toLowerCase() === clean) ||
        (r.phone && r.phone.replace(/\s+/g, '') === cleanNum)
    );

    if (found) {
      setErrorMsg('');
      onSelectRecord(found);
      onClose();
    } else {
      setErrorMsg('No registration found matching that ID, Roll No, Phone, or Email on this device.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lookup-modal-title"
    >
      <div 
        className="bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] rounded-2xl w-full max-w-md shadow-2xl p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#2e2b22]">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#d4a935]" />
            <h3 id="lookup-modal-title" className="font-serif-title text-xl font-bold text-[#ffffff]">
              Find Your Ticket Pass
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 text-[#a79f8b] hover:text-[#ffffff] rounded-lg border border-[#2e2b22]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSearch} className="mt-5 space-y-4">
          <p className="text-xs text-[#a79f8b]">
            Enter the Registration ID (e.g. <span className="text-[#f2c14e]">NV26-XXXXXX</span>) or the email address used during registration.
          </p>

          <div>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Registration ID or Email"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] text-sm focus:outline-none focus:border-[#d4a935]"
                autoFocus
              />
              <Search className="w-4 h-4 text-[#a79f8b] absolute left-3.5 top-3" />
            </div>

            {errorMsg && (
              <div className="mt-2 text-xs text-[#ff8a80] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#f2c14e] text-[#1a1300] font-semibold text-sm hover:bg-[#d4a935] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Search Pass</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {savedRecords.length > 0 && (
          <div className="mt-6 pt-4 border-t border-[#2e2b22]">
            <span className="text-[11px] font-semibold text-[#a79f8b] uppercase tracking-wider block mb-2">
              Recent Registrations On This Browser
            </span>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {savedRecords.map((rec) => (
                <button
                  key={rec.regId}
                  type="button"
                  onClick={() => {
                    onSelectRecord(rec);
                    onClose();
                  }}
                  className="w-full text-left p-2.5 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] hover:border-[#d4a935] flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <span className="font-bold text-[#f3ecd9] block">{rec.name}</span>
                    <span className="text-[#a79f8b] font-mono">{rec.regId}</span>
                  </div>
                  <span className="text-[#d4a935] text-[11px]">View &rarr;</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
