/** A thin progress bar for a file that is being uploaded (0 to 1). */
export function UploadBar({ fraction, label }: { fraction: number; label?: string }) {
  const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] duration-150"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-ink-soft" dir="auto">
        {label ? `${label} ` : ''}
        {percent}%
      </p>
    </div>
  );
}
