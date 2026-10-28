import type { TemplateDesign } from '@invite/shared';

type Ornament = TemplateDesign['ornament'];

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Decorative SVG motifs, drawn in `currentColor` so the renderer can tint them per template. */
export function OrnamentGraphic({ kind, className }: { kind: Ornament; className?: string }) {
  switch (kind) {
    case 'none':
      return null;
    case 'floral':
      return (
        <svg viewBox="0 0 120 40" className={className} aria-hidden {...stroke}>
          <path d="M2 20h38M80 20h38" />
          <path d="M60 4c8 7 8 25 0 32-8-7-8-25 0-32Z" />
          <path d="M42 20c7-9 14-9 18 0-4 9-11 9-18 0ZM78 20c-7-9-14-9-18 0 4 9 11 9 18 0Z" />
          <circle cx="40" cy="20" r="1.8" fill="currentColor" />
          <circle cx="80" cy="20" r="1.8" fill="currentColor" />
        </svg>
      );
    case 'geometric':
      return (
        <svg viewBox="0 0 120 40" className={className} aria-hidden {...stroke}>
          <path d="M2 20h36M82 20h36" />
          <path d="M60 3 68 12h12l-9 8 9 8H68l-8 9-8-9H40l9-8-9-8h12Z" />
          <circle cx="60" cy="20" r="4" />
        </svg>
      );
    case 'stars':
      return (
        <svg viewBox="0 0 120 40" className={className} aria-hidden {...stroke}>
          <path
            d="M60 4l4.5 10 10.5 1-8 7 2.5 10.5L60 27l-9.5 5.5L53 22l-8-7 10.5-1Z"
            fill="currentColor"
          />
          <path d="M22 14l2.5 5.5 6 .5-4.5 4 1.5 6-5.5-3.2-5.5 3.2 1.5-6-4.5-4 6-.5ZM98 14l2.5 5.5 6 .5-4.5 4 1.5 6-5.5-3.2-5.5 3.2 1.5-6-4.5-4 6-.5Z" />
        </svg>
      );
    case 'balloons':
      return (
        <svg viewBox="0 0 120 56" className={className} aria-hidden {...stroke}>
          <ellipse cx="40" cy="18" rx="12" ry="15" fill="currentColor" fillOpacity=".18" />
          <ellipse cx="62" cy="14" rx="12" ry="15" fill="currentColor" fillOpacity=".3" />
          <ellipse cx="84" cy="19" rx="12" ry="15" fill="currentColor" fillOpacity=".18" />
          <path d="M40 33c0 8 10 10 20 22M62 29c0 10-2 16-2 26M84 34c0 8-10 12-24 21" />
        </svg>
      );
    case 'cap':
      return (
        <svg viewBox="0 0 120 56" className={className} aria-hidden {...stroke}>
          <path d="M60 8 108 26 60 44 12 26Z" fill="currentColor" fillOpacity=".15" />
          <path d="M34 36v10c0 5 12 8 26 8s26-3 26-8V36" />
          <path d="M108 26v18" />
          <circle cx="108" cy="47" r="3" fill="currentColor" />
        </svg>
      );
    case 'rings':
      return (
        <svg viewBox="0 0 120 56" className={className} aria-hidden {...stroke}>
          <circle cx="48" cy="34" r="16" />
          <circle cx="72" cy="34" r="16" />
          <path d="M48 8l5 6h-10Z" />
        </svg>
      );
  }
}

/** Corner flourish used by the ornate frame (drawn for the top-start corner). */
export function CornerMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden {...stroke}>
      <path d="M2 38V14C2 7 7 2 14 2h24" />
      <path d="M10 38V18c0-5 3-8 8-8h20" />
      <circle cx="6" cy="6" r="1.8" fill="currentColor" />
    </svg>
  );
}

/** CSS background for the subtle patterns; `accent` is a validated #rrggbb value. */
export function patternBackground(
  pattern: TemplateDesign['pattern'],
  accent: string,
): string | undefined {
  const color = encodeURIComponent(accent);
  switch (pattern) {
    case 'none':
      return undefined;
    case 'dots':
      return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='3' cy='3' r='1.4' fill='${color}' fill-opacity='.35'/%3E%3Ccircle cx='15' cy='15' r='1.4' fill='${color}' fill-opacity='.2'/%3E%3C/svg%3E")`;
    case 'diagonal':
      return `repeating-linear-gradient(135deg, ${accent}24 0 2px, transparent 2px 14px)`;
    case 'arabesque':
      return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' fill='none' stroke='${color}' stroke-opacity='.3' stroke-width='1'%3E%3Cpath d='M24 2 46 24 24 46 2 24Z'/%3E%3Ccircle cx='24' cy='24' r='7'/%3E%3C/svg%3E")`;
  }
}
