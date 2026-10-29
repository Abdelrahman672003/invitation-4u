import { useEffect, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import QRCode from 'qrcode';
import { Link, useParams } from 'react-router';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import { applyDesignOverrides } from '@invite/shared';
import { InvitationLanding } from '@/components/invitation/InvitationLanding';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useInvitation } from './api';
import { publicUrl } from './ManagePage';
import { renderSource, toRenderContent } from './renderContent';

/**
 * Prints the invitation's cover exactly as it looks on the page (A5), with a QR code that opens
 * the invitation added in the corner. It uses the browser's print dialog, so the customer can
 * print it or save it as a PDF.
 */
export function PrintPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const invitation = useInvitation(id);
  const [qr, setQr] = useState('');
  const link = invitation.data ? publicUrl(invitation.data.slug) : '';

  useEffect(() => {
    if (!link) return;
    void QRCode.toDataURL(link, { margin: 1, width: 600, errorCorrectionLevel: 'M' }).then(setQr);
  }, [link]);

  if (invitation.isPending) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner />
      </div>
    );
  }
  if (invitation.isError || invitation.data.status !== 'PUBLISHED') {
    return (
      <div className="mx-auto max-w-md p-6">
        <Alert tone="warning">{t('print.notPublished')}</Alert>
        <Link
          to={id ? `/invitations/${id}/manage` : '/dashboard'}
          className="mt-4 inline-block underline"
        >
          {t('print.back')}
        </Link>
      </div>
    );
  }

  const data = invitation.data;
  const design = applyDesignOverrides(data.template.design, data.content.design);
  const text = toRenderContent(renderSource(data));
  const lt = i18n.getFixedT(data.contentLocale);

  return (
    <div className="min-h-dvh bg-sunken print:bg-white">
      {/* Only the cover (the invitation's first screen) is printed, exactly as it looks on the page. */}
      <style>{`
        @page { size: A5; margin: 0 }
        .print-cover, .print-cover * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-landing > div > :not(header) { display: none !important; }
        .print-cover header { min-height: 210mm !important; }
        .print-cover .animate-bounce { display: none !important; }
        @media print { body { background: #fff } }
      `}</style>
      <div className="mx-auto flex max-w-[148mm] items-center justify-between gap-3 px-4 py-4 print:hidden">
        <Link
          to={`/invitations/${data.id}/manage`}
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
          {t('print.back')}
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden />
          {t('print.print')}
        </Button>
      </div>
      <p className="mx-auto max-w-[148mm] px-4 pb-3 text-sm text-ink-soft print:hidden">
        {t('print.hint')}
      </p>

      <div className="print-cover relative mx-auto h-[210mm] w-[148mm] max-w-full overflow-hidden shadow-lift print:shadow-none">
        <div className="print-landing">
          <InvitationLanding
            embedded
            design={design}
            content={data.content}
            text={text}
            eventDate={data.eventDate}
            locale={data.contentLocale}
          />
        </div>
        {qr && (
          <div className="absolute bottom-[7mm] end-[7mm] z-50 flex w-[30mm] flex-col items-center gap-[1mm] rounded-md bg-white p-[2mm] text-center text-black shadow-soft print:shadow-none">
            <img src={qr} alt={lt('print.qrAlt')} className="size-[26mm]" />
            <span className="text-[6.5pt] leading-tight">{lt('print.scan')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
