import { Link, useParams } from 'react-router';
import { ArrowLeft, Crown, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { directionFor, type InvitationDto } from '@invite/shared';
import { PageContainer } from '@/components/layout/Layouts';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { SaveStatus } from '@/features/invitations/EditorPage';
import { PhotoField } from '@/features/invitations/PhotoField';
import { useInvitation } from '@/features/invitations/api';
import { toRenderContent } from '@/features/invitations/renderContent';
import { useInvitationEditor } from '@/features/invitations/useInvitationEditor';
import { mediaUrl, uploadArt } from '@/lib/media';
import { DesignEditor, defaultCustom, defaultPalette } from './DesignEditor';
import { useArtLibrary } from './useArtLibrary';

/** The Design Studio: customers draw their own poster for one invitation (premium package). */
export function StudioPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const invitation = useInvitation(id);
  if (invitation.isPending) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner />
      </div>
    );
  }
  if (invitation.isError) {
    return (
      <PageContainer>
        <Alert tone="danger">{t('editor.notFound')}</Alert>
      </PageContainer>
    );
  }
  return <Studio invitation={invitation.data} />;
}

function Studio({ invitation }: { invitation: InvitationDto }) {
  const { t } = useTranslation();
  const library = useArtLibrary();
  const { draft, state, updateContent, retry } = useInvitationEditor(invitation);

  const studio = draft.content.design.studio;
  // Until the customer edits, the studio starts from the chosen template's artwork when it has any.
  const templateDesign = invitation.template.design;
  const custom = studio?.custom ?? templateDesign.custom ?? defaultCustom();
  const palette =
    studio?.palette ?? (templateDesign.custom ? templateDesign.palette : defaultPalette);
  const locale = draft.contentLocale;
  const content = toRenderContent(draft, {
    placeholders: { t, categorySlug: invitation.categorySlug },
  });

  return (
    <PageContainer>
      <Link
        to={`/invitations/${invitation.id}/edit`}
        className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
        {t('studio.backToEditor')}
      </Link>
      <div className="mb-4 mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{t('studio.title')}</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-brand-800">
            <Crown className="size-3.5" aria-hidden />
            {t('templates.premium')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <SaveStatus state={state} onRetry={retry} />
          {studio && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                updateContent({ design: { ...draft.content.design, studio: undefined } })
              }
            >
              <Undo2 className="size-4" aria-hidden />
              {t('studio.useTemplate')}
            </Button>
          )}
        </div>
      </div>
      <Alert tone={studio ? 'info' : 'warning'} className="mb-6">
        {t(studio ? 'studio.activeNote' : 'studio.startNote')} {t('studio.premiumNote')}
      </Alert>
      <DesignEditor
        custom={custom}
        palette={palette}
        onChange={(next) => updateContent({ design: { ...draft.content.design, studio: next } })}
        uploadImage={(file) => uploadArt(invitation.id, file)}
        library={library.data ?? []}
        content={content}
        dir={directionFor(locale)}
        eventDate={draft.eventDate}
        photo={draft.content.photo ? mediaUrl(draft.content.photo) : null}
        photoControls={
          <PhotoField
            invitationId={invitation.id}
            value={draft.content.photo}
            onChange={(photo) => updateContent({ photo })}
          />
        }
      />
    </PageContainer>
  );
}
