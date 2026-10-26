import React from 'react';
import { 
  Sparkles, 
  Ticket, 
  User, 
  ScanLine, 
  CalendarDays
} from 'lucide-react';
import { triggerHaptic } from '../utils/mobileApp';

interface MobileBottomNavProps {
  activeTab: 'events' | 'register' | 'pass' | 'space' | 'admin';
  onSelectTab: (tab: 'events' | 'register' | 'pass' | 'space' | 'admin') => void;
  isLoggedIn?: boolean;
  hasConfirmedPass?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  isLoggedIn,
  hasConfirmedPass
}) => {
  const handleTabClick = (tab: 'events' | 'register' | 'pass' | 'space' | 'admin') => {
    triggerHaptic('light');
    onSelectTab(tab);
  };

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-[#d4a935]/25 shadow-[0_-8px_24px_rgba(0,0,0,0.6)] px-2 pt-1 pb-[max(env(safe-area-inset-bottom),8px)]"
    >
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1 items-center">
        {/* 1. Events & Register */}
        <button
          type="button"
          onClick={() => handleTabClick('events')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'events' || activeTab === 'register'
              ? 'text-[#f2c14e] bg-[#f2c14e]/10 font-bold'
              : 'text-[#9c9382] hover:text-[#f3ecd9]'
          }`}
        >
          <CalendarDays className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-wide">Register</span>
        </button>

        {/* 2. My Ticket Pass */}
        <button
          type="button"
          onClick={() => handleTabClick('pass')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'pass'
              ? 'text-[#f2c14e] bg-[#f2c14e]/10 font-bold'
              : 'text-[#9c9382] hover:text-[#f3ecd9]'
          }`}
        >
          <Ticket className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-wide">My Ticket</span>
          {hasConfirmedPass && (
            <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_8px_#4ade80]" />
          )}
        </button>

        {/* 3. Participant Space */}
        <button
          type="button"
          onClick={() => handleTabClick('space')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'space'
              ? 'text-[#f2c14e] bg-[#f2c14e]/10 font-bold'
              : 'text-[#9c9382] hover:text-[#f3ecd9]'
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-wide">My Space</span>
          {isLoggedIn && (
            <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]" />
          )}
        </button>

        {/* 4. Admin / Scanner */}
        <button
          type="button"
          onClick={() => handleTabClick('admin')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'admin'
              ? 'text-[#f2c14e] bg-[#f2c14e]/10 font-bold'
              : 'text-[#9c9382] hover:text-[#f3ecd9]'
          }`}
        >
          <ScanLine className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-wide">Scanner</span>
        </button>
      </div>
    </nav>
  );
};
