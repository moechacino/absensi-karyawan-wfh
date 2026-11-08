import type { components } from '../api/schema'
import { Alert } from '../ui/Feedback'

export function ImpactSummary({
  impact,
}: {
  impact: components['schemas']['ChangeImpact']
}) {
  return (
    <div className="space-y-3">
      <Alert
        title={
          impact.canApply
            ? 'Konfigurasi dapat diterapkan'
            : 'Periksa konfigurasi'
        }
        tone={impact.canApply ? 'success' : 'warning'}
      >
        {impact.canApply
          ? 'Tinjau perubahan sebelum menyimpan untuk seluruh perusahaan.'
          : 'Perbaiki masalah berikut dan lakukan peninjauan ulang.'}
      </Alert>
      {impact.issues.length > 0 && (
        <ul className="space-y-2" aria-label="Masalah konfigurasi">
          {impact.issues.map((issue, index) => (
            <li
              key={`${issue.code}-${index}`}
              className="rounded-control bg-warning-soft p-3 text-small"
            >
              {issue.message}
              {issue.field && (
                <span className="ml-1 text-text-muted">({issue.field})</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
