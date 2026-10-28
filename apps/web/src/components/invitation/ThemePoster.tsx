import type { CSSProperties } from 'react';
import { MapPin } from 'lucide-react';
import type { InvitationContent, TemplateDesign } from '@invite/shared';
import { cn } from '@/lib/cn';
import { CustomPoster } from './CustomPoster';
import { OrnamentGraphic } from './ornaments';
import { Bloom, Laurel, Royal } from './ThemePosterExtra';
import {
  FlowerCorner,
  NightSky,
  PhotoSlot,
  Skyline,
  SprigCorner,
  TornEdge,
  paperGrain,
} from './posterArt';

type Theme = Exclude<NonNullable<TemplateDesign['theme']>, 'classic'>;

export const POSTER_THEMES: readonly string[] = [
  'cinema',
  'editorial',
  'nightsky',
  'paper',
  'arch',
  'royal',
  'bloom',
  'laurel',
  'custom',
];

export function isPosterTheme(theme: TemplateDesign['theme']): theme is Theme {
  return theme !== undefined && POSTER_THEMES.includes(theme);
}

const FIXED_BACKDROP: Record<Exclude<Theme, 'custom'>, string> = {
  cinema: 'radial-gradient(circle at 50% 0%, #34423a, #111713)',
  editorial: 'radial-gradient(circle at 50% 0%, #f4f4f0, #dcdcd6)',
  nightsky: 'radial-gradient(circle at 50% 0%, #1b1740, #05071c)',
  paper: 'radial-gradient(circle at 50% 0%, #e2d8c6, #b9ab92)',
  arch: 'radial-gradient(circle at 50% 0%, #f7f2e6, #e4d9c3)',
  royal: 'radial-gradient(circle at 50% 0%, #1a2050, #05071a)',
  bloom: 'radial-gradient(circle at 50% 0%, #f9e4de, #e8c4bd)',
  laurel: 'radial-gradient(circle at 50% 0%, #f1ece0, #d9d1bf)',
};

/** Page colour behind the poster on the public page, so the poster reads as an object on a surface. */
export function posterBackdrop(design: TemplateDesign): string {
  const theme = design.theme;
  if (theme === 'custom') {
    const color = design.custom?.background.color ?? '#eeeeee';
    return `radial-gradient(circle at 50% 0%, ${color}, #1b1b1b 220%)`;
  }
  return FIXED_BACKDROP[(theme as Exclude<Theme, 'custom'>) ?? 'cinema'];
}

interface Props {
  design: TemplateDesign;
  content: InvitationContent;
  dir: 'rtl' | 'ltr';
  /** ISO date (YYYY-MM-DD); lets themes lay the date out as weekday / day / year. */
  eventDate?: string | null;
  /** URL of the customer's photo. */
  photo?: string | null;
  /** Show a camera hint in the empty photo area (previews only). */
  hint?: boolean;
  className?: string;
}

export interface DateParts {
  weekday: string;
  month: string;
  day: string;
  year: string;
  numeric: string;
}

export function dateParts(
  eventDate: string | null | undefined,
  dir: 'rtl' | 'ltr',
): DateParts | null {
  if (!eventDate) return null;
  const [year, month, day] = eventDate.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(dir === 'rtl' ? 'ar-EG-u-nu-latn' : 'en-GB', {
      timeZone: 'UTC',
      ...options,
    }).format(date);
  const two = (value: number) => String(value).padStart(2, '0');
  return {
    weekday: format({ weekday: 'long' }),
    month: format({ month: 'long' }),
    day: two(day),
    year: String(year),
    numeric: `${two(day)}.${two(month)}.${String(year).slice(2)}`,
  };
}

/** "Sara & Omar" becomes ["Sara", "Omar"]; anything else stays whole. */
function splitNames(title: string): [string, string] | [string] {
  const parts = title.split(/\s+(?:&|and|و)\s+/i);
  return parts.length === 2 ? [parts[0] ?? '', parts[1] ?? ''] : [title];
}

/**
 * A full-artwork invitation poster. Sizes are container units, so the same markup is a thumbnail
 * in the gallery and the hero of the public page. It is plain text over fixed illustrated scenes.
 */
export function ThemePoster({ design, content, dir, eventDate, photo, hint, className }: Props) {
  const theme = design.theme;
  if (!isPosterTheme(theme)) return null;
  const parts = dateParts(eventDate, dir);
  const shared = { design, content, dir, parts, photo, hint };
  return (
    <div
      className={cn('relative size-full overflow-hidden', className)}
      dir={dir}
      style={{ containerType: 'inline-size' }}
    >
      {theme === 'cinema' && <Cinema {...shared} />}
      {theme === 'editorial' && <Editorial {...shared} />}
      {theme === 'nightsky' && <NightSkyPoster {...shared} />}
      {theme === 'paper' && <Paper {...shared} />}
      {theme === 'arch' && <Arch {...shared} />}
      {theme === 'royal' && <Royal {...shared} />}
      {theme === 'bloom' && <Bloom {...shared} />}
      {theme === 'laurel' && <Laurel {...shared} />}
      {theme === 'custom' && design.custom && (
        <CustomPoster
          custom={design.custom}
          content={content}
          dir={dir}
          names={splitNames(content.title)}
          parts={parts ?? (hint ? dateParts('2026-12-10', dir) : null)}
          photo={photo}
          hint={hint}
        />
      )}
    </div>
  );
}

interface ThemeProps {
  design: TemplateDesign;
  content: InvitationContent;
  dir: 'rtl' | 'ltr';
  parts: DateParts | null;
  photo?: string | null;
  hint?: boolean;
}

const track = (dir: 'rtl' | 'ltr', amount: string): CSSProperties => ({
  letterSpacing: dir === 'ltr' ? amount : undefined,
});
const fillLayer = 'absolute inset-0';

function Meta({
  content,
  color,
  dir,
  size = 3.1,
  withTime = true,
}: {
  content: InvitationContent;
  color: string;
  dir: 'rtl' | 'ltr';
  size?: number;
  withTime?: boolean;
}) {
  const line = [withTime ? content.time : '', content.venue].filter(Boolean).join('  ·  ');
  return (
    <>
      {line && (
        <p
          className="font-caps uppercase"
          style={{ color, fontSize: `${size}cqw`, ...track(dir, '0.18em') }}
        >
          {line}
        </p>
      )}
      {content.address && (
        <p
          className="font-caps uppercase opacity-80"
          style={{ color, fontSize: `${size * 0.9}cqw`, ...track(dir, '0.18em') }}
        >
          {content.address}
        </p>
      )}
    </>
  );
}

/** Weekday and time flanking a large day number, each side ruled above and below. */
function RuledDateRow({
  parts,
  content,
  color,
  line,
  dayClass,
}: {
  parts: DateParts;
  content: InvitationContent;
  color: string;
  line: string;
  dayClass: string;
}) {
  const cell: CSSProperties = {
    borderBlock: `0.35cqw solid ${line}`,
    padding: '2.2cqw 0',
    color,
    fontSize: '3.6cqw',
  };
  return (
    <div
      className="grid w-full items-center"
      style={{ gridTemplateColumns: '1fr auto 1fr', gap: '3cqw' }}
    >
      <span className="text-center font-caps uppercase tracking-[0.25em]" style={cell}>
        {parts.weekday}
      </span>
      <span className={dayClass} style={{ color, fontSize: '17cqw', lineHeight: 1 }}>
        {parts.day}
      </span>
      <span className="text-center font-caps uppercase tracking-[0.2em]" style={cell}>
        {content.time || '—'}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ cinema */

function Cinema({ design, content, dir, parts, photo, hint }: ThemeProps) {
  const { palette } = design;
  return (
    <>
      <div className={fillLayer}>
        <PhotoSlot photo={photo} hint={hint} from="#9fb09c" to="#4d5b47" />
      </div>
      <div
        className={fillLayer}
        style={{ background: 'linear-gradient(to top, rgba(10,14,10,.88), rgba(10,14,10,0) 46%)' }}
      />
      <p
        className="absolute inset-x-0 top-[6%] text-center font-caps uppercase"
        style={{ color: palette.text, fontSize: '3.2cqw', ...track(dir, '0.4em') }}
      >
        {content.label}
      </p>
      <div className="absolute inset-x-[5%] top-[31%] text-center text-white">
        <h3
          className="font-script text-balance"
          style={{
            fontSize: '19cqw',
            lineHeight: 1.05,
            textShadow: '0 0.6cqw 2cqw rgba(0,0,0,.35)',
            fontWeight: 400,
          }}
        >
          {content.title}
        </h3>
        <p
          className="mt-[2cqw] font-caps font-light uppercase opacity-90"
          style={{ fontSize: '3cqw', ...track(dir, '0.3em') }}
        >
          {content.occasion}
        </p>
      </div>
      <div className="absolute inset-x-[6%] bottom-[6%] flex flex-col items-center gap-[1.2cqw] text-center text-white">
        <p className="font-caps font-light" style={{ fontSize: '4.4cqw', ...track(dir, '0.4em') }}>
          {parts ? parts.numeric : content.date}
        </p>
        <Meta content={content} color="rgba(255,255,255,.85)" dir={dir} size={2.8} />
      </div>
    </>
  );
}

/* --------------------------------------------------------------- editorial */

function Editorial({ design, content, dir, parts, photo, hint }: ThemeProps) {
  const { palette } = design;
  const names = splitNames(content.title);
  const big: CSSProperties = {
    fontSize: '17cqw',
    lineHeight: 0.92,
    color: palette.text,
    fontWeight: 300,
  };
  return (
    <div className={fillLayer} style={{ background: palette.background }}>
      <div
        className="absolute inset-[3cqw]"
        style={{ border: `0.3cqw solid ${palette.muted}88` }}
      />
      <div className="absolute inset-x-0 top-[31%] h-[38%]" style={{ filter: 'grayscale(1)' }}>
        <PhotoSlot photo={photo} hint={hint} from="#dcdcd8" to="#a9a9a4" />
      </div>
      <div className="absolute inset-x-[9%] top-[11%]" style={{ color: palette.text }}>
        <p className="font-luxe uppercase" style={big}>
          {names[0]}
        </p>
        {names[1] !== undefined && (
          <>
            <p
              className="font-script"
              style={{
                fontSize: '9cqw',
                lineHeight: 1,
                marginBlock: '-1cqw -2cqw',
                marginInlineStart: '-3cqw',
              }}
            >
              &amp;
            </p>
            <p className="font-luxe uppercase" style={{ ...big, marginInlineStart: '9cqw' }}>
              {names[1]}
            </p>
          </>
        )}
      </div>
      <div
        className="absolute inset-x-[8%] bottom-[7%] flex flex-col items-center gap-[1.4cqw] text-center"
        style={{ color: palette.text }}
      >
        <p
          className="font-caps font-light uppercase"
          style={{ fontSize: '3.3cqw', ...track(dir, '0.2em') }}
        >
          {content.label}
        </p>
        <p
          className="font-luxe font-light"
          style={{ fontSize: parts ? '13cqw' : '6cqw', lineHeight: 1 }}
        >
          {parts ? parts.numeric : content.date}
        </p>
        <Meta content={content} color={palette.text} dir={dir} size={3.2} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- night sky */

function NightSkyPoster({ design, content, dir, parts, photo }: ThemeProps) {
  const { palette } = design;
  const names = splitNames(content.title);
  return (
    <>
      <div className={fillLayer}>
        <NightSky />
      </div>
      {photo && (
        <>
          <img src={photo} alt="" className="absolute inset-0 size-full object-cover opacity-45" />
          <div
            className={fillLayer}
            style={{
              background: 'linear-gradient(to bottom, rgba(7,11,43,.75), rgba(46,34,80,.55))',
            }}
          />
        </>
      )}
      <div className={cn('absolute inset-x-0 bottom-0 h-[24%]', photo && 'opacity-80')}>
        <Skyline />
      </div>
      <div
        className="absolute inset-x-[9%] top-[4%] bottom-[19%] rounded-[5cqw]"
        style={{
          background: 'linear-gradient(to bottom, rgba(255,255,255,.04), rgba(255,255,255,.16))',
        }}
      />
      <FlowerCorner
        petal="#f7b6c8"
        petalSoft="#fbd3de"
        center="#9a6a4a"
        leaf="#6fa58a"
        className="absolute start-[2%] top-[2%] w-[40%] rtl:-scale-x-100"
      />
      <FlowerCorner
        petal="#f7b6c8"
        petalSoft="#fbd3de"
        center="#9a6a4a"
        leaf="#6fa58a"
        className="absolute bottom-[19%] end-[2%] w-[32%] -scale-100 rtl:scale-x-100"
      />
      <div
        className="absolute inset-x-[14%] top-[5%] flex flex-col items-center text-center"
        style={{ color: palette.accent }}
      >
        <div className="w-[16cqw]" style={{ color: '#fff4dc' }}>
          <OrnamentGraphic kind="rings" className="h-auto w-full" />
        </div>
        <p
          className="mt-[2cqw] font-caps font-light uppercase"
          style={{ fontSize: '3.6cqw', ...track(dir, '0.22em') }}
        >
          {content.label}
        </p>
        <h3
          className="mt-[1.5cqw] font-script"
          style={{ fontSize: '17cqw', lineHeight: 0.95, fontWeight: 400 }}
        >
          {names[0]}
          {names[1] !== undefined && (
            <>
              <span className="ms-[2cqw] align-top" style={{ fontSize: '6cqw' }}>
                &amp;
              </span>
              <br />
              {names[1]}
            </>
          )}
        </h3>
        {parts ? (
          <div className="mt-[4cqw] flex items-center justify-center" style={{ gap: '4cqw' }}>
            <span
              className="font-caps font-light uppercase"
              style={{ fontSize: '5cqw', ...track(dir, '0.1em') }}
            >
              {parts.weekday.slice(0, dir === 'ltr' ? 3 : undefined)}
            </span>
            <span style={{ width: '0.35cqw', height: '15cqw', background: palette.accent }} />
            <span className="font-caps font-light" style={{ fontSize: '14cqw', lineHeight: 1 }}>
              {parts.day}
            </span>
            <span style={{ width: '0.35cqw', height: '15cqw', background: palette.accent }} />
            <span className="font-caps font-light" style={{ fontSize: '5cqw' }}>
              {parts.year}
            </span>
          </div>
        ) : (
          <p className="mt-[4cqw] font-caps" style={{ fontSize: '4.4cqw' }}>
            {content.date}
          </p>
        )}
        {content.time && (
          <p
            className="mt-[2.5cqw] font-caps font-light uppercase"
            style={{ fontSize: '4.4cqw', ...track(dir, '0.15em') }}
          >
            {content.time}
          </p>
        )}
        {content.venue && (
          <p
            className="mt-[3cqw] flex items-center gap-[1.5cqw] font-caps font-light uppercase"
            style={{ fontSize: '4cqw', ...track(dir, '0.12em') }}
          >
            <MapPin style={{ width: '5cqw', height: '5cqw' }} aria-hidden />
            {content.venue}
          </p>
        )}
        <p
          className="mt-[3.5cqw] font-caps font-light uppercase"
          style={{ fontSize: '3.3cqw', ...track(dir, '0.18em') }}
        >
          {content.occasion}
        </p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------- paper */

function Paper({ design, content, dir, parts, photo, hint }: ThemeProps) {
  const { palette } = design;
  const paper = palette.background;
  return (
    <div className={fillLayer} style={{ background: paper }}>
      <div className="absolute inset-0" style={{ backgroundImage: paperGrain, opacity: 0.7 }} />
      <div className="absolute inset-x-0 top-0 h-[50%]">
        <PhotoSlot photo={photo} hint={hint} from="#8ea6ae" to="#c6d6d4" />
        <TornEdge color={paper} className="absolute inset-x-0 -bottom-px h-[5.5cqw] w-full" />
      </div>
      <SprigCorner
        leaf="#5d7a5b"
        leafSoft="#9db79b"
        className="absolute start-0 top-0 w-[16%] rtl:-scale-x-100"
      />
      <SprigCorner
        leaf="#5d7a5b"
        leafSoft="#9db79b"
        className="absolute end-0 top-0 w-[16%] -scale-x-100 rtl:scale-x-100"
      />
      <SprigCorner
        leaf="#6f8a6d"
        leafSoft="#b4c8b0"
        className="absolute bottom-0 start-0 w-[17%] -scale-y-100 rtl:-scale-100"
      />
      <SprigCorner
        leaf="#6f8a6d"
        leafSoft="#b4c8b0"
        className="absolute bottom-0 end-0 w-[17%] -scale-100 rtl:scale-x-100"
      />
      <div
        className="absolute inset-x-[7%] top-[52%] flex flex-col items-center text-center"
        style={{ color: palette.text }}
      >
        <h3
          className="font-script text-balance"
          style={{ fontSize: '14cqw', lineHeight: 1.1, fontWeight: 400 }}
        >
          {content.title}
        </h3>
        {parts ? (
          <>
            <p
              className="mt-[2.5cqw] font-caps uppercase"
              style={{ fontSize: '4.6cqw', ...track(dir, '0.5em') }}
            >
              {parts.month}
            </p>
            <div className="my-[1.5cqw] w-full">
              <RuledDateRow
                parts={parts}
                content={content}
                color={palette.text}
                line={palette.text}
                dayClass="font-luxe italic"
              />
            </div>
            <p
              className="font-caps uppercase"
              style={{ fontSize: '4.6cqw', ...track(dir, '0.5em') }}
            >
              {parts.year}
            </p>
          </>
        ) : (
          <p
            className="mt-[3cqw] font-caps uppercase"
            style={{ fontSize: '4cqw', ...track(dir, '0.2em') }}
          >
            {content.date}
          </p>
        )}
        <div className="mt-[3.5cqw] flex flex-col gap-[1cqw]">
          <Meta content={content} withTime={false} color={palette.text} dir={dir} size={3.6} />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- arch */

function Arch({ design, content, dir, parts, photo, hint }: ThemeProps) {
  const { palette } = design;
  const radius = '999px 999px 0 0';
  const petal = { petal: '#f8dca8', petalSoft: '#f4c08c', center: '#a06a3c', leaf: '#e07a3f' };
  return (
    <div className={fillLayer} style={{ background: palette.background }}>
      <div
        className="absolute rounded-full opacity-60 blur-[3cqw]"
        style={{
          background: '#f6b98a',
          width: '26cqw',
          height: '26cqw',
          top: '10%',
          insetInlineEnd: '4%',
        }}
      />
      <div
        className="absolute inset-x-[6%] top-[6%] bottom-[30%]"
        style={{
          border: `0.5cqw solid ${palette.accent}`,
          borderBottom: 'none',
          borderRadius: radius,
        }}
      />
      <div
        className="absolute inset-x-[9%] top-[9%] bottom-[30%] overflow-hidden"
        style={{ borderRadius: radius }}
      >
        <PhotoSlot photo={photo} hint={hint} from="#bfa58c" to="#e2cfba" />
        <div
          className="absolute inset-x-0 bottom-0 h-[42%]"
          style={{
            background: `linear-gradient(to top, ${palette.background}, ${palette.background}00)`,
          }}
        />
      </div>
      <FlowerCorner {...petal} className="absolute start-0 top-0 w-[24%] rtl:-scale-x-100" />
      <FlowerCorner
        {...petal}
        className="absolute end-0 top-0 w-[24%] -scale-x-100 rtl:scale-x-100"
      />
      <FlowerCorner
        {...petal}
        className="absolute bottom-0 start-0 w-[24%] -scale-y-100 rtl:-scale-100"
      />
      <FlowerCorner
        {...petal}
        className="absolute bottom-0 end-0 w-[24%] -scale-100 rtl:scale-x-100"
      />
      <p
        className="absolute font-script"
        style={{
          top: '12%',
          insetInlineStart: '12%',
          fontSize: '6cqw',
          color: palette.text,
          transform: `rotate(${dir === 'ltr' ? -32 : 32}deg)`,
          transformOrigin: 'left top',
        }}
      >
        {content.label}
      </p>
      <div
        className="absolute inset-x-[5%] top-[58%] flex flex-col items-center text-center"
        style={{ color: palette.text }}
      >
        <h3
          className="font-script text-balance"
          style={{
            fontSize: '14cqw',
            lineHeight: 1.05,
            fontWeight: 400,
            textShadow: `0 0 3cqw ${palette.background}`,
          }}
        >
          {content.title}
        </h3>
        {parts ? (
          <>
            <p
              className="mt-[1.5cqw] font-caps uppercase"
              style={{ fontSize: '4.4cqw', ...track(dir, '0.5em') }}
            >
              {parts.month}
            </p>
            <div className="my-[1.5cqw] w-full px-[1cqw]">
              <RuledDateRow
                parts={parts}
                content={content}
                color={palette.text}
                line={palette.text}
                dayClass="font-caps font-semibold"
              />
            </div>
            <p
              className="font-caps uppercase"
              style={{ fontSize: '4.4cqw', ...track(dir, '0.5em') }}
            >
              {parts.year}
            </p>
          </>
        ) : (
          <p
            className="mt-[3cqw] font-caps uppercase"
            style={{ fontSize: '4cqw', ...track(dir, '0.2em') }}
          >
            {content.date}
          </p>
        )}
        <div className="mt-[3cqw] flex flex-col gap-[0.8cqw]">
          <Meta content={content} withTime={false} color={palette.text} dir={dir} size={3.4} />
        </div>
      </div>
    </div>
  );
}
