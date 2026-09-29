/**
 * Support / contact constants — single source of truth.
 *
 * The number is stored in international format without `+` or separators,
 * because that is exactly what WhatsApp's `wa.me` deep link expects.
 */
const WHATSAPP_E164 = '8801811389672';

/** Local display form, grouped for readability. */
const DISPLAY = '+880 1811-389672';

export const APP_SUPPORT = {
  /** How the studio is labelled everywhere in the UI. */
  studioName: 'Zettocraft Studio',
  studioUrl: 'https://www.facebook.com/profile.php?id=61593986655196',

  /** Raw digits, safe to embed in a `wa.me` link. */
  whatsappNumber: WHATSAPP_E164,
  /** Formatted for humans. */
  whatsappDisplay: DISPLAY,
  /** Local BD format, if a `tel:` link is ever needed. */
  whatsappLocal: '01811389672',

  /**
   * Build a `wa.me` deep link with a prefilled message.
   * Long messages are truncated by WhatsApp, so we cap the body defensively.
   */
  whatsappUrl(message?: string): string {
    const base = `https://wa.me/${WHATSAPP_E164}`;
    if (!message) return base;
    return `${base}?text=${encodeURIComponent(message.slice(0, 1000))}`;
  },
} as const;
