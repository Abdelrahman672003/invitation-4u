import { Facebook, Instagram } from 'lucide-react';
import { SOCIAL_LINKS, type SocialKey } from '@/lib/social';
import { cn } from '@/lib/cn';

const NAMES: Record<SocialKey, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16.6 2h-3.2v13.1a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9a6.1 6.1 0 1 0 5.2 6V8.6a7.4 7.4 0 0 0 4.3 1.4V6.8a4.3 4.3 0 0 1-4.3-4.8z" />
    </svg>
  );
}

const ICONS = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: TikTokIcon,
} as const;

/** Icon links to the site's social pages. Shows nothing until at least one address is set. */
export function SocialLinks({
  className,
  linkClassName,
  size = 'size-5',
}: {
  className?: string;
  linkClassName?: string;
  size?: string;
}) {
  if (SOCIAL_LINKS.length === 0) return null;
  return (
    <ul className={cn('flex items-center gap-3', className)}>
      {SOCIAL_LINKS.map(({ key, url }) => {
        const Icon = ICONS[key];
        return (
          <li key={key}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={NAMES[key]}
              title={NAMES[key]}
              className={cn('inline-grid place-items-center transition-colors', linkClassName)}
            >
              <Icon className={size} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
