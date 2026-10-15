const DEFAULT_LEFT_LOGO = '/symposium-poster.jpg';
const DEFAULT_RIGHT_LOGO = '/ieee-sb-logo.png';

const STORAGE_LEFT_LOGO = 'nexusverse_logo_left';
const STORAGE_RIGHT_LOGO = 'nexusverse_logo_right';

export function getLeftLogo(): string {
  try {
    const custom = localStorage.getItem(STORAGE_LEFT_LOGO);
    if (custom && custom.trim() && custom !== '/nbkrist-logo.png') return custom;
  } catch (e) {
    // localStorage error fallback
  }
  return DEFAULT_LEFT_LOGO;
}

export function getRightLogo(): string {
  try {
    const custom = localStorage.getItem(STORAGE_RIGHT_LOGO);
    if (custom && custom.trim()) return custom;
  } catch (e) {
    // localStorage error fallback
  }
  return DEFAULT_RIGHT_LOGO;
}

export function setLeftLogo(dataUrl: string): void {
  try {
    if (dataUrl) {
      localStorage.setItem(STORAGE_LEFT_LOGO, dataUrl);
    } else {
      localStorage.removeItem(STORAGE_LEFT_LOGO);
    }
  } catch (e) {
    console.warn('Could not save left logo:', e);
  }
}

export function setRightLogo(dataUrl: string): void {
  try {
    if (dataUrl) {
      localStorage.setItem(STORAGE_RIGHT_LOGO, dataUrl);
    } else {
      localStorage.removeItem(STORAGE_RIGHT_LOGO);
    }
  } catch (e) {
    console.warn('Could not save right logo:', e);
  }
}

export function resetLogos(): void {
  try {
    localStorage.removeItem(STORAGE_LEFT_LOGO);
    localStorage.removeItem(STORAGE_RIGHT_LOGO);
  } catch (e) {
    console.warn('Could not reset logos:', e);
  }
}
