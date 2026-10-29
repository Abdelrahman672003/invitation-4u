import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  ArrowLeft,
  CircleHelp,
  Crown,
  FileText,
  LayoutTemplate,
  ListChecks,
  Palette,
  UserCheck,
  Check,
  CloudOff,
  Eye,
  Loader2,
  Monitor,
  Pencil,
  Plus,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  applyDesignOverrides,
  localized,
  publishReadiness,
  type InvitationDto,
} from '@invite/shared';
import { InvitationLanding } from '@/components/invitation/InvitationLanding';
import { RsvpSample } from '@/components/invitation/RsvpSample';
import { ToggleRow as Toggle } from '@/components/ui/Toggle';
import { ButtonLink } from '@/components/ui/Button';
import { Alert, Badge } from '@/components/ui/Card';
import { isPosterTheme } from '@/components/invitation/ThemePoster';
import { EditorGuide, GUIDE_STEPS, guideSeen, markGuideSeen } from './EditorGuide';
import { PhotoField } from './PhotoField';
import { MusicField } from './MusicField';
import { GalleryField } from './GalleryField';
import { FontPicker } from './FontPicker';
import { ColorInput, DateInput, TimeInput } from '@/components/ui/Pickers';
import { EnvelopePicker } from './EnvelopePicker';
import { PageColors, PosterEntry } from './DesignPanelParts';
import { SIDEBAR_DEFAULT, SIDEBAR_MAX, SIDEBAR_MIN, useSidebarWidth } from './useSidebarWidth';
import { AccordionSection } from '@/features/studio/controls';
import { Guestbook } from '@/components/invitation/Guestbook';
import { guestbookLabels } from '@/components/invitation/guestbookLabels';
import { Field, Input } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { useTemplates } from '@/features/templates/api';
import { TemplateThumb } from '@/features/templates/TemplateThumb';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/cn';
import { useInvitation } from './api';
import { toRenderContent } from './renderContent';
import { useInvitationEditor, type SaveState } from './useInvitationEditor';

const textareaClass =
  'block w-full rounded-(--radius-field) border border-line-strong bg-surface px-4 py-3 text-ink shadow-field ' +
  'placeholder:text-muted focus:outline-none focus:ring-4 focus:ring-brand-100 focus:border-brand-500';

export function EditorPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const invitation = useInvitation(id);

  if (invitation.isPending) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner />
      </div>
    );
  }
  if (invitation.isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Alert title={t('editor.notFound')}>
          <ButtonLink to="/dashboard" variant="secondary" size="sm" className="mt-3">
            {t('editor.backToDashboard')}
          </ButtonLink>
        </Alert>
      </div>
    );
  }
  if (invitation.data.status === 'ARCHIVED') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Alert tone="warning" title={t('editor.archived')}>
          <ButtonLink to="/dashboard" variant="secondary" size="sm" className="mt-3">
            {t('editor.backToDashboard')}
          </ButtonLink>
        </Alert>
      </div>
    );
  }
  return <Editor invitation={invitation.data} />;
}

export function SaveStatus({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const { t } = useTranslation();
  if (state === 'error' || state === 'conflict') {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-danger-600" role="alert">
        <CloudOff className="size-4" aria-hidden />
        {t(state === 'conflict' ? 'editor.conflict' : 'editor.saveFailed')}
        {state === 'error' ? (
          <button type="button" onClick={onRetry} className="font-medium underline">
            {t('common.retry')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="font-medium underline"
          >
            {t('editor.reload')}
          </button>
        )}
      </span>
    );
  }
  const saving = state === 'saving' || state === 'dirty';
  return (
    <span
      className="inline-flex items-center gap-2 text-sm text-muted"
      role="status"
      aria-live="polite"
    >
      {saving ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Check className="size-4 text-success-600" aria-hidden />
      )}
      {t(saving ? 'common.saving' : 'common.saved')}
    </span>
  );
}

const EditorAccordion = createContext<{ open: string; toggle: (id: string) => void }>({
  open: '',
  toggle: () => undefined,
});

/** One collapsible part of the editor sidebar. Only one is open at a time. */
function Panel({
  id,
  icon,
  title,
  summary,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  summary?: string;
  children: ReactNode;
}) {
  const accordion = useContext(EditorAccordion);
  const isOpen = accordion.open === id;
  const firstRender = useRef(true);
  // When a section opens, bring it into view (the section that was open above it collapses meanwhile).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!isOpen) return;
    const timer = setTimeout(() => {
      document
        .getElementById(`ed-${id}-trigger`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => clearTimeout(timer);
  }, [id, isOpen]);
  return (
    <AccordionSection
      id={`ed-${id}`}
      icon={icon}
      title={title}
      summary={summary}
      open={isOpen}
      onToggle={() => accordion.toggle(id)}
    >
      {children}
    </AccordionSection>
  );
}

const HTTPS_URL = /^https:\/\/\S+$/;

/** Link field that only commits https URLs, so a half-typed address never reaches the autosave. */
function MapUrlField({ value, onValid }: { value: string; onValid: (value: string) => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState(value);
  const valid = text === '' || HTTPS_URL.test(text);
  return (
    <Field
      label={t('editor.fields.mapUrl')}
      hint={t('editor.fields.mapUrlHint')}
      error={valid ? undefined : t('validation.url')}
    >
      {(p) => (
        <Input
          {...p}
          dir="ltr"
          inputMode="url"
          maxLength={300}
          placeholder="https://maps.app.goo.gl/…"
          value={text}
          onChange={(e) => {
            const next = e.target.value.trim();
            setText(next);
            if (next === '' || HTTPS_URL.test(next)) onValid(next);
          }}
        />
      )}
    </Field>
  );
}

function Editor({ invitation }: { invitation: InvitationDto }) {
  const { t } = useTranslation();
  const uiLocale = currentLocale();
  const { draft, state, update, updateContent, retry, serverFieldErrors } =
    useInvitationEditor(invitation);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('mobile');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [openPanel, setOpenPanel] = useState('details');
  const [guideStep, setGuideStep] = useState<number | null>(() =>
    guideSeen(invitation.id) ? null : 0,
  );
  const goToGuideStep = (step: number) => {
    setGuideStep(step);
    const panel = GUIDE_STEPS[step]?.panel;
    if (panel) {
      setTab('edit');
      setOpenPanel(panel);
    }
  };
  const closeGuide = () => {
    markGuideSeen(invitation.id);
    setGuideStep(null);
  };
  const publishStep = guideStep === GUIDE_STEPS.length - 1;
  const sidebarWidth = useSidebarWidth();
  const templates = useTemplates(invitation.categorySlug);

  const template =
    templates.data?.find((item) => item.slug === draft.templateSlug) ?? invitation.template;
  const design = applyDesignOverrides(template.design, draft.content.design);
  const content = toRenderContent(draft, {
    placeholders: { t, categorySlug: invitation.categorySlug },
  });
  const missing = publishReadiness(draft.content, draft.eventDate);
  const fieldError = (name: string) => serverFieldErrors[name];
  const { content: c } = draft;

  const deviceButton = (value: 'desktop' | 'mobile', icon: ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => setDevice(value)}
      aria-pressed={device === value}
      aria-label={label}
      className={cn(
        'grid size-9 place-items-center rounded-full',
        device === value ? 'bg-brand-700 text-white' : 'text-ink-soft hover:bg-sunken',
      )}
    >
      {icon}
    </button>
  );

  const gridRef = useRef<HTMLDivElement>(null);
  const resizing = useRef(false);
  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    resizing.current = true;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Dragging still works while the pointer stays over the handle.
    }
  }
  function moveResize(event: ReactPointerEvent<HTMLDivElement>) {
    const grid = gridRef.current;
    if (!resizing.current || !grid) return;
    const rect = grid.getBoundingClientRect();
    const rtl = getComputedStyle(grid).direction === 'rtl';
    const next = rtl ? rect.right - event.clientX : event.clientX - rect.left;
    sidebarWidth.setWidth(Math.min(next, rect.width - 360));
  }
  function keyResize(event: ReactKeyboardEvent<HTMLDivElement>) {
    const rtl = gridRef.current ? getComputedStyle(gridRef.current).direction === 'rtl' : false;
    const grow = event.key === (rtl ? 'ArrowLeft' : 'ArrowRight');
    const shrink = event.key === (rtl ? 'ArrowRight' : 'ArrowLeft');
    if (grow || shrink) {
      event.preventDefault();
      sidebarWidth.setWidth(sidebarWidth.width + (grow ? 24 : -24));
    } else if (event.key === 'Home') {
      sidebarWidth.setWidth(SIDEBAR_DEFAULT);
    }
  }

  const sidebar = (
    <EditorAccordion.Provider
      value={{
        open: openPanel,
        toggle: (id) => setOpenPanel((current) => (current === id ? '' : id)),
      }}
    >
      <div className="space-y-3 p-3 sm:p-4">
        <Panel
          id="design"
          icon={<Palette className="size-5" />}
          title={t('editor.sections.design')}
          summary={localized(template, uiLocale)}
        >
          <PosterEntry invitationId={invitation.id} active={Boolean(c.design.studio)} />
          <div>
            <p className="mb-2 text-sm font-medium text-ink-soft">{t('editor.fields.template')}</p>
            <ul className="grid grid-cols-3 gap-2">
              {templates.data?.map((item) => (
                <li key={item.id} className="relative">
                  {item.isPremium && (
                    <span
                      className="pointer-events-none absolute end-1.5 top-1.5 z-10 inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-gold-200 via-gold-300 to-gold-500 px-1.5 py-0.5 text-[0.65rem] font-semibold text-brand-900 shadow-soft"
                      title={t('templates.premium')}
                    >
                      <Crown className="size-3" aria-hidden />
                      {t('templates.premium')}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => update({ templateSlug: item.slug })}
                    aria-pressed={item.slug === draft.templateSlug}
                    aria-label={localized(item, uiLocale)}
                    className={cn(
                      'block w-full rounded-lg p-0.5 ring-2',
                      item.slug === draft.templateSlug
                        ? 'ring-brand-600'
                        : 'ring-transparent hover:ring-line-strong',
                    )}
                  >
                    <TemplateThumb template={item} className="rounded-md" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="accent" className="text-sm font-medium text-ink-soft">
              {t('editor.fields.accent')}
            </label>
            <div className="flex items-center gap-2">
              <ColorInput
                id="accent"
                label={t('editor.fields.accent')}
                value={design.palette.accent}
                onChange={(accent) => updateContent({ design: { ...c.design, accent } })}
              />
              {c.design.accent && (
                <button
                  type="button"
                  className="text-sm text-brand-700 underline"
                  onClick={() => updateContent({ design: { ...c.design, accent: undefined } })}
                >
                  {t('editor.reset')}
                </button>
              )}
            </div>
          </div>
          <PageColors
            colors={c.design.colors}
            palette={design.palette}
            onChange={(colors) => updateContent({ design: { ...c.design, colors } })}
          />
        </Panel>

        <Panel
          id="details"
          icon={<FileText className="size-5" />}
          title={t('editor.sections.details')}
          summary={c.headline || undefined}
        >
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-ink-soft">{t('editor.fields.language')}</p>
            <div role="radiogroup" aria-label={t('editor.fields.language')} className="flex gap-2">
              {(['ar', 'en'] as const).map((locale) => (
                <button
                  key={locale}
                  type="button"
                  role="radio"
                  aria-checked={draft.contentLocale === locale}
                  onClick={() => update({ contentLocale: locale })}
                  className={cn(
                    'flex-1 rounded-full border px-3 py-2 text-sm',
                    draft.contentLocale === locale
                      ? 'border-brand-700 bg-brand-700 text-white'
                      : 'border-line-strong text-ink-soft hover:bg-sunken',
                  )}
                >
                  {t(`languages.${locale}`)}
                </button>
              ))}
            </div>
          </div>
          {isPosterTheme(design.theme) && (design.theme !== 'custom' || design.custom?.photo) && (
            <PhotoField
              invitationId={invitation.id}
              value={c.photo}
              onChange={(photo) => updateContent({ photo })}
            />
          )}
          <Field label={t('editor.fields.hostLine')} error={fieldError('content.hostLine')}>
            {(p) => (
              <Input
                {...p}
                value={c.hostLine}
                placeholder={t('editor.placeholders.hostLine')}
                maxLength={80}
                onChange={(e) => updateContent({ hostLine: e.target.value })}
              />
            )}
          </Field>
          <Field label={t('editor.fields.headline')} error={fieldError('content.headline')}>
            {(p) => (
              <Input
                {...p}
                value={c.headline}
                placeholder={t('editor.placeholders.headline')}
                maxLength={80}
                onChange={(e) => updateContent({ headline: e.target.value })}
              />
            )}
          </Field>
          <Field label={t('editor.fields.occasionLine')}>
            {(p) => (
              <Input
                {...p}
                value={c.occasionLine}
                placeholder={t('editor.placeholders.occasionLine')}
                maxLength={100}
                onChange={(e) => updateContent({ occasionLine: e.target.value })}
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('editor.fields.date')} error={fieldError('eventDate')}>
              {(p) => (
                <DateInput
                  id={p.id}
                  aria-describedby={p['aria-describedby']}
                  invalid={p.invalid}
                  value={draft.eventDate ?? ''}
                  onChange={(value) => update({ eventDate: value || null })}
                />
              )}
            </Field>
            <Field label={t('editor.fields.time')} error={fieldError('content.time')}>
              {(p) => (
                <TimeInput
                  id={p.id}
                  aria-describedby={p['aria-describedby']}
                  invalid={p.invalid}
                  value={c.time}
                  onChange={(time) => updateContent({ time })}
                />
              )}
            </Field>
          </div>
          <Field label={t('editor.fields.venueName')}>
            {(p) => (
              <Input
                {...p}
                value={c.venueName}
                placeholder={t('editor.placeholders.venueName')}
                maxLength={120}
                onChange={(e) => updateContent({ venueName: e.target.value })}
              />
            )}
          </Field>
          <Field label={t('editor.fields.venueAddress')}>
            {(p) => (
              <Input
                {...p}
                value={c.venueAddress}
                placeholder={t('editor.placeholders.venueAddress')}
                maxLength={200}
                onChange={(e) => updateContent({ venueAddress: e.target.value })}
              />
            )}
          </Field>
          <Field label={t('editor.fields.message')} hint={`${c.message.length}/400`}>
            {(p) => (
              <textarea
                id={p.id}
                aria-describedby={p['aria-describedby']}
                className={textareaClass}
                rows={3}
                maxLength={400}
                value={c.message}
                placeholder={t('editor.placeholders.message')}
                onChange={(e) => updateContent({ message: e.target.value })}
              />
            )}
          </Field>
        </Panel>

        <Panel
          id="optional"
          icon={<ListChecks className="size-5" />}
          title={t('editor.sections.optional')}
        >
          {(
            [
              'time',
              'address',
              'message',
              'countdown',
              'story',
              'schedule',
              'details',
              'envelope',
              'calendar',
              'guestbook',
              'gallery',
            ] as const
          ).map((key) => (
            <Toggle
              key={key}
              label={t(`editor.toggles.${key}`)}
              checked={c.sections[key]}
              onChange={(value) => updateContent({ sections: { ...c.sections, [key]: value } })}
            />
          ))}
          {c.sections.envelope && (
            <EnvelopePicker
              value={c.envelopeStyle}
              palette={design.palette}
              onChange={(envelopeStyle) => updateContent({ envelopeStyle })}
            />
          )}
        </Panel>

        <Panel
          id="landing"
          icon={<LayoutTemplate className="size-5" />}
          title={t('editor.sections.landing')}
        >
          <Field label={t('editor.fields.verse')} hint={`${c.verse.length}/300`}>
            {(p) => (
              <textarea
                id={p.id}
                className={textareaClass}
                rows={3}
                maxLength={300}
                value={c.verse}
                placeholder={t('editor.placeholders.verse')}
                onChange={(e) => updateContent({ verse: e.target.value })}
              />
            )}
          </Field>
          {c.verse.trim() !== '' && (
            <FontPicker
              label={t('editor.fields.verseFont')}
              value={c.verseFont}
              onChange={(verseFont) => updateContent({ verseFont })}
            />
          )}
          <GalleryField
            invitationId={invitation.id}
            value={c.gallery}
            layout={c.galleryLayout}
            onChange={(gallery) => updateContent({ gallery })}
            onLayoutChange={(galleryLayout) => updateContent({ galleryLayout })}
          />
          <MusicField
            invitationId={invitation.id}
            value={c.music}
            onChange={(music) => updateContent({ music })}
          />
          <Field label={t('editor.fields.story')} hint={`${c.story.length}/600`}>
            {(p) => (
              <textarea
                id={p.id}
                aria-describedby={p['aria-describedby']}
                className={textareaClass}
                rows={4}
                maxLength={600}
                value={c.story}
                placeholder={t('editor.placeholders.story')}
                onChange={(e) => updateContent({ story: e.target.value })}
              />
            )}
          </Field>
          {c.story.trim() !== '' && (
            <FontPicker
              label={t('editor.fields.storyFont')}
              value={c.storyFont}
              onChange={(storyFont) => updateContent({ storyFont })}
            />
          )}
          <div>
            <p className="mb-2 text-sm font-medium text-ink-soft">{t('editor.fields.schedule')}</p>
            <ul className="space-y-2">
              {c.schedule.map((item, index) => (
                <li key={index} className="flex items-center gap-2">
                  <TimeInput
                    aria-label={t('editor.fields.scheduleTime')}
                    className="w-36 shrink-0 px-3"
                    value={item.time}
                    onChange={(time) =>
                      updateContent({
                        schedule: c.schedule.map((row, i) =>
                          i === index ? { ...row, time: time || row.time } : row,
                        ),
                      })
                    }
                  />
                  <Input
                    aria-label={t('editor.fields.scheduleTitle')}
                    maxLength={60}
                    value={item.title}
                    onChange={(e) =>
                      updateContent({
                        schedule: c.schedule.map((row, i) =>
                          i === index ? { ...row, title: e.target.value } : row,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    aria-label={t('editor.fields.scheduleRemove')}
                    className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-sunken"
                    onClick={() =>
                      updateContent({ schedule: c.schedule.filter((_, i) => i !== index) })
                    }
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            {c.schedule.length < 6 && (
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
                onClick={() =>
                  updateContent({ schedule: [...c.schedule, { time: '19:00', title: '' }] })
                }
              >
                <Plus className="size-4" aria-hidden />
                {t('editor.fields.scheduleAdd')}
              </button>
            )}
          </div>
          <Field label={t('editor.fields.dressCode')}>
            {(p) => (
              <Input
                {...p}
                value={c.dressCode}
                placeholder={t('editor.placeholders.dressCode')}
                maxLength={80}
                onChange={(e) => updateContent({ dressCode: e.target.value })}
              />
            )}
          </Field>
          <Field label={t('editor.fields.notes')} hint={`${c.notes.length}/300`}>
            {(p) => (
              <textarea
                id={p.id}
                aria-describedby={p['aria-describedby']}
                className={textareaClass}
                rows={2}
                maxLength={300}
                value={c.notes}
                placeholder={t('editor.placeholders.notes')}
                onChange={(e) => updateContent({ notes: e.target.value })}
              />
            )}
          </Field>
          <MapUrlField value={c.mapUrl} onValid={(mapUrl) => updateContent({ mapUrl })} />
        </Panel>

        <Panel id="rsvp" icon={<UserCheck className="size-5" />} title={t('editorRsvp.title')}>
          <Toggle
            label={t('editorRsvp.enabled')}
            checked={c.rsvp.enabled}
            onChange={(value) => updateContent({ rsvp: { ...c.rsvp, enabled: value } })}
          />
          {c.rsvp.enabled && (
            <>
              <Toggle
                label={t('editorRsvp.askAttendees')}
                checked={c.rsvp.askAttendees}
                onChange={(value) => updateContent({ rsvp: { ...c.rsvp, askAttendees: value } })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('editorRsvp.max')}>
                  {(p) => (
                    <Input
                      {...p}
                      type="number"
                      min={1}
                      max={20}
                      value={c.rsvp.maxPerResponse}
                      onChange={(e) =>
                        updateContent({
                          rsvp: {
                            ...c.rsvp,
                            maxPerResponse: Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                          },
                        })
                      }
                    />
                  )}
                </Field>
                <Field label={t('editorRsvp.deadline')} error={fieldError('rsvpDeadline')}>
                  {(p) => (
                    <DateInput
                      id={p.id}
                      aria-describedby={p['aria-describedby']}
                      invalid={p.invalid}
                      value={draft.rsvpDeadline ?? ''}
                      onChange={(value) => update({ rsvpDeadline: value || null })}
                    />
                  )}
                </Field>
              </div>
            </>
          )}
        </Panel>
      </div>
    </EditorAccordion.Provider>
  );

  const preview = (
    <div className="flex justify-center p-4 sm:p-8">
      <div
        className={cn(
          'w-full transition-[max-width] duration-300',
          device === 'mobile' ? 'max-w-[24rem]' : 'max-w-4xl',
        )}
      >
        <InvitationLanding
          embedded
          design={design}
          content={draft.content}
          text={content}
          eventDate={draft.eventDate}
          locale={draft.contentLocale}
          rsvp={c.rsvp.enabled ? <RsvpSample locale={draft.contentLocale} /> : undefined}
          guestbook={
            <Guestbook
              sample
              entries={[]}
              locale={draft.contentLocale}
              palette={design.palette}
              labels={guestbookLabels(draft.contentLocale, 0)}
            />
          }
          className="rounded-2xl shadow-lift"
        />
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-2.5 sm:px-6">
        <Link
          to="/dashboard"
          className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-sunken"
          aria-label={t('editor.backToDashboard')}
        >
          <ArrowLeft className="size-5 rtl:-scale-x-100" />
        </Link>
        <input
          aria-label={t('editor.fields.title')}
          value={draft.title}
          maxLength={120}
          onChange={(e) => update({ title: e.target.value })}
          className="min-w-0 flex-1 basis-[calc(100%-3.5rem)] rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-semibold hover:border-line focus:border-brand-500 focus:outline-none sm:max-w-sm sm:basis-0"
        />
        <Badge tone="neutral">{t('status.DRAFT')}</Badge>
        <SaveStatus state={state} onRetry={retry} />
        <div className="ms-auto hidden items-center gap-1 md:flex">
          {deviceButton('mobile', <Smartphone className="size-4" />, t('editor.mobilePreview'))}
          {deviceButton('desktop', <Monitor className="size-4" />, t('editor.desktopPreview'))}
        </div>
        <ButtonLink
          to={`/invitations/${invitation.id}/manage`}
          size="sm"
          className={cn('ms-auto md:ms-2', publishStep && 'animate-pulse ring-4 ring-brand-300')}
        >
          {t('editorRsvp.manage')}
        </ButtonLink>
        <button
          type="button"
          onClick={() => goToGuideStep(0)}
          aria-label={t('editor.guide.restart')}
          title={t('editor.guide.restart')}
          className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-sunken"
        >
          <CircleHelp className="size-5" aria-hidden />
        </button>
        {guideStep !== null && (
          <EditorGuide
            step={guideStep}
            manageHref={`/invitations/${invitation.id}/manage`}
            missing={Object.keys(missing)}
            onStep={goToGuideStep}
            onClose={closeGuide}
          />
        )}
      </div>

      <div
        className="flex gap-1 border-b border-line bg-surface px-4 py-2 md:hidden"
        role="tablist"
      >
        {(['edit', 'preview'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm font-medium',
              tab === value ? 'bg-brand-50 text-brand-700' : 'text-ink-soft',
            )}
          >
            {value === 'edit' ? <Pencil className="size-4" /> : <Eye className="size-4" />}
            {t(`editor.tabs.${value}`)}
          </button>
        ))}
      </div>

      <div
        ref={gridRef}
        className="relative grid min-h-0 flex-1 md:grid-cols-[var(--sidebar-w)_1fr]"
        style={{ '--sidebar-w': `${sidebarWidth.width}px` } as CSSProperties}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t('editor.resize')}
          aria-valuemin={SIDEBAR_MIN}
          aria-valuemax={SIDEBAR_MAX}
          aria-valuenow={sidebarWidth.width}
          tabIndex={0}
          title={t('editor.resizeHint')}
          className="absolute inset-y-0 z-20 hidden w-2 -translate-x-1/2 cursor-col-resize touch-none transition-colors hover:bg-brand-600/30 focus-visible:bg-brand-600/40 md:block rtl:translate-x-1/2"
          style={{ insetInlineStart: sidebarWidth.width }}
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onPointerUp={() => (resizing.current = false)}
          onPointerCancel={() => (resizing.current = false)}
          onDoubleClick={sidebarWidth.reset}
          onKeyDown={keyResize}
        />
        <aside
          className={cn(
            'min-h-0 overflow-y-auto overscroll-contain border-line bg-surface pb-24 md:border-e md:pb-0',
            tab === 'preview' && 'hidden md:block',
          )}
        >
          {Object.keys(missing).length > 0 && (
            <div className="px-5 pt-5">
              <Alert tone="info" title={t('editor.readiness')}>
                <ul className="list-inside list-disc">
                  {Object.keys(missing).map((key) => (
                    <li key={key}>{t(`editor.missing.${key}`)}</li>
                  ))}
                </ul>
              </Alert>
            </div>
          )}
          {sidebar}
        </aside>
        <section
          className={cn(
            'min-h-0 overflow-y-auto overscroll-contain bg-sunken pb-24 md:pb-0',
            tab === 'edit' && 'hidden md:block',
          )}
          aria-label={t('editor.preview')}
        >
          {preview}
        </section>
      </div>
      <button
        type="button"
        onClick={() => setTab((current) => (current === 'edit' ? 'preview' : 'edit'))}
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] start-1/2 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-brand-700 px-6 font-medium text-white shadow-lift md:hidden ltr:-translate-x-1/2 rtl:translate-x-1/2"
      >
        {tab === 'edit' ? (
          <Eye className="size-5" aria-hidden />
        ) : (
          <Pencil className="size-5" aria-hidden />
        )}
        {t(tab === 'edit' ? 'editor.showPreview' : 'editor.backToEditing')}
      </button>
    </div>
  );
}
