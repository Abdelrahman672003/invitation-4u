import { Compass, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Card';
import { PageContainer } from '@/components/layout/Layouts';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <PageContainer>
      <EmptyState
        icon={<Compass className="size-7" />}
        title={t('notFound.title')}
        body={t('notFound.body')}
        action={<ButtonLink to="/">{t('notFound.home')}</ButtonLink>}
      />
    </PageContainer>
  );
}

export function ForbiddenPage() {
  const { t } = useTranslation();
  return (
    <PageContainer>
      <EmptyState
        icon={<Lock className="size-7" />}
        title={t('forbidden.title')}
        body={t('forbidden.body')}
        action={<ButtonLink to="/">{t('notFound.home')}</ButtonLink>}
      />
    </PageContainer>
  );
}
