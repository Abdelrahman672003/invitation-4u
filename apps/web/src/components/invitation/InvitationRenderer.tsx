import type { ReactNode } from 'react';
import type { InvitationContent, TemplateDesign } from '@invite/shared';
import { cn } from '@/lib/cn';
import { CornerMark, OrnamentGraphic, patternBackground } from './ornaments';
import { ThemePoster, isPosterTheme } from './ThemePoster';

interface Props {
  design: TemplateDesign;
  content: InvitationContent;
  /** Text direction of the invitation's language. */
  dir: 'rtl' | 'ltr';
  /** ISO date; lets poster themes lay the date out in parts. */
  eventDate?: string | null;
  /** URL of the customer's photo, for poster themes. */
  photo?: string | null;
  className?: string;
}

const cornerPositions = [
  'left-[1.5cqw] top-[1.5cqw]',
  'right-[1.5cqw] top-[1.5cqw] -scale-x-100',
  'bottom-[1.5cqw] left-[1.5cqw] -scale-y-100',
  'bottom-[1.5cqw] right-[1.5cqw] -scale-100',
];

/**
 * Renders an invitation from a validated design config and plain text content.
 * Shared by the template gallery, the editor preview and public invitation pages.
 * Sizes use container units (cqw), so it scales from a thumbnail to a full page.
 */
export function InvitationRenderer({ design, content, dir, eventDate, photo, className }: Props) {
  const { palette } = design;

  if (isPosterTheme(design.theme)) {
    return (
      <div
        dir={dir}
        className={cn(
          'relative w-full overflow-hidden',
          design.theme === 'custom' ? 'aspect-[5/7]' : 'aspect-[3/4]',
          className,
        )}
      >
        <ThemePoster
          design={design}
          content={content}
          dir={dir}
          eventDate={eventDate}
          photo={photo}
          hint
        />
      </div>
    );
  }

  return (
    <div
      dir={dir}
      className={cn('relative aspect-[3/4] w-full overflow-hidden', className)}
      style={{
        containerType: 'inline-size',
        background: palette.background,
        backgroundImage: patternBackground(design.pattern, palette.accent),
        color: palette.text,
      }}
    >
      <div
        className="absolute flex flex-col overflow-hidden"
        style={{ inset: '4cqw', background: palette.surface, borderRadius: '2cqw' }}
      >
        <Frame frame={design.frame} accent={palette.accent} />
        <Layout design={design}>
          <Text design={design} content={content} dir={dir} />
        </Layout>
      </div>
    </div>
  );
}

function Text({
  design,
  content,
  dir,
}: {
  design: TemplateDesign;
  content: InvitationContent;
  dir: 'rtl' | 'ltr';
}) {
  const { palette } = design;
  const titleFont =
    design.font === 'elegant' ? 'font-display font-semibold' : 'font-sans font-bold';
  return (
    <div
      className="relative z-10 flex flex-1 flex-col items-center justify-center text-center"
      style={{ gap: '2.2cqw' }}
    >
      <p
        style={{
          color: palette.accent,
          fontSize: '4.2cqw',
          letterSpacing: dir === 'ltr' ? '0.18em' : undefined,
        }}
      >
        {content.label}
      </p>
      <h3
        className={cn('leading-tight', titleFont)}
        style={{ color: palette.text, fontSize: '11cqw' }}
      >
        {content.title}
      </h3>
      <p style={{ color: palette.muted, fontSize: '4.6cqw' }}>{content.occasion}</p>
      <div style={{ background: palette.accent, width: '14cqw', height: 1, margin: '2cqw 0' }} />
      <p className="font-medium" style={{ color: palette.text, fontSize: '5cqw' }}>
        {content.date}
      </p>
      {content.time && <p style={{ color: palette.muted, fontSize: '4.2cqw' }}>{content.time}</p>}
      <p style={{ color: palette.text, fontSize: '4.6cqw' }}>{content.venue}</p>
      {content.address && (
        <p style={{ color: palette.muted, fontSize: '3.8cqw' }}>{content.address}</p>
      )}
      {content.message && (
        <p
          className="max-w-[80%]"
          style={{ color: palette.muted, fontSize: '3.8cqw', marginTop: '2cqw' }}
        >
          {content.message}
        </p>
      )}
    </div>
  );
}

function Frame({ frame, accent }: { frame: TemplateDesign['frame']; accent: string }) {
  if (frame === 'none') return null;
  const line = `1px solid ${accent}`;
  return (
    <>
      <div
        className="pointer-events-none absolute"
        style={{ inset: '2.5cqw', border: line, borderRadius: '1.2cqw' }}
      />
      {(frame === 'double' || frame === 'ornate') && (
        <div
          className="pointer-events-none absolute"
          style={{ inset: '4.5cqw', border: line, opacity: 0.5, borderRadius: '0.8cqw' }}
        />
      )}
      {frame === 'ornate' &&
        cornerPositions.map((position) => (
          <CornerMark
            key={position}
            className={cn('pointer-events-none absolute w-[9cqw]', position)}
            // The mark is drawn for the top-start corner; the rest are mirrored.
          />
        ))}
    </>
  );
}

function Layout({ design, children }: { design: TemplateDesign; children: ReactNode }) {
  const { accent, surface } = design.palette;
  const motif = (width: string) => (
    <div style={{ color: accent, width }} aria-hidden>
      <OrnamentGraphic kind={design.ornament} className="h-auto w-full" />
    </div>
  );

  if (design.layout === 'banner') {
    return (
      <div className="relative z-10 flex h-full flex-col">
        <div
          className="flex items-center justify-center"
          style={{ background: accent, color: surface, height: '22%' }}
        >
          <div style={{ width: '30cqw' }} aria-hidden>
            <OrnamentGraphic kind={design.ornament} className="h-auto w-full" />
          </div>
        </div>
        <div className="flex flex-1 flex-col" style={{ padding: '6cqw 8cqw 8cqw' }}>
          {children}
        </div>
      </div>
    );
  }

  if (design.layout === 'split') {
    return (
      <div className="relative z-10 flex h-full">
        <div
          className="flex shrink-0 items-center justify-center overflow-hidden"
          style={{ background: `${accent}22`, width: '22%' }}
          aria-hidden
        >
          <div className="rotate-90" style={{ color: accent, width: '48cqw', flexShrink: 0 }}>
            <OrnamentGraphic kind={design.ornament} className="h-auto w-full" />
          </div>
        </div>
        <div className="flex flex-1 flex-col" style={{ padding: '9cqw 5cqw' }}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex h-full flex-col" style={{ padding: '9cqw 8cqw' }}>
      <div className="flex justify-center">{motif('26cqw')}</div>
      {children}
    </div>
  );
}
