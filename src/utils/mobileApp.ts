import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const isNativeMobile = (): boolean => {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
};

export const initMobileApp = async () => {
  if (!isNativeMobile()) return;

  try {
    // Configure native status bar
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0a0a0d' });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (err) {
    console.warn('Status bar configuration notice:', err);
  }

  try {
    // Handle Android hardware back button
    CapApp.addListener('backButton', ({ canGoBack }) => {
      // 1. Dispatch custom event so React modals (Admin, Pass, Scanner) can close first
      const event = new CustomEvent('nexusverse:back', { cancelable: true });
      const wasHandled = !window.dispatchEvent(event);

      if (wasHandled) return;

      // 2. Check for active modals in the DOM
      const activeCloseBtn = document.querySelector<HTMLButtonElement>(
        '[data-modal-close="true"], button[aria-label="Close"], button[title="Close"]'
      );
      if (activeCloseBtn) {
        activeCloseBtn.click();
        return;
      }

      // 3. Fallback to browser navigation or exit app
      if (canGoBack && window.history.length > 1) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
  } catch (err) {
    console.warn('Back button listener notice:', err);
  }
};

/**
 * Trigger native mobile haptic feedback on Android/iOS
 */
export const triggerHaptic = async (type: 'success' | 'warning' | 'error' | 'light' = 'light') => {
  if (!isNativeMobile()) return;

  try {
    if (type === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (type === 'warning') {
      await Haptics.notification({ type: NotificationType.Warning });
    } else if (type === 'error') {
      await Haptics.notification({ type: NotificationType.Error });
    } else {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  } catch (e) {
    // Haptics not supported or permitted on this device
  }
};
