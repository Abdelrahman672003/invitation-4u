import type { ReactNode } from 'react';
import {
  CalendarDays,
  Cake,
  Check,
  Crown,
  GraduationCap,
  Gem,
  Heart,
  Images,
  Languages,
  Mail,
  MessageSquareHeart,
  Music,
  ShieldCheck,
  Sparkles,
  Timer,
  UserCheck,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FREE_PLAN, localized } from '@invite/shared';
import { ButtonLink } from '@/components/ui/Button';
import { Alert, Badge, Card } from '@/components/ui/Card';
import { useCategories } from '@/features/categories/api';
import { usePackages } from '@/features/packages/api';
import { useTemplates } from '@/features/templates/api';
import { TemplateThumb } from '@/features/templates/TemplateThumb';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';

interface Item {
  title: string;
  body: string;
}

const categoryIcons: Record<string, LucideIcon> = {
  wedding: Heart,
  birthday: Cake,
  'engagement-bridal': Gem,
  graduation: GraduationCap,
};

export function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-2 text-ink-soft">{subtitle}</p>}
    </div>
  );
}

export function CategoryGrid() {
  const { t } = useTranslation();
  const locale = currentLocale();
  const categories = useCategories();
  return (
    <div>
      {categories.isError && <Alert>{t('home.categoriesError')}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.isPending &&
          Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-card bg-sunken" />
          ))}
        {categories.data?.map((category) => {
          const Icon = categoryIcons[category.slug] ?? Heart;
          return (
            <Link key={category.id} to={`/categories/${category.slug}`} className="group block">
              <Card className="h-full p-6 transition-shadow group-hover:shadow-lift">
                <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                  <Icon className="size-6" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold">{localized(category, locale)}</h3>
                <p className="mt-1.5 text-sm text-ink-soft">
                  {t(`categories.${category.slug}`, { defaultValue: '' })}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function FeaturedTemplates({ count = 4 }: { count?: number }) {
  const { t } = useTranslation();
  const locale = currentLocale();
  const templates = useTemplates();
  // One per category first, so the strip shows the range of occasions.
  const picked = (() => {
    const all = templates.data ?? [];
    const firstPerCategory = all.filter(
      (item, index) => all.findIndex((x) => x.categorySlug === item.categorySlug) === index,
    );
    return [...firstPerCategory, ...all.filter((item) => !firstPerCategory.includes(item))].slice(
      0,
      count,
    );
  })();
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {templates.isPending &&
        Array.from({ length: count }, (_, index) => (
          <li key={index} className="aspect-[3/4] animate-pulse rounded-xl bg-sunken" />
        ))}
      {picked.map((template) => (
        <li key={template.id}>
          <Link to={`/templates/${template.slug}`} className="group block">
            <div className="transition-transform duration-200 group-hover:-translate-y-1">
              <TemplateThumb template={template} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="font-medium">{localized(template, locale)}</span>
              {template.isPremium && <Badge tone="gold">{t('templates.premium')}</Badge>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Steps({ items }: { items: Item[] }) {
  return (
    <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => (
        <li key={item.title} className="relative">
          <span className="mb-3 grid size-10 place-items-center rounded-full bg-brand-700 font-semibold text-white">
            {index + 1}
          </span>
          <h3 className="text-lg font-semibold">{item.title}</h3>
          <p className="mt-1.5 text-sm text-ink-soft">{item.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function Benefits({ items }: { items: Item[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.title} className="p-6">
          <h3 className="text-lg font-semibold">{item.title}</h3>
          <p className="mt-1.5 text-sm text-ink-soft">{item.body}</p>
        </Card>
      ))}
    </div>
  );
}

const everyPlan: Array<{ key: string; icon: LucideIcon }> = [
  { key: 'envelope', icon: Mail },
  { key: 'countdown', icon: Timer },
  { key: 'calendar', icon: CalendarDays },
  { key: 'rsvp', icon: UserCheck },
  { key: 'guestbook', icon: MessageSquareHeart },
  { key: 'gallery', icon: Images },
  { key: 'music', icon: Music },
  { key: 'bilingual', icon: Languages },
];

/** One line in a plan: ticked when included, dimmed and crossed when it is not. */
function Line({ included, children }: { included: boolean; children: ReactNode }) {
  return (
    <li
      className={cn(
        'flex items-start gap-2.5',
        !included && 'text-muted line-through decoration-line-strong',
      )}
    >
      {included ? (
        <Check className="mt-0.5 size-4 shrink-0 text-success-600" aria-hidden />
      ) : (
        <X className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
      )}
      <span>{children}</span>
    </li>
  );
}

export function PricingCards() {
  const { t } = useTranslation();
  const locale = currentLocale();
  const packages = usePackages();
  return (
    <div>
      {packages.isError && <Alert>{t('marketing.pricing.error')}</Alert>}
      <div className="grid items-stretch gap-6 md:grid-cols-3">
        <Card className="flex flex-col border-dashed p-7 transition-transform duration-300 hover:-translate-y-1">
          <Badge tone="info" className="self-start">
            {t('pricingPlus.tryIt')}
          </Badge>
          <h3 className="mt-3 text-xl font-semibold">{t('freePricing.name')}</h3>
          <p className="mt-3 text-4xl font-semibold">{t('freePricing.price')}</p>
          <p className="mt-1 text-sm text-muted">
            {t('pricingPlus.freeNote', { hours: FREE_PLAN.durationHours })}
          </p>
          <ul className="mt-6 flex-1 space-y-3 text-sm">
            <Line included>{t('pricingPlus.liveHours', { hours: FREE_PLAN.durationHours })}</Line>
            <Line included>
              {t('marketing.pricing.upToGuests', { count: FREE_PLAN.maxGuests })}
            </Line>
            <Line included>{t('marketing.pricing.premiumNo')}</Line>
            <Line included={false}>{t('pricingPlus.noWatermark')}</Line>
            <Line included={false}>{t('pricingPlus.permanentLink')}</Line>
            <Line included={false}>{t('pricingPlus.premiumTemplates')}</Line>
            <Line included={false}>{t('pricingPlus.studio')}</Line>
          </ul>
          <ButtonLink to="/register" className="mt-7" variant="secondary">
            {t('pricingPlus.startFree')}
          </ButtonLink>
        </Card>
        {packages.isPending && (
          <div className="h-96 animate-pulse rounded-card bg-sunken md:col-span-2" />
        )}
        {packages.data?.map((pkg) => {
          const premium = pkg.premiumTemplates;
          return (
            <Card
              key={pkg.id}
              className={cn(
                'relative flex flex-col p-7 transition-transform duration-300 hover:-translate-y-1',
                premium &&
                  'border-2 border-gold-400 bg-gradient-to-b from-gold-50 via-surface to-surface shadow-lift md:-translate-y-3 md:hover:-translate-y-4',
              )}
            >
              {premium && (
                <span className="absolute -top-3.5 start-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gradient-to-r from-gold-300 to-gold-500 px-4 py-1 text-xs font-semibold text-brand-900 shadow-soft rtl:translate-x-1/2">
                  <Crown className="size-3.5" aria-hidden />
                  {t('pricingPlus.popular')}
                </span>
              )}
              <h3 className="text-xl font-semibold">{localized(pkg, locale)}</h3>
              <p className="mt-3">
                <span className="text-4xl font-semibold">
                  {formatMoney(pkg.priceMinor, pkg.currency, locale)}
                </span>
                <span className="ms-2 text-sm text-muted">
                  {t('marketing.pricing.perInvitation')}
                </span>
              </p>
              <p className="mt-1 text-sm text-muted">{t('pricingPlus.oneTime')}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {pkg.maxGuests && (
                  <Line included>
                    {t('marketing.pricing.upToGuests', { count: pkg.maxGuests })}
                  </Line>
                )}
                <Line included>{t('pricingPlus.permanentLink')}</Line>
                <Line included>{t('pricingPlus.noWatermark')}</Line>
                <Line included>{t('marketing.pricing.premiumNo')}</Line>
                <Line included={premium}>{t('pricingPlus.premiumTemplates')}</Line>
                <Line included={premium}>{t('pricingPlus.studio')}</Line>
                <Line included={premium}>{t('pricingPlus.colors')}</Line>
              </ul>
              <ButtonLink to="/register" className="mt-7" variant={premium ? 'gold' : 'primary'}>
                {t(premium ? 'pricingPlus.choosePremium' : 'marketing.pricing.choose')}
              </ButtonLink>
            </Card>
          );
        })}
      </div>

      <div className="mt-14 rounded-card border border-line bg-surface p-6 sm:p-8">
        <h3 className="flex items-center justify-center gap-2 text-center text-lg font-semibold">
          <Sparkles className="size-5 text-gold-500" aria-hidden />
          {t('pricingPlus.everyPlan')}
        </h3>
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          {everyPlan.map(({ key, icon: Icon }) => (
            <li key={key} className="flex flex-col items-center gap-2 text-center">
              <span
                className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700"
                aria-hidden
              >
                <Icon className="size-5" />
              </span>
              <span className="text-sm font-medium">{t(`pricingPlus.every.${key}`)}</span>
            </li>
          ))}
        </ul>
      </div>

      <ul className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-ink-soft">
        {(['noSubscription', 'designFree', 'secure'] as const).map((key) => (
          <li key={key} className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-success-600" aria-hidden />
            {t(`pricingPlus.trust.${key}`)}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-sm text-muted">{t('marketing.pricing.note')}</p>
    </div>
  );
}

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-line rounded-card border border-line bg-surface">
      {items.map((item) => (
        <details key={item.q} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
            {item.q}
            <span
              className="text-xl leading-none text-muted transition-transform group-open:rotate-45"
              aria-hidden
            >
              +
            </span>
          </summary>
          <p className="mt-3 text-ink-soft">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

export function CtaBand() {
  const { t } = useTranslation();
  return (
    <div className="rounded-[2rem] bg-brand-800 px-6 py-12 text-center text-white sm:px-12">
      <h2 className="text-2xl font-semibold sm:text-3xl text-white">{t('marketing.cta.title')}</h2>
      <p className="mx-auto mt-3 max-w-xl text-brand-100">{t('marketing.cta.body')}</p>
      <ButtonLink to="/register" variant="gold" size="lg" className="mt-7">
        {t('marketing.cta.button')}
      </ButtonLink>
    </div>
  );
}
