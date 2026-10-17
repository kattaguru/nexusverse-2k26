export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number; // in paise
  currency?: string;
  name: string;
  description?: string;
  image?: string;
  order_id?: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
    backdrop_color?: string;
  };
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
  method?: {
    netbanking?: boolean;
    card?: boolean;
    wallet?: boolean;
    upi?: boolean;
    paylater?: boolean;
  };
  config?: any;
  config_id?: string;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: string, callback: (response: any) => void) => void;
      close: () => void;
    };
  }
}

const RZP_KEY_STORAGE = 'nexusverse_rzp_key';

export interface RazorpayPublicConfig {
  keyId: string;
  isLive: boolean;
  mode: string;
  paymentMode: 'razorpay' | 'upi';
  razorpayMeLink?: string;
  razorpayMeName?: string;
  upiVpa?: string;
  upiPayeeName?: string;
}

let cachedConfig: RazorpayPublicConfig | null = null;

/**
 * Dynamically loads the Razorpay checkout script if not already present.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay checkout script.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Fetches active Razorpay and Direct UPI public configuration from the server backend.
 */
export async function fetchRazorpayConfig(): Promise<RazorpayPublicConfig> {
  try {
    const res = await fetch('/api/razorpay/config');
    if (res.ok) {
      const data = await res.json();
      if (data && data.keyId) {
        cachedConfig = {
          keyId: data.keyId,
          isLive: !!data.isLive,
          mode: data.mode || (data.isLive ? 'Live Production' : 'Sandbox / Test Mode'),
          paymentMode: (data.paymentMode === 'razorpay' ? 'razorpay' : 'upi'),
          razorpayMeLink: data.razorpayMeLink || 'https://razorpay.me/@veluriprasanth',
          razorpayMeName: data.razorpayMeName || 'VELURI PRASANTH',
          upiVpa: data.upiVpa || (import.meta as any).env?.VITE_UPI_VPA || '9441759500@ptyes',
          upiPayeeName: data.upiPayeeName || data.razorpayMeName || 'NexusVerse 2K26'
        };
        return cachedConfig;
      }
    }
  } catch (e) {
    console.warn('Could not fetch /api/razorpay/config, falling back to local keys:', e);
  }

  const fallbackKey = getRazorpayKey();
  return {
    keyId: fallbackKey,
    isLive: fallbackKey.startsWith('rzp_live_'),
    mode: fallbackKey.startsWith('rzp_live_') ? 'Live Production' : 'Sandbox / Test Mode',
    paymentMode: 'upi',
    razorpayMeLink: 'https://razorpay.me/@veluriprasanth',
    razorpayMeName: 'VELURI PRASANTH',
    upiVpa: (import.meta as any).env?.VITE_UPI_VPA || '9441759500@ptyes',
    upiPayeeName: 'NexusVerse 2K26'
  };
}

/**
 * Gets the configured Razorpay Key ID from cache, Vite env or local storage.
 */
export function getRazorpayKey(): string {
  if (cachedConfig?.keyId) {
    return cachedConfig.keyId;
  }
  const envKey = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID;
  if (envKey && typeof envKey === 'string' && envKey.trim()) {
    return envKey.trim();
  }
  try {
    const saved = localStorage.getItem(RZP_KEY_STORAGE);
    if (saved && saved.trim()) return saved.trim();
  } catch (e) {
    // localStorage may be unavailable in private browsing
  }
  return 'rzp_test_TngfcrewRR7VL3';
}

/**
 * Stores custom Razorpay Key ID in local storage for easy testing in browser.
 */
export function setRazorpayKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(RZP_KEY_STORAGE, key.trim());
      if (cachedConfig) {
        cachedConfig.keyId = key.trim();
        cachedConfig.isLive = key.trim().startsWith('rzp_live_');
      }
    } else {
      localStorage.removeItem(RZP_KEY_STORAGE);
    }
  } catch (e) {
    console.warn('Could not store Razorpay key:', e);
  }
}

/**
 * Tries to create an order from server backend.
 * Returns order_id string or undefined if server is not set up.
 */
export async function createServerOrder(amountInRupees: number, currency = 'INR'): Promise<string | undefined> {
  try {
    const res = await fetch('/api/razorpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        amount: amountInRupees, 
        currency,
        receipt: `nv26_${Date.now()}`
      })
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    return data.orderId || data.id;
  } catch (e) {
    return undefined;
  }
}

/**
 * Cryptographically verifies payment signature or UPI UTR on server backend.
 */
export async function verifyPaymentOnServer(
  paymentId: string, 
  orderId?: string, 
  signature?: string,
  expectedAmount?: number,
  paymentMode?: 'razorpay' | 'upi'
): Promise<{ verified: boolean; error?: string }> {
  try {
    const res = await fetch('/api/razorpay/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        razorpay_signature: signature,
        expectedAmount,
        paymentMode
      })
    });
    const data = await res.json();
    if (res.ok && (data.verified || data.success)) {
      return { verified: true };
    }
    return { verified: false, error: data.error || 'Payment could not be verified.' };
  } catch (err: any) {
    console.warn('Payment verification network error:', err);
    return { verified: false, error: 'Unable to connect to verification server. Please ensure you are online.' };
  }
}

/**
 * Launch the official Razorpay Checkout popup.
 */
export async function triggerRazorpayCheckout({
  key,
  amountInRupees,
  attendeeName,
  email,
  phone,
  eventName = 'NexusVerse 2K26 Registration',
  notes = {},
  preferredMethod = 'upi',
  onSuccess,
  onError,
  onDismiss
}: {
  key?: string;
  amountInRupees: number;
  attendeeName: string;
  email: string;
  phone: string;
  eventName?: string;
  notes?: Record<string, string>;
  preferredMethod?: 'upi' | 'card' | 'netbanking' | 'wallet';
  onSuccess: (paymentId: string, orderId?: string) => void;
  onError?: (error: any) => void;
  onDismiss?: () => void;
}): Promise<boolean> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    onError?.({ description: 'Could not load Razorpay SDK. Please check your internet connection.' });
    return false;
  }

  // Active key
  const activeKey = key?.trim() || getRazorpayKey();

  // Attempt server order creation if backend is available
  const orderId = await createServerOrder(amountInRupees);

  const options: RazorpayOptions = {
    key: activeKey,
    amount: Math.round(amountInRupees * 100), // in paise
    currency: 'INR',
    name: 'NexusVerse 2K26',
    description: eventName,
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=128&q=80',
    order_id: orderId,
    handler: async (response: RazorpaySuccessResponse) => {
      // Perform server-side HMAC signature verification
      const verifyResult = await verifyPaymentOnServer(
        response.razorpay_payment_id,
        response.razorpay_order_id || orderId,
        response.razorpay_signature,
        amountInRupees
      );

      if (verifyResult.verified) {
        onSuccess(response.razorpay_payment_id, response.razorpay_order_id || orderId);
      } else {
        onError?.({ description: verifyResult.error || 'Payment verification failed.' });
      }
    },
    prefill: {
      name: attendeeName,
      email: email,
      contact: phone,
      ...(preferredMethod ? { method: preferredMethod } : {})
    },
    notes: {
      ...notes,
      source: 'NexusVerse_2K26_IEEE_SB_NBKRIST'
    },
    theme: {
      color: '#00629b' // IEEE Official Blue / Nexus Brand
    },
    method: {
      upi: true,
      card: true,
      netbanking: true,
      wallet: true,
      paylater: false
    },
    config: {
      display: {
        blocks: {
          upi: {
            name: 'Pay using UPI / QR (PhonePe, GPay, Paytm, BHIM)',
            instruments: [
              {
                method: 'upi',
                flows: ['qr', 'intent', 'collect']
              }
            ]
          },
          other: {
            name: 'Cards, Net Banking & Other Options',
            instruments: [
              {
                method: 'card'
              },
              {
                method: 'netbanking'
              },
              {
                method: 'wallet'
              }
            ]
          }
        },
        sequence: preferredMethod === 'card' ? ['block.other', 'block.upi'] : ['block.upi', 'block.other'],
        preferences: {
          show_default_blocks: true
        }
      }
    },
    modal: {
      ondismiss: () => {
        onDismiss?.();
      }
    }
  };

  try {
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (response: any) => {
      console.error('Razorpay payment failed:', response);
      onError?.(response.error || response);
    });
    rzp.open();
    return true;
  } catch (err) {
    console.error('Failed to initialize Razorpay instance:', err);
    onError?.(err);
    return false;
  }
}
