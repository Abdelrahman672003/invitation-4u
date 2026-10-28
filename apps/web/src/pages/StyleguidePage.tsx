import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert, Badge, Card, EmptyState } from '@/components/ui/Card';
import { Field, Input, PasswordInput } from '@/components/ui/Field';
import { PageContainer, PageHeader } from '@/components/layout/Layouts';

const swatches = [
  ['canvas', 'bg-canvas'],
  ['surface', 'bg-surface'],
  ['sunken', 'bg-sunken'],
  ['ink', 'bg-ink'],
  ['brand-700', 'bg-brand-700'],
  ['brand-100', 'bg-brand-100'],
  ['gold-500', 'bg-gold-500'],
  ['gold-100', 'bg-gold-100'],
  ['success-600', 'bg-success-600'],
  ['danger-600', 'bg-danger-600'],
] as const;

/** Development-only reference of the design system (route only registered in dev). */
export function StyleguidePage() {
  return (
    <PageContainer>
      <PageHeader
        title="نظام التصميم · Design system"
        subtitle="Tokens and base components used across the product."
      />
      <div className="space-y-10">
        <section>
          <h2 className="mb-4 text-xl font-semibold">Colours</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {swatches.map(([name, cls]) => (
              <div key={name} className="overflow-hidden rounded-xl border border-line">
                <div className={`h-16 ${cls}`} />
                <p className="px-3 py-2 text-xs text-ink-soft" dir="ltr">
                  {name}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="mb-4 text-xl font-semibold">Typography</h2>
          <p className="font-display text-4xl font-semibold">سارة & عمر — Sara & Omar</p>
          <p className="text-lg">
            نص أساسي بخط IBM Plex Sans Arabic مع English mixed content و 2026/12/12.
          </p>
          <p className="text-sm text-muted">Muted helper text · نص مساعد</p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Primary · أساسي</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="gold">Gold</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <Card className="space-y-4 p-6">
            <Field label="الاسم">{(props) => <Input placeholder="سارة" {...props} />}</Field>
            <Field label="البريد الإلكتروني" error="validation.email">
              {(props) => <Input type="email" defaultValue="sara@" {...props} />}
            </Field>
            <Field label="كلمة المرور" hint="10 أحرف على الأقل">
              {(props) => <PasswordInput {...props} />}
            </Field>
          </Card>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge>Draft</Badge>
              <Badge tone="warning">Pending payment</Badge>
              <Badge tone="success">Published</Badge>
              <Badge tone="info">Unpublished</Badge>
              <Badge tone="danger">Failed</Badge>
              <Badge tone="gold">Premium</Badge>
            </div>
            <Alert tone="success" title="تم الحفظ">
              Changes saved.
            </Alert>
            <Alert tone="warning">Your RSVP deadline is tomorrow.</Alert>
            <Alert>Something went wrong.</Alert>
          </div>
        </section>

        <EmptyState
          icon={<Heart className="size-7" />}
          title="Empty state"
          body="Helpful copy and one clear next step."
          action={<Button>Action</Button>}
        />
      </div>
    </PageContainer>
  );
}
