import type { CSSProperties } from 'react';
import type { TemplateDesign } from '@invite/shared';
import { cn } from '@/lib/cn';
import { useIntroFonts } from './introFonts';
import { shade } from './sectionLook';

type Palette = TemplateDesign['palette'];
type Phase = 'closed' | 'opening' | 'leaving';

/** Intros that are a place rather than an envelope: stage curtains, grand doors, a hall entrance. */
export const GATE_VARIANTS = ['curtain', 'doors', 'hall'] as const;
export type GateVariant = (typeof GATE_VARIANTS)[number];
export const isGate = (value: string): value is GateVariant =>
  (GATE_VARIANTS as readonly string[]).includes(value);

const GOLD = '#d8b36a';
const CREAM = '#fff3d6';

const CSS = `
@keyframes gate-sway{0%,100%{transform:skewX(-.5deg)}50%{transform:skewX(.7deg)}}
@keyframes gate-crack{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes gate-draw-left{0%{transform:scaleX(1) skewX(0)}45%{transform:scaleX(.5) skewX(7deg)}100%{transform:scaleX(.1) skewX(0)}}
@keyframes gate-draw-right{0%{transform:scaleX(1) skewX(0)}45%{transform:scaleX(.5) skewX(-7deg)}100%{transform:scaleX(.1) skewX(0)}}
@keyframes gate-fall{0%{opacity:0;transform:translateY(-6cqh) rotate(0)}10%{opacity:1}100%{opacity:0;transform:translateY(100cqh) rotate(540deg)}}
@keyframes gate-spot{0%{opacity:0}100%{opacity:.6}}
@keyframes gate-flash{0%{opacity:0}40%{opacity:1}100%{opacity:0}}
@keyframes gate-dust{0%{opacity:0;transform:translateY(0)}20%{opacity:.9}100%{opacity:0;transform:translateY(-90px)}}
@keyframes gate-twinkle{0%,100%{opacity:.5;scale:.8}50%{opacity:1;scale:1.25}}
@media (prefers-reduced-motion:reduce){.gate-anim{animation:none!important}}
`;

const dust = Array.from({ length: 16 }, (_, index) => ({
  left: 8 + ((index * 53) % 84),
  top: 40 + ((index * 29) % 50),
  size: 3 + (index % 4),
  delay: (index % 7) * 0.35,
}));

function Reveal({
  opened,
  title,
  label,
  fontClass,
  color,
  className,
}: {
  opened: boolean;
  title?: string;
  label?: string;
  fontClass?: string;
  color: string;
  className: string;
}) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-x-0 px-[8%] text-center', className)}
      style={{
        color,
        opacity: opened ? 1 : 0,
        transform: opened ? 'scale(1)' : 'scale(.9)',
        transition: 'opacity 1.2s ease-out 1s, transform 1.6s ease-out 1s',
        textShadow: '0 2px 18px rgba(0,0,0,.45)',
      }}
    >
      <p
        className={cn(
          'mb-[2cqmin] text-[max(.7rem,2.4cqmin)] tracking-widest opacity-80',
          useIntroFonts().label,
        )}
      >
        {label}
      </p>
      <p
        className={cn('text-balance leading-tight', fontClass)}
        style={{ fontSize: 'clamp(1.5rem, 8cqmin, 4.2rem)' }}
      >
        {title}
      </p>
      <span className="mx-auto mt-[2.4cqmin] block h-px w-[18cqmin]" style={{ background: GOLD }} />
    </div>
  );
}

function Leaf({
  side,
  opened,
  accent,
}: {
  side: 'left' | 'right';
  opened: boolean;
  accent: string;
}) {
  const left = side === 'left';
  const panel: CSSProperties = {
    border: `max(1px,.35cqmin) solid ${GOLD}88`,
    background: 'rgba(0,0,0,.16)',
    boxShadow: 'inset 0 0 2cqmin rgba(0,0,0,.35)',
  };
  return (
    <div
      className="absolute inset-y-0 w-1/2"
      style={{
        [side]: 0,
        transformOrigin: left ? 'left center' : 'right center',
        transform: opened ? `rotateY(${left ? -108 : 108}deg)` : 'rotateY(0)',
        transition: 'transform 1.9s cubic-bezier(.65,0,.2,1) .35s',
        background: `linear-gradient(${left ? 90 : 270}deg, ${shade(accent, -0.72)}, ${shade(accent, -0.55)} 45%, ${shade(accent, -0.47)})`,
        boxShadow: `inset 0 0 0 max(1px,.5cqmin) ${GOLD}66, inset 0 0 6cqmin rgba(0,0,0,.5)`,
      }}
    >
      <span className="absolute inset-x-[13%] top-[7%] h-[40%] rounded-sm" style={panel} />
      <span className="absolute inset-x-[13%] bottom-[7%] h-[40%] rounded-sm" style={panel} />
      <span
        className="absolute top-1/2 aspect-square w-[8%] -translate-y-1/2 rounded-full"
        style={{
          [left ? 'right' : 'left']: '6%',
          background: 'radial-gradient(circle at 35% 30%, #f6df9c, #c79a34 70%, #8a6615)',
          boxShadow: '0 .6cqmin 1.4cqmin rgba(0,0,0,.5)',
        }}
      />
    </div>
  );
}

/** The thin line of light between two shut doors. */
function Crack() {
  return (
    <span
      aria-hidden
      className="gate-anim absolute inset-y-0 start-1/2 z-[5] w-[max(2px,.5cqmin)] -translate-x-1/2"
      style={{
        background: '#fff6cf',
        boxShadow: '0 0 3cqmin 1cqmin rgba(255,236,170,.8)',
        animation: 'gate-crack 2.4s ease-in-out infinite',
      }}
    />
  );
}

const VELVET = { dark: '#32050e', mid: '#74112a', light: '#b02a46' };

const confetti = Array.from({ length: 30 }, (_, index) => ({
  left: (index * 37 + 5) % 100,
  delay: 2.1 + (index % 10) * 0.16,
  size: 6 + (index % 4) * 2,
  duration: 2.8 + (index % 5) * 0.4,
  color: ['#f6df9c', '#ffffff', '#d8b36a', '#e9a9b8'][index % 4],
}));

function Curtain({ palette, opened, leaving, title, label, fontClass, mini }: GateProps) {
  const a = palette.accent;
  const pleats = `repeating-linear-gradient(90deg, ${VELVET.dark} 0%, ${VELVET.mid} 3%, ${VELVET.light} 5.5%, ${VELVET.mid} 8%, ${VELVET.dark} 11%)`;
  const panel = (edge: 'left' | 'right'): CSSProperties => ({
    [edge]: 0,
    width: '51%',
    transformOrigin: edge === 'left' ? 'left center' : 'right center',
    background: `linear-gradient(180deg, rgba(0,0,0,.5), transparent 20%, transparent 62%, rgba(0,0,0,.6)), ${pleats}`,
    boxShadow: `${edge === 'left' ? '' : '-'}8px 0 28px rgba(0,0,0,.55)`,
    animation: mini
      ? undefined
      : opened
        ? `gate-draw-${edge} 2.8s cubic-bezier(.62,0,.25,1) .4s both`
        : `gate-sway 5.5s ease-in-out ${edge === 'left' ? 0 : -2.7}s infinite`,
  });
  const edgeTrim = (edge: 'left' | 'right'): CSSProperties => ({
    [edge === 'left' ? 'right' : 'left']: 0,
    width: '1.4%',
    background: `linear-gradient(90deg, ${GOLD}, #f6df9c, ${GOLD})`,
    boxShadow: '0 0 1.4cqmin rgba(246,223,156,.5)',
  });
  const beam = (rotate: number, delay: number, width: string): CSSProperties => ({
    width,
    height: '84%',
    left: '50%',
    marginLeft: `calc(${width} / -2)`,
    transformOrigin: '50% 0',
    rotate: `${rotate}deg`,
    clipPath: 'polygon(46% 0, 54% 0, 100% 100%, 0 100%)',
    background: 'linear-gradient(180deg, rgba(255,246,207,.85), rgba(255,246,207,.04))',
    opacity: 0,
    animation: opened ? `gate-spot 1.8s ease-out ${delay}s forwards` : undefined,
  });
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${shade(a, 0.05)}, ${shade(a, -0.88)} 70%)`,
        }}
      >
        <div
          className="absolute inset-x-0 bottom-0 h-[17%]"
          style={{
            background: `repeating-linear-gradient(90deg, rgba(0,0,0,.28) 0 1px, transparent 1px 7%), linear-gradient(180deg, ${shade(a, -0.62)}, #0b0608)`,
            borderTop: `max(1px,.3cqmin) solid ${GOLD}77`,
          }}
        />
        {!mini && (
          <>
            <span aria-hidden className="gate-anim absolute top-0" style={beam(0, 0.9, '40%')} />
            <span aria-hidden className="gate-anim absolute top-0" style={beam(-16, 1.2, '26%')} />
            <span aria-hidden className="gate-anim absolute top-0" style={beam(16, 1.4, '26%')} />
            {/* Footlights */}
            <div
              aria-hidden
              className="absolute inset-x-[6%] bottom-[16.2%] flex justify-between transition-opacity duration-1000"
              style={{ opacity: opened ? 1 : 0, transitionDelay: '1.2s' }}
            >
              {Array.from({ length: 9 }, (_, index) => (
                <span
                  key={index}
                  className="gate-anim size-[1.4cqmin] rounded-full"
                  style={{
                    background: '#ffe9a8',
                    boxShadow: '0 0 2.4cqmin .9cqmin rgba(255,226,140,.9)',
                    animation: `gate-twinkle 2.4s ease-in-out ${(index % 3) * 0.4}s infinite`,
                  }}
                />
              ))}
            </div>
            {opened &&
              dust.map((mote, index) => (
                <span
                  key={index}
                  aria-hidden
                  className="gate-anim absolute rounded-full"
                  style={{
                    left: `${22 + (mote.left % 56)}%`,
                    top: `${mote.top}%`,
                    width: mote.size,
                    height: mote.size,
                    background: '#fff6cf',
                    opacity: 0,
                    animation: `gate-dust 3.4s ease-out ${1.4 + mote.delay}s infinite`,
                  }}
                />
              ))}
            <Reveal
              opened={opened}
              title={title}
              label={label}
              fontClass={fontClass}
              color={CREAM}
              className="top-[34%]"
            />
            {opened &&
              confetti.map((piece, index) => (
                <span
                  key={index}
                  aria-hidden
                  className="gate-anim absolute top-0 rounded-[1px]"
                  style={{
                    left: `${piece.left}%`,
                    width: piece.size,
                    height: piece.size * 1.6,
                    background: piece.color,
                    opacity: 0,
                    animation: `gate-fall ${piece.duration}s ease-in ${piece.delay}s both`,
                  }}
                />
              ))}
          </>
        )}
      </div>
      <div className="gate-anim absolute inset-y-0" style={panel('left')}>
        <span className="absolute inset-y-0" style={edgeTrim('left')} />
      </div>
      <div className="gate-anim absolute inset-y-0" style={panel('right')}>
        <span className="absolute inset-y-0" style={edgeTrim('right')} />
      </div>
      {/* Valance with a scalloped edge and a gold fringe */}
      <div
        className="absolute inset-x-0 top-0 z-[6] flex h-[11%]"
        style={{ filter: 'drop-shadow(0 1cqmin 1.2cqmin rgba(0,0,0,.55))' }}
      >
        {Array.from({ length: 6 }, (_, index) => (
          <span
            key={index}
            className="h-full flex-1"
            style={{
              background: `linear-gradient(180deg, ${VELVET.dark}, ${VELVET.light})`,
              borderRadius: '0 0 50% 50% / 0 0 55% 55%',
              borderBottom: `max(1px,.4cqmin) solid ${GOLD}`,
              marginInline: '-0.5%',
            }}
          />
        ))}
      </div>
      {/* <div
        aria-hidden
        className="absolute inset-x-0 top-[10.4%] z-[6] h-[2.6%] opacity-80"
        style={{
          background: `repeating-linear-gradient(90deg, ${GOLD} 0 2px, transparent 2px 7px)`,
          maskImage: 'linear-gradient(180deg, #000, transparent)',
          WebkitMaskImage: 'linear-gradient(180deg, #000, transparent)',
        }}
      /> */}
      {leaving && (
        <span
          aria-hidden
          className="gate-anim absolute inset-0 z-10"
          style={{
            background:
              'radial-gradient(circle at 50% 45%, #fff8dc, rgba(246,223,156,.5) 50%, transparent 75%)',
            animation: 'gate-flash .85s ease-out both',
          }}
        />
      )}
    </>
  );
}

function Doors({ palette, opened, leaving, title, label, fontClass, mini }: GateProps) {
  const a = palette.accent;
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, #fffbe8, #f6df9c 32%, ${shade(a, -0.35)} 95%)`,
        }}
      >
        {!mini && (
          <Reveal
            opened={opened}
            title={title}
            label={label}
            fontClass={fontClass}
            color={shade(a, -0.8)}
            className="top-[36%]"
          />
        )}
      </div>
      <div className="absolute inset-0 [perspective:1500px]">
        <Leaf side="left" opened={opened} accent={a} />
        <Leaf side="right" opened={opened} accent={a} />
      </div>
      {!opened && <Crack />}
      {/* Lintel and posts */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[6]"
        style={{
          boxShadow: `inset 0 0 0 max(3px,2.2cqmin) ${shade(a, -0.7)}, inset 0 0 0 max(4px,2.7cqmin) ${GOLD}`,
        }}
      />
      {leaving && (
        <span
          aria-hidden
          className="gate-anim absolute inset-0 z-10"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, #fff, rgba(255,246,207,.8) 40%, transparent 75%)',
            animation: 'gate-flash .85s ease-in both',
          }}
        />
      )}
    </>
  );
}

function Hall({ palette, opened, leaving, title, label, fontClass, mini }: GateProps) {
  const a = palette.accent;
  const lights = Array.from({ length: 11 }, (_, index) => ({
    left: 4 + index * 9.2,
    top: 3.5 + Math.sin((index / 10) * Math.PI) * 4,
    delay: (index % 4) * 0.4,
  }));
  return (
    <>
      {/* Outer wall with pilasters */}
      <div
        className="absolute inset-0"
        style={{
          background: `repeating-linear-gradient(90deg, transparent 0 14%, rgba(255,255,255,.05) 14% 15%, transparent 15% 16%), linear-gradient(180deg, ${shade(a, -0.8)}, ${shade(a, -0.6)})`,
        }}
      />
      {!mini &&
        lights.map((light, index) => (
          <span
            key={index}
            aria-hidden
            className="gate-anim absolute size-[1.3cqmin] rounded-full"
            style={{
              left: `${light.left}%`,
              top: `${light.top}%`,
              background: '#ffe9a8',
              boxShadow: '0 0 2cqmin .7cqmin rgba(255,226,140,.85)',
              animation: `gate-twinkle 2.6s ease-in-out ${light.delay}s infinite`,
            }}
          />
        ))}
      {/* Red carpet */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[10%]"
        style={{
          clipPath: 'polygon(36% 0, 64% 0, 86% 100%, 14% 100%)',
          background: 'linear-gradient(180deg, #5c0d1d, #9a1b34)',
        }}
      />
      {/* The doorway */}
      <div
        className="absolute bottom-[8%] start-1/2 h-[80%] max-w-[90%] -translate-x-1/2 overflow-hidden [perspective:1300px] rtl:translate-x-1/2"
        style={{
          aspectRatio: '0.64',
          borderRadius: '999px 999px 0 0',
          boxShadow: `0 0 0 max(2px,.9cqmin) ${GOLD}, 0 0 0 max(4px,1.8cqmin) ${shade(a, -0.7)}, 0 0 6cqmin rgba(255,226,140,${opened ? 0.55 : 0.15})`,
          transition: 'box-shadow 1.6s ease-out',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 30%, #ffe9b0, ${shade(a, -0.5)} 60%, #0a0608)`,
            filter: `brightness(${opened ? 1 : 0.6})`,
            transition: 'filter 1.6s ease-out .3s',
          }}
        >
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-[38%] origin-top"
            style={{
              background: `repeating-conic-gradient(#f3e7c8 0 25%, ${shade(a, -0.6)} 0 50%) 0 0 / 22% 30%`,
              transform: 'perspective(40cqmin) rotateX(58deg)',
              opacity: 0.55,
            }}
          />
          <span
            aria-hidden
            className="absolute start-1/2 top-[5%] size-[22%] -translate-x-1/2 rounded-full blur-xl"
            style={{ background: 'radial-gradient(circle, #fff6cf, transparent 70%)' }}
          />
          {!mini &&
            opened &&
            dust.map((mote, index) => (
              <span
                key={index}
                aria-hidden
                className="gate-anim absolute rounded-full"
                style={{
                  left: `${mote.left}%`,
                  top: `${mote.top}%`,
                  width: mote.size,
                  height: mote.size,
                  background: '#ffe9a8',
                  boxShadow: '0 0 8px 2px rgba(255,226,140,.8)',
                  opacity: 0,
                  animation: `gate-dust 3s ease-out ${1 + mote.delay}s infinite`,
                }}
              />
            ))}
          {!mini && (
            <Reveal
              opened={opened}
              title={title}
              label={label}
              fontClass={fontClass}
              color={CREAM}
              className="top-[32%]"
            />
          )}
        </div>
        <Leaf side="left" opened={opened} accent={a} />
        <Leaf side="right" opened={opened} accent={a} />
        {!opened && <Crack />}
      </div>
      {leaving && (
        <span
          aria-hidden
          className="gate-anim absolute inset-0 z-10"
          style={{
            background:
              'radial-gradient(circle at 50% 48%, #fff8dc, rgba(246,223,156,.6) 40%, transparent 72%)',
            animation: 'gate-flash .85s ease-in both',
          }}
        />
      )}
    </>
  );
}

interface GateProps {
  palette: Palette;
  opened: boolean;
  leaving?: boolean;
  title?: string;
  label?: string;
  fontClass?: string;
  mini?: boolean;
}

export function GateArt({ kind, ...props }: GateProps & { kind: GateVariant }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ containerType: 'size' }}>
      {!props.mini && <style>{CSS}</style>}
      {kind === 'curtain' && <Curtain {...props} />}
      {kind === 'doors' && <Doors {...props} />}
      {kind === 'hall' && <Hall {...props} />}
    </div>
  );
}

/** A small closed scene for choosing a style. */
export function GateThumb({ variant, palette }: { variant: GateVariant; palette: Palette }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
      <GateArt kind={variant} palette={palette} opened={false} mini />
    </div>
  );
}

/** Zoom the whole scene toward the light as the intro ends, as if walking through. */
const ZOOM: Record<GateVariant, { scale: number; origin: string }> = {
  curtain: { scale: 1.18, origin: '50% 45%' },
  doors: { scale: 2.8, origin: '50% 50%' },
  hall: { scale: 4.2, origin: '50% 48%' },
};

export function GateOverlay({
  variant,
  palette,
  phase,
  title,
  label,
  openLabel,
  fontClass,
  onOpen,
}: {
  variant: GateVariant;
  palette: Palette;
  phase: Phase;
  title: string;
  label: string;
  openLabel: string;
  fontClass: string;
  onOpen: () => void;
}) {
  const opened = phase !== 'closed';
  const leaving = phase === 'leaving';
  const zoom = ZOOM[variant];
  return (
    <div
      className={cn(
        'fixed inset-0 z-[60] overflow-hidden bg-black transition-opacity duration-700',
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: leaving ? `scale(${zoom.scale})` : 'scale(1)',
          transformOrigin: zoom.origin,
          transition: 'transform 850ms cubic-bezier(.55,0,.8,.4)',
        }}
      >
        <GateArt
          kind={variant}
          palette={palette}
          opened={opened}
          leaving={leaving}
          title={title}
          label={label}
          fontClass={fontClass}
        />
      </div>
      <button
        type="button"
        onClick={onOpen}
        aria-label={openLabel}
        className="absolute inset-0 z-20 cursor-pointer"
      />
      <p
        className={cn(
          'pointer-events-none absolute inset-x-0 z-30 px-6 text-center text-sm tracking-wide transition-opacity duration-500',
          useIntroFonts().label,
          variant === 'curtain' ? 'top-[14%]' : 'top-[3.5%]',
          opened && 'opacity-0',
        )}
        style={{ color: CREAM, textShadow: '0 1px 8px rgba(0,0,0,.7)' }}
      >
        {label}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'absolute bottom-[3.5%] start-1/2 z-30 -translate-x-1/2 rounded-full border px-8 py-3 text-sm font-medium backdrop-blur-md transition-all hover:scale-105 rtl:translate-x-1/2',
          opened && 'pointer-events-none opacity-0',
        )}
        style={{ color: CREAM, borderColor: GOLD, background: 'rgba(0,0,0,.45)' }}
      >
        {openLabel}
      </button>
    </div>
  );
}
