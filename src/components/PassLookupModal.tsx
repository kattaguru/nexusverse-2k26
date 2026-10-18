import React, { useState } from 'react';
import { X, Search, Ticket, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
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
  const [isSearching, setIsSearching] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim().toLowerCase();
    if (!clean) {
      setErrorMsg('Please enter your Registration ID, Roll Number, Phone, or Email.');
      return;
    }

    const cleanNum = clean.replace(/\s+/g, '');
    
    // 1. Check local device records
    let found = savedRecords.find(
      (r) => 
        r.regId.toLowerCase() === clean || 
        r.email.toLowerCase() === clean ||
        (r.roll && r.roll.toLowerCase() === clean) ||
        (r.phone && r.phone.replace(/\s+/g, '') === cleanNum)
    );

    // 2. If not found locally, query backend server records
    if (!found) {
      setIsSearching(true);
      setErrorMsg('');
      try {
        const res = await fetch('/api/registrations');
        if (res.ok) {
          const json = await res.json();
          const remoteRecords: RegistrationRecord[] = json.data || [];
          found = remoteRecords.find(
            (r) => 
              r.regId.toLowerCase() === clean || 
              r.email.toLowerCase() === clean ||
              (r.roll && r.roll.toLowerCase() === clean) ||
              (r.phone && r.phone.replace(/\s+/g, '') === cleanNum)
          );
        }
      } catch (err) {
        console.warn('Pass lookup network notice:', err);
      } finally {
        setIsSearching(false);
      }
    }

    if (found) {
      setErrorMsg('');
      onSelectRecord(found);
      onClose();
    } else {
      setErrorMsg('No pass found matching that Registration ID, Roll Number, or Email.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lookup-modal-title"
    >
      <div 
        className="bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#2e2b22]">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#d4a935]" />
            <h3 id="lookup-modal-title" className="font-serif-title text-xl font-bold text-[#ffffff]">
              Find My Ticket
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 text-[#a79f8b] hover:text-[#ffffff] rounded-lg border border-[#2e2b22] hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSearch} className="mt-5 space-y-4">
          <p className="text-xs text-[#a79f8b] leading-relaxed">
            Enter your <strong className="text-white">Registration ID</strong> (e.g. <span className="text-[#f2c14e] font-mono">NV26-XXXXXX</span>), <strong className="text-white">Roll Number</strong>, or registered <strong className="text-white">Email Address</strong> to find your pass.
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
                placeholder="Registration ID, Roll No, or Email"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] text-sm focus:outline-none focus:border-[#d4a935]"
                autoFocus
              />
              <Search className="w-4 h-4 text-[#a79f8b] absolute left-3.5 top-3" />
            </div>

            {errorMsg && (
              <div className="mt-2 text-xs text-[#ff8a80] flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="w-full py-2.5 rounded-xl bg-[#f2c14e] text-[#1a1300] font-semibold text-sm hover:bg-[#d4a935] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching Records...</span>
              </>
            ) : (
              <>
                <span>Search Pass</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
