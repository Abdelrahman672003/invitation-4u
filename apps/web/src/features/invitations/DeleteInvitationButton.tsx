import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { InvitationDto } from '@invite/shared';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useDeleteInvitation } from './api';

/**
 * Permanent delete for invitations that were never paid for. The server enforces the same rule;
 * paid invitations simply do not get the button. The confirmation says what is lost.
 */
export function DeleteInvitationButton({
  invitation,
  onDeleted,
}: {
  invitation: InvitationDto;
  onDeleted?: () => void;
}) {
  const { t } = useTranslation();
  const remove = useDeleteInvitation();
  const confirm = useConfirm();
  if (invitation.paid) return null;

  const confirmText = t(
    invitation.status === 'PUBLISHED'
      ? 'dashboard.deleteConfirmPublished'
      : 'dashboard.deleteConfirm',
    {
      title: invitation.title,
    },
  );
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-danger-600 hover:bg-danger-50 hover:text-danger-700"
      loading={remove.isPending}
      onClick={async () => {
        if (
          await confirm({
            message: confirmText,
            confirmLabel: t('dashboard.delete'),
            tone: 'danger',
          })
        )
          remove.mutate(invitation.id, { onSuccess: () => onDeleted?.() });
      }}
    >
      <Trash2 className="size-4" aria-hidden />
      {t('dashboard.delete')}
    </Button>
  );
}
