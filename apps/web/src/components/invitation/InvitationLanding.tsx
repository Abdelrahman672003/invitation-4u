import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import i18n, { type TFunction } from 'i18next';
import { Link } from 'react-router';
import type {
  InvitationContent,
  InvitationContentData,
  Locale,
  TemplateDesign,
} from '@invite/shared';
import { cn } from '@/lib/cn';
import { CornerMark, OrnamentGraphic, patternBackground } from './ornaments';
import { mediaUrl } from '@/lib/media';
import { SocialLinks } from '@/components/ui/SocialLinks';
import { CalendarCard } from './Calendar';
import { Decor, GlassBackdrop, LookProvider, glass, lookFor, shade, useLook } from './sectionLook';
import { EnvelopeIntro } from './Envelope';
import { introFonts } from './introFonts';
import { MusicPlayer } from './MusicPlayer';
import { ThemePoster, isPosterTheme, posterBackdrop } from './ThemePoster';

/** Class for each font a customer can choose for the verse or the story. */
const TEXT_FONT_CLASS = {
  display: 'font-display font-semibold',
  script: 'font-script text-[1.2em] font-normal',
  luxe: 'font-luxe font-semibold',
  sans: 'font-sans',
  caps: 'font-caps',
} as const;

/** The timezone invitations are scheduled in until per-invitation timezones are offered. */
const EVENT_TIMEZONE = 'Africa/Cairo';

interface Props {
  design: TemplateDesign;
  /** Stored content: story, schedule, notes and the section switches. */
  content: InvitationContentData;
  /** Display text already formatted for the invitation's language (dates, times, placeholders). */
  text: InvitationContent;
  eventDate: string | null;
  locale: Locale;
  /** The RSVP form (public page) or a sample (editor). Omitted when RSVP is switched off. */
  rsvp?: ReactNode;
  /** The guestbook (public page) or a sample (editor). Omitted when it is not available. */
  guestbook?: ReactNode;
  /** Free plan: shows a ribbon and a tiled mark over the page. */
  watermark?: boolean;
  /** Inside the editor the hero fills a preview pane instead of the whole screen. */
  embedded?: boolean;
  className?: string;
}

/** Black or white, whichever reads better on the given #rrggbb background. */
function readableOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const channel = (value: number) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const luminance = 0.2126 * channel(r ?? 0) + 0.7152 * channel(g ?? 0) + 0.0722 * channel(b ?? 0);
  return luminance > 0.4 ? '#1c1a17' : '#ffffff';
}

/** Offset (ms) of a timezone from UTC at the given instant. */
function zoneOffset(utcMs: number, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(new Date(utcMs))
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;
  return (
    Date.UTC(
      parts.year ?? 0,
      (parts.month ?? 1) - 1,
      parts.day ?? 1,
      parts.hour ?? 0,
      parts.minute ?? 0,
      parts.second ?? 0,
    ) - utcMs
  );
}

/** Instant of "date at time" on the wall clock of the event timezone. */
export function eventInstant(date: string, time: string): number | null {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = (time || '18:00').split(':').map(Number);
  if (!year || !month || !day) return null;
  const wall = Date.UTC(year, month - 1, day, hours ?? 18, minutes ?? 0);
  return wall - zoneOffset(wall, EVENT_TIMEZONE);
}

function useNow(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [enabled]);
  return now;
}

/** Fades content in as it scrolls into view; shows it at once when motion is reduced or unsupported. */
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const node = ref.current;
    if (!node || shown) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return setShown(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shown]);
  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        'relative z-10 transition-all duration-700 ease-out',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

function Heading({
  children,
  color,
  accent,
  titleFont,
}: {
  children: ReactNode;
  color: string;
  accent: string;
  titleFont: string;
}) {
  const look = useLook();
  const font = look.headingFont || titleFont;
  if (look.heading === 'script') {
    return (
      <div className="mb-10 text-center">
        <h2
          className={cn('text-[clamp(2.4rem,10cqw,4rem)] leading-tight', font)}
          style={{ color: accent }}
        >
          {children}
        </h2>
      </div>
    );
  }
  if (look.heading === 'caps') {
    return (
      <div className="mb-10 text-center">
        <h2
          className={cn(
            'text-[clamp(1.1rem,3.6cqw,1.6rem)] uppercase leading-tight tracking-[0.28em] rtl:tracking-normal',
            font,
          )}
          style={{ color }}
        >
          {children}
        </h2>
        <div className="mx-auto mt-4 h-px w-10" style={{ background: accent }} />
      </div>
    );
  }
  return (
    <div className="mb-10 text-center">
      <h2
        className={cn('text-[clamp(1.75rem,6cqw,2.75rem)] leading-tight', font)}
        style={{ color }}
      >
        {children}
      </h2>
      {look.heading === 'ornament' ? (
        <div className="mx-auto mt-4 flex w-40 items-center gap-3" aria-hidden>
          <span className="h-px flex-1" style={{ background: accent }} />
          <span className="size-2 rotate-45" style={{ background: accent }} />
          <span className="h-px flex-1" style={{ background: accent }} />
        </div>
      ) : (
        <div className="mx-auto mt-4 h-px w-16" style={{ background: accent }} />
      )}
    </div>
  );
}

/**
 * The public invitation as a full landing page: hero, countdown, details, story, programme,
 * venue, good-to-know notes, RSVP and footer. Everything is plain text styled from the template
 * design; nothing the customer types is ever rendered as markup.
 */
export function InvitationLanding({
  design,
  content,
  text,
  eventDate,
  locale,
  rsvp,
  guestbook,
  watermark,
  embedded,
  className,
}: Props) {
  const t = i18n.getFixedT(locale);
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const { palette } = design;
  const onAccent = readableOn(palette.accent);
  const posterTheme = isPosterTheme(design.theme) ? design.theme : null;
  const titleFont = posterTheme
    ? 'font-luxe font-semibold'
    : design.font === 'elegant'
      ? 'font-display font-semibold'
      : 'font-sans font-bold';
  const intro = introFonts(design, titleFont);
  const passageFont = (choice: InvitationContentData['verseFont'], fallback: string) =>
    choice === 'auto' ? fallback : TEXT_FONT_CLASS[choice];
  const eventAt = eventDate ? eventInstant(eventDate, content.time) : null;
  const now = useNow(eventAt !== null && content.sections.countdown);
  const [musicStart, setMusicStart] = useState(0);

  const { sections } = content;
  const hasStory = sections.story && content.story.trim() !== '';
  const schedule = content.schedule
    .filter((item) => item.title.trim() !== '')
    .sort((a, b) => a.time.localeCompare(b.time));
  const hasSchedule = sections.schedule && schedule.length > 0;
  const hasNotes =
    sections.details && (content.dressCode.trim() !== '' || content.notes.trim() !== '');
  const mapHref =
    content.mapUrl ||
    (text.venue
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([text.venue, content.venueAddress].filter(Boolean).join(' '))}`
      : '');

  // Section colours come from the template palette; the RSVP form reuses the site's components,
  // so the tokens they read are re-pointed at the palette inside this wrapper.
  const theme = {
    '--color-brand-50': `${palette.accent}14`,
    '--color-brand-100': `${palette.accent}33`,
    '--color-brand-500': palette.accent,
    '--color-brand-600': palette.accent,
    '--color-brand-700': palette.accent,
    '--color-surface': palette.surface,
    '--color-sunken': palette.background,
    '--color-ink': palette.text,
    '--color-ink-soft': palette.muted,
    '--color-muted': palette.muted,
    '--color-line': `${palette.accent}33`,
    '--color-line-strong': `${palette.accent}66`,
    '--color-success-600': palette.accent,
    color: palette.text,
    background: palette.background,
    containerType: 'inline-size',
  } as CSSProperties;

  const look = lookFor(design);
  const band = (background: string, color: string): CSSProperties => ({ background, color });
  const pad = 'relative z-10 px-6 py-16 @2xl:py-24';
  const glassCard = (strength?: 'soft' | 'strong') => glass(palette, strength);

  return (
    <LookProvider look={look}>
      <div
        dir={dir}
        lang={locale}
        className={cn('relative overflow-x-clip', className)}
        style={theme}
      >
        {!embedded && content.sections.envelope && (
          <EnvelopeIntro
            palette={palette}
            variant={content.envelopeStyle}
            title={text.title}
            label={t('landing.envelopeLabel')}
            openLabel={t('landing.openInvitation')}
            fontClass={intro.title}
            labelClass={intro.label}
            onOpen={() => setMusicStart((value) => value + 1)}
          />
        )}
        {!embedded && content.music && (
          <MusicPlayer
            src={mediaUrl(content.music)}
            palette={palette}
            startSignal={musicStart}
            label={t('landing.music')}
          />
        )}
        {watermark && <FreeMark locale={locale} />}
        <GlassBackdrop palette={palette} />

        {/* 1. Hero */}
        {posterTheme ? (
          <header
            className={cn(
              'relative flex flex-col items-center justify-center gap-6 px-4 py-10',
              embedded ? 'min-h-[34rem]' : 'min-h-svh',
            )}
            style={{ background: posterBackdrop(design) }}
          >
            <div
              className={cn(
                'relative aspect-[5/7] w-full overflow-hidden rounded-sm shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)]',
                embedded ? 'max-w-[26rem]' : 'max-w-[min(34rem,calc((100svh-9rem)*5/7))]',
              )}
            >
              <ThemePoster
                design={design}
                content={text}
                dir={dir}
                eventDate={eventDate}
                photo={content.photo ? mediaUrl(content.photo) : null}
                hint={embedded}
              />
            </div>
            {rsvp && (
              <Anchor
                embedded={embedded}
                href="#rsvp"
                className="inline-flex h-12 items-center rounded-full px-8 font-medium shadow-lg transition-transform hover:-translate-y-0.5"
                style={band(palette.accent, onAccent)}
              >
                {t('landing.replyNow')}
              </Anchor>
            )}
          </header>
        ) : (
          <header
            className={cn(
              'relative flex flex-col items-center justify-center px-6 text-center',
              embedded ? 'min-h-[34rem]' : 'min-h-svh',
            )}
            style={{
              backgroundColor: palette.background,
              backgroundImage: patternBackground(design.pattern, palette.accent),
            }}
          >
            {design.layout === 'banner' && (
              <div
                className="absolute inset-x-0 top-0 flex h-24 items-center justify-center"
                style={band(palette.accent, onAccent)}
                aria-hidden
              >
                <OrnamentGraphic kind={design.ornament} className="h-auto w-40" />
              </div>
            )}
            {design.layout === 'split' && (
              <div
                className="absolute inset-y-0 start-0 w-3 @md:w-6"
                style={{ background: palette.accent }}
                aria-hidden
              />
            )}
            {design.frame !== 'none' && (
              <div
                className="pointer-events-none absolute inset-4 @md:inset-8"
                aria-hidden
                style={{
                  border: `1px solid ${palette.accent}`,
                  borderRadius: 12,
                  color: palette.accent,
                }}
              >
                {(design.frame === 'double' || design.frame === 'ornate') && (
                  <div
                    className="absolute inset-2 rounded-lg opacity-50"
                    style={{ border: `1px solid ${palette.accent}` }}
                  />
                )}
                {design.frame === 'ornate' &&
                  [
                    'start-1 top-1',
                    'end-1 top-1 -scale-x-100',
                    'bottom-1 start-1 -scale-y-100',
                    'bottom-1 end-1 -scale-100',
                  ].map((position) => (
                    <CornerMark key={position} className={cn('absolute w-10 @md:w-14', position)} />
                  ))}
              </div>
            )}
            <div
              className="relative z-10 flex max-w-3xl flex-col items-center gap-5 py-24"
              style={{ color: palette.text }}
            >
              {design.layout !== 'banner' && (
                <div className="w-40" style={{ color: palette.accent }} aria-hidden>
                  <OrnamentGraphic kind={design.ornament} className="h-auto w-full" />
                </div>
              )}
              {text.label && (
                <p
                  className="text-lg tracking-wide @md:text-xl"
                  style={{
                    color: palette.accent,
                    letterSpacing: dir === 'ltr' ? '0.2em' : undefined,
                  }}
                >
                  {text.label}
                </p>
              )}
              <h1 className={cn('text-[clamp(2.75rem,13cqw,6.5rem)] leading-[1.05]', titleFont)}>
                {text.title}
              </h1>
              {text.occasion && (
                <p className="text-[clamp(1.1rem,3.4cqw,1.6rem)]" style={{ color: palette.muted }}>
                  {text.occasion}
                </p>
              )}
              <div className="mt-2 h-px w-24" style={{ background: palette.accent }} />
              <p className="text-[clamp(1.1rem,3.6cqw,1.7rem)] font-medium">{text.date}</p>
              {text.venue && <p style={{ color: palette.muted }}>{text.venue}</p>}
              {rsvp && (
                <Anchor
                  embedded={embedded}
                  href="#rsvp"
                  className="mt-4 inline-flex h-12 items-center rounded-full px-8 font-medium shadow-lg transition-transform hover:-translate-y-0.5"
                  style={band(palette.accent, onAccent)}
                >
                  {t('landing.replyNow')}
                </Anchor>
              )}
            </div>
            <Anchor
              embedded={embedded}
              href="#details"
              label={t('landing.scroll')}
              className="absolute bottom-6 animate-bounce motion-reduce:animate-none"
              style={{ color: palette.accent }}
            >
              <ChevronDown className="size-7" />
            </Anchor>
          </header>
        )}

        {/* Verse or quotation */}
        {content.verse.trim() !== '' && (
          <section className="relative z-10 px-6 py-14 text-center" style={{ color: palette.text }}>
            <Reveal className="mx-auto max-w-2xl">
              <figure
                className="relative overflow-hidden rounded-[2rem] px-8 py-12"
                style={glassCard('strong')}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-6 start-5 select-none font-luxe text-[9rem] leading-none opacity-20"
                  style={{ color: palette.accent }}
                >
                  “
                </span>
                <p
                  className={cn(
                    'relative whitespace-pre-line text-balance text-[clamp(1.25rem,4.4cqw,1.9rem)] leading-loose',
                    passageFont(content.verseFont, titleFont),
                  )}
                >
                  {content.verse}
                </p>
                <div
                  className="mx-auto mt-6 h-px w-24"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${palette.accent}, transparent)`,
                  }}
                />
              </figure>
            </Reveal>
          </section>
        )}

        {/* 2. Countdown */}
        {sections.countdown && eventAt !== null && (
          <section
            className={cn(pad, 'relative overflow-hidden text-center')}
            style={{
              background: `linear-gradient(135deg, ${palette.accent}, ${shade(palette.accent, -0.38)})`,
              color: onAccent,
            }}
            aria-label={t('landing.countdownTitle')}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-24 start-1/4 size-72 rounded-full bg-white/20 blur-3xl"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-24 end-1/4 size-72 rounded-full bg-black/20 blur-3xl"
            />
            <Reveal>
              <h2
                className={cn(
                  'mb-8 text-[clamp(1.5rem,5cqw,2.25rem)]',
                  look.headingFont || titleFont,
                )}
                style={{ color: onAccent }}
              >
                {t('landing.countdownTitle')}
              </h2>
              <Countdown target={eventAt} now={now} locale={locale} t={t} />
            </Reveal>
          </section>
        )}

        {/* 3. Details: date, time, place */}
        <section id="details" className={cn(pad, 'overflow-hidden')}>
          <Decor palette={palette} />
          <Reveal className="mx-auto max-w-4xl">
            <Heading color={palette.text} accent={palette.accent} titleFont={titleFont}>
              {t('landing.detailsTitle')}
            </Heading>
            <div className={cn('grid gap-4', text.time ? '@xl:grid-cols-3' : '@xl:grid-cols-2')}>
              <Reveal delay={0}>
                <Tile
                  icon={<CalendarDays className="size-6" />}
                  label={t('landing.date')}
                  value={text.date}
                  accent={palette.accent}
                  muted={palette.muted}
                />
              </Reveal>
              {text.time && (
                <Reveal delay={120}>
                  <Tile
                    icon={<Clock className="size-6" />}
                    label={t('landing.time')}
                    value={text.time}
                    accent={palette.accent}
                    muted={palette.muted}
                  />
                </Reveal>
              )}
              <Reveal delay={240}>
                <Tile
                  icon={<MapPin className="size-6" />}
                  label={t('landing.place')}
                  value={text.venue}
                  sub={text.address}
                  accent={palette.accent}
                  muted={palette.muted}
                />
              </Reveal>
            </div>
          </Reveal>
        </section>

        {/* Calendar */}
        {sections.calendar && eventDate && (
          <section className={pad}>
            <Reveal className="mx-auto max-w-2xl">
              <Heading color={palette.text} accent={palette.accent} titleFont={titleFont}>
                {t('landing.calendarTitle')}
              </Heading>
              <CalendarCard
                details={{
                  title: text.title,
                  date: eventDate,
                  time: content.time,
                  venue: text.venue,
                  address: content.venueAddress,
                  timeZone: EVENT_TIMEZONE,
                }}
                locale={locale}
                palette={palette}
                googleLabel={t('landing.addToCalendar')}
                icsLabel={t('landing.downloadIcs')}
                embedded={embedded}
              />
            </Reveal>
          </section>
        )}

        {/* 4. Story and message */}
        {(hasStory || text.message) && (
          <section className={cn(pad, 'overflow-hidden')}>
            <Decor palette={palette} />
            <Reveal className="mx-auto max-w-2xl text-center">
              {hasStory && (
                <>
                  <Heading color={palette.text} accent={palette.accent} titleFont={titleFont}>
                    {t('landing.storyTitle')}
                  </Heading>
                  <div className="relative rounded-[2rem] p-8 @md:p-10" style={glassCard()}>
                    <span
                      aria-hidden
                      className="absolute inset-y-8 start-0 w-1 rounded-full"
                      style={{ background: `linear-gradient(${palette.accent}, transparent)` }}
                    />
                    <p
                      className={cn(
                        'whitespace-pre-line text-lg leading-loose',
                        passageFont(content.storyFont, ''),
                      )}
                      style={{ color: palette.muted }}
                    >
                      {content.story}
                    </p>
                  </div>
                </>
              )}
              {text.message && (
                <blockquote
                  className={cn(
                    'relative overflow-hidden rounded-[2rem] p-8 text-xl leading-loose',
                    hasStory && 'mt-8',
                  )}
                  style={{ ...glassCard('strong'), color: palette.text }}
                >
                  <span
                    aria-hidden
                    className="block bg-clip-text font-luxe text-6xl leading-none text-transparent"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${palette.accent}, ${shade(palette.accent, 0.4)})`,
                    }}
                  >
                    “
                  </span>
                  {text.message}
                </blockquote>
              )}
            </Reveal>
          </section>
        )}

        {/* Photo gallery */}
        {sections.gallery && content.gallery.length > 0 && (
          <section className={cn(pad, 'overflow-hidden')}>
            <Decor palette={palette} />
            <Reveal className="mx-auto max-w-4xl">
              <Heading color={palette.text} accent={palette.accent} titleFont={titleFont}>
                {t('landing.galleryTitle')}
              </Heading>
              <Gallery
                photos={content.gallery}
                layout={content.galleryLayout}
                closeLabel={t('landing.close')}
                palette={palette}
              />
            </Reveal>
          </section>
        )}

        {/* 5. Programme */}
        {hasSchedule && (
          <section className={pad}>
            <Reveal className="mx-auto max-w-4xl">
              <Heading color={palette.text} accent={palette.accent} titleFont={titleFont}>
                {t('landing.scheduleTitle')}
              </Heading>
              <ol className="relative space-y-6 @2xl:space-y-0">
                <span
                  aria-hidden
                  className="absolute inset-y-4 start-6 w-0.5 -translate-x-1/2 rounded-full @2xl:start-1/2 rtl:translate-x-1/2"
                  style={{
                    background: `linear-gradient(${palette.accent}00, ${palette.accent} 12%, ${palette.accent} 88%, ${palette.accent}00)`,
                  }}
                />
                {schedule.map((item, index) => {
                  const side = index % 2 === 0;
                  return (
                    <li
                      key={index}
                      className={cn(
                        'relative ps-16 @2xl:w-1/2 @2xl:py-3 @2xl:ps-0',
                        side ? '@2xl:pe-14 @2xl:text-end' : '@2xl:ms-auto @2xl:ps-14',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'absolute start-6 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full ltr:-translate-x-1/2 rtl:translate-x-1/2',
                          side
                            ? '@2xl:start-auto @2xl:end-0 @2xl:ltr:translate-x-1/2 @2xl:rtl:-translate-x-1/2'
                            : '@2xl:start-0 @2xl:ltr:-translate-x-1/2 @2xl:rtl:translate-x-1/2',
                        )}
                        style={{
                          background: `linear-gradient(135deg, ${palette.accent}, ${shade(palette.accent, 0.35)})`,
                          color: onAccent,
                          boxShadow: `0 0 0 6px ${palette.accent}26, 0 10px 22px -8px ${palette.accent}`,
                        }}
                      >
                        <Clock className="size-5" />
                      </span>
                      <Reveal delay={index * 90}>
                        <div
                          className="relative overflow-hidden rounded-3xl px-6 py-5 transition-transform duration-300 hover:-translate-y-1"
                          style={glassCard('strong')}
                        >
                          <span
                            aria-hidden
                            className="absolute inset-y-0 start-0 w-1.5"
                            style={{
                              background: `linear-gradient(${palette.accent}, ${shade(palette.accent, 0.4)})`,
                            }}
                          />
                          <p
                            className="font-luxe text-3xl font-semibold leading-none tabular-nums"
                            style={{ color: palette.accent }}
                          >
                            {formatClock(item.time, locale)}
                          </p>
                          <p className={cn('mt-2 text-xl leading-snug', titleFont)}>{item.title}</p>
                        </div>
                      </Reveal>
                    </li>
                  );
                })}
              </ol>
            </Reveal>
          </section>
        )}

        {/* 6. Venue and map */}
        {text.venue && (
          <section className={cn(pad, 'overflow-hidden text-center')}>
            <Decor palette={palette} />
            <Reveal className="mx-auto max-w-2xl">
              <Heading color={palette.text} accent={palette.accent} titleFont={titleFont}>
                {t('landing.venueTitle')}
              </Heading>
              <div
                className="relative overflow-hidden rounded-[2rem] p-8 @md:p-10"
                style={glassCard('strong')}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-16 start-1/2 size-48 -translate-x-1/2 rounded-full blur-3xl"
                  style={{ background: palette.accent, opacity: 0.25 }}
                />
                <span className="relative mx-auto grid size-16 place-items-center">
                  <span
                    aria-hidden
                    className="absolute inset-0 animate-ping rounded-full opacity-25 motion-reduce:animate-none"
                    style={{ background: palette.accent }}
                  />
                  <span
                    className="relative grid size-16 place-items-center rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${palette.accent}, ${shade(palette.accent, -0.3)})`,
                      color: onAccent,
                    }}
                  >
                    <MapPin className="size-7" aria-hidden />
                  </span>
                </span>
                <p className={cn('relative mt-4 text-2xl', titleFont)}>{text.venue}</p>
                {text.address && (
                  <p className="relative mt-2" style={{ color: palette.muted }}>
                    {text.address}
                  </p>
                )}
                {mapHref && (
                  <a
                    href={mapHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative mt-6 inline-flex h-12 items-center rounded-full px-8 font-medium transition-transform hover:-translate-y-0.5"
                    style={{
                      background: `linear-gradient(135deg, ${palette.accent}, ${shade(palette.accent, -0.3)})`,
                      color: onAccent,
                      boxShadow: `0 14px 30px -12px ${palette.accent}`,
                    }}
                  >
                    {t('landing.openMap')}
                  </a>
                )}
              </div>
            </Reveal>
          </section>
        )}

        {/* 7. Good to know */}
        {hasNotes && (
          <section className={pad}>
            <Reveal className="mx-auto max-w-3xl">
              <Heading color={palette.text} accent={palette.accent} titleFont={titleFont}>
                {t('landing.notesTitle')}
              </Heading>
              <div className="grid gap-4 @xl:grid-cols-2">
                {content.dressCode && (
                  <Reveal delay={0}>
                    <Tile
                      label={t('landing.dressCode')}
                      value={content.dressCode}
                      accent={palette.accent}
                      muted={palette.muted}
                    />
                  </Reveal>
                )}
                {content.notes && (
                  <Reveal delay={120}>
                    <Tile
                      label={t('landing.notes')}
                      value={content.notes}
                      accent={palette.accent}
                      muted={palette.muted}
                    />
                  </Reveal>
                )}
              </div>
            </Reveal>
          </section>
        )}

        {/* 8. RSVP */}
        {rsvp && (
          <section
            id="rsvp"
            className={cn(pad, 'relative overflow-hidden')}
            style={{ color: palette.text }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-80 max-w-xl -translate-y-1/2 rounded-full blur-3xl"
              style={{ background: palette.accent, opacity: 0.22 }}
            />
            <Reveal className="mx-auto max-w-md">
              <div
                className="rounded-[2rem] p-2 [&_form]:rounded-[1.5rem] [&_form]:border-white/40 [&_form]:bg-transparent [&_form]:shadow-none"
                style={glassCard('strong')}
              >
                {rsvp}
              </div>
            </Reveal>
          </section>
        )}

        {/* Guestbook */}
        {sections.guestbook && guestbook && (
          <section id="guestbook" className={cn(pad, 'overflow-hidden')}>
            <Decor palette={palette} />
            <Reveal className="mx-auto max-w-2xl">
              <Heading color={palette.text} accent={palette.accent} titleFont={titleFont}>
                {t('landing.guestbookTitle')}
              </Heading>
              {guestbook}
            </Reveal>
          </section>
        )}

        {/* 9. Footer */}
        <footer
          className="relative z-10 overflow-hidden px-6 py-14 text-center"
          style={{
            background: `linear-gradient(160deg, ${palette.text}, ${shade(palette.text, -0.35)})`,
            color: readableOn(palette.text),
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -top-20 start-1/2 size-64 -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: palette.accent, opacity: 0.3 }}
          />
          <div
            className="relative mx-auto w-28 opacity-90"
            style={{ color: palette.accent }}
            aria-hidden
          >
            <OrnamentGraphic kind={design.ornament} className="h-auto w-full" />
          </div>
          <p className={cn('relative mt-4 text-2xl', titleFont)}>{text.title}</p>
          <SocialLinks
            className="relative mt-6 justify-center opacity-40"
            size="size-4"
            linkClassName="hover:opacity-100"
          />
          <p className="relative mt-4 text-xs opacity-70">
            <a href="/" target="_blank" rel="noopener" className="hover:underline">
              {t('public.madeWith')}
            </a>
          </p>
        </footer>
        {!embedded && rsvp && (
          <StickyReply accent={palette.accent} onAccent={onAccent} label={t('landing.replyNow')} />
        )}
      </div>
    </LookProvider>
  );
}

/** In previews the page-internal links are plain elements, so they never change the host page's address. */
function Anchor({
  embedded,
  href,
  label,
  className,
  style,
  children,
}: {
  embedded?: boolean;
  href: string;
  label?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  if (embedded) {
    return (
      <span className={className} style={style} aria-hidden>
        {children}
      </span>
    );
  }
  return (
    <a href={href} aria-label={label} className={className} style={style}>
      {children}
    </a>
  );
}

function formatClock(value: string, locale: Locale) {
  const [hours, minutes] = value.split(':').map(Number);
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2000, 0, 1, hours ?? 0, minutes ?? 0)));
}

function Tile({
  icon,
  label,
  value,
  sub,
  accent,
  muted,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
  muted: string;
}) {
  const look = useLook();
  const radius = look.tile === 'line' ? '1.1rem' : '1.75rem';
  const style: CSSProperties = {
    ...glass(look.palette, look.tile === 'filled' ? 'strong' : 'soft'),
    borderRadius: radius,
  };
  return (
    <div
      className="group relative h-full overflow-hidden p-6 text-center transition-all duration-300 hover:-translate-y-1.5"
      style={style}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-10 start-1/2 size-28 -translate-x-1/2 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
        style={{ background: accent }}
      />
      {icon && (
        <div
          className="relative mx-auto mb-3 grid size-12 place-items-center rounded-full text-white"
          style={{ background: `linear-gradient(135deg, ${accent}, ${shade(accent, -0.3)})` }}
          aria-hidden
        >
          {icon}
        </div>
      )}
      <p className="relative text-sm" style={{ color: muted }}>
        {label}
      </p>
      <p className="relative mt-1 whitespace-pre-line text-lg font-medium">{value}</p>
      {sub && (
        <p className="relative mt-1 text-sm" style={{ color: muted }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function Countdown({
  target,
  now,
  locale,
  t,
}: {
  target: number;
  now: number;
  locale: Locale;
  t: TFunction;
}) {
  const remaining = target - now;
  if (remaining <= 0) {
    return <p className="text-xl">{t('landing.countdownDone')}</p>;
  }
  const seconds = Math.floor(remaining / 1000);
  const units = [
    ['days', Math.floor(seconds / 86400)],
    ['hours', Math.floor((seconds % 86400) / 3600)],
    ['minutes', Math.floor((seconds % 3600) / 60)],
    ['seconds', seconds % 60],
  ] as const;
  const format = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
    minimumIntegerDigits: 2,
  });
  return (
    <div className="mx-auto grid max-w-xl grid-cols-4 gap-3" role="timer">
      {units.map(([unit, value]) => (
        <div
          key={unit}
          className="rounded-3xl border border-white/30 bg-white/15 px-1 py-5 shadow-lg backdrop-blur-md"
        >
          <p className="text-[clamp(1.5rem,7cqw,3rem)] font-semibold tabular-nums leading-none">
            {format.format(value)}
          </p>
          <p className="mt-2 text-xs opacity-90 @md:text-sm">{t(`landing.${unit}`)}</p>
        </div>
      ))}
    </div>
  );
}

/** Free-plan watermark: a ribbon at the top and a faint tiled mark over the whole page. */
function FreeMark({ locale }: { locale: Locale }) {
  const t = i18n.getFixedT(locale);
  const tile =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='180'%3E%3Ctext x='130' y='90' text-anchor='middle' transform='rotate(-24 130 90)' font-family='sans-serif' font-size='20' font-weight='600' fill='%23000' fill-opacity='.13'%3EInvitation 4u · Free plan%3C/text%3E%3C/svg%3E\")";
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 z-30"
        style={{ backgroundImage: tile }}
        aria-hidden
        data-testid="watermark"
      />
      <Link
        to="/"
        className="sticky top-0 z-40 block bg-black/85 px-4 py-2 text-center text-sm font-medium text-white backdrop-blur"
      >
        {t('free.ribbon')}
      </Link>
    </>
  );
}

/** A floating "reply" pill that appears once the guest has scrolled past the cover. */
function StickyReply({
  accent,
  onAccent,
  label,
}: {
  accent: string;
  onAccent: string;
  label: string;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const rect = document.getElementById('rsvp')?.getBoundingClientRect();
      const inView = rect ? rect.top < window.innerHeight && rect.bottom > 0 : false;
      setVisible(window.scrollY > window.innerHeight * 0.8 && !inView);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <a
      href="#rsvp"
      tabIndex={visible ? 0 : -1}
      className={cn(
        'fixed bottom-5 right-5 z-50 inline-flex h-12 items-center rounded-full px-7 font-medium shadow-lg transition-all duration-300',
        visible ? 'opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
      style={{ background: accent, color: onAccent }}
    >
      {label}
    </a>
  );
}

/** The photo gallery: a grid, a swipeable carousel or tilted polaroids; each photo opens full size. */
function Gallery({
  photos,
  layout,
  closeLabel,
  palette,
}: {
  photos: string[];
  layout: InvitationContentData['galleryLayout'];
  closeLabel: string;
  palette: TemplateDesign['palette'];
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const count = photos.length;

  useEffect(() => {
    if (open === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null);
      if (event.key === 'ArrowRight')
        setOpen((value) => (value === null ? value : (value + 1) % count));
      if (event.key === 'ArrowLeft')
        setOpen((value) => (value === null ? value : (value - 1 + count) % count));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, count]);

  const deck = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const swiped = useRef(false);
  const [dragX, setDragX] = useState(0);
  const dragging = dragX !== 0;
  const [rtl, setRtl] = useState(false);
  useEffect(() => {
    if (deck.current) setRtl(getComputedStyle(deck.current).direction === 'rtl');
  }, []);
  const step = (by: number) => setActive((value) => (value + by + count) % count);
  function finishDrag() {
    const current = drag.current;
    drag.current = null;
    if (!current) return;
    if (current.moved && Math.abs(dragX) > 60) step(dragX < 0 ? 1 : -1);
    // The click that follows a swipe must not open the photo.
    swiped.current = current.moved;
    if (current.moved) window.setTimeout(() => (swiped.current = false), 50);
    setDragX(0);
  }

  // Cards are rounded-3xl with a small padding, so the photo inside gets the matching inner radius.
  const photo = (index: number, ratio: string) => (
    <button
      type="button"
      onClick={() => setOpen(index)}
      className={cn('block w-full overflow-hidden rounded-[1.125rem]', ratio)}
    >
      <img
        src={mediaUrl(photos[index] ?? '')}
        alt=""
        loading="lazy"
        className="size-full object-cover transition-transform duration-700 hover:scale-105"
      />
    </button>
  );
  const tilt = [-3, 2.5, -1.5, 3, -2.5, 1.5];

  return (
    <>
      {layout === 'carousel' ? (
        <div className="mx-auto w-full max-w-xl select-none">
          <div
            ref={deck}
            className="relative mx-auto my-4 aspect-[4/5] w-[72%] touch-pan-y @xl:aspect-[4/3] @xl:w-[58%]"
            onPointerDown={(event) => {
              drag.current = { x: event.clientX, moved: false };
            }}
            onPointerMove={(event) => {
              if (!drag.current) return;
              const dx = event.clientX - drag.current.x;
              if (Math.abs(dx) > 6) drag.current.moved = true;
              if (drag.current.moved) setDragX(dx);
            }}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onPointerLeave={finishDrag}
          >
            {photos.map((name, index) => {
              const depth = (index - active + count) % count;
              const front = depth === 0;
              const shown = depth <= 2;
              const side = rtl ? -1 : 1;
              const transform = front
                ? `translateX(${dragX}px) rotate(${dragX / 24}deg)`
                : `translateX(${side * depth * 12}%) scale(${1 - depth * 0.07}) rotate(${side * depth * 2}deg)`;
              return (
                <div
                  key={name}
                  style={{
                    ...glass(palette, 'strong'),
                    transform,
                    zIndex: count - depth,
                    opacity: shown ? 1 - depth * 0.18 : 0,
                    filter: front ? undefined : `brightness(${1 - depth * 0.08})`,
                    transition: dragging ? 'none' : 'all 650ms cubic-bezier(.22,.9,.3,1)',
                  }}
                  className={cn(
                    'absolute inset-0 rounded-3xl p-1.5',
                    !front && 'pointer-events-none',
                  )}
                >
                  <button
                    type="button"
                    tabIndex={front ? 0 : -1}
                    onClick={() => {
                      if (!drag.current?.moved && !swiped.current) setOpen(index);
                    }}
                    className="block size-full overflow-hidden rounded-[1.125rem]"
                  >
                    <img
                      src={mediaUrl(name)}
                      alt=""
                      draggable={false}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  </button>
                </div>
              );
            })}
          </div>
          {count > 1 && (
            <div className="mt-5 flex items-center justify-center gap-4">
              <button
                type="button"
                aria-label="‹"
                onClick={() => step(-1)}
                className="grid size-11 place-items-center rounded-full transition-transform hover:scale-110"
                style={{ ...glass(palette, 'strong'), color: palette.text }}
              >
                {rtl ? (
                  <ChevronRight className="size-5" aria-hidden />
                ) : (
                  <ChevronLeft className="size-5" aria-hidden />
                )}
              </button>
              <div className="flex gap-2">
                {photos.map((name, index) => (
                  <button
                    key={name}
                    type="button"
                    aria-label={String(index + 1)}
                    onClick={() => setActive(index)}
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: index === active ? '1.5rem' : '0.5rem',
                      background: palette.accent,
                      opacity: index === active ? 1 : 0.35,
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label="›"
                onClick={() => step(1)}
                className="grid size-11 place-items-center rounded-full transition-transform hover:scale-110"
                style={{ ...glass(palette, 'strong'), color: palette.text }}
              >
                {rtl ? (
                  <ChevronLeft className="size-5" aria-hidden />
                ) : (
                  <ChevronRight className="size-5" aria-hidden />
                )}
              </button>
            </div>
          )}
        </div>
      ) : layout === 'polaroid' ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 px-1 py-4 @xl:grid-cols-3">
          {photos.map((name, index) => (
            <li
              key={name}
              style={{ ...glass(palette, 'strong'), rotate: `${tilt[index % tilt.length]}deg` }}
              className={cn(
                'relative rounded-3xl p-2 pb-7 transition-all duration-500 hover:z-10 hover:!rotate-0 hover:scale-105',
                index % 2 === 1 && '@xl:mt-6',
              )}
            >
              {photo(index, 'aspect-square')}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 gap-3 @xl:grid-cols-3">
          {photos.map((name, index) => (
            <li
              key={name}
              style={glass(palette)}
              className={cn(
                'rounded-3xl p-1.5',
                index === 0 && count % 2 === 1 && 'col-span-2 @xl:col-span-1',
              )}
            >
              {photo(index, 'aspect-[4/5]')}
            </li>
          ))}
        </ul>
      )}
      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] grid place-items-center bg-black/85 p-4"
          onClick={() => setOpen(null)}
        >
          <img
            src={mediaUrl(photos[open] ?? '')}
            alt=""
            className="max-h-full max-w-full rounded-3xl object-contain"
          />
          <button
            type="button"
            aria-label={closeLabel}
            className="absolute end-4 top-4 grid size-10 place-items-center rounded-full bg-white/15 text-2xl text-white"
            onClick={() => setOpen(null)}
          >
            ×
          </button>
          {count > 1 && (
            <>
              <button
                type="button"
                aria-label="‹"
                className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen((open - 1 + count) % count);
                }}
              >
                <ChevronLeft className="size-6" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="›"
                className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen((open + 1) % count);
                }}
              >
                <ChevronRight className="size-6" aria-hidden />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
