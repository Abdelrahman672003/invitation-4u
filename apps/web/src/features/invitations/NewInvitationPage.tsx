import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { localized } from '@invite/shared';
import { PageContainer, PageHeader } from '@/components/layout/Layouts';
import { Button } from '@/components/ui/Button';
import { Alert, Badge } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { useCategories } from '@/features/categories/api';
import { useTemplates } from '@/features/templates/api';
import { TemplateThumb } from '@/features/templates/TemplateThumb';
import { cn } from '@/lib/cn';
import { currentLocale } from '@/i18n';
import { useCreateInvitation } from './api';

export function NewInvitationPage() {
  const { t } = useTranslation();
  const locale = currentLocale();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [category, setCategory] = useState<string | undefined>();
  const [selected, setSelected] = useState<string | undefined>(params.get('template') ?? undefined);
  const [title, setTitle] = useState('');
  const [subtype, setSubtype] = useState('');
  const [titleError, setTitleError] = useState<string>();
  const categories = useCategories();
  const templates = useTemplates(category);
  const create = useCreateInvitation();

  const chosen = templates.data?.find((item) => item.slug === selected);
  const subtypes =
    categories.data?.find((item) => item.slug === chosen?.categorySlug)?.subtypes ?? [];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!chosen) return;
    if (!title.trim()) return setTitleError('validation.required');
    setTitleError(undefined);
    create.mutate(
      { templateSlug: chosen.slug, title: title.trim(), subtypeSlug: subtype || undefined, locale },
      { onSuccess: (invitation) => navigate(`/invitations/${invitation.id}/edit`) },
    );
  };

  const chip = (active: boolean) =>
    cn(
      'rounded-full border px-4 py-2 text-sm transition-colors',
      active
        ? 'border-brand-700 bg-brand-700 text-white'
        : 'border-line-strong bg-surface text-ink-soft hover:bg-sunken',
    );

  return (
    <PageContainer>
      <PageHeader title={t('newInvitation.title')} subtitle={t('newInvitation.subtitle')} />

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('templates.filter')}>
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

      <ul className="mt-6 grid gap-5 sm:grid-cols-3 lg:grid-cols-6">
        {templates.data?.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              onClick={() => setSelected(template.slug)}
              aria-pressed={template.slug === selected}
              className={cn(
                'block w-full rounded-xl p-1 text-start ring-2 transition',
                template.slug === selected
                  ? 'ring-brand-600'
                  : 'ring-transparent hover:ring-line-strong',
              )}
            >
              <TemplateThumb template={template} />
              <span className="mt-2 flex items-center justify-between gap-1 px-1 text-sm font-medium">
                {localized(template, locale)}
                {template.isPremium && <Badge tone="gold">{t('templates.premium')}</Badge>}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={submit}
        className="sticky bottom-8 mt-8 rounded-card border border-line bg-surface p-5 shadow-lift z-1000"
        noValidate
      >
        {!chosen ? (
          <p className="text-ink-soft">{t('newInvitation.pick')}</p>
        ) : (
          <div className="grid items-end gap-4 md:grid-cols-[1fr_14rem_auto]">
            <Field
              label={t('newInvitation.name')}
              hint={t('newInvitation.nameHint')}
              error={titleError}
            >
              {(p) => (
                <Input
                  {...p}
                  value={title}
                  maxLength={120}
                  onChange={(e) => setTitle(e.target.value)}
                />
              )}
            </Field>
            {subtypes.length > 0 ? (
              <Field label={t('newInvitation.subtype')}>
                {(p) => (
                  <select
                    id={p.id}
                    value={subtype}
                    onChange={(e) => setSubtype(e.target.value)}
                    className="block h-12 w-full rounded-(--radius-field) border border-line-strong bg-surface px-3"
                  >
                    <option value="">—</option>
                    {subtypes.map((item) => (
                      <option key={item.id} value={item.slug}>
                        {localized(item, locale)}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            ) : (
              <div />
            )}
            <Button type="submit" loading={create.isPending}>
              {t('newInvitation.create')}
            </Button>
          </div>
        )}
        {create.isError && <Alert className="mt-4">{t('newInvitation.error')}</Alert>}
      </form>
    </PageContainer>
  );
}
