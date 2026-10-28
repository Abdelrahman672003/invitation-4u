import type { CSSProperties } from 'react';
import { Camera, MapPin } from 'lucide-react';
import type { InvitationContent, TemplateDesign } from '@invite/shared';
import type { DateParts } from './ThemePoster';
import { Flower, FlowerCorner } from './posterArt';

/**
 * Three more wedding posters, drawn entirely in SVG and CSS: a golden arch at night, a blush
 * floral wreath, and an ivory laurel. Sizes are container units like the other poster themes.
 */

export interface ExtraProps {
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

function splitNames(title: string): [string, string] | [string] {
  const parts = title.split(/\s+(?:&|and|و)\s+/i);
  return parts.length === 2 ? [parts[0] ?? '', parts[1] ?? ''] : [title];
}

function Names({
  title,
  className,
  size,
  amp,
  style,
}: {
  title: string;
  className: string;
  size: number;
  amp: string;
  style?: CSSProperties;
}) {
  const names = splitNames(title);
  return (
    <h3
      className={`text-balance ${className}`}
      style={{ fontSize: `${size}cqw`, lineHeight: 1.05, fontWeight: 400, ...style }}
    >
      {names[0]}
      {names[1] !== undefined && (
        <>
          <span
            className="mx-[2cqw] font-script align-middle"
            style={{ fontSize: `${size * 0.5}cqw`, color: amp }}
          >
            &amp;
          </span>
          {names[1]}
        </>
      )}
    </h3>
  );
}

function DateRow({
  parts,
  date,
  color,
  accent,
  dir,
  dayClass,
}: {
  parts: DateParts | null;
  date: string;
  color: string;
  accent: string;
  dir: 'rtl' | 'ltr';
  dayClass: string;
}) {
  if (!parts)
    return (
      <p className="font-caps" style={{ color, fontSize: '4.4cqw' }}>
        {date}
      </p>
    );
  const rule = <span style={{ width: '0.3cqw', height: '11cqw', background: accent }} />;
  return (
    <div className="flex items-center justify-center" style={{ gap: '3.5cqw', color }}>
      <span className="font-caps uppercase" style={{ fontSize: '3.5cqw', ...track(dir, '0.2em') }}>
        {parts.weekday}
      </span>
      {rule}
      <span className={dayClass} style={{ fontSize: '13cqw', lineHeight: 1 }}>
        {parts.day}
      </span>
      {rule}
      <span className="font-caps uppercase" style={{ fontSize: '3.5cqw', ...track(dir, '0.2em') }}>
        {parts.month} {parts.year}
      </span>
    </div>
  );
}

function Where({
  content,
  color,
  dir,
}: {
  content: InvitationContent;
  color: string;
  dir: 'rtl' | 'ltr';
}) {
  return (
    <div className="flex flex-col items-center gap-[1cqw]" style={{ color }}>
      {content.time && (
        <p className="font-caps uppercase" style={{ fontSize: '3.8cqw', ...track(dir, '0.18em') }}>
          {content.time}
        </p>
      )}
      {content.venue && (
        <p
          className="flex items-center gap-[1.4cqw] font-caps uppercase"
          style={{ fontSize: '3.6cqw', ...track(dir, '0.14em') }}
        >
          <MapPin style={{ width: '4.4cqw', height: '4.4cqw' }} aria-hidden />
          {content.venue}
        </p>
      )}
    </div>
  );
}

const GOLD = '#d8b36a';

/* ------------------------------------------------------------------- royal */

function Lantern({ x, drop }: { x: number; drop: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <line x1="0" y1="0" x2="0" y2={drop} stroke={GOLD} strokeWidth=".3" />
      <ellipse cx="0" cy={drop + 8} rx="9" ry="12" fill="#f6df9c" opacity=".16" />
      <path
        d={`M-2.6 ${drop} H2.6 L3.6 ${drop + 3} L2.8 ${drop + 13} L-2.8 ${drop + 13} L-3.6 ${drop + 3} Z`}
        fill="#f6df9c"
        fillOpacity=".85"
        stroke={GOLD}
        strokeWidth=".35"
      />
      <path
        d={`M-1.2 ${drop + 3} V${drop + 12} M1.2 ${drop + 3} V${drop + 12}`}
        stroke="#b88a2c"
        strokeWidth=".25"
      />
      <path d={`M-1.6 ${drop + 13} L0 ${drop + 16} L1.6 ${drop + 13}`} fill={GOLD} />
    </g>
  );
}

const spark = (x: number, y: number, s: number) =>
  `M${x} ${y - s} L${x + s * 0.22} ${y - s * 0.22} L${x + s} ${y} L${x + s * 0.22} ${y + s * 0.22} L${x} ${y + s} L${x - s * 0.22} ${y + s * 0.22} L${x - s} ${y} L${x - s * 0.22} ${y - s * 0.22} Z`;

export function Royal({ design, content, dir, parts, photo, hint }: ExtraProps) {
  const { palette } = design;
  const outer = 'M13 84 V46 C13 27 36 23 50 5 C64 23 87 27 87 46 V84 Z';
  const inner = 'M17.5 84 V47 C17.5 30 38 26 50 10 C62 26 82.500 30 82.500 47 V84 Z';
  return (
    <div
      className="absolute inset-0"
      style={{ background: 'linear-gradient(170deg, #0b1130, #1a2050 60%, #121744)' }}
    >
      <svg
        viewBox="0 0 100 140"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        aria-hidden
      >
        <defs>
          <pattern id="royal-tile" width="14" height="14" patternUnits="userSpaceOnUse">
            <path
              d="M7 0 L8.6 5.4 L14 7 L8.6 8.6 L7 14 L5.4 8.6 L0 7 L5.4 5.4 Z"
              fill="none"
              stroke={GOLD}
              strokeWidth=".22"
            />
          </pattern>
          <radialGradient id="royal-glow" cx="50%" cy="38%" r="55%">
            <stop offset="0" stopColor="#f6df9c" stopOpacity=".35" />
            <stop offset="1" stopColor="#f6df9c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="royal-photo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a4478" />
            <stop offset="1" stopColor="#171c4a" />
          </linearGradient>
          <linearGradient id="royal-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f6df9c" />
            <stop offset=".5" stopColor="#c79a34" />
            <stop offset="1" stopColor="#f0d68a" />
          </linearGradient>
          <clipPath id="royal-clip">
            <path d={inner} />
          </clipPath>
        </defs>
        <rect width="100" height="140" fill="url(#royal-tile)" opacity=".55" />
        <rect width="100" height="140" fill="url(#royal-glow)" />
        {photo ? (
          <image
            href={photo}
            x="12"
            y="8"
            width="76"
            height="78"
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#royal-clip)"
          />
        ) : (
          <rect
            x="12"
            y="8"
            width="76"
            height="78"
            fill="url(#royal-photo)"
            clipPath="url(#royal-clip)"
          />
        )}
        <path d={inner} fill="none" stroke="url(#royal-gold)" strokeWidth=".7" />
        <path d={outer} fill="none" stroke="url(#royal-gold)" strokeWidth=".35" />
        <path d="M9 86 H91" stroke="url(#royal-gold)" strokeWidth=".5" />
        <path d="M11 88.200 H89" stroke={GOLD} strokeWidth=".2" opacity=".7" />
        <path d={spark(50, 2.4, 2.4)} fill="#f6df9c" />
        <Lantern x={6} drop={0} />
        <Lantern x={94} drop={6} />
        <Lantern x={22} drop={0} />
        <Lantern x={78} drop={2} />
        {[
          [30, 98, 1.3],
          [72, 101, 1.6],
          [12, 118, 1.1],
          [90, 122, 1.4],
          [50, 134, 1.2],
        ].map(([x = 0, y = 0, s = 1], index) => (
          <path key={index} d={spark(x, y, s)} fill="#f6df9c" opacity=".8" />
        ))}
      </svg>
      {!photo && hint && (
        <Camera
          className="absolute start-1/2 top-[34%] w-[12%] -translate-x-1/2 opacity-40 rtl:translate-x-1/2"
          style={{ color: '#fff' }}
        />
      )}
      <div
        className="absolute inset-x-[8%] top-[65%] flex flex-col items-center text-center"
        style={{ color: palette.text }}
      >
        <p
          className="font-caps uppercase"
          style={{ fontSize: '3.2cqw', color: GOLD, ...track(dir, '0.3em') }}
        >
          {content.label}
        </p>
        <Names
          title={content.title}
          className="mt-[1.5cqw] bg-clip-text font-luxe font-semibold text-transparent"
          size={11.5}
          amp={GOLD}
          style={{
            backgroundImage: 'linear-gradient(180deg, #fbeab4, #d8b36a 60%, #b88a2c)',
            fontWeight: 600,
          }}
        />
        <div className="mt-[3.5cqw]">
          <DateRow
            parts={parts}
            date={content.date}
            color={palette.text}
            accent={GOLD}
            dir={dir}
            dayClass="font-luxe font-semibold"
          />
        </div>
        <div className="mt-[3cqw]">
          <Where content={content} color="#c9c3de" dir={dir} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- bloom */

function Wreath() {
  const items = Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
    return { angle, x: 50 + Math.cos(angle) * 45, y: 50 + Math.sin(angle) * 45, index };
  });
  const colors = [
    ['#f4a7b6', '#f9ccd5'],
    ['#f7c4a8', '#fbdcc8'],
    ['#e98fa4', '#f6bccb'],
  ] as const;
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
      <circle cx="50" cy="50" r="45" fill="none" stroke="#9cb591" strokeWidth=".5" />
      {items.map(({ angle, x, y, index }) => {
        const deg = (angle * 180) / Math.PI;
        const [petal, soft] = colors[index % 3] ?? colors[0];
        return (
          <g key={index}>
            <ellipse
              cx={50 + Math.cos(angle + 0.26) * 45}
              cy={50 + Math.sin(angle + 0.26) * 45}
              rx="6.200"
              ry="2.400"
              fill={index % 2 ? '#8fae86' : '#a9c29e'}
              transform={`rotate(${deg + 90 + 28} ${50 + Math.cos(angle + 0.26) * 45} ${50 + Math.sin(angle + 0.26) * 45})`}
            />
            <ellipse
              cx={50 + Math.cos(angle - 0.26) * 45}
              cy={50 + Math.sin(angle - 0.26) * 45}
              rx="5.600"
              ry="2.200"
              fill="#a9c29e"
              transform={`rotate(${deg + 90 - 28} ${50 + Math.cos(angle - 0.26) * 45} ${50 + Math.sin(angle - 0.26) * 45})`}
            />
            <Flower
              x={x}
              y={y}
              r={index % 3 === 0 ? 8.5 : 6.5}
              petals={index % 2 ? 7 : 9}
              petal={petal}
              center="#b86a5a"
            />
            <circle cx={x} cy={y} r="3" fill={soft} opacity=".5" />
          </g>
        );
      })}
    </svg>
  );
}

export function Bloom({ design, content, dir, parts, photo, hint }: ExtraProps) {
  const { palette } = design;
  const petal = { petal: '#f4a7b6', petalSoft: '#f9ccd5', center: '#b86a5a', leaf: '#8fae86' };
  const blob = (color: string, size: number, style: CSSProperties) => (
    <div
      aria-hidden
      className="absolute rounded-full blur-[7cqw]"
      style={{ background: color, width: `${size}cqw`, height: `${size}cqw`, ...style }}
    />
  );
  return (
    <div
      className="absolute inset-0"
      style={{ background: 'linear-gradient(180deg, #fdf3ef, #f8e3dc)' }}
    >
      {blob('#f7c4a8', 52, { top: '-8%', insetInlineStart: '-14%', opacity: 0.7 })}
      {blob('#f4a7b6', 46, { top: '30%', insetInlineEnd: '-16%', opacity: 0.5 })}
      {blob('#cfdcc8', 50, { bottom: '-10%', insetInlineStart: '-10%', opacity: 0.8 })}
      <FlowerCorner {...petal} className="absolute start-0 top-0 w-[26%] rtl:-scale-x-100" />
      <FlowerCorner
        {...petal}
        className="absolute end-0 top-0 w-[26%] -scale-x-100 rtl:scale-x-100"
      />
      <FlowerCorner
        {...petal}
        className="absolute bottom-0 end-0 w-[30%] -scale-100 rtl:scale-x-100"
      />
      <div className="absolute start-1/2 top-[7%] aspect-square w-[66%] -translate-x-1/2 rtl:translate-x-1/2">
        <div
          className="absolute inset-[15%] overflow-hidden rounded-full"
          style={{
            boxShadow: '0 0 0 1.2cqw #fffaf7, 0 3cqw 7cqw -2cqw rgba(138,74,82,.45)',
          }}
        >
          {photo ? (
            <img src={photo} alt="" className="size-full object-cover" />
          ) : (
            <div
              className="flex size-full items-center justify-center"
              style={{ background: 'linear-gradient(160deg, #f6d3c8, #e5a9b4)' }}
            >
              {hint && <Camera className="w-[22%] opacity-50" style={{ color: '#fff' }} />}
            </div>
          )}
        </div>
        <Wreath />
      </div>
      <div
        className="absolute inset-x-[8%] top-[60%] flex flex-col items-center text-center"
        style={{ color: palette.text }}
      >
        <p
          className="font-caps uppercase"
          style={{ fontSize: '3.2cqw', color: palette.accent, ...track(dir, '0.3em') }}
        >
          {content.label}
        </p>
        <Names
          title={content.title}
          className="mt-[1cqw] font-script"
          size={15}
          amp={palette.accent}
        />
        <div className="mt-[3cqw]">
          <DateRow
            parts={parts}
            date={content.date}
            color={palette.text}
            accent={palette.accent}
            dir={dir}
            dayClass="font-luxe font-semibold"
          />
        </div>
        <div className="mt-[3cqw]">
          <Where content={content} color={palette.muted} dir={dir} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ laurel */

function laurelPoints(side: 1 | -1) {
  const rx = 28;
  const ry = 35;
  return Array.from({ length: 15 }, (_, index) => {
    const t = index / 14;
    const base = 105 + t * 150;
    const a = ((side === 1 ? base : 180 - base) * Math.PI) / 180;
    const x = 50 + Math.cos(a) * rx;
    const y = 53 + Math.sin(a) * ry;
    const tangent = (Math.atan2(ry * Math.cos(a), -rx * Math.sin(a)) * 180) / Math.PI;
    return { x, y, tangent: side === 1 ? tangent : tangent + 180, index };
  });
}

export function Laurel({ design, content, dir, parts, photo, hint }: ExtraProps) {
  const { palette } = design;
  const sides = [laurelPoints(1), laurelPoints(-1)];
  return (
    <div
      className="absolute inset-0"
      style={{ background: 'linear-gradient(160deg, #fbf9f4, #efe9dc)' }}
    >
      <svg
        viewBox="0 0 100 140"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="laurel-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e6c777" />
            <stop offset=".5" stopColor="#b08d3c" />
            <stop offset="1" stopColor="#d9b867" />
          </linearGradient>
          <linearGradient id="laurel-photo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ece4d2" />
            <stop offset="1" stopColor="#cdbf9f" />
          </linearGradient>
          <clipPath id="laurel-oval">
            <ellipse cx="50" cy="53" rx="22" ry="29" />
          </clipPath>
        </defs>
        <g fill="none" stroke="#c9c0ae" strokeWidth=".25" opacity=".55">
          <path d="M-5 30 C20 22 30 50 55 40 S90 20 108 36" />
          <path d="M-5 78 C25 70 40 100 70 88 S98 74 108 84" />
          <path d="M20 -4 C26 30 10 60 22 100 S30 130 28 146" />
          <path d="M78 -4 C70 24 90 60 76 96 S84 128 80 146" />
        </g>
        <rect
          x="4"
          y="4"
          width="92"
          height="132"
          fill="none"
          stroke="url(#laurel-gold)"
          strokeWidth=".5"
        />
        <rect
          x="6"
          y="6"
          width="88"
          height="128"
          fill="none"
          stroke="url(#laurel-gold)"
          strokeWidth=".18"
        />
        {[
          [4, 4],
          [96, 4],
          [4, 136],
          [96, 136],
        ].map(([x = 0, y = 0], index) => (
          <circle key={index} cx={x} cy={y} r="1.3" fill="url(#laurel-gold)" />
        ))}
        {photo ? (
          <image
            href={photo}
            x="26"
            y="22"
            width="48"
            height="62"
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#laurel-oval)"
          />
        ) : (
          <rect
            x="26"
            y="22"
            width="48"
            height="62"
            fill="url(#laurel-photo)"
            clipPath="url(#laurel-oval)"
          />
        )}
        <ellipse
          cx="50"
          cy="53"
          rx="22"
          ry="29"
          fill="none"
          stroke="url(#laurel-gold)"
          strokeWidth=".6"
        />
        {sides.map((points, side) => (
          <g key={side}>
            <path
              d={points
                .map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
                .join(' ')}
              fill="none"
              stroke="url(#laurel-gold)"
              strokeWidth=".45"
            />
            {points.map((p) => {
              const sign = p.index % 2 ? 1 : -1;
              const lean = p.tangent + sign * 32;
              const rad = (lean * Math.PI) / 180;
              const cx = p.x + Math.cos(rad) * 3.4;
              const cy = p.y + Math.sin(rad) * 3.4;
              return (
                <ellipse
                  key={p.index}
                  cx={cx}
                  cy={cy}
                  rx="4.6"
                  ry="1.5"
                  fill="url(#laurel-gold)"
                  transform={`rotate(${lean} ${cx} ${cy})`}
                />
              );
            })}
          </g>
        ))}
      </svg>
      {!photo && hint && (
        <Camera
          className="absolute start-1/2 top-[38%] w-[10%] -translate-x-1/2 opacity-40 rtl:translate-x-1/2"
          style={{ color: '#fff' }}
        />
      )}
      <div
        className="absolute inset-x-[10%] top-[66%] flex flex-col items-center text-center"
        style={{ color: palette.text }}
      >
        <p
          className="font-caps uppercase"
          style={{ fontSize: '3cqw', color: palette.accent, ...track(dir, '0.32em') }}
        >
          {content.label}
        </p>
        <Names
          title={content.title}
          className="mt-[1.5cqw] font-luxe font-semibold uppercase"
          size={9.5}
          amp={palette.accent}
          style={{ ...track(dir, '0.08em'), fontWeight: 600 }}
        />
        <div className="mt-[3cqw]">
          <DateRow
            parts={parts}
            date={content.date}
            color={palette.text}
            accent={palette.accent}
            dir={dir}
            dayClass="font-luxe font-semibold"
          />
        </div>
        <div className="mt-[2.4cqw]">
          <Where content={content} color={palette.muted} dir={dir} />
        </div>
      </div>
    </div>
  );
}
