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
  Info,
  Upload,
  Image as ImageIcon,
  Trash2,
  FileCheck,
  CheckCheck,
  Mail
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
  subtotal?: number;
  gstAmount?: number;
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
  onSuccess: (paymentId: string, paymentScreenshot?: string, paymentModeUsed?: 'upi' | 'razorpay') => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  subtotal,
  gstAmount,
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
  const [paymentMode, setPaymentMode] = useState<'razorpay' | 'upi'>('upi');
  
  // Official UPI & Razorpay configuration
  const defaultMeUrl = SYMPOSIUM_CONFIG.razorpayMe?.url || 'https://razorpay.me/@veluriprasanth';
  const defaultMeName = SYMPOSIUM_CONFIG.razorpayMe?.name || 'NexusVerse 2K26';
  const defaultUpi = (import.meta as any).env?.VITE_UPI_VPA || '9441759500@ptyes';
  const [upiVpa, setUpiVpa] = useState<string>(defaultUpi);
  const [upiPayeeName, setUpiPayeeName] = useState<string>('NexusVerse 2K26');
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

  // UPI Mode Screenshot Upload States
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isCompressingScreenshot, setIsCompressingScreenshot] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Session countdown timer (12 minutes standard QR expiry)
  const [timeLeft, setTimeLeft] = useState<number>(720); // 12 minutes in seconds
  const [sessionKey, setSessionKey] = useState<number>(Date.now());

  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const effectivePayeeName = (paymentMode === 'upi' ? (upiPayeeName || razorpayMeName) : razorpayMeName) || 'NexusVerse 2K26';

  // Standard NPCI UPI URI for PhonePe / GPay / Paytm / BHIM scanner
  const upiIntentString = `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(effectivePayeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`NexusVerse 2K26 - ${roll || attendeeName}`)}`;
  const activeQrPayload = (paymentMode === 'razorpay' && qrDisplayMode === 'rzp_link') ? razorpayMeUrl : upiIntentString;

  // Initialize and load Razorpay / UPI configuration
  useEffect(() => {
    if (!isOpen) {
      setPaymentRefInput('');
      setScreenshotFile(null);
      setScreenshotPreview(null);
      setIsCompressingScreenshot(false);
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
      setPaymentMode(cfg.paymentMode || 'upi');
      if (cfg.razorpayMeLink) {
        setRazorpayMeUrl(cfg.razorpayMeLink);
      }
      if (cfg.razorpayMeName) {
        setRazorpayMeName(cfg.razorpayMeName);
      }
      if (cfg.upiVpa) {
        setUpiVpa(cfg.upiVpa);
      }
      if (cfg.upiPayeeName) {
        setUpiPayeeName(cfg.upiPayeeName);
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
        if (error) console.error('Failed to generate QR Code:', error);
      }
    );
  }, [isOpen, activeQrPayload, activeTab, qrDisplayMode, sessionKey]);

  if (!isOpen) return null;

  // Client-Side Canvas Screenshot Compressor (~40KB - 60KB data URL)
  const compressScreenshot = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
          resolve(dataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle Screenshot file selection
  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid screenshot image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Screenshot file is too large (max 15MB). Please upload a standard phone screenshot.');
      return;
    }

    setIsCompressingScreenshot(true);
    setErrorMessage(null);
    try {
      const compressed = await compressScreenshot(file);
      setScreenshotFile(file);
      setScreenshotPreview(compressed);
    } catch (err) {
      console.error('Failed to process screenshot:', err);
      setErrorMessage('Could not process screenshot image. Please try selecting the file again.');
    } finally {
      setIsCompressingScreenshot(false);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Copy helper for VPA
  const handleCopyVpa = () => {
    navigator.clipboard.writeText(upiVpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2200);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(razorpayMeUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  // Mobile App Deep Link Intent Launchers
  const handleOpenUpiApp = (appName?: 'gpay' | 'phonepe' | 'paytm') => {
    if (appName === 'gpay') {
      window.location.href = `gpay://upi/pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(effectivePayeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`NexusVerse 2K26 - ${roll || attendeeName}`)}`;
      setTimeout(() => {
        window.location.href = upiIntentString;
      }, 500);
      return;
    }
    if (appName === 'phonepe') {
      window.location.href = `phonepe://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(effectivePayeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`NexusVerse 2K26 - ${roll || attendeeName}`)}`;
      setTimeout(() => {
        window.location.href = upiIntentString;
      }, 500);
      return;
    }
    if (appName === 'paytm') {
      window.location.href = `paytmmp://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(effectivePayeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`NexusVerse 2K26 - ${roll || attendeeName}`)}`;
      setTimeout(() => {
        window.location.href = upiIntentString;
      }, 500);
      return;
    }
    window.location.href = upiIntentString;
  };

  // Verification Handler
  const handleVerifyManualPayment = async () => {
    const rawId = paymentRefInput.trim();

    // 1. UPI MODE: Strict requirement - BOTH Transaction ID (UTR) and Screenshot are mandatory!
    if (paymentMode === 'upi') {
      if (!rawId) {
        setErrorMessage('Please enter your 12-digit UPI Transaction Reference Number (UTR) from your payment receipt.');
        return;
      }
      if (!screenshotPreview) {
        setErrorMessage('Please upload your payment screenshot (from Google Pay, PhonePe, or Paytm) to confirm payment.');
        return;
      }

      setIsConfirming(true);
      setErrorMessage(null);

      const verifyResult = await verifyPaymentOnServer(rawId, undefined, undefined, amount, 'upi');
      setIsConfirming(false);

      if (verifyResult.verified) {
        onSuccess(rawId, screenshotPreview, 'upi');
      } else {
        setErrorMessage(
          verifyResult.error || 
          'UPI payment verification failed. Please ensure you entered the complete 12-digit UTR from your payment receipt.'
        );
      }
      return;
    }

    // 2. RAZORPAY MODE: Verify payment ID (no screenshot required)
    if (!rawId) {
      setErrorMessage('Please enter the official Razorpay Payment ID (starts with pay_...) from your Razorpay receipt.');
      return;
    }

    setIsConfirming(true);
    setErrorMessage(null);

    const verifyResult = await verifyPaymentOnServer(rawId, undefined, undefined, amount, 'razorpay');
    setIsConfirming(false);

    if (verifyResult.verified) {
      onSuccess(rawId, undefined, 'razorpay');
    } else {
      setErrorMessage(
        verifyResult.error || 
        'Razorpay payment verification failed. Payment ID could not be found or is not captured in Razorpay. Please complete payment via Razorpay first.'
      );
    }
  };

  // Trigger Razorpay Checkout SDK popup with prioritized UPI flow
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
        baseFee: String(subtotal ?? (amount - (gstAmount || 0))),
        gstAmount: String(gstAmount ?? 0),
        totalPaid: String(amount)
      },
      onSuccess: (paymentId) => {
        setIsProcessingRazorpay(false);
        // Razorpay mode: Ticket pass is automatically generated, emailed, and saved to Participant Space (NO screenshot needed!)
        onSuccess(paymentId, undefined, 'razorpay');
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
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
          paymentMode === 'upi'
            ? 'bg-gradient-to-r from-[#081810] via-[#0d2618] to-[#121e16] border-[#1d442b]'
            : 'bg-gradient-to-r from-[#07192f] via-[#0c2340] to-[#141b2d] border-[#20334f]'
        }`}>
          <div className="flex items-center gap-3">
            {paymentMode === 'upi' ? (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1b5e39] to-[#27ae60] flex flex-col items-center justify-center text-white font-black shadow-lg border border-[#4cc38a]/40">
                <span className="text-[13px] tracking-tight leading-none text-white">UPI</span>
                <span className="text-[8px] font-mono tracking-widest text-[#a3e8c0] mt-0.5 font-bold">DIRECT</span>
              </div>
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00629b] to-[#0088d4] flex flex-col items-center justify-center text-white font-black shadow-lg border border-[#3395ff]/40">
                <span className="text-[13px] tracking-tight leading-none">RZP</span>
                <span className="text-[9px] font-mono tracking-widest text-[#70baff] mt-0.5 font-bold">GATEWAY</span>
              </div>
            )}
            <div>
              <div className="text-[11px] text-[#9fc7e8] flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4cc38a]" />
                <span className="font-semibold text-[#a3e8c0]">
                  {paymentMode === 'upi' ? 'Direct UPI Official Payment' : 'Razorpay Official Gateway'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a] animate-pulse" />
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-[#4cc38a] border border-[#4cc38a]/30">
                  {paymentMode === 'upi' ? 'NPCI Verified' : 'Instant Auto-Pass'}
                </span>
              </div>
              <h3 id="payment-modal-heading" className="text-sm sm:text-base font-bold text-white tracking-wide">
                NexusVerse 2K26 · {effectivePayeeName}
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
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-2xl sm:text-3xl font-mono font-extrabold text-[#f2c14e]">
                ₹{amount}
              </span>
              <span className="text-xs text-[#a79f8b] font-mono">INR</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f2c14e]/15 text-[#f2c14e] font-semibold border border-[#f2c14e]/30">
                Incl. 2% GST (₹2/₹100)
              </span>
            </div>
            {subtotal !== undefined && gstAmount !== undefined && (
              <div className="text-[11px] text-[#8ea8c9] font-mono mt-0.5">
                Base Fee: ₹{subtotal} + 2% GST: ₹{gstAmount}
              </div>
            )}
          </div>
          <div className="text-right text-xs text-[#a79f8b]">
            <span className="block text-[#f3ecd9] font-semibold truncate max-w-[170px] sm:max-w-[220px]">{attendeeName}</span>
            <span className="font-mono text-[11px] text-[#7ea0c4]">Roll: {roll || 'N/A'}</span>
            <span className="text-[10px] text-[#d4a935] block truncate max-w-[170px] sm:max-w-[220px]">
              {dept} {classNameVal ? `· ${classNameVal}` : ''}
            </span>
          </div>
        </div>

        {/* Payment Mode Banner */}
        {paymentMode === 'upi' ? (
          <div className="flex border-b border-[#1d442b] bg-[#081810] px-4 py-2.5 items-center justify-between shrink-0 text-xs">
            <div className="flex items-center gap-2 text-[#a3e8c0] font-semibold">
              <QrCode className="w-4 h-4 text-[#4cc38a]" />
              <span>Direct Bank UPI Scanner (UTR & Screenshot Required)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#4cc38a]/20 text-[#4cc38a] border border-[#4cc38a]/40 font-bold">
              Direct Settlement
            </span>
          </div>
        ) : (
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
              <Sparkles className="w-4 h-4 text-[#70baff]" />
              <span>Razorpay Instant Checkout</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#4cc38a]/20 text-[#4cc38a] border border-[#4cc38a]/40 font-mono">
                Auto-Pass
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
        )}

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

          {/* ========================================================================= */}
          {/* CASE 1: DIRECT UPI MODE (Requires Transaction ID + Screenshot Upload)     */}
          {/* ========================================================================= */}
          {paymentMode === 'upi' ? (
            <div className="space-y-4">
              
              {/* STEP 1: SCANNER & UPI APPS CARD */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#081810] via-[#0d2417] to-[#07130c] border border-[#1d442b] shadow-xl space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#1b3d27] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4cc38a] animate-pulse" />
                    <span className="text-xs font-bold text-white tracking-wide">
                      Step 1: Scan QR or Pay with UPI App
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#4cc38a]/15 text-[#4cc38a] border border-[#4cc38a]/30">
                    Amount: ₹{amount}{gstAmount ? ` (Incl. ₹${gstAmount} GST)` : ''}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Dynamic QR Code Canvas */}
                  <div className="relative p-3.5 bg-white rounded-2xl shadow-2xl shrink-0 flex items-center justify-center border-4 border-[#27ae60]/40">
                    <canvas 
                      ref={qrCanvasRef} 
                      className="rounded-xl w-[180px] h-[180px] sm:w-[190px] sm:h-[190px] block" 
                    />
                    <div className="absolute left-3.5 right-3.5 h-1 bg-gradient-to-r from-transparent via-[#27ae60] to-transparent razorpay-scan-laser-anim shadow-[0_0_10px_#27ae60] pointer-events-none rounded" />
                  </div>

                  {/* QR Details */}
                  <div className="space-y-3 text-center sm:text-left flex-1 min-w-0">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#05140b] border border-[#173b23] text-[11px] font-mono text-[#a3e8c0]">
                        <Clock className="w-3.5 h-3.5 text-[#f2c14e]" />
                        <span>Expires in: <strong>{formatTimer(timeLeft)}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRefreshSession}
                        className="p-1 rounded-lg hover:bg-white/10 text-[#a79f8b] hover:text-white transition-colors cursor-pointer"
                        title="Refresh session"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                        <span>Scan with Any UPI App</span>
                        <span className="text-[10px] text-[#4cc38a] font-mono font-normal">(₹{amount})</span>
                      </h4>
                      <p className="text-[11px] text-[#a3e8c0] mt-0.5 leading-relaxed">
                        Scan using <strong className="text-white">Google Pay, PhonePe, Paytm, or BHIM</strong>.
                      </p>
                    </div>

                    {/* VPA Display & Copy */}
                    <div className="p-2.5 rounded-xl bg-[#05140b] border border-[#1b3d27] flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase tracking-wider text-[#7ea0c4] block font-semibold">
                          Official Direct UPI ID (VPA)
                        </span>
                        <span className="font-mono text-white font-bold truncate block">{upiVpa}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyVpa}
                        className="py-1 px-2.5 rounded-lg bg-[#1b5e39] hover:bg-[#27ae60] text-white font-semibold text-[11px] transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {copiedVpa ? <Check className="w-3 h-3 text-[#f2c14e]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedVpa ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile Quick Tap Buttons */}
                <div className="pt-2 border-t border-[#1b3d27] space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#a3e8c0] block text-center sm:text-left">
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
              </div>

              {/* STEP 2: REQUIRED TRANSACTION ID & SCREENSHOT UPLOAD */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0a0d13] border-2 border-[#1f3828] space-y-4">
                <div className="flex items-center justify-between border-b border-[#1b3224] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#4cc38a]/20 border border-[#4cc38a]/40 flex items-center justify-center text-[#4cc38a]">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        Step 2: Enter Transaction ID & Upload Payment Receipt
                      </h4>
                      <p className="text-[10px] text-[#f2c14e]">
                        Ticket will be sent to your mail at 8 PM & accessible in your space (Find My Ticket)
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#f2c14e]/20 text-[#f2c14e] border border-[#f2c14e]/40 font-bold uppercase">
                    Mandatory
                  </span>
                </div>

                {/* Field 1: Transaction ID / UTR */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#f3ecd9] flex items-center justify-between">
                    <span>1. UPI Transaction Reference Number (UTR) *</span>
                    <span className="text-[10px] text-[#4cc38a] font-mono font-normal">12-digit number</span>
                  </label>
                  <input
                    type="text"
                    value={paymentRefInput}
                    onChange={(e) => {
                      setPaymentRefInput(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="e.g. 429182749102 or T241017..."
                    className="w-full bg-[#121622] border border-[#23354f] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#546b88] focus:outline-none focus:border-[#4cc38a] font-mono tracking-wide"
                  />
                  <p className="text-[10px] text-[#7ea0c4]">
                    Found on your Google Pay, PhonePe, or Paytm payment success receipt as "UPI Ref No." or "UTR".
                  </p>
                </div>

                {/* Field 2: Screenshot Upload Dropzone */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-[#f3ecd9] flex items-center justify-between">
                    <span>2. Payment Confirmation Screenshot *</span>
                    <span className="text-[10px] text-[#f2c14e] font-mono font-normal">Required</span>
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="hidden"
                  />

                  {!screenshotPreview ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#274635] hover:border-[#4cc38a] rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-[#07130c]/70 hover:bg-[#07130c] transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#142e1f] group-hover:bg-[#1b442b] border border-[#27ae60]/40 flex items-center justify-center text-[#4cc38a] mb-2 transition-transform group-hover:scale-105">
                        {isCompressingScreenshot ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Upload className="w-5 h-5" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-white group-hover:text-[#4cc38a] transition-colors">
                        {isCompressingScreenshot ? 'Compressing Screenshot...' : 'Click to Upload Payment Screenshot'}
                      </span>
                      <span className="text-[10px] text-[#7ea0c4] mt-1">
                        Attach receipt from PhonePe, Google Pay, or Paytm (PNG, JPG, WEBP)
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-[#091b11] border border-[#2d6a45] flex items-center justify-between gap-3 animate-in fade-in">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-black border border-[#2d6a45] overflow-hidden shrink-0 relative flex items-center justify-center">
                          <img 
                            src={screenshotPreview} 
                            alt="Payment screenshot preview" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#4cc38a] shrink-0" />
                            <span className="text-xs font-bold text-white truncate">
                              {screenshotFile?.name || 'payment_screenshot.jpg'}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#a3e8c0] block font-mono">
                            Ready for verification · Verified size
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleRemoveScreenshot}
                        className="py-1 px-2.5 rounded-lg bg-[#2a1315] hover:bg-[#3d191d] border border-[#ff8a80]/30 text-[#ff8a80] text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Final Submit Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isConfirming || isCompressingScreenshot || !paymentRefInput.trim() || !screenshotPreview}
                    onClick={handleVerifyManualPayment}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#2ecc71] hover:to-[#40e080] text-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#27ae60]/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConfirming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Verifying Receipt & Submitting Payment...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Submit Payment Receipt & Transaction ID (₹{amount})</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-start gap-2 pt-1 text-[11px] text-[#7ea0c4] border-t border-[#1b3224]">
                  <Clock className="w-3.5 h-3.5 text-[#f2c14e] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#f2c14e]">For UPI:</strong> After you upload payment receipt and transaction ID, your ticket will be sent to your mail at 8 PM and you can access your ticket in your space under Find My Ticket. (Razorpay is automatic).
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* CASE 2: RAZORPAY MODE (Instant Auto Pass, No Screenshot Needed!)           */
            /* ========================================================================= */
            <div className="space-y-4">
              
              {/* PRIMARY PROMINENT RAZORPAY 1-CLICK INSTANT PASS HERO CARD */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-[#0a1e38] via-[#0c2444] to-[#071324] border-2 border-[#0088d4] shadow-2xl space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#1b3f69] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4cc38a] animate-pulse" />
                    <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#70baff]" />
                      <span>Automatic Ticket Pass Generation</span>
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#4cc38a]/20 text-[#4cc38a] border border-[#4cc38a]/40 font-bold">
                    Zero Screenshot Required
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-base sm:text-lg font-bold text-white">
                    Pay ₹{amount} with Razorpay Instant Gateway
                  </h4>
                  <p className="text-xs text-[#9fc7e8] leading-relaxed">
                    Click the button below to pay via <strong className="text-white">Google Pay, PhonePe, Paytm, Debit/Credit Cards, or Net Banking</strong>. No screenshot or manual UTR entry needed — your ticket pass is automatically created immediately upon payment!
                  </p>
                </div>

                {/* Key Benefits Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#071321] border border-[#16375d] flex items-center gap-2">
                    <CheckCheck className="w-4 h-4 text-[#4cc38a] shrink-0" />
                    <div>
                      <span className="font-bold text-white block text-[11px]">Instant Pass</span>
                      <span className="text-[10px] text-[#7ea0c4]">Auto-generated</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#071321] border border-[#16375d] flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#70baff] shrink-0" />
                    <div>
                      <span className="font-bold text-white block text-[11px]">Sent to Email</span>
                      <span className="text-[10px] text-[#7ea0c4] truncate block max-w-[100px]">{email}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#071321] border border-[#16375d] flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#f2c14e] shrink-0" />
                    <div>
                      <span className="font-bold text-white block text-[11px]">Participant Space</span>
                      <span className="text-[10px] text-[#7ea0c4]">Saved automatically</span>
                    </div>
                  </div>
                </div>

                {/* The Big 1-Click Pay Button */}
                <button
                  type="button"
                  onClick={() => handleLaunchSdk('upi')}
                  disabled={isProcessingRazorpay}
                  className="w-full py-4 px-5 rounded-xl font-extrabold text-sm sm:text-base bg-gradient-to-r from-[#00629b] via-[#007cc2] to-[#009bf2] hover:from-[#007cc2] hover:to-[#00aeff] text-white transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-[#0088d4]/30 cursor-pointer disabled:opacity-60"
                >
                  {isProcessingRazorpay ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Opening Secure Razorpay Gateway...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-5 h-5 text-[#f2c14e]" />
                      <span>Pay ₹{amount} with Razorpay (Instant Ticket)</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </>
                  )}
                </button>
              </div>

              {/* SECONDARY SCANNER OPTION FOR DESKTOP / QR PREFERENCE */}
              <div className="p-4 rounded-2xl bg-[#090b10] border border-[#1f283b] space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-[#1b2535] pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-[#70baff]" />
                    <span>Prefer to scan a QR code from another device?</span>
                  </span>
                  <span className="text-[10px] text-[#7ea0c4] font-mono">
                    Alternative
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                  <div className="relative p-2.5 bg-white rounded-xl shadow-lg shrink-0 flex items-center justify-center border-2 border-[#00629b]/40">
                    <canvas 
                      ref={qrCanvasRef} 
                      className="rounded-lg w-[130px] h-[130px] block" 
                    />
                  </div>
                  <div className="space-y-2 text-center sm:text-left text-xs flex-1">
                    <p className="text-[11px] text-[#8ea8c9]">
                      Scan this QR code with any UPI app to pay directly. Or click below to open our official Razorpay checkout page in a new window:
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      <a
                        href={razorpayMeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="py-1.5 px-3 rounded-lg bg-[#00629b] hover:bg-[#007cc2] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Razorpay.me Page</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Optional Fallback if user paid on Razorpay.me page */}
                <div className="pt-2 border-t border-[#182030] space-y-2">
                  <span className="text-[11px] text-[#7ea0c4] block">
                    Already completed payment via Razorpay.me? Enter your Razorpay Payment ID to verify:
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={paymentRefInput}
                      onChange={(e) => {
                        setPaymentRefInput(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="e.g. pay_To1b77abc..."
                      className="flex-1 bg-[#121622] border border-[#23354f] rounded-xl px-3 py-2 text-xs text-white placeholder-[#546b88] focus:outline-none focus:border-[#0088d4] font-mono"
                    />
                    <button
                      type="button"
                      disabled={isConfirming || !paymentRefInput.trim()}
                      onClick={handleVerifyManualPayment}
                      className="py-2 px-3.5 rounded-xl font-bold text-xs bg-[#4cc38a] hover:bg-[#3db279] text-black transition-all flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {isConfirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Verify & Get Pass</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security Badge Footer */}
        <div className="p-3 bg-[#080a0f] border-t border-[#1f283b] flex items-center justify-between text-[11px] text-[#7ea0c4] shrink-0 px-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#4cc38a]" />
            <span>
              {paymentMode === 'upi' ? 'NPCI Instant Bank UPI · 256-Bit SSL' : '256-Bit SSL Encrypted · Razorpay UPI Verified'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#a79f8b]">
            UPI ID: {upiVpa}
          </span>
        </div>
      </div>
    </div>
  );
};
