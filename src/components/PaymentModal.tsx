import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  ShieldCheck, 
  Smartphone, 
  CreditCard, 
  Check, 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  Lock, 
  ArrowRight, 
  ExternalLink, 
  Copy, 
  QrCode, 
  CheckCircle2, 
  HelpCircle,
  Landmark,
  Wallet,
  RefreshCw,
  Clock,
  ChevronRight,
  Info
} from 'lucide-react';
import { 
  triggerRazorpayCheckout, 
  getRazorpayKey, 
  loadRazorpayScript,
  fetchRazorpayConfig,
  verifyPaymentOnServer
} from '../utils/razorpay';
import { SYMPOSIUM_CONFIG } from '../data/symposiumData';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  attendeeName: string;
  email: string;
  phone: string;
  college?: string;
  classNameVal?: string;
  sectionVal?: string;
  dept?: string;
  roll?: string;
  year?: string;
  eventName?: string;
  onSuccess: (paymentId: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  attendeeName,
  email,
  phone,
  college = '',
  classNameVal = '',
  sectionVal = '',
  dept = '',
  roll = '',
  year = '',
  eventName = 'NexusVerse 2K26 Registration',
  onSuccess
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string>('');
  const [gatewayMode, setGatewayMode] = useState<string>('Live UPI');
  const [isLiveGateway, setIsLiveGateway] = useState<boolean>(true);
  const [isProcessingRazorpay, setIsProcessingRazorpay] = useState<boolean>(false);
  
  // Official Razorpay.me configuration
  const defaultMeUrl = SYMPOSIUM_CONFIG.razorpayMe?.url || 'https://razorpay.me/@veluriprasanth';
  const defaultMeName = SYMPOSIUM_CONFIG.razorpayMe?.name || 'VELURI PRASANTH';
  const defaultUpi = (import.meta as any).env?.VITE_UPI_VPA || 'veluriprasanth@razorpay';
  const [upiVpa, setUpiVpa] = useState<string>(defaultUpi);
  const [razorpayMeUrl, setRazorpayMeUrl] = useState<string>(defaultMeUrl);
  const [razorpayMeName, setRazorpayMeName] = useState<string>(defaultMeName);
  
  // UI States
  const [activeTab, setActiveTab] = useState<'upi_qr' | 'cards_netbanking'>('upi_qr');
  const [qrDisplayMode, setQrDisplayMode] = useState<'upi_apps' | 'rzp_link'>('upi_apps');
  const [paymentRefInput, setPaymentRefInput] = useState<string>('');
  const [copiedVpa, setCopiedVpa] = useState<boolean>(false);
  const [copiedDetails, setCopiedDetails] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  
  // Session countdown timer (12 minutes standard Razorpay QR expiry)
  const [timeLeft, setTimeLeft] = useState<number>(720); // 12 minutes in seconds
  const [sessionKey, setSessionKey] = useState<number>(Date.now());

  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Standard NPCI UPI URI for PhonePe / GPay / Paytm / BHIM scanner
  const upiIntentString = `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(razorpayMeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`NexusVerse 2K26 - ${roll || attendeeName}`)}`;
  const activeQrPayload = qrDisplayMode === 'rzp_link' ? razorpayMeUrl : upiIntentString;

  // Initialize and load Razorpay configuration
  useEffect(() => {
    if (!isOpen) {
      setPaymentRefInput('');
      setErrorMessage(null);
      setIsProcessingRazorpay(false);
      setIsConfirming(false);
      setTimeLeft(720);
      return;
    }

    loadRazorpayScript();
    setErrorMessage(null);
    setTimeLeft(720);
    setSessionKey(Date.now());

    fetchRazorpayConfig().then(cfg => {
      setActiveKey(cfg.keyId);
      setIsLiveGateway(cfg.isLive);
      setGatewayMode(cfg.mode);
      if (cfg.razorpayMeLink) {
        setRazorpayMeUrl(cfg.razorpayMeLink);
      }
      if (cfg.razorpayMeName) {
        setRazorpayMeName(cfg.razorpayMeName);
      }
      if (cfg.upiVpa) {
        setUpiVpa(cfg.upiVpa);
      }
    });
  }, [isOpen]);

  // Session timer countdown effect
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, sessionKey]);

  // Format mm:ss
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleRefreshSession = () => {
    setTimeLeft(720);
    setSessionKey(Date.now());
  };

  // Render High-Resolution Dynamic QR Code for UPI or Razorpay.me URL
  useEffect(() => {
    if (!isOpen || !qrCanvasRef.current || activeTab !== 'upi_qr') return;

    QRCode.toCanvas(
      qrCanvasRef.current,
      activeQrPayload,
      {
        width: 200,
        margin: 1.5,
        color: {
          dark: '#0a192f',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      },
      (error) => {
        if (error) console.error('Failed to generate Razorpay QR Code:', error);
      }
    );
  }, [isOpen, activeQrPayload, activeTab, qrDisplayMode, sessionKey]);

  if (!isOpen) return null;

  // Copy helper for VPA
  const handleCopyVpa = () => {
    navigator.clipboard.writeText(upiVpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2200);
  };

  // Copy helper for Roll number and amount
  const handleCopyDetails = () => {
    const textToCopy = `NexusVerse 2K26 Registration | Name: ${attendeeName} | Roll: ${roll || 'N/A'} | Amount: ₹${amount} | UPI: ${upiVpa}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedDetails(true);
    setTimeout(() => setCopiedDetails(false), 2200);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(razorpayMeUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleOpenRazorpayMe = () => {
    window.open(razorpayMeUrl, '_blank', 'noopener,noreferrer');
  };

  // Mobile App Deep Link Intent Launchers
  const handleOpenUpiApp = (appName?: 'gpay' | 'phonepe' | 'paytm') => {
    if (appName === 'gpay') {
      window.location.href = `gpay://upi/pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(razorpayMeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`NexusVerse 2K26 - ${roll || attendeeName}`)}`;
      setTimeout(() => {
        window.location.href = upiIntentString;
      }, 500);
      return;
    }
    if (appName === 'phonepe') {
      window.location.href = `phonepe://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(razorpayMeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`NexusVerse 2K26 - ${roll || attendeeName}`)}`;
      setTimeout(() => {
        window.location.href = upiIntentString;
      }, 500);
      return;
    }
    if (appName === 'paytm') {
      window.location.href = `paytmmp://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(razorpayMeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`NexusVerse 2K26 - ${roll || attendeeName}`)}`;
      setTimeout(() => {
        window.location.href = upiIntentString;
      }, 500);
      return;
    }
    window.location.href = upiIntentString;
  };

  // Strictly verify Razorpay Payment ID with backend & Razorpay API
  const handleVerifyManualPayment = async () => {
    const rawId = paymentRefInput.trim();
    if (!rawId) {
      setErrorMessage('Please enter the official Razorpay Payment ID (starts with pay_...) from your Razorpay receipt.');
      return;
    }

    setIsConfirming(true);
    setErrorMessage(null);

    const verifyResult = await verifyPaymentOnServer(rawId, undefined, undefined, amount);

    setIsConfirming(false);

    if (verifyResult.verified) {
      onSuccess(rawId);
    } else {
      setErrorMessage(
        verifyResult.error || 
        'Razorpay payment verification failed. Payment ID could not be found or is not captured in Razorpay. Please complete payment via Razorpay first.'
      );
    }
  };

  // Trigger Razorpay Checkout SDK popup with prioritized UPI QR flow
  const handleLaunchSdk = async (preferredMethod: 'upi' | 'card' = 'upi') => {
    const keyToUse = (activeKey || getRazorpayKey()).trim();

    setIsProcessingRazorpay(true);
    setErrorMessage(null);

    const launched = await triggerRazorpayCheckout({
      key: keyToUse,
      amountInRupees: amount,
      attendeeName,
      email,
      phone,
      eventName,
      preferredMethod,
      notes: {
        college,
        className: classNameVal,
        section: sectionVal,
        department: dept,
        rollNumber: roll,
        yearOfStudy: year,
        totalPaid: String(amount)
      },
      onSuccess: (paymentId) => {
        setIsProcessingRazorpay(false);
        onSuccess(paymentId);
      },
      onError: (err) => {
        setIsProcessingRazorpay(false);
        const desc = err?.description || err?.message || 'Payment was not completed. Ticket will only be issued after payment is completed.';
        setErrorMessage(desc);
      },
      onDismiss: () => {
        setIsProcessingRazorpay(false);
        setErrorMessage('Razorpay checkout was closed before payment completion. Ticket was not generated.');
      }
    });

    if (!launched) {
      setIsProcessingRazorpay(false);
      setErrorMessage('Could not load Razorpay SDK. Please scan the direct UPI QR code below using Google Pay, PhonePe, or Paytm.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-heading"
    >
      <style>{`
        @keyframes razorpayScanLaser {
          0% { top: 0%; opacity: 0.85; }
          50% { top: 92%; opacity: 1; }
          100% { top: 0%; opacity: 0.85; }
        }
        .razorpay-scan-laser-anim {
          animation: razorpayScanLaser 2.2s ease-in-out infinite;
        }
      `}</style>

      <div 
        className="bg-[#0f1118] border border-[#273248] text-[#f3ecd9] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[96vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#07192f] via-[#0c2340] to-[#141b2d] p-4 sm:p-5 border-b border-[#20334f] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00629b] to-[#0088d4] flex flex-col items-center justify-center text-white font-black shadow-lg border border-[#3395ff]/40">
              <span className="text-[13px] tracking-tight leading-none">RZP</span>
              <span className="text-[9px] font-mono tracking-widest text-[#70baff] mt-0.5 font-bold">UPI</span>
            </div>
            <div>
              <div className="text-[11px] text-[#9fc7e8] flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4cc38a]" />
                <span className="font-semibold">Razorpay Official UPI Portal</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a] animate-pulse" />
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-[#4cc38a] border border-[#4cc38a]/30">
                  NPCI Verified
                </span>
              </div>
              <h3 id="payment-modal-heading" className="text-sm sm:text-base font-bold text-white tracking-wide">
                NexusVerse 2K26 · {razorpayMeName}
              </h3>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-[#a79f8b] hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delegate & Fee Summary Ribbon */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-[#090b10] border-b border-[#1f283b] flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#7ea0c4] block">Registration Amount</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-mono font-extrabold text-[#f2c14e]">
                ₹{amount}
              </span>
              <span className="text-xs text-[#a79f8b] font-mono">INR</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#4cc38a]/15 text-[#4cc38a] font-semibold border border-[#4cc38a]/30 ml-1.5">
                Zero Convenience Fee
              </span>
            </div>
          </div>
          <div className="text-right text-xs text-[#a79f8b]">
            <span className="block text-[#f3ecd9] font-semibold truncate max-w-[170px] sm:max-w-[220px]">{attendeeName}</span>
            <span className="font-mono text-[11px] text-[#7ea0c4]">Roll: {roll || 'N/A'}</span>
            <span className="text-[10px] text-[#d4a935] block truncate max-w-[170px] sm:max-w-[220px]">
              {dept} {classNameVal ? `· ${classNameVal}` : ''}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1f283b] bg-[#0c0e14] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('upi_qr')}
            className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 transition-all border-b-2 cursor-pointer ${
              activeTab === 'upi_qr'
                ? 'border-[#0088d4] text-white bg-gradient-to-t from-[#00629b]/25 to-transparent'
                : 'border-transparent text-[#7ea0c4] hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4 text-[#4cc38a]" />
            <span>Razorpay UPI QR Scanner</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#4cc38a]/20 text-[#4cc38a] border border-[#4cc38a]/40 font-mono">
              Live
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cards_netbanking')}
            className={`py-3 px-4 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${
              activeTab === 'cards_netbanking'
                ? 'border-[#0088d4] text-white bg-[#00629b]/15'
                : 'border-transparent text-[#7ea0c4] hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-[#70baff]" />
            <span>Cards / Net Banking</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Error Message Notice */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#2a1315] border border-[#ff8a80]/30 text-xs text-[#ffb4ab] flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-[#ff8a80] shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Notice:</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {activeTab === 'upi_qr' ? (
            /* TAB 1: RAZORPAY UPI QR SCANNER TERMINAL */
            <div className="space-y-4">
              
              {/* PRIMARY SCANNER TERMINAL CARD */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#0b1726] via-[#0d1e34] to-[#080d15] border border-[#00629b]/60 shadow-xl space-y-4 relative overflow-hidden">
                
                {/* Mode Selector Pill Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1b324d] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4cc38a] animate-pulse" />
                    <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1">
                      <span>Dynamic UPI QR Scanner</span>
                    </span>
                  </div>

                  {/* Mode switcher tabs */}
                  <div className="flex items-center bg-[#060b12] p-1 rounded-xl border border-[#1b324d] text-[11px]">
                    <button
                      type="button"
                      onClick={() => setQrDisplayMode('upi_apps')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        qrDisplayMode === 'upi_apps'
                          ? 'bg-[#00629b] text-white shadow'
                          : 'text-[#8ea8c9] hover:text-white'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Scan & Pay</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrDisplayMode('rzp_link')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        qrDisplayMode === 'rzp_link'
                          ? 'bg-[#00629b] text-white shadow'
                          : 'text-[#8ea8c9] hover:text-white'
                      }`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Razorpay.me</span>
                    </button>
                  </div>
                </div>

                {/* ON-SCREEN UPI QR CODE SCANNER VIEW */}
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  
                  {/* The QR Code with Viewfinder & Laser Animation */}
                  <div className="relative p-3.5 bg-white rounded-2xl shadow-2xl shrink-0 flex items-center justify-center border-4 border-[#00629b]/40">
                    
                    {/* Corner Target Reticles */}
                    <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-3 border-l-3 border-[#00629b] rounded-tl-lg" />
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-3 border-r-3 border-[#00629b] rounded-tr-lg" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-3 border-l-3 border-[#00629b] rounded-bl-lg" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-3 border-r-3 border-[#00629b] rounded-br-lg" />

                    {/* Canvas */}
                    <canvas 
                      ref={qrCanvasRef} 
                      className="rounded-xl w-[190px] h-[190px] sm:w-[200px] sm:h-[200px] block" 
                    />

                    {/* Animated Scanning Laser Line */}
                    <div className="absolute left-3.5 right-3.5 h-1 bg-gradient-to-r from-transparent via-[#00a6fb] to-transparent razorpay-scan-laser-anim shadow-[0_0_10px_#00a6fb] pointer-events-none rounded" />
                  </div>

                  {/* QR Details & App Icons */}
                  <div className="space-y-3 text-center sm:text-left flex-1 min-w-0">
                    
                    {/* Timer & Session State */}
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#071321] border border-[#183659] text-[11px] font-mono text-[#70baff]">
                        <Clock className="w-3.5 h-3.5 text-[#f2c14e]" />
                        <span>Expires in: <strong>{formatTimer(timeLeft)}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRefreshSession}
                        className="p-1 rounded-lg hover:bg-white/10 text-[#a79f8b] hover:text-white transition-colors cursor-pointer"
                        title="Refresh QR session"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Title & Payee Info */}
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                        <span>Scan with Any UPI App</span>
                        <span className="text-[10px] text-[#4cc38a] font-mono font-normal">
                          (₹{amount})
                        </span>
                      </h4>
                      <p className="text-[11px] text-[#8ea8c9] mt-0.5 leading-relaxed">
                        Scan using <strong className="text-white">Google Pay, PhonePe, Paytm, or BHIM</strong>. Payment is credited directly to <strong className="text-white">{razorpayMeName}</strong>.
                      </p>
                    </div>

                    {/* Official VPA Display & Copy */}
                    <div className="p-2.5 rounded-xl bg-[#07101c] border border-[#183659] flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-[#6484a6] block font-semibold">Razorpay UPI ID (VPA)</span>
                        <span className="font-mono text-white font-bold truncate block">{upiVpa}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyVpa}
                        className="py-1 px-2.5 rounded-lg bg-[#00629b] hover:bg-[#0077bc] text-white font-semibold text-[11px] transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {copiedVpa ? <Check className="w-3 h-3 text-[#4cc38a]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedVpa ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Supported App Badges */}
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-0.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#131d2e] border border-[#23354f] text-[#9fc7e8] font-medium">Google Pay</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#131d2e] border border-[#23354f] text-[#c490e4] font-medium">PhonePe</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#131d2e] border border-[#23354f] text-[#70baff] font-medium">Paytm</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#131d2e] border border-[#23354f] text-[#4cc38a] font-medium">BHIM UPI</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#131d2e] border border-[#23354f] text-[#f2c14e] font-medium">Cred</span>
                    </div>
                  </div>
                </div>

                {/* Mobile Quick Tap UPI App Buttons */}
                <div className="pt-2 border-t border-[#1b324d] space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#7ea0c4] block text-center sm:text-left">
                    Paying on this mobile phone? Tap your UPI app:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenUpiApp('gpay')}
                      className="py-2 px-2.5 rounded-xl bg-[#0f1d2e] hover:bg-[#162940] border border-[#234266] text-white font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
                      <span>Google Pay</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenUpiApp('phonepe')}
                      className="py-2 px-2.5 rounded-xl bg-[#1b122c] hover:bg-[#271a3e] border border-[#3e2763] text-[#d6b4ff] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#5f259f]" />
                      <span>PhonePe</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenUpiApp('paytm')}
                      className="py-2 px-2.5 rounded-xl bg-[#0c1a29] hover:bg-[#13273e] border border-[#1b3a5c] text-[#70baff] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#00b9f1]" />
                      <span>Paytm UPI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenUpiApp()}
                      className="py-2 px-2.5 rounded-xl bg-[#14231b] hover:bg-[#1e3428] border border-[#26533a] text-[#55e09b] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Any UPI App</span>
                    </button>
                  </div>
                </div>

                {/* RAZORPAY CHECKOUT POPUP BUTTON */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleLaunchSdk('upi')}
                    disabled={isProcessingRazorpay}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#00629b] via-[#007cc2] to-[#009bf2] text-white hover:from-[#007cc2] hover:to-[#00aeff] transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-[#0088d4]/30 cursor-pointer disabled:opacity-60"
                  >
                    {isProcessingRazorpay ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <QrCode className="w-4 h-4 text-[#f2c14e]" />
                    )}
                    <span>Launch Razorpay Checkout Popup (Auto Pass)</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* STEP 2: STRICT RAZORPAY VERIFICATION */}
              <div className="p-4 rounded-2xl bg-[#090b10] border border-[#1f283b] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#f3ecd9] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#4cc38a]" />
                    <span>Step 2: Verify Razorpay Payment to Get Pass</span>
                  </span>
                  <span className="text-[10px] text-[#4cc38a] font-mono bg-[#4cc38a]/15 px-2 py-0.5 rounded-full border border-[#4cc38a]/30">
                    Live Verified Only
                  </span>
                </div>

                <p className="text-[11px] text-[#a79f8b] leading-relaxed">
                  If you paid via QR Code or Razorpay.me, enter your official <strong className="text-white">Razorpay Payment ID</strong> (starts with <code className="text-[#f2c14e]">pay_</code>, e.g. <code className="text-[#f2c14e]">pay_To1...</code> from your payment receipt) to verify:
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={paymentRefInput}
                    onChange={(e) => {
                      setPaymentRefInput(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="e.g. pay_To1b77abc..."
                    className="flex-1 bg-[#121622] border border-[#23354f] rounded-xl px-3 py-2 text-xs text-white placeholder-[#546b88] focus:outline-none focus:border-[#0088d4] font-mono tracking-wide"
                  />
                  <button
                    type="button"
                    disabled={isConfirming}
                    onClick={handleVerifyManualPayment}
                    className="py-2 px-4 rounded-xl font-bold text-xs bg-[#4cc38a] hover:bg-[#3db279] text-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60 shadow"
                  >
                    {isConfirming ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{isConfirming ? 'Verifying...' : 'Verify with Razorpay'}</span>
                  </button>
                </div>

                {/* Strict security enforcement notice - zero bypass */}
                <div className="pt-2 flex items-center gap-2 border-t border-[#182030] text-[11px] text-[#7ea0c4]">
                  <Lock className="w-3.5 h-3.5 text-[#4cc38a] shrink-0" />
                  <span>
                    Tickets are strictly generated only after confirmed payment capture by Razorpay. Unpaid attempts are automatically rejected.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: CARDS / NET BANKING / WALLETS */
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#0e1622] to-[#0a0a0d] border border-[#1d3557] space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9fc7e8] font-semibold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#4cc38a]" />
                    <span>Embedded Razorpay Checkout</span>
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#00629b]/40 text-[#70baff] border border-[#00629b]/60">
                    256-Bit SSL
                  </span>
                </div>

                <p className="text-xs text-[#a79f8b] leading-relaxed">
                  Opens the standard embedded Razorpay checkout modal with Debit Cards, Credit Cards, Net Banking, and Wallets:
                </p>

                {/* Methods Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-[#131318] border border-[#2e2b22] flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4 text-[#70baff] shrink-0" />
                    <div>
                      <span className="text-[#f3ecd9] font-medium block text-[11px]">Cards</span>
                      <span className="text-[10px] text-[#a79f8b]">Visa, Master, RuPay</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#131318] border border-[#2e2b22] flex items-center gap-2.5">
                    <Landmark className="w-4 h-4 text-[#4cc38a] shrink-0" />
                    <div>
                      <span className="text-[#f3ecd9] font-medium block text-[11px]">Net Banking</span>
                      <span className="text-[10px] text-[#a79f8b]">SBI, HDFC, ICICI +50</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#131318] border border-[#2e2b22] flex items-center gap-2.5">
                    <Wallet className="w-4 h-4 text-[#d4a935] shrink-0" />
                    <div>
                      <span className="text-[#f3ecd9] font-medium block text-[11px]">Wallets</span>
                      <span className="text-[10px] text-[#a79f8b]">Cred, Mobikwik & More</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#131318] border border-[#2e2b22] flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-[#f2c14e] shrink-0" />
                    <div>
                      <span className="text-[#f3ecd9] font-medium block text-[11px]">Razorpay UPI</span>
                      <span className="text-[10px] text-[#a79f8b]">GPay, PhonePe</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isProcessingRazorpay}
                  onClick={() => handleLaunchSdk('card')}
                  className="w-full mt-2 py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#00629b] via-[#0077bc] to-[#0088cc] text-white hover:from-[#0077bc] hover:to-[#0099e6] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00629b]/30 cursor-pointer disabled:opacity-60"
                >
                  {isProcessingRazorpay ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opening Razorpay Gateway...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#70baff]" />
                      <span>Launch Embedded Checkout (₹{amount})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security Badge Footer */}
        <div className="p-3 bg-[#080a0f] border-t border-[#1f283b] flex items-center justify-between text-[11px] text-[#7ea0c4] shrink-0 px-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#4cc38a]" />
            <span>256-Bit SSL Encrypted · Razorpay UPI Verified</span>
          </div>
          <span className="font-mono text-[10px] text-[#a79f8b]">
            VPA: {upiVpa}
          </span>
        </div>
      </div>
    </div>
  );
};
