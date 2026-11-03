export type OtaMode = 'B2B_DEMAND_API' | 'AFFILIATE_PARTNER';

export const OTA_MODE_STORAGE_KEY = 'stayai_ota_mode';

export function getStoredOtaMode(): OtaMode {
  const stored = localStorage.getItem(OTA_MODE_STORAGE_KEY);
  if (stored === 'AFFILIATE_PARTNER' || stored === 'B2B_DEMAND_API') {
    return stored;
  }
  return 'B2B_DEMAND_API';
}

export function setStoredOtaMode(mode: OtaMode) {
  localStorage.setItem(OTA_MODE_STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent('ota_mode_changed', { detail: mode }));
}
