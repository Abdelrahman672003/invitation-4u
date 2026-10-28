import { useState } from 'react';
import { ArrowLeft, Check, Crown } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { localized } from '@invite/shared';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Alert, Badge } from '@/components/ui/Card';
import { useCurrentUser } from '@/features/auth/api';
import { useCategories } from '@/features/categories/api';
import { cn } from '@/lib/cn';
import { currentLocale } from '@/i18n';
import { useTemplate, useTemplates } from './api';
import { DarkBackdrop, PhoneDemo } from '@/features/marketing/home';
import { TemplateCard, TemplateStage } from './TemplateCard';
import { TemplateThumb } from './TemplateThumb';

export function TemplateGalleryPage() {
  const { t } = useTranslation();
  const locale = currentLocale();
  const [category, setCategory] = useState<string | undefined>();
  const categories = useCategories();
  const templates = useTemplates(category);

  const chip = (active: boolean) =>
    cn(
      'rounded-full border px-5 py-2 text-sm font-medium transition-colors',
      active
        ? 'border-gold-300 bg-gold-300 text-brand-900'
        : 'border-white/25 text-white hover:border-gold-300 hover:text-gold-200',
    );

  return (
    <>
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-brand-900 via-brand-800 to-brand-900 px-4 pb-14 pt-14 text-center sm:px-6">
        <DarkBackdrop />
        <div className="relative mx-auto max-w-3xl">
          <p className="mt-12 mb-3 text-sm font-medium uppercase tracking-[0.2em] text-gold-300">
            {t('templates.eyebrow')}
          </p>
          <h1 className="font-display text-4xl font-semibold text-white sm:text-5xl">
            {t('templates.title')}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-100">{t('templates.subtitle')}</p>
          <div
            className="mt-8 flex flex-wrap justify-center gap-2"
            role="group"
            aria-label={t('templates.filter')}
          >
            <button
              type="button"
              className={chip(!category)}
              aria-pressed={!category}
              onClick={() => setCategory(undefined)}
            >
              {t('templates.all')}
            </button>
            {categories.data?.map((item) => (
              <button
                key={item.id}
                type="button"
                className={chip(category === item.slug)}
                aria-pressed={category === item.slug}
                onClick={() => setCategory(item.slug)}
              >
                {localized(item, locale)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {templates.isError && (
          <Alert className="mb-8" title={t('templates.error')}>
            <Button variant="secondary" size="sm" onClick={() => templates.refetch()}>
              {t('common.retry')}
            </Button>
          </Alert>
        )}
        <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {templates.isPending &&
            Array.from({ length: 8 }, (_, index) => (
              <li key={index} className="aspect-[3/4] animate-pulse rounded-[1.75rem] bg-sunken" />
            ))}
          {templates.data?.map((template) => (
            <li key={template.id}>
              <TemplateCard template={template} />
            </li>
          ))}
        </ul>
        {templates.data?.length === 0 && <p className="text-muted">{t('templates.empty')}</p>}
      </div>
    </>
  );
}

export function TemplatePreviewPage() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const locale = currentLocale();
  const { data: user } = useCurrentUser();
  const template = useTemplate(slug);
  const sections = t('templates.includes', { returnObjects: true }) as string[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        to="/templates"
        className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
        {t('templates.back')}
      </Link>

      {template.isPending && (
        <div className="mt-6 h-[34rem] animate-pulse rounded-[1.75rem] bg-sunken" />
      )}
      {template.isError && (
        <Alert className="mt-6" title={t('templates.notFound')}>
          <ButtonLink to="/templates" variant="secondary" size="sm">
            {t('templates.back')}
          </ButtonLink>
        </Alert>
      )}
      {template.data && (
        <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <TemplateStage className="px-4 py-12 sm:px-10">
            <div className="relative mx-auto flex max-w-lg items-center justify-center">
              <div className="absolute -start-2 top-10 hidden w-44 -rotate-6 sm:block" aria-hidden>
                <TemplateThumb
                  template={template.data}
                  className="rounded-lg shadow-[0_22px_40px_-14px_rgb(0_0_0/0.7)]"
                />
              </div>
              <PhoneDemo
                categorySlug={template.data.categorySlug}
                template={template.data}
                className="relative z-10 sm:ms-24"
                envelope={false}
              />
            </div>
          </TemplateStage>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-semibold sm:text-4xl">
                {localized(template.data, locale)}
              </h1>
              {template.data.isPremium && (
                <Badge tone="gold" className="gap-1">
                  <Crown className="size-3.5" aria-hidden />
                  {t('templates.premium')}
                </Badge>
              )}
            </div>
            <div className="mt-4 h-px w-20 bg-gold-500" aria-hidden />
            <p className="mt-5 text-lg text-ink-soft">
              {locale === 'ar' ? template.data.descriptionAr : template.data.descriptionEn}
            </p>
            <ul className="mt-6 grid gap-2 text-ink-soft sm:grid-cols-2">
              {sections.map((line) => (
                <li key={line} className="inline-flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-gold-600" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink
                to={user ? `/invitations/new?template=${template.data.slug}` : '/register'}
                size="lg"
              >
                {t('templates.useTemplate')}
              </ButtonLink>
              <ButtonLink to="/templates" variant="secondary" size="lg">
                {t('templates.back')}
              </ButtonLink>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
