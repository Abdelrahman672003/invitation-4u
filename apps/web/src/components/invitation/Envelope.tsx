import { useEffect, useState, type CSSProperties } from 'react';
import { Crown, Heart, Moon, type LucideIcon } from 'lucide-react';
import type { TemplateDesign } from '@invite/shared';
import { cn } from '@/lib/cn';
import { FlowerCorner } from './posterArt';
import { shade } from './sectionLook';
import { IntroFontsContext, useIntroFonts } from './introFonts';
import { GateOverlay, GateThumb, isGate, type GateVariant } from './Gate';

type Phase = 'closed' | 'opening' | 'leaving' | 'gone';
type Palette = TemplateDesign['palette'];
export type EnvelopeKind = 'classic' | 'luxe' | 'floral' | 'minimal' | 'night';
export type EnvelopeVariant = EnvelopeKind | GateVariant;

interface Theme {
  overlay: string;
  /** Colour of the text above and below the envelope. */
  ink: string;
  back: string;
  /** Left, right and bottom panels of the pocket. */
  panels: [string, string, string];
  flap: string;
  lining: string;
  line: string;
  lineWidth: number;
  seal: { background: string; color: string; Icon: LucideIcon };
  card: { background: string; color: string; frame: string };
  deco: 'none' | 'flowers' | 'stars';
}

const gold = 'radial-gradient(circle at 35% 30%, #f6df9c, #c79a34 70%, #a67c1f)';

function themeFor(variant: EnvelopeKind, p: Palette): Theme {
  const a = p.accent;
  switch (variant) {
    case 'luxe': {
      const base = shade(a, -0.62);
      return {
        overlay: `radial-gradient(circle at 50% 25%, ${shade(a, -0.72)}, #0a0608)`,
        ink: '#f3e7c8',
        back: shade(a, -0.8),
        panels: [base, shade(base, -0.14), shade(base, 0.06)],
        flap: shade(base, 0.12),
        lining: shade(a, -0.82),
        line: '#d8b36a',
        lineWidth: 1.6,
        seal: { background: gold, color: '#5b3b08', Icon: Crown },
        card: { background: '#fbf4e4', color: '#3a2a14', frame: '#c9a24b' },
        deco: 'none',
      };
    }
    case 'floral':
      return {
        overlay: `radial-gradient(circle at 50% 20%, ${shade(a, 0.82)}, ${shade(a, 0.5)})`,
        ink: shade(a, -0.55),
        back: shade(a, 0.7),
        panels: ['#fbf3ea', '#f4e8dc', '#fff9f2'],
        flap: shade(a, 0.86),
        lining: shade(a, 0.78),
        line: shade(a, 0.35),
        lineWidth: 1.2,
        seal: {
          background: `radial-gradient(circle at 35% 30%, ${shade(a, 0.25)}, ${a})`,
          color: '#ffffff',
          Icon: Heart,
        },
        card: { background: '#ffffff', color: '#3b2a2a', frame: shade(a, 0.3) },
        deco: 'flowers',
      };
    case 'minimal':
      return {
        overlay: 'linear-gradient(160deg, #efede8, #cfccc4)',
        ink: '#4a4741',
        back: '#e2e0da',
        panels: ['#ffffff', '#f2f1ee', '#fafaf8'],
        flap: '#fcfcfa',
        lining: '#ecebe7',
        line: '#b9b6ad',
        lineWidth: 1,
        seal: { background: '#ffffff', color: a, Icon: Heart },
        card: { background: '#ffffff', color: '#26241f', frame: '#d9d6cd' },
        deco: 'none',
      };
    case 'night':
      return {
        overlay: 'radial-gradient(circle at 50% 20%, #1f2560, #05061a)',
        ink: '#d9dcff',
        back: '#0d1034',
        panels: ['#1d2252', '#171b45', '#252b66'],
        flap: '#2a3070',
        lining: '#0f1238',
        line: '#8f98e0',
        lineWidth: 1,
        seal: { background: gold, color: '#5b4510', Icon: Moon },
        card: { background: '#14173f', color: '#f6e9c7', frame: '#d8b36a' },
        deco: 'stars',
      };
    default:
      return {
        overlay: `radial-gradient(circle at 50% 30%, ${shade(a, -0.55)}, ${shade(a, -0.82)})`,
        ink: 'rgba(255,255,255,0.85)',
        back: shade(a, -0.4),
        panels: [shade(a, -0.1), shade(a, -0.2), shade(a, -0.04)],
        flap: shade(a, 0.08),
        lining: shade(a, -0.45),
        line: shade(a, -0.32),
        lineWidth: 1.2,
        seal: { background: gold, color: '#6b4a10', Icon: Heart },
        card: { background: p.surface, color: p.text, frame: a },
        deco: 'none',
      };
  }
}

const CSS = `
@keyframes env-float{0%,100%{transform:translateY(0) rotate(-.6deg)}50%{transform:translateY(-10px) rotate(.6deg)}}
@keyframes env-shake{0%,100%{transform:translate(0,0) rotate(0)}15%{transform:translate(-5px,2px) rotate(-1.6deg)}30%{transform:translate(5px,-2px) rotate(1.6deg)}45%{transform:translate(-4px,1px) rotate(-1deg)}60%{transform:translate(3px,0) rotate(.8deg)}80%{transform:translate(-1px,0) rotate(-.3deg)}}
@keyframes env-pulse{0%,100%{box-shadow:0 6px 14px rgba(0,0,0,.35),0 0 0 0 rgba(246,223,156,.55)}50%{box-shadow:0 6px 14px rgba(0,0,0,.35),0 0 0 14px rgba(246,223,156,0)}}
@keyframes env-seal{0%{scale:1;opacity:1}35%{scale:1.45;opacity:1}100%{scale:2.2;opacity:0}}
@keyframes env-glow{0%{opacity:0;scale:.4}40%{opacity:1}100%{opacity:.85;scale:1.25}}
@keyframes env-spark{0%{opacity:0;transform:translate(0,0) scale(.3)}15%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1)}}
@keyframes env-flash{0%{opacity:0}35%{opacity:.95}100%{opacity:0}}
@keyframes env-sheen{0%{transform:translateX(-120%) skewX(-18deg)}60%,100%{transform:translateX(220%) skewX(-18deg)}}
@media (prefers-reduced-motion:reduce){.env-anim{animation:none!important}}
`;

const sparks = Array.from({ length: 18 }, (_, index) => {
  const angle = (index / 18) * Math.PI * 2;
  const distance = 110 + ((index * 37) % 90);
  return {
    dx: Math.round(Math.cos(angle) * distance),
    dy: Math.round(Math.sin(angle) * distance) - 50,
    size: 5 + ((index * 3) % 6),
    delay: 0.45 + (index % 6) * 0.05,
  };
});

/** Page colour and text colour behind an envelope, for places that show one outside the intro. */
export const envelopeBackdrop = (variant: EnvelopeKind, palette: Palette) => {
  const th = themeFor(variant, palette);
  return { background: th.overlay, ink: th.ink };
};

const stars = Array.from({ length: 26 }, (_, index) => ({
  x: (index * 47 + 13) % 400,
  y: (index * 71 + 29) % 300,
  r: 0.7 + ((index * 5) % 4) * 0.45,
}));

/**
 * The envelope drawing: back, a card that can slide out, a three-panel pocket, a two-sided flap
 * that folds open, and a seal. Used full size in the intro and tiny in the style picker.
 */
export function EnvelopeArt({
  variant,
  palette,
  opened,
  leaving,
  title,
  label,
  fontClass,
  mini,
}: {
  variant: EnvelopeKind;
  palette: Palette;
  opened: boolean;
  leaving?: boolean;
  title?: string;
  label?: string;
  fontClass?: string;
  mini?: boolean;
}) {
  const th = themeFor(variant, palette);
  const introLabel = useIntroFonts().label;
  const { Icon } = th.seal;
  const stroke = { stroke: th.line, strokeWidth: th.lineWidth, strokeLinejoin: 'round' as const };
  const flapPath = 'M0 0 H400 L200 168 Z';

  return (
    <div
      className="env-anim relative aspect-[4/3] w-full [perspective:1400px]"
      style={{
        filter: mini ? undefined : 'drop-shadow(0 30px 40px rgba(0,0,0,0.45))',
        animation: mini
          ? undefined
          : opened
            ? 'env-shake 0.55s ease-in-out'
            : 'env-float 4.5s ease-in-out infinite',
      }}
    >
      {!mini && <style>{CSS}</style>}
      {/* Back */}
      <svg viewBox="0 0 400 300" className="absolute inset-0 size-full" aria-hidden>
        <rect width="400" height="300" rx="10" fill={th.back} />
      </svg>

      {/* Light that spills out when the flap lifts */}
      {!mini && opened && (
        <span
          aria-hidden
          className="env-anim pointer-events-none absolute inset-x-[-10%] top-[-30%] h-[90%] rounded-full blur-2xl"
          style={{
            background:
              'radial-gradient(closest-side, #fff6cf, rgba(246,223,156,0.55) 55%, transparent)',
            animation: 'env-glow 1.6s ease-out 0.35s both',
            zIndex: 0,
          }}
        />
      )}

      {/* The card inside */}
      {!mini && (
        <span
          className={cn(
            'absolute inset-x-[7%] bottom-[8%] flex h-[88%] flex-col items-center justify-center gap-2 rounded-sm p-5 text-center shadow-lg transition-transform duration-[1100ms] ease-out',
            opened && '-translate-y-[58%]',
            leaving && 'scale-[2.6]',
          )}
          style={{
            background: th.card.background,
            color: th.card.color,
            zIndex: leaving ? 6 : 1,
            transitionDuration: leaving ? '800ms' : '1300ms',
            transitionDelay: opened && !leaving ? '0.7s' : '0s',
            transitionTimingFunction: leaving
              ? 'cubic-bezier(.5,0,.2,1)'
              : 'cubic-bezier(.2,.9,.25,1.15)',
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-2 rounded-[2px] border"
            style={{ borderColor: th.card.frame, opacity: 0.7 }}
          />
          <span className={cn('relative text-xs opacity-70', introLabel)}>{label}</span>
          <span className={cn('relative text-balance text-2xl leading-tight', fontClass)}>
            {title}
          </span>
          <span className="relative mt-1 h-px w-10" style={{ background: th.card.frame }} />
        </span>
      )}

      {/* Pocket: three folded panels */}
      <svg
        viewBox="0 0 400 300"
        className="absolute inset-0 size-full"
        style={{ zIndex: 2 }}
        aria-hidden
      >
        <path d="M0 0 L200 168 L0 300 Z" fill={th.panels[0]} {...stroke} />
        <path d="M400 0 L200 168 L400 300 Z" fill={th.panels[1]} {...stroke} />
        <path d="M0 300 L200 168 L400 300 Z" fill={th.panels[2]} {...stroke} />
        <rect x="0.5" y="0.5" width="399" height="299" rx="0" fill="none" />
        {th.deco === 'stars' &&
          stars.map((star, index) => (
            <circle key={index} cx={star.x} cy={star.y} r={star.r} fill="#fff" opacity={0.65} />
          ))}
      </svg>
      {th.deco === 'flowers' && (
        <>
          <FlowerCorner
            petal={palette.accent}
            petalSoft={shade(palette.accent, 0.4)}
            center="#8a5a3a"
            leaf="#7aa88c"
            className="absolute bottom-0 start-0 w-[26%] -scale-y-100 rtl:-scale-100"
          />
          <FlowerCorner
            petal={palette.accent}
            petalSoft={shade(palette.accent, 0.4)}
            center="#8a5a3a"
            leaf="#7aa88c"
            className="absolute bottom-0 end-0 w-[26%] -scale-100 rtl:scale-x-100"
          />
        </>
      )}

      {/* Flap: front and lining, folded about the top edge */}
      <div
        className="absolute inset-x-0 top-0 h-[56%] origin-top"
        style={{
          transformOrigin: 'top',
          transform: opened ? 'rotateX(-180deg)' : '',
          zIndex: opened ? 0 : 3,
          transition: 'transform 900ms ease-in-out, z-index 0s',
          transitionDelay: opened ? '0s, 0.35s' : '0s',
        }}
      >
        <svg
          viewBox="0 0 400 168"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full [backface-visibility:hidden]"
          aria-hidden
        >
          <path d={flapPath} fill={th.flap} {...stroke} />
          <path
            d="M22 8 H378 L200 154 Z"
            fill="none"
            stroke={th.line}
            strokeWidth={th.lineWidth * 0.7}
            opacity={0.55}
            strokeLinejoin="round"
          />
        </svg>
        <svg
          viewBox="0 0 400 168"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full [backface-visibility:hidden]"
          style={{ transform: 'rotateX(180deg)' } as CSSProperties}
          aria-hidden
        >
          <path d={flapPath} fill={th.lining} {...stroke} />
        </svg>
      </div>

      {/* Seal */}
      <span
        className={cn(
          'env-anim absolute start-1/2 top-[56%] z-[4] grid -translate-y-1/2 place-items-center rounded-full shadow-lg ltr:-translate-x-1/2 rtl:translate-x-1/2',
          mini ? 'size-5' : 'size-14',
          opened && 'opacity-0',
        )}
        style={{
          background: th.seal.background,
          color: th.seal.color,
          boxShadow: '0 6px 14px rgba(0,0,0,0.35), inset 0 -2px 4px rgba(0,0,0,0.2)',
          animation: mini
            ? undefined
            : opened
              ? 'env-seal 0.6s ease-out forwards'
              : 'env-pulse 2.2s ease-out infinite',
        }}
      >
        <Icon
          className={mini ? 'size-3' : 'size-6'}
          fill={Icon === Heart ? 'currentColor' : 'none'}
          aria-hidden
        />
      </span>

      {/* Sparks bursting from the seal */}
      {!mini && opened && (
        <span aria-hidden className="pointer-events-none absolute start-1/2 top-[56%] z-[5]">
          {sparks.map((spark, index) => (
            <span
              key={index}
              className="env-anim absolute rounded-full"
              style={
                {
                  width: spark.size,
                  height: spark.size,
                  marginInlineStart: -spark.size / 2,
                  background: index % 3 === 0 ? '#fff' : '#f6df9c',
                  boxShadow: '0 0 10px 2px rgba(246,223,156,0.9)',
                  '--dx': `${spark.dx}px`,
                  '--dy': `${spark.dy}px`,
                  opacity: 0,
                  animation: `env-spark 1.5s ease-out ${spark.delay}s both`,
                } as CSSProperties
              }
            />
          ))}
        </span>
      )}

      {/* A slow sheen across the sealed envelope */}
      {!mini && !opened && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[3] overflow-hidden rounded-[10px]"
        >
          <span
            className="env-anim absolute inset-y-0 w-1/4"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)',
              animation: 'env-sheen 3.8s ease-in-out 1s infinite',
            }}
          />
        </span>
      )}
    </div>
  );
}

/** A small closed envelope for choosing a style. */
export function EnvelopeThumb({
  variant,
  palette,
}: {
  variant: EnvelopeVariant;
  palette: Palette;
}) {
  if (isGate(variant)) return <GateThumb variant={variant} palette={palette} />;
  const th = themeFor(variant, palette);
  return (
    <div className="rounded-lg p-2.5" style={{ background: th.overlay }}>
      <EnvelopeArt variant={variant} palette={palette} opened={false} mini />
    </div>
  );
}

/**
 * Full-screen "you have received an invitation" gate: a sealed envelope that opens when tapped.
 * Tapping is also the user gesture that lets background music start. Motion is skipped when the
 * visitor prefers reduced motion.
 */
export function EnvelopeIntro({
  palette,
  variant,
  title,
  label,
  openLabel,
  fontClass,
  labelClass,
  onOpen,
}: {
  palette: Palette;
  variant: EnvelopeVariant;
  title: string;
  label: string;
  openLabel: string;
  fontClass: string;
  labelClass: string;
  onOpen: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('closed');
  const th = themeFor(isGate(variant) ? 'classic' : variant, palette);

  useEffect(() => {
    if (phase === 'gone') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  useEffect(() => {
    if (phase === 'opening') {
      const timer = setTimeout(() => setPhase('leaving'), isGate(variant) ? 4600 : 2700);
      return () => clearTimeout(timer);
    }
    if (phase === 'leaving') {
      const timer = setTimeout(() => setPhase('gone'), 850);
      return () => clearTimeout(timer);
    }
  }, [phase, variant]);

  if (phase === 'gone') return null;

  function open() {
    if (phase !== 'closed') return;
    onOpen();
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return setPhase('gone');
    setPhase('opening');
  }

  const opened = phase !== 'closed';

  const fonts = { label: labelClass, title: fontClass };

  if (isGate(variant))
    return (
      <IntroFontsContext.Provider value={fonts}>
        <GateOverlay
          variant={variant}
          palette={palette}
          phase={phase}
          title={title}
          label={label}
          openLabel={openLabel}
          fontClass={fontClass}
          onOpen={open}
        />
      </IntroFontsContext.Provider>
    );

  return (
    <IntroFontsContext.Provider value={fonts}>
      <div
        className={cn(
          'fixed inset-0 z-[60] flex flex-col items-center justify-center gap-9 px-6 transition-opacity duration-700',
          phase === 'leaving' ? 'pointer-events-none opacity-0' : 'opacity-100',
        )}
        style={{ background: th.overlay }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <p
          className={cn('text-center text-lg tracking-wide', labelClass)}
          style={{ color: th.ink }}
        >
          {label}
        </p>
        {phase === 'leaving' && (
          <span
            aria-hidden
            className="env-anim pointer-events-none absolute inset-0 z-10"
            style={{
              background:
                'radial-gradient(circle at 50% 45%, #fff8dc, rgba(246,223,156,0.6) 45%, transparent 75%)',
              animation: 'env-flash 0.85s ease-out both',
            }}
          />
        )}
        <button
          type="button"
          onClick={open}
          aria-label={openLabel}
          className="block w-[min(88vw,24rem)] cursor-pointer transition-transform duration-300 hover:scale-[1.02] focus-visible:outline-offset-8"
        >
          <EnvelopeArt
            variant={variant}
            palette={palette}
            opened={opened}
            leaving={phase === 'leaving'}
            title={title}
            label={label}
            fontClass={fontClass}
          />
        </button>
        <button
          type="button"
          onClick={open}
          className={cn(
            'rounded-full border px-8 py-3 text-sm font-medium transition-all hover:scale-105',
            opened && 'opacity-0',
          )}
          style={{ color: th.ink, borderColor: th.ink }}
        >
          {openLabel}
        </button>
      </div>
    </IntroFontsContext.Provider>
  );
}
