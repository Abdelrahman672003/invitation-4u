/**
 * The site's social media pages. Put the full address of each page here; an empty one is not shown.
 * Example: facebook: 'https://www.facebook.com/invitation4u'
 */
export const SOCIAL_URLS = {
  facebook: '',
  instagram: '',
  tiktok: '',
} as const;

export type SocialKey = keyof typeof SOCIAL_URLS;

export const SOCIAL_LINKS = (Object.entries(SOCIAL_URLS) as [SocialKey, string][])
  .filter(([, url]) => url.trim() !== '')
  .map(([key, url]) => ({ key, url }));
