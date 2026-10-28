import { Camera } from 'lucide-react';

/**
 * Illustrated artwork for the poster themes. Everything is plain SVG drawn from fixed colours,
 * so a template looks the same everywhere it is shown; no photos are bundled or fetched.
 */

const fill = { width: '100%', height: '100%' } as const;

export function Flower({
  x,
  y,
  r,
  petals = 8,
  petal,
  center,
}: {
  x: number;
  y: number;
  r: number;
  petals?: number;
  petal: string;
  center: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: petals }, (_, index) => (
        <ellipse
          key={index}
          cx={0}
          cy={-r * 0.55}
          rx={r * 0.27}
          ry={r * 0.55}
          fill={petal}
          transform={`rotate(${(index * 360) / petals})`}
        />
      ))}
      <circle r={r * 0.22} fill={center} />
    </g>
  );
}

function Leaf({
  x,
  y,
  rotate,
  size,
  color,
}: {
  x: number;
  y: number;
  rotate: number;
  size: number;
  color: string;
}) {
  return (
    <ellipse
      cx={x}
      cy={y}
      rx={size}
      ry={size * 0.45}
      fill={color}
      transform={`rotate(${rotate} ${x} ${y})`}
    />
  );
}

/** A cluster of blossoms and leaves drawn for the top-start corner; mirror it for the others. */
export function FlowerCorner({
  petal,
  petalSoft,
  center,
  leaf,
  className,
}: {
  petal: string;
  petalSoft: string;
  center: string;
  leaf: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path d="M2 96C12 60 30 26 62 4" stroke={leaf} strokeWidth="1.4" fill="none" />
      {[
        [20, 62, 30, 6],
        [38, 40, -20, 6],
        [56, 22, -40, 5],
        [12, 80, 50, 5],
        [46, 10, 20, 5],
      ].map(([x, y, rotate, size], index) => (
        <Leaf
          key={index}
          x={x ?? 0}
          y={y ?? 0}
          rotate={rotate ?? 0}
          size={size ?? 5}
          color={leaf}
        />
      ))}
      <Flower x={28} y={28} r={25} petals={10} petal={petal} center={center} />
      <Flower x={62} y={14} r={14} petal={petalSoft} center={center} />
      <Flower x={14} y={62} r={14} petal={petalSoft} center={center} />
      <Flower x={46} y={52} r={12} petals={7} petal={petal} center={center} />
      <Flower x={80} y={6} r={7} petal={petalSoft} center={center} />
      <Flower x={6} y={86} r={7} petal={petalSoft} center={center} />
    </svg>
  );
}

/** A eucalyptus-style sprig with round leaves, drawn for the bottom-start corner. */
export function SprigCorner({
  leaf,
  leafSoft,
  className,
}: {
  leaf: string;
  leafSoft: string;
  className?: string;
}) {
  const leaves: Array<[number, number, number, number, boolean]> = [
    [24, 80, -40, 9, true],
    [34, 66, 40, 8, false],
    [28, 50, -30, 8, true],
    [40, 36, 35, 7, false],
    [38, 22, -25, 7, true],
    [48, 10, 30, 6, false],
    [14, 90, 20, 8, false],
    [46, 88, -20, 7, true],
  ];
  return (
    <svg viewBox="0 0 70 100" className={className} aria-hidden>
      <path d="M18 100C20 72 28 40 50 4" stroke={leaf} strokeWidth="1.2" fill="none" />
      {leaves.map(([x, y, rotate, size, soft], index) => (
        <Leaf key={index} x={x} y={y} rotate={rotate} size={size} color={soft ? leafSoft : leaf} />
      ))}
    </svg>
  );
}

/** Dusk sky, moon and stars. */
export function NightSky() {
  const stars = Array.from({ length: 46 }, (_, index) => ({
    x: (index * 37 + 11) % 100,
    y: (index * 53 + 7) % 78,
    r: 0.18 + ((index * 7) % 5) * 0.07,
  }));
  return (
    <svg viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice" style={fill} aria-hidden>
      <defs>
        <linearGradient id="ns-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#070b2b" />
          <stop offset=".55" stopColor="#2a2250" />
          <stop offset="1" stopColor="#5e4768" />
        </linearGradient>
      </defs>
      <rect width="100" height="140" fill="url(#ns-sky)" />
      {stars.map((star, index) => (
        <circle key={index} cx={star.x} cy={star.y} r={star.r} fill="#fff" opacity=".7" />
      ))}
      <circle cx="-1" cy="52" r="7" fill="#efe3a8" />
      <circle cx="1.5" cy="50" r="2.2" fill="#d8c47c" opacity=".55" />
    </svg>
  );
}

/** City skyline with lit windows. */
export function Skyline() {
  const blocks = [
    [0, 14, 16, 36],
    [14, 6, 14, 44],
    [28, 18, 14, 32],
    [58, 16, 14, 34],
    [72, 4, 12, 46],
    [84, 12, 16, 38],
  ];
  return (
    <svg viewBox="0 0 100 50" preserveAspectRatio="xMidYMax slice" style={fill} aria-hidden>
      {blocks.map(([x = 0, y = 0, w = 0, h = 0], index) => (
        <g key={index}>
          <rect x={x} y={y} width={w} height={h + 20} fill="#2c1f26" />
          {Array.from({ length: Math.floor(h / 5) }, (_, row) =>
            Array.from({ length: Math.floor(w / 4.5) }, (_, column) =>
              (row * 3 + column + index) % 3 === 0 ? (
                <rect
                  key={`${row}-${column}`}
                  x={x + 1.4 + column * 4.4}
                  y={y + 2 + row * 5}
                  width="1.6"
                  height="2.6"
                  fill="#f0a9a0"
                  opacity=".85"
                />
              ) : null,
            ),
          )}
        </g>
      ))}
    </svg>
  );
}

/** Irregular bottom edge, as if the photo were torn from a sheet. */
export function TornEdge({ color, className }: { color: string; className?: string }) {
  const points = Array.from({ length: 81 }, (_, index) => {
    const x = index * 1.25;
    const y = 6 + 2.4 * Math.sin(x * 0.45) + 1.6 * Math.sin(x * 1.3 + 1) + 0.9 * Math.sin(x * 3.1);
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  });
  return (
    <svg viewBox="0 0 100 14" preserveAspectRatio="none" className={className} aria-hidden>
      <path d={`M0 14V${points[0]?.split(' ')[1]} L${points.join(' L')} V14Z`} fill={color} />
    </svg>
  );
}

/** Subtle paper grain. */
export const paperGrain =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 .4 0 0 0 0 .33 0 0 0 0 .25 0 0 0 .22 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * The customer's photo, cropped to fill its frame. Without one, a soft gradient in the theme's
 * colours stands in (with a camera hint where the customer is expected to add their own).
 */
export function PhotoSlot({
  photo,
  from,
  to,
  hint,
  className,
}: {
  photo?: string | null;
  from: string;
  to: string;
  hint?: boolean;
  className?: string;
}) {
  if (photo)
    return (
      <img
        src={photo}
        alt=""
        loading="lazy"
        decoding="async"
        className={`size-full object-cover ${className ?? ''}`}
      />
    );
  return (
    <div
      className={`flex size-full items-center justify-center ${className ?? ''}`}
      style={{ background: `linear-gradient(to bottom, ${from}, ${to})` }}
      aria-hidden
    >
      {hint && <Camera className="w-[14%] opacity-40" style={{ color: '#fff' }} />}
    </div>
  );
}
