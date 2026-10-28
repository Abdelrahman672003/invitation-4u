import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import i18n from 'i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Library, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CustomDesign, TemplateDesign } from '@invite/shared';
import { PageContainer } from '@/components/layout/Layouts';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { ToggleRow as Toggle } from '@/components/ui/Toggle';
import { DesignEditor, defaultCustom, defaultPalette } from '@/features/studio/DesignEditor';
import { useArtLibrary } from '@/features/studio/useArtLibrary';
import {
  AccordionSection,
  IconButton,
  Labeled,
  UploadButton,
  selectClass,
} from '@/features/studio/controls';
import { sampleContent } from '@/features/templates/sampleContent';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { mediaUrl, uploadAsset } from '@/lib/media';

type Palette = TemplateDesign['palette'];

interface FormState {
  categorySlug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  isPremium: boolean;
  palette: Palette;
  custom: CustomDesign;
}

const initial: FormState = {
  categorySlug: 'wedding',
  nameEn: '',
  nameAr: '',
  descriptionEn: '',
  descriptionAr: '',
  isPremium: false,
  palette: defaultPalette,
  custom: defaultCustom(),
};

export function TemplateBuilderPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const client = useQueryClient();
  const library = useArtLibrary();
  const [form, setForm] = useState<FormState>(initial);
  const [previewLocale, setPreviewLocale] = useState<'ar' | 'en'>('ar');
  const [saving, setSaving] = useState(false);

  const categories = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () =>
      (await api<{ data: { slug: string; nameEn: string; nameAr: string }[] }>('/admin/categories'))
        .data,
  });
  const existing = useQuery({
    queryKey: ['admin', 'template', id],
    enabled: Boolean(id),
    queryFn: async () =>
      (
        await api<{
          data: {
            categorySlug: string;
            nameEn: string;
            nameAr: string;
            descriptionEn: string;
            descriptionAr: string;
            isPremium: boolean;
            design: TemplateDesign;
          };
        }>(`/admin/templates/${id}`)
      ).data,
  });

  useEffect(() => {
    const data = existing.data;
    if (!data?.design.custom) return;
    setForm({
      categorySlug: data.categorySlug,
      nameEn: data.nameEn,
      nameAr: data.nameAr,
      descriptionEn: data.descriptionEn,
      descriptionAr: data.descriptionAr,
      isPremium: data.isPremium,
      palette: data.design.palette,
      custom: data.design.custom,
    });
  }, [existing.data]);

  const previewT = useMemo(() => i18n.getFixedT(previewLocale), [previewLocale]);
  const content = useMemo(
    () => sampleContent(previewT, form.categorySlug),
    [previewT, form.categorySlug],
  );

  async function save() {
    if (!form.nameEn.trim() || !form.nameAr.trim()) {
      toast.error(t('builder.namesRequired'));
      return;
    }
    setSaving(true);
    const design: TemplateDesign = {
      layout: 'centered',
      frame: 'none',
      ornament: 'none',
      pattern: 'none',
      font: 'elegant',
      theme: 'custom',
      custom: form.custom,
      palette: form.palette,
    };
    const body = {
      categorySlug: form.categorySlug,
      nameEn: form.nameEn.trim(),
      nameAr: form.nameAr.trim(),
      descriptionEn: form.descriptionEn.trim(),
      descriptionAr: form.descriptionAr.trim(),
      isPremium: form.isPremium,
      design,
    };
    try {
      if (id) await api(`/admin/templates/${id}`, { method: 'PUT', body });
      else await api('/admin/templates', { method: 'POST', body });
      await client.invalidateQueries({ queryKey: ['admin'] });
      toast.success(t(id ? 'builder.saved' : 'builder.created'));
      if (!id) navigate('/admin/templates');
    } catch {
      toast.error(t('builder.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (id && existing.isPending) {
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {t(id ? 'builder.editTitle' : 'builder.newTitle')}
        </h1>
        <Button onClick={() => void save()} loading={saving}>
          {t('common.save')}
        </Button>
      </div>
      <DesignEditor
        custom={form.custom}
        palette={form.palette}
        onChange={({ custom, palette }) => setForm((current) => ({ ...current, custom, palette }))}
        uploadImage={uploadAsset}
        library={library.data ?? []}
        content={content}
        dir={previewLocale === 'ar' ? 'rtl' : 'ltr'}
        eventDate="2026-12-10"
        previewTools={
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t('builder.preview')}</p>
            <div className="flex gap-1" role="group" aria-label={t('builder.previewLang')}>
              {(['ar', 'en'] as const).map((locale) => (
                <button
                  key={locale}
                  type="button"
                  aria-pressed={previewLocale === locale}
                  onClick={() => setPreviewLocale(locale)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium',
                    previewLocale === locale
                      ? 'border-brand-700 bg-brand-700 text-white'
                      : 'border-line-strong text-ink-soft',
                  )}
                >
                  {locale.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        }
        topSections={({ open, toggle }) => (
          <AccordionSection
            id="sec-basics"
            icon={<FileText className="size-5" />}
            title={t('builder.basics')}
            summary={form.nameEn || t('studio.unnamed')}
            open={open === 'basics'}
            onToggle={() => toggle('basics')}
          >
            <Labeled label={t('builder.nameEn')}>
              <Input
                dir="ltr"
                maxLength={80}
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              />
            </Labeled>
            <Labeled label={t('builder.nameAr')}>
              <Input
                dir="rtl"
                maxLength={80}
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              />
            </Labeled>
            <Labeled label={t('builder.descEn')}>
              <Input
                dir="ltr"
                maxLength={300}
                value={form.descriptionEn}
                onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
              />
            </Labeled>
            <Labeled label={t('builder.descAr')}>
              <Input
                dir="rtl"
                maxLength={300}
                value={form.descriptionAr}
                onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
              />
            </Labeled>
            <Labeled label={t('admin.category')}>
              <select
                className={selectClass}
                value={form.categorySlug}
                onChange={(e) => setForm({ ...form, categorySlug: e.target.value })}
              >
                {categories.data?.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {i18n.language === 'ar' ? category.nameAr : category.nameEn}
                  </option>
                ))}
              </select>
            </Labeled>
            <Toggle
              label={t('templates.premium')}
              checked={form.isPremium}
              onChange={(value) => setForm({ ...form, isPremium: value })}
            />
          </AccordionSection>
        )}
        extraSections={({ open, toggle }) => (
          <AccordionSection
            id="sec-library"
            icon={<Library className="size-5" />}
            title={t('studio.adminLibrary')}
            summary={t('studio.layerCount', { count: library.data?.length ?? 0 })}
            open={open === 'library'}
            onToggle={() => toggle('library')}
          >
            <LibraryManager />
          </AccordionSection>
        )}
      />
    </PageContainer>
  );
}

/** Admin: add ready-made artwork that customers can use in the Design Studio, or remove it. */
function LibraryManager() {
  const { t } = useTranslation();
  const toast = useToast();
  const client = useQueryClient();
  const library = useArtLibrary();
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  async function add(file: File | undefined) {
    if (!file) return;
    if (!label.trim()) {
      toast.error(t('studio.labelRequired'));
      return;
    }
    setBusy(true);
    try {
      const name = await uploadAsset(file);
      await api('/art-assets', { method: 'POST', body: { file: name, label: label.trim() } });
      setLabel('');
      await client.invalidateQueries({ queryKey: ['art-assets'] });
      toast.success(t('studio.artAdded'));
    } catch {
      toast.error(t('builder.uploadFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await api(`/art-assets/${id}`, { method: 'DELETE' });
    await client.invalidateQueries({ queryKey: ['art-assets'] });
  }

  return (
    <>
      <p className="text-sm text-ink-soft">{t('studio.adminLibraryHint')}</p>
      <Labeled label={t('studio.artLabel')}>
        <Input maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} />
      </Labeled>
      <UploadButton
        busy={busy}
        label={t('studio.addToLibrary')}
        onFile={(file) => void add(file)}
      />
      <ul className="grid grid-cols-3 gap-2">
        {library.data?.map((item) => (
          <li key={item.id} className="rounded-lg border border-line p-1.5 text-center">
            <img
              src={mediaUrl(item.file)}
              alt=""
              className="mx-auto aspect-square w-full rounded bg-sunken object-contain"
            />
            <div className="mt-1 flex items-center justify-between gap-1">
              <span className="truncate text-xs">{item.label}</span>
              <IconButton
                label={t('builder.remove')}
                icon={<Trash2 className="size-4" />}
                onClick={() => void remove(item.id)}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
