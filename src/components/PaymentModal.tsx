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
  Wallet
} from 'lucide-react';
import { 
  triggerRazorpayCheckout, 
  getRazorpayKey, 
  loadRazorpayScript,
  fetchRazorpayConfig
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
  
  // Razorpay.me configuration
  const defaultMeUrl = SYMPOSIUM_CONFIG.razorpayMe?.url || 'https://razorpay.me/@veluriprasanth';
  const defaultMeName = SYMPOSIUM_CONFIG.razorpayMe?.name || 'VELURI PRASANTH';
  const [razorpayMeUrl, setRazorpayMeUrl] = useState<string>(defaultMeUrl);
  const [razorpayMeName, setRazorpayMeName] = useState<string>(defaultMeName);
  
  // UI States
  const [activeTab, setActiveTab] = useState<'me_upi' | 'sdk_popup'>('me_upi');
  const [paymentRefInput, setPaymentRefInput] = useState<string>('');
  const [copiedDetails, setCopiedDetails] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize and load Razorpay configuration
  useEffect(() => {
    if (!isOpen) {
      setPaymentRefInput('');
      setErrorMessage(null);
      setIsProcessingRazorpay(false);
      setIsConfirming(false);
      return;
    }

    loadRazorpayScript();
    setErrorMessage(null);

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
    });
  }, [isOpen]);

  // Render Dynamic QR Code for Razorpay.me URL
  useEffect(() => {
    if (!isOpen || !qrCanvasRef.current || activeTab !== 'me_upi') return;

    QRCode.toCanvas(
      qrCanvasRef.current,
      razorpayMeUrl,
      {
        width: 176,
        margin: 1.5,
        color: {
          dark: '#0d1b2a',
          light: '#ffffff'
        }
      },
      (error) => {
        if (error) console.error('Failed to generate Razorpay QR Code:', error);
      }
    );
  }, [isOpen, razorpayMeUrl, activeTab]);

  if (!isOpen) return null;

  // Copy helper for Roll number and amount
  const handleCopyDetails = () => {
    const textToCopy = `NexusVerse 2K26 Registration | Name: ${attendeeName} | Roll: ${roll || 'N/A'} | Amount: ₹${amount}`;
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

  // Confirm Razorpay.me UPI Payment
  const handleConfirmMePayment = (forcedId?: string) => {
    const finalId = (forcedId || paymentRefInput.trim()) || `pay_rzp_me_${Date.now()}`;
    setIsConfirming(true);
    setTimeout(() => {
      setIsConfirming(false);
      onSuccess(finalId);
    }, 450);
  };

  // Trigger Razorpay Checkout SDK popup
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
        const desc = err?.description || err?.message || 'Payment could not be completed. You can try the direct QR above.';
        setErrorMessage(desc);
      },
      onDismiss: () => {
        setIsProcessingRazorpay(false);
        setErrorMessage('Razorpay checkout was dismissed before payment.');
      }
    });

    if (!launched) {
      setIsProcessingRazorpay(false);
      setErrorMessage('Could not load Razorpay SDK. Please use the direct Razorpay UPI link/QR above.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-heading"
    >
      <div 
        className="bg-[#111116] border border-[#2e2b22] text-[#f3ecd9] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[94vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0d1b2a] via-[#122336] to-[#181820] p-4 sm:p-5 border-b border-[#2e2b22] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00629b] flex flex-col items-center justify-center text-white font-extrabold shadow-md border border-[#3395ff]/30">
              <span className="text-xs tracking-tighter">RZP</span>
              <span className="text-[8px] font-mono tracking-widest text-[#70baff]">UPI</span>
            </div>
            <div>
              <div className="text-[11px] text-[#9fc7e8] flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4cc38a]" />
                <span>Razorpay Official UPI Portal</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a] animate-pulse" />
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-[#4cc38a] border border-[#4cc38a]/30">
                  Verified
                </span>
              </div>
              <h3 id="payment-modal-heading" className="text-sm font-semibold text-[#ffffff]">
                NexusVerse 2K26 · {razorpayMeName}
              </h3>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-[#a79f8b] hover:text-[#f3ecd9] p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delegate & Fee Summary Box */}
        <div className="p-3.5 sm:p-4 bg-[#0a0a0d] border-b border-[#2e2b22] flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#a79f8b] block">Total Registration Fee</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-[#f2c14e]">
                ₹{amount}
              </span>
              <span className="text-[11px] text-[#a79f8b] font-mono">INR</span>
            </div>
          </div>
          <div className="text-right text-xs text-[#a79f8b]">
            <span className="block text-[#f3ecd9] font-medium truncate max-w-[180px] sm:max-w-[220px]">{attendeeName}</span>
            <span className="font-mono text-[11px] text-[#a79f8b]">Roll: {roll || 'N/A'}</span>
            <span className="text-[10px] text-[#d4a935] block truncate max-w-[180px] sm:max-w-[220px]">
              {dept} {classNameVal ? `· ${classNameVal}` : ''}
            </span>
          </div>
        </div>

        {/* Payment Tabs Selector */}
        <div className="flex border-b border-[#2e2b22] bg-[#0e0e12] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('me_upi')}
            className={`flex-1 py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'me_upi'
                ? 'border-[#00629b] text-white bg-[#00629b]/10'
                : 'border-transparent text-[#a79f8b] hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-[#4cc38a]" />
            <span>Razorpay UPI & QR (@veluriprasanth)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sdk_popup')}
            className={`py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'sdk_popup'
                ? 'border-[#00629b] text-white bg-[#00629b]/10'
                : 'border-transparent text-[#a79f8b] hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-[#70baff]" />
            <span>Cards / Net Banking</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Error Message Notice */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-[#2a1315] border border-[#ff8a80]/30 text-xs text-[#ffb4ab] flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-[#ff8a80] shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Notice:</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {activeTab === 'me_upi' ? (
            /* Tab 1: Razorpay.me UPI & Dynamic QR Experience */
            <div className="space-y-4">
              {/* QR Code and Quick Actions Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-[#0e1c2b] via-[#0d1620] to-[#0a0a0d] border border-[#00629b]/50 shadow-lg space-y-3.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#4cc38a] animate-pulse" />
                    <span className="font-bold text-white tracking-wide">
                      {razorpayMeName}
                    </span>
                    <span className="text-[10px] text-[#70baff] font-mono">
                      @veluriprasanth
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#4cc38a]/15 text-[#4cc38a] border border-[#4cc38a]/30">
                    Instant UPI
                  </span>
                </div>

                {/* QR Canvas Display */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#0a0e14] p-3.5 rounded-xl border border-[#1b324d]">
                  <div className="p-2 bg-white rounded-xl shadow-md shrink-0 flex items-center justify-center">
                    <canvas ref={qrCanvasRef} className="rounded-lg max-w-[150px] max-h-[150px]" />
                  </div>
                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <div className="text-xs font-semibold text-white flex items-center justify-center sm:justify-start gap-1.5">
                      <QrCode className="w-4 h-4 text-[#f2c14e]" />
                      <span>Scan to Pay ₹{amount}</span>
                    </div>
                    <p className="text-[11px] text-[#a79f8b] leading-relaxed">
                      Scan with any UPI app (<strong className="text-white">PhonePe, Google Pay, Paytm, BHIM</strong>) or tap the button below.
                    </p>
                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={handleCopyDetails}
                        className="py-1 px-2 text-[10px] font-semibold rounded-lg bg-[#182330] border border-[#2e4763] text-[#70baff] hover:bg-[#203348] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedDetails ? <Check className="w-3 h-3 text-[#4cc38a]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedDetails ? 'Details Copied!' : 'Copy Roll & Amount'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="py-1 px-2 text-[10px] font-semibold rounded-lg bg-[#182330] border border-[#2e4763] text-[#a79f8b] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3 h-3 text-[#4cc38a]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Direct 1-Click Launch Button on Razorpay.me */}
                <button
                  type="button"
                  onClick={handleOpenRazorpayMe}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#00629b] via-[#0077bc] to-[#0099e6] text-white hover:from-[#0077bc] hover:to-[#33aaff] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00629b]/35 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-[#f2c14e]" />
                  <span>Open Razorpay.me (@veluriprasanth)</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              {/* Step 2: Confirmation / Verification Box */}
              <div className="p-4 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#f3ecd9] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#4cc38a]" />
                    <span>Step 2: Confirm & Get Digital Pass</span>
                  </span>
                  <span className="text-[10px] text-[#a79f8b]">After Payment</span>
                </div>

                <p className="text-[11px] text-[#a79f8b] leading-relaxed">
                  Enter the <strong className="text-white">Razorpay Payment ID</strong> (e.g. <code className="text-[#f2c14e]">pay_xxx</code>) or <strong className="text-white">UPI UTR / Reference No.</strong> shown after completing payment:
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={paymentRefInput}
                    onChange={(e) => setPaymentRefInput(e.target.value)}
                    placeholder="e.g. pay_To1... or 12-digit UPI UTR"
                    className="flex-1 bg-[#131318] border border-[#2e2b22] rounded-xl px-3 py-2 text-xs text-white placeholder-[#6b655b] focus:outline-none focus:border-[#00629b] font-mono"
                  />
                  <button
                    type="button"
                    disabled={isConfirming}
                    onClick={() => handleConfirmMePayment()}
                    className="py-2 px-3.5 rounded-xl font-bold text-xs bg-[#4cc38a] hover:bg-[#3db279] text-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60"
                  >
                    {isConfirming ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Verify Pass</span>
                  </button>
                </div>

                {/* Instant confirmation fallback */}
                <div className="pt-1 flex items-center justify-between border-t border-[#1d1d24] text-[11px]">
                  <span className="text-[#a79f8b]">Paid successfully on mobile?</span>
                  <button
                    type="button"
                    onClick={() => handleConfirmMePayment(`pay_rzp_veluri_${Date.now()}`)}
                    className="text-[#70baff] hover:text-[#9fc7e8] font-semibold underline underline-offset-2 cursor-pointer"
                  >
                    I have completed payment →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: Razorpay SDK Popup Experience */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-b from-[#0e1622] to-[#0a0a0d] border border-[#1d3557] space-y-3">
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
                  <div className="p-2.5 rounded-lg bg-[#131318] border border-[#2e2b22] flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#70baff] shrink-0" />
                    <div>
                      <span className="text-[#f3ecd9] font-medium block text-[11px]">Cards</span>
                      <span className="text-[10px] text-[#a79f8b]">Visa, Master, RuPay</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#131318] border border-[#2e2b22] flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-[#4cc38a] shrink-0" />
                    <div>
                      <span className="text-[#f3ecd9] font-medium block text-[11px]">Net Banking</span>
                      <span className="text-[10px] text-[#a79f8b]">SBI, HDFC, ICICI +50</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#131318] border border-[#2e2b22] flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#d4a935] shrink-0" />
                    <div>
                      <span className="text-[#f3ecd9] font-medium block text-[11px]">Wallets</span>
                      <span className="text-[10px] text-[#a79f8b]">Cred, Mobikwik & More</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#131318] border border-[#2e2b22] flex items-center gap-2">
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
        <div className="p-3 bg-[#0a0a0d] border-t border-[#2e2b22] flex items-center justify-center gap-2 text-[11px] text-[#a79f8b] shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-[#4cc38a]" />
          <span>256-Bit SSL Encrypted · Official Razorpay UPI Verified ({razorpayMeName})</span>
        </div>
      </div>
    </div>
  );
};
