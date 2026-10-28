import type { ReactNode } from 'react';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { localized } from '@invite/shared';
import { ButtonLink } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Card';
import { useCategories } from '@/features/categories/api';
import { CtaBand, FaqList, PricingCards } from '@/features/marketing/sections';
import {
  Anatomy,
  Band,
  DarkBackdrop,
  DarkSteps,
  OccasionShowcase,
  PhoneDemo,
  PremiumHeading,
  Tools,
} from '@/features/marketing/home';
import { useTemplates } from '@/features/templates/api';
import { TemplateCard } from '@/features/templates/TemplateCard';
import { TemplateThumb } from '@/features/templates/TemplateThumb';
import { currentLocale } from '@/i18n';

type Item = { title: string; body: string };
type Faq = { q: string; a: string };
type LegalSection = { h: string; p: string };

function Page({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-3 max-w-2xl text-ink-soft">{subtitle}</p>}
      <div className="mt-10">{children}</div>
    </div>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  const steps = t('marketing.steps.items', { returnObjects: true }) as Item[];
  const anatomy = t('marketing.home.anatomy.items', { returnObjects: true }) as Item[];
  const tools = t('marketing.home.tools.items', { returnObjects: true }) as Item[];
  const points = t('marketing.hero.points', { returnObjects: true }) as string[];
  const faq = t('marketing.faq.items', { returnObjects: true }) as Faq[];
  const included = t('marketing.pricingPage.items', { returnObjects: true }) as string[];
  const templates = useTemplates();
  const all = templates.data ?? [];
  const wedding =
    all.find((item) => item.categorySlug === 'wedding' && item.isPremium) ??
    all.find((item) => item.categorySlug === 'wedding');
  const sideLeft = all.find((item) => item.categorySlug === 'birthday');
  const sideRight = all.find((item) => item.categorySlug === 'graduation');

  return (
    <>
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-brand-900 via-brand-800 to-brand-900 px-4 pb-24 pt-20 text-white sm:px-6 lg:pt-28">
        <DarkBackdrop />
        <div className="relative mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-fade-up text-center lg:text-start">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold-400/50 px-4 py-1.5 text-sm font-medium text-gold-200">
              <Sparkles className="size-4" aria-hidden />
              {t('marketing.hero.eyebrow')}
            </p>
            <h1 className="font-display text-5xl font-semibold leading-[1.1] text-white sm:text-6xl">
              {t('marketing.hero.title')}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-brand-100 lg:mx-0">
              {t('marketing.hero.subtitle')}
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
              <ButtonLink to="/register" variant="gold" size="lg">
                {t('marketing.hero.primary')}
                <ArrowRight className="size-5 rtl:-scale-x-100" aria-hidden />
              </ButtonLink>
              <ButtonLink
                to="/templates"
                variant="secondary"
                size="lg"
                className="border-white/30 bg-transparent text-white hover:border-white/60 hover:bg-white/10"
              >
                {t('marketing.hero.secondary')}
              </ButtonLink>
            </div>
            <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-brand-100 lg:justify-start">
              {points.map((point) => (
                <li key={point} className="inline-flex items-center gap-2">
                  <Check className="size-4 text-gold-300" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div
              className="absolute inset-x-6 inset-y-10 -z-10 rounded-full bg-gold-400/20 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -start-10 top-20 z-0 hidden w-36 -rotate-6 lg:block"
              aria-hidden
            >
              {sideLeft && (
                <TemplateThumb
                  template={sideLeft}
                  className="rounded-xl shadow-lift ring-1 ring-white/20"
                />
              )}
            </div>
            <div
              className="pointer-events-none absolute -end-10 bottom-12 z-0 hidden w-36 rotate-6 lg:block"
              aria-hidden
            >
              {sideRight && (
                <TemplateThumb
                  template={sideRight}
                  className="rounded-xl shadow-lift ring-1 ring-white/20"
                />
              )}
            </div>
            <PhoneDemo categorySlug="wedding" template={wedding} className="relative z-10" />
          </div>
        </div>
      </section>

      <Band className="bg-canvas">
        <PremiumHeading
          eyebrow={t('marketing.home.anatomy.eyebrow')}
          title={t('marketing.home.anatomy.title')}
          subtitle={t('marketing.home.anatomy.subtitle')}
        />
        <Anatomy items={anatomy} />
      </Band>

      <Band className="bg-sunken">
        <PremiumHeading
          eyebrow={t('marketing.home.designs.eyebrow')}
          title={t('marketing.home.designs.title')}
          subtitle={t('marketing.home.designs.subtitle')}
        />
        <OccasionShowcase />
      </Band>

      <Band className="bg-canvas">
        <PremiumHeading
          eyebrow={t('marketing.home.tools.eyebrow')}
          title={t('marketing.home.tools.title')}
        />
        <Tools items={tools} />
      </Band>

      <section
        id="how-it-works"
        className="relative isolate scroll-mt-16 overflow-hidden bg-brand-900 px-4 py-20 sm:px-6 sm:py-24"
      >
        <DarkBackdrop />
        <div className="relative mx-auto max-w-6xl">
          <PremiumHeading
            dark
            eyebrow={t('marketing.home.steps.eyebrow')}
            title={t('marketing.steps.title')}
          />
          <DarkSteps items={steps} />
        </div>
      </section>

      <Band id="pricing" className="scroll-mt-16 bg-canvas">
        <PremiumHeading
          eyebrow={t('marketing.home.pricing.eyebrow')}
          title={t('marketing.pricing.title')}
          subtitle={t('marketing.pricing.subtitle')}
        />
        <PricingCards />
        <h3 className="mb-3 mt-12 text-center font-display text-xl font-semibold">
          {t('marketing.pricingPage.includes')}
        </h3>
        <ul className="mx-auto flex max-w-3xl flex-wrap justify-center gap-x-8 gap-y-2 text-ink-soft">
          {included.map((line) => (
            <li key={line} className="inline-flex items-center gap-2">
              <Check className="size-4 text-success-600" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      </Band>

      <Band id="faq" className="scroll-mt-16 bg-sunken">
        <div className="mx-auto max-w-3xl">
          <PremiumHeading
            eyebrow={t('marketing.home.faq.eyebrow')}
            title={t('marketing.faq.title')}
          />
          <FaqList items={faq} />
          <Link
            to="/contact"
            className="mt-6 inline-block text-sm font-medium text-brand-700 hover:underline"
          >
            {t('marketing.faq.more')}
          </Link>
        </div>
      </Band>

      <Band className="bg-canvas !py-16">
        <CtaBand />
      </Band>
    </>
  );
}

export function CategoryPage() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const locale = currentLocale();
  const categories = useCategories();
  const templates = useTemplates(slug);
  const category = categories.data?.find((item) => item.slug === slug);

  if (categories.data && !category) {
    return (
      <Page title={t('marketing.categoryPage.notFound')}>
        <ButtonLink to="/" variant="secondary">
          {t('marketing.categoryPage.back')}
        </ButtonLink>
      </Page>
    );
  }

  return (
    <Page
      title={category ? localized(category, locale) : t('common.loading')}
      subtitle={category ? t(`categories.${category.slug}`, { defaultValue: '' }) : undefined}
    >
      {category && category.subtypes.length > 0 && (
        <p className="-mt-4 mb-8 text-sm text-ink-soft">
          {t('marketing.categories.subtypes')}:{' '}
          {category.subtypes.map((subtype) => localized(subtype, locale)).join(' · ')}
        </p>
      )}
      <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {templates.data?.map((template) => (
          <li key={template.id}>
            <TemplateCard template={template} />
          </li>
        ))}
      </ul>
      {templates.data?.length === 0 && (
        <p className="text-muted">{t('marketing.categoryPage.empty')}</p>
      )}
    </Page>
  );
}

export function ContactPage() {
  const { t } = useTranslation();
  const email = import.meta.env.VITE_SUPPORT_EMAIL as string | undefined;
  return (
    <Page title={t('marketing.contact.title')} subtitle={t('marketing.contact.subtitle')}>
      <div className="max-w-xl rounded-card border border-line bg-surface p-6 shadow-soft">
        {email ? (
          <>
            <p className="text-sm text-muted">{t('marketing.contact.emailLabel')}</p>
            <a
              href={`mailto:${email}`}
              className="mt-1 block text-lg font-medium text-brand-700 hover:underline"
              dir="ltr"
            >
              {email}
            </a>
          </>
        ) : (
          <Alert tone="info">{t('marketing.contact.notConfigured')}</Alert>
        )}
        <p className="mt-4 text-sm text-ink-soft">{t('marketing.contact.hours')}</p>
      </div>
    </Page>
  );
}

export function LegalPage({ doc }: { doc: 'terms' | 'privacy' | 'refund' }) {
  const { t } = useTranslation();
  const sections = t(`legal.${doc}.sections`, { returnObjects: true }) as LegalSection[];
  return (
    <Page title={t(`legal.${doc}.title`)}>
      <div className="max-w-3xl">
        <Alert tone="warning">{t('legal.draft')}</Alert>
        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <section key={section.h}>
              <h2 className="text-lg font-semibold">{section.h}</h2>
              <p className="mt-1.5 text-ink-soft">{section.p}</p>
            </section>
          ))}
        </div>
      </div>
    </Page>
  );
}
