/**
 * How customers reach support. An empty value is simply not shown on the Contact page.
 * WhatsApp number: digits only with the country code, no plus or spaces.
 */
export const SUPPORT_EMAIL =
  (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) || 'invitation4u4u@gmail.com';
export const SUPPORT_WHATSAPP = '201556060245';
