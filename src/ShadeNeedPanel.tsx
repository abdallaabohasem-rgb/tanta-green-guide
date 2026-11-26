import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Coordinates } from './plantingData';
import type { ShadeNeedReport } from './shadeNeeds';

export interface ShadeNotice {
  text: string;
  tone: 'status' | 'alert';
}

interface Props {
  reports: ShadeNeedReport[];
  activeId: string | null;
  picking: boolean;
  draftOpen: boolean;
  draftLocation: Coordinates | null;
  reason: string;
  notice: ShadeNotice | null;
  onStartReport: () => void;
  onStartMovingPoint: () => void;
  onCancelPicking: () => void;
  onCancelDraft: () => void;
  onReasonChange: (value: string) => void;
  onSave: () => boolean;
  onSelectReport: (report: ShadeNeedReport, trigger: HTMLButtonElement) => void;
}

const format = new Intl.NumberFormat('ar-EG');

export function ShadeNeedPanel({
  reports,
  activeId,
  picking,
  draftOpen,
  draftLocation,
  reason,
  notice,
  onStartReport,
  onStartMovingPoint,
  onCancelPicking,
  onCancelDraft,
  onReasonChange,
  onSave,
  onSelectReport,
}: Props) {
  const [reasonError, setReasonError] = useState('');
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  function handleReasonChange(value: string) {
    onReasonChange(value);
    if (reasonError && value.trim()) setReasonError('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftLocation) return;
    if (!reason.trim()) {
      setReasonError('اكتب سبب الاحتياج للظل قبل الحفظ (ما ينفعش يبقى فاضي).');
      reasonRef.current?.focus();
      return;
    }
    setReasonError('');
    onSave();
  }

  function startOrReset() {
    setReasonError('');
    onStartReport();
  }

  function cancelWholeDraft() {
    setReasonError('');
    onCancelDraft();
  }

  return (
    <section className="shade-need-panel" aria-labelledby="shade-need-heading">
      <div className="shade-need-header">
        <h2 id="shade-need-heading" tabIndex={-1}>محتاجين ظل هنا</h2>
        {!draftOpen && (
          <button type="button" className="shade-need-start" onClick={startOrReset}>
            بلّغ عن احتياج للظل
          </button>
        )}
      </div>
      <p className="shade-need-intro">
        حدّد مكان محتاج ظل واكتب السبب. البلاغات بتتحفظ على المتصفح ده فقط كـ«احتياج للظل»، ومش بتتحوّل لموقع زراعة مقترح إلا بعد المراجعة مستقبلًا.
      </p>

      {draftOpen && (
        <div className="shade-need-draft">
          {picking && !draftLocation && (
            <>
              <p className="shade-need-prompt" role="status">
                اضغط على المكان اللي محتاج ظل على الخريطة، أو حرّك الخريطة واضغط «اختار مركز الخريطة».
              </p>
              <div className="shade-need-actions">
                <button type="button" onClick={cancelWholeDraft}>إلغاء البلاغ</button>
              </div>
            </>
          )}

          {draftLocation && (
            <>
              <p className="shade-need-coords">
                النقطة المختارة:{' '}
                <bdi dir="ltr">{draftLocation.map(value => value.toFixed(5)).join(', ')}</bdi>
              </p>
              {picking ? (
                <>
                  <p className="shade-need-prompt" role="status">
                    اضغط على المكان الجديد على الخريطة أو استخدم «اختار مركز الخريطة» لنقل النقطة.
                  </p>
                  <div className="shade-need-actions">
                    <button type="button" onClick={onCancelPicking}>إلغاء تحريك النقطة</button>
                    <button type="button" onClick={cancelWholeDraft}>إلغاء البلاغ</button>
                  </div>
                </>
              ) : (
                <div className="shade-need-actions">
                  <button type="button" onClick={onStartMovingPoint}>حرّك النقطة</button>
                  <button type="button" onClick={cancelWholeDraft}>إلغاء البلاغ</button>
                </div>
              )}

              <form className="shade-need-form" onSubmit={handleSubmit} noValidate>
                <label htmlFor="shade-need-reason">سبب الاحتياج للظل</label>
                <p id="shade-reason-help" className="survey-help">
                  مثال: محطة مواصلات مكشوفة، رصيف مدرسة، أو ممر مشاة مشمس وقت الظهر.
                </p>
                <textarea
                  ref={reasonRef}
                  id="shade-need-reason"
                  name="shadeReason"
                  rows={3}
                  maxLength={400}
                  value={reason}
                  onChange={event => handleReasonChange(event.currentTarget.value)}
                  aria-invalid={!!reasonError}
                  aria-describedby={reasonError ? 'shade-reason-help shade-reason-error' : 'shade-reason-help'}
                />
                {reasonError && (
                  <p id="shade-reason-error" className="field-error" role="alert">
                    {reasonError}
                  </p>
                )}
                <button type="submit" className="shade-need-save">
                  احفظ البلاغ على الجهاز
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {notice && (
        <p className="shade-need-notice" role={notice.tone}>
          {notice.text}
        </p>
      )}

      <div className="shade-need-saved">
        <h3>
          بلاغات «احتياج للظل» على هذا الجهاز ({format.format(reports.length)})
        </h3>
        {reports.length === 0 ? (
          <p className="shade-need-empty">لسه مفيش بلاغات محفوظة على المتصفح ده.</p>
        ) : (
          <ul className="shade-need-list">
            {reports.map((report, index) => (
              <li key={report.id}>
                <button
                  type="button"
                  aria-pressed={report.id === activeId}
                  onClick={event => onSelectReport(report, event.currentTarget)}
                >
                  <span className="shade-need-badge" aria-hidden="true">
                    ظل {format.format(index + 1)}
                  </span>
                  <span className="shade-need-item-text">
                    <strong>احتياج للظل</strong>
                    <span>{report.reason}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
