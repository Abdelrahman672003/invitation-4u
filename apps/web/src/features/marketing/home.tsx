import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  BarChart3,
  CalendarClock,
  Clock,
  Cake,
  Eye,
  Gem,
  GraduationCap,
  Heart,
  Languages,
  ListChecks,
  Lock,
  MapPin,
  MessageCircleHeart,
  PartyPopper,
  Send,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { invitationContentSchema, localized, type TemplateDto } from '@invite/shared';
import { EnvelopeArt, envelopeBackdrop, type EnvelopeKind } from '@/components/invitation/Envelope';
import { InvitationLanding } from '@/components/invitation/InvitationLanding';
import { OrnamentGraphic } from '@/components/invitation/ornaments';
import { RsvpSample } from '@/components/invitation/RsvpSample';
import { useCategories } from '@/features/categories/api';
import { toRenderContent } from '@/features/invitations/renderContent';
import { useTemplates } from '@/features/templates/api';
import { TemplateCard } from '@/features/templates/TemplateCard';
import { sampleContent } from '@/features/templates/sampleContent';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/cn';

type Item = { title: string; body: string };
type DemoCopy = {
  story: string;
  schedule: { time: string; title: string }[];
  dressCode: string;
  notes: string;
};

const categoryIcons: Record<string, LucideIcon> = {
  wedding: Heart,
  birthday: Cake,
  'engagement-bridal': Gem,
  graduation: GraduationCap,
};

/** Small gold label, display-font title and a hairline ornament: the heading style of every premium band. */
export function PremiumHeading({
  eyebrow,
  title,
  subtitle,
  dark,
  center = true,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  dark?: boolean;
  center?: boolean;
}) {
  return (
    <div className={cn('mb-12 max-w-2xl', center && 'mx-auto text-center')}>
      {eyebrow && (
        <p
          className={cn(
            'mb-3 text-sm font-medium uppercase tracking-[0.2em]',
            dark ? 'text-gold-300' : 'text-gold-600',
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          'font-display text-3xl font-semibold leading-tight sm:text-4xl',
          dark ? 'text-white' : 'text-ink',
        )}
      >
        {title}
      </h2>
      <div className={cn('mt-5 flex', center && 'justify-center')} aria-hidden>
        <span className={cn('block h-px w-20', dark ? 'bg-gold-400' : 'bg-gold-500')} />
      </div>
      {subtitle && (
        <p className={cn('mt-5 text-lg', dark ? 'text-brand-100' : 'text-ink-soft')}>{subtitle}</p>
      )}
    </div>
  );
}

/** Full-width band with an inner container, so sections can alternate backgrounds edge to edge. */
export function Band({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn('px-4 py-20 sm:px-6 sm:py-24', className)}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

/** A real invitation landing page built from sample text for an occasion, in the visitor's language. */
function useDemo(categorySlug: string, template: TemplateDto | undefined) {
  const { t } = useTranslation();
  const locale = currentLocale();
  return useMemo(() => {
    if (!template) return null;
    const sample = sampleContent(t, categorySlug);
    const copy = t(`homeDemo.${categorySlug}`, { returnObjects: true }) as DemoCopy;
    const content = invitationContentSchema.parse({
      hostLine: sample.label,
      headline: sample.title,
      occasionLine: sample.occasion,
      time: '19:00',
      venueName: sample.venue,
      venueAddress: sample.address ?? '',
      message: '',
      story: copy.story,
      schedule: copy.schedule,
      dressCode: copy.dressCode,
      notes: copy.notes,
      mapUrl: 'https://maps.google.com',
    });
    // A date roughly six weeks out keeps the countdown moving whenever the page is opened.
    const eventDate = new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10);
    return {
      content,
      eventDate,
      text: toRenderContent({ content, eventDate, contentLocale: locale }),
      design: template.design,
    };
  }, [t, categorySlug, template, locale]);
}

/** Scrolls its content slowly up and down; stops while the visitor touches it and when motion is reduced. */
function AutoScroll({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    let last = performance.now();
    let position = 0;
    let direction = 1;
    let pausedUntil = performance.now() + 1500;
    let held = false;
    const hold = () => {
      held = true;
    };
    const release = () => {
      held = false;
      position = node.scrollTop;
      pausedUntil = performance.now() + 2500;
    };
    const tick = (now: number) => {
      const elapsed = now - last;
      last = now;
      if (!held && now > pausedUntil) {
        position += direction * elapsed * 0.045;
        const max = node.scrollHeight - node.clientHeight;
        if (position >= max) {
          position = max;
          direction = -1;
          pausedUntil = now + 1800;
        } else if (position <= 0) {
          position = 0;
          direction = 1;
          pausedUntil = now + 1800;
        }
        node.scrollTop = position;
      }
      frame = requestAnimationFrame(tick);
    };
    node.addEventListener('pointerenter', hold);
    node.addEventListener('pointerleave', release);
    node.addEventListener('touchstart', hold, { passive: true });
    node.addEventListener('touchend', release);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener('pointerenter', hold);
      node.removeEventListener('pointerleave', release);
      node.removeEventListener('touchstart', hold);
      node.removeEventListener('touchend', release);
    };
  }, []);
  return (
    <div
      ref={ref}
      className={cn('[&::-webkit-scrollbar]:hidden', className)}
      style={{ scrollbarWidth: 'none' }}
    >
      {children}
    </div>
  );
}

const phoneEnvelope: Record<string, EnvelopeKind> = {
  wedding: 'classic',
  birthday: 'floral',
  'engagement-bridal': 'luxe',
  graduation: 'night',
};

/**
 * The sealed envelope a guest meets first, played on a loop inside the phone: it sits closed, opens
 * and lifts out the card, then fades to reveal the page. Skipped when motion is reduced.
 */
function PhoneEnvelope({
  categorySlug,
  design,
  title,
}: {
  categorySlug: string;
  design: TemplateDto['design'];
  title: string;
}) {
  const { t } = useTranslation();
  const [stage, setStage] = useState<'closed' | 'open' | 'page'>('closed');
  const [still, setStill] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setStill(true);
      return;
    }
    const wait = { closed: 2400, open: 3000, page: 10000 }[stage];
    const next = { closed: 'open', open: 'page', page: 'closed' }[stage] as typeof stage;
    const timer = setTimeout(() => setStage(next), wait);
    return () => clearTimeout(timer);
  }, [stage]);
  if (still) return null;
  const variant = phoneEnvelope[categorySlug] ?? 'classic';
  const look = envelopeBackdrop(variant, design.palette);
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 overflow-hidden rounded-[2rem] px-5 transition-opacity duration-700',
        stage === 'page' ? 'opacity-0' : 'opacity-100',
      )}
      style={{ background: look.background }}
    >
      <p className="text-center text-xs tracking-wide" style={{ color: look.ink }}>
        {t('landing.envelopeLabel')}
      </p>
      <div className="w-[92%]">
        <EnvelopeArt
          variant={variant}
          palette={design.palette}
          opened={stage !== 'closed'}
          title={title}
          label={t('landing.envelopeLabel')}
        />
      </div>
    </div>
  );
}

/** A phone showing a live, scrolling invitation page. */
export function PhoneDemo({
  categorySlug,
  template,
  className,
  envelope = true,
}: {
  categorySlug: string;
  template: TemplateDto | undefined;
  className?: string;
  envelope?: boolean;
}) {
  const demo = useDemo(categorySlug, template);
  const locale = currentLocale();
  return (
    <div
      className={cn(
        'relative mx-auto w-[17.5rem] rounded-[2.6rem] border-[9px] border-[#15121f] bg-[#15121f] shadow-[0_40px_80px_-20px_rgb(0_0_0/0.6)] sm:w-[19.5rem]',
        className,
      )}
      role="img"
      aria-label="Invitation preview"
    >
      <span
        className="absolute left-1/2 top-0 z-20 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-[#15121f]"
        aria-hidden
      />
      <AutoScroll className="h-[34rem] overflow-y-auto rounded-[2rem] bg-canvas sm:h-[37rem]">
        {demo ? (
          <InvitationLanding
            embedded
            design={demo.design}
            content={demo.content}
            text={demo.text}
            eventDate={demo.eventDate}
            locale={locale}
            rsvp={<RsvpSample locale={locale} />}
          />
        ) : (
          <div className="h-full animate-pulse bg-sunken" />
        )}
      </AutoScroll>
      {demo && envelope && (
        <PhoneEnvelope categorySlug={categorySlug} design={demo.design} title={demo.text.title} />
      )}
    </div>
  );
}

const anatomyIcons: LucideIcon[] = [
  Sparkles,
  Clock,
  CalendarClock,
  MessageCircleHeart,
  ListChecks,
  MapPin,
  PartyPopper,
  Send,
];

/** The sections every invitation page is made of. */
export function Anatomy({ items }: { items: Item[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => {
        const Icon = anatomyIcons[index] ?? Sparkles;
        return (
          <li
            key={item.title}
            className="group relative overflow-hidden rounded-3xl border border-gold-200 bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
          >
            <span
              className="absolute -end-2 -top-1 font-display text-9xl font-semibold text-gold-100 transition-colors group-hover:text-gold-200"
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="relative">
              <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-brand-800 text-gold-300">
                <Icon className="size-6" aria-hidden />
              </div>
              <h3 className="font-display text-xl font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.body}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Tabs per occasion; each shows real templates for it. */
export function OccasionShowcase() {
  const { t } = useTranslation();
  const locale = currentLocale();
  const categories = useCategories();
  const templates = useTemplates();
  const [selected, setSelected] = useState<string>();
  const active = selected ?? categories.data?.[0]?.slug;
  const shown = (templates.data ?? [])
    .filter((template) => template.categorySlug === active)
    .slice(0, 4);

  return (
    <div>
      <div
        role="tablist"
        aria-label={t('marketing.home.designs.title')}
        className="mb-10 flex flex-wrap justify-center gap-2"
      >
        {categories.data?.map((category) => {
          const Icon = categoryIcons[category.slug] ?? Heart;
          const on = category.slug === active;
          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setSelected(category.slug)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-5 py-2.5 font-medium transition-colors',
                on
                  ? 'border-brand-800 bg-brand-800 text-white shadow-soft'
                  : 'border-line-strong bg-surface text-ink-soft hover:border-gold-400 hover:text-ink',
              )}
            >
              <Icon className="size-4" aria-hidden />
              {localized(category, locale)}
            </button>
          );
        })}
      </div>
      {active && (
        <p className="mx-auto mb-10 max-w-xl text-center text-ink-soft">
          {t(`categories.${active}`, { defaultValue: '' })}
        </p>
      )}
      <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4" role="tabpanel">
        {templates.isPending &&
          Array.from({ length: 4 }, (_, index) => (
            <li key={index} className="aspect-[3/4] animate-pulse rounded-[1.75rem] bg-sunken" />
          ))}
        {shown.map((template) => (
          <li key={template.id}>
            <TemplateCard template={template} />
          </li>
        ))}
      </ul>
      <div className="mt-12 text-center">
        <Link
          // to={active ? `/categories/${active}` : '/templates'}
          to={'/templates'}
          className="font-medium text-brand-700 underline-offset-4 hover:underline"
        >
          {t('marketing.home.designs.more')}
        </Link>
      </div>
    </div>
  );
}

const toolIcons: LucideIcon[] = [Users, BarChart3, Send, Eye, Languages, Lock];

/** What the host gets after publishing. */
export function Tools({ items }: { items: Item[] }) {
  return (
    <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => {
        const Icon = toolIcons[index] ?? Sparkles;
        return (
          <li key={item.title} className="flex gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-full border border-gold-300 text-gold-600">
              <Icon className="size-5" aria-hidden />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{item.body}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Four numbered steps on a dark band, joined by a gold line. */
export function DarkSteps({ items }: { items: Item[] }) {
  return (
    <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
      <span
        className="absolute inset-x-0 top-5 hidden h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent lg:block"
        aria-hidden
      />
      {items.map((item, index) => (
        <li key={item.title} className="relative text-center">
          <span className="relative mx-auto mb-5 grid size-10 place-items-center rounded-full border border-gold-400 bg-brand-900 font-display text-lg font-semibold text-gold-300">
            {index + 1}
          </span>
          <h3 className="font-display text-xl font-semibold text-white">{item.title}</h3>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-brand-100">
            {item.body}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** Soft gold glow and ornament used behind dark bands. */
export function DarkBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -start-32 -top-32 size-[28rem] rounded-full bg-gold-500/20 blur-3xl" />
      <div className="absolute -bottom-40 -end-24 size-[26rem] rounded-full bg-brand-500/30 blur-3xl" />
      <div className="absolute inset-x-0 top-6 mx-auto w-40 text-gold-400/50">
        <OrnamentGraphic kind="floral" className="h-auto w-full" />
      </div>
    </div>
  );
}
