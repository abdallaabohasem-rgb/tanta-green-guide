import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { Tree } from './treeData';
import type { DraftTreePhoto } from './AddTreePanel';
import { validateAndDecodeTreeImage } from './observedTrees';
import { isValidEntryDate } from './treeStories';
import {
  careConditions,
  provisionalPhotoDatesTarget,
  summarizeCareByTree,
} from './careContinuity';
import type { CareCondition, CareFollowUpLog } from './careContinuity';

export interface CareNotice {
  text: string;
  tone: 'status' | 'alert';
}

interface Props {
  trees: Tree[];
  treesState: 'loading' | 'ready' | 'error';
  selectedTreeId: string;
  followUpDate: string;
  condition: string;
  observation: string;
  photo: DraftTreePhoto | null;
  logs: CareFollowUpLog[];
  loading: boolean;
  saving: boolean;
  notice: CareNotice | null;
  onSelectTreeId: (treeId: string) => void;
  onDateChange: (value: string) => void;
  onConditionChange: (value: string) => void;
  onObservationChange: (value: string) => void;
  onPhotoChange: (photo: DraftTreePhoto | null) => void;
  onSave: (input: {
    treeId: string;
    followUpDate: string;
    condition: CareCondition;
    observation: string;
    photo: DraftTreePhoto | null;
  }) => Promise<boolean>;
  onDeleteLog: (id: string) => Promise<void>;
}

const format = new Intl.NumberFormat('ar-EG');
const sizeFormat = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 });

function formatPhotoSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${sizeFormat.format(bytes / (1024 * 1024))} ميجابايت`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} كيلوبايت`;
}

function formatArabicDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function CareContinuityPanel({
  trees,
  treesState,
  selectedTreeId,
  followUpDate,
  condition,
  observation,
  photo,
  logs,
  loading,
  saving,
  notice,
  onSelectTreeId,
  onDateChange,
  onConditionChange,
  onObservationChange,
  onPhotoChange,
  onSave,
  onDeleteLog,
}: Props) {
  const [treeError, setTreeError] = useState('');
  const [dateError, setDateError] = useState('');
  const [conditionError, setConditionError] = useState('');
  const [observationError, setObservationError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [checkingPhoto, setCheckingPhoto] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});

  const treeRef = useRef<HTMLSelectElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const conditionRef = useRef<HTMLSelectElement>(null);
  const observationRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const photoCheckSeq = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      photoCheckSeq.current += 1;
    };
  }, []);

  useEffect(() => {
    const nextUrls: Record<string, string> = {};
    for (const log of logs) {
      if (log.photo) {
        nextUrls[log.id] = URL.createObjectURL(log.photo);
      }
    }
    setThumbUrls(nextUrls);
    setBrokenThumbs({});
    return () => {
      for (const url of Object.values(nextUrls)) {
        URL.revokeObjectURL(url);
      }
    };
  }, [logs]);

  const effectiveTreeId =
    selectedTreeId && trees.some(tree => String(tree.id) === selectedTreeId)
      ? selectedTreeId
      : trees[0]
        ? String(trees[0].id)
        : '';

  async function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const seq = ++photoCheckSeq.current;
    setCheckingPhoto(true);
    setPhotoError('');

    const result = await validateAndDecodeTreeImage(file);
    if (!mountedRef.current || seq !== photoCheckSeq.current) {
      if (result.ok) URL.revokeObjectURL(result.previewUrl);
      return;
    }
    setCheckingPhoto(false);

    if (!result.ok) {
      setPhotoError(result.error);
      return;
    }

    onPhotoChange({
      blob: result.blob,
      previewUrl: result.previewUrl,
      width: result.width,
      height: result.height,
      name: result.name,
      type: result.type,
      size: result.size,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (checkingPhoto || saving) return;

    let firstInvalid: HTMLElement | null = null;
    if (!effectiveTreeId) {
      setTreeError('اختار شجرة قائمة من العينة الأول.');
      firstInvalid = treeRef.current;
    } else {
      setTreeError('');
    }

    if (!isValidEntryDate(followUpDate)) {
      setDateError('اختار تاريخ صحيح لمتابعة الرعاية.');
      if (!firstInvalid) firstInvalid = dateRef.current;
    } else {
      setDateError('');
    }

    if (!careConditions.some(option => option === condition)) {
      setConditionError('اختار الحالة الحالية للشجرة قبل التسجيل.');
      if (!firstInvalid) firstInvalid = conditionRef.current;
    } else {
      setConditionError('');
    }

    if (!observation.trim()) {
      setObservationError('اكتب ملاحظة قصيرة عن الرعاية أو حالة الشجرة (ما ينفعش تبقى فاضية).');
      if (!firstInvalid) firstInvalid = observationRef.current;
    } else {
      setObservationError('');
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const saved = await onSave({
      treeId: effectiveTreeId,
      followUpDate,
      condition: condition as CareCondition,
      observation,
      photo,
    });

    if (saved) {
      photoCheckSeq.current += 1;
      setPhotoError('');
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await onDeleteLog(id);
    } finally {
      setDeletingId(null);
    }
  }

  const treeMap = new Map(trees.map(tree => [String(tree.id), tree]));
  const trackedTrees = summarizeCareByTree(logs, trees);
  const visibleLogs = logs.filter(log => treeMap.has(log.treeId));

  return (
    <section className="care-panel" aria-labelledby="care-heading">
      <div className="care-header">
        <h2 id="care-heading" tabIndex={-1}>تقدير الاستمرار في الرعاية</h2>
        <div className="care-header-badges">
          <span className="status care-trial-pill">معيار تجريبي محلي</span>
          <span className="status local-status">حفظ على الجهاز فقط</span>
        </div>
      </div>

      <p className="care-rule">
        سجّل متابعات الرعاية المؤرخة لأي شجرة قائمة من العينة (بيانات تجريبية). كقاعدة تجريبية على المتصفح ده، بتحصل الشجرة على شارة محلية تجريبية «استمرار في الرعاية» لما توثّقها في{' '}
        <strong>{format.format(provisionalPhotoDatesTarget)} تواريخ مختلفة على الأقل</strong> بصورة لكل تاريخ؛ المتابعات المتعددة في نفس اليوم بتتحسب مرة واحدة فقط، والمتابعة بدون صورة بتتحفظ في السجل لكن ما بتتحسبش ضمن التوثيق بالصورة. السجلات بتفضل على المتصفح ده فقط، والإضافات المنتظرة من «أضف شجرة من شارعك» بتفضل خاصة.
      </p>

      {treesState === 'loading' && <p role="status">جاري تحميل قائمة الأشجار…</p>}
      {treesState === 'error' && (
        <p className="field-error" role="alert">تعذّر تحميل قائمة الأشجار الحالية لتسجيل متابعة الرعاية.</p>
      )}

      {treesState === 'ready' && (
        <form className="care-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="care-tree-id">الشجرة القائمة</label>
          <select
            ref={treeRef}
            id="care-tree-id"
            name="careTreeId"
            value={effectiveTreeId}
            onChange={event => {
              onSelectTreeId(event.currentTarget.value);
              if (treeError) setTreeError('');
            }}
            aria-invalid={!!treeError}
            aria-describedby={treeError ? 'care-tree-error' : undefined}
          >
            {trees.map(tree => (
              <option key={tree.id} value={String(tree.id)}>
                {tree.properties.name} ({tree.id})
              </option>
            ))}
          </select>
          {treeError && <p id="care-tree-error" className="field-error" role="alert">{treeError}</p>}

          <label htmlFor="care-date">تاريخ المتابعة</label>
          <input
            ref={dateRef}
            id="care-date"
            name="careDate"
            type="date"
            value={followUpDate}
            onChange={event => {
              onDateChange(event.currentTarget.value);
              if (dateError && isValidEntryDate(event.currentTarget.value)) setDateError('');
            }}
            aria-invalid={!!dateError}
            aria-describedby={dateError ? 'care-date-error' : undefined}
          />
          {dateError && <p id="care-date-error" className="field-error" role="alert">{dateError}</p>}

          <label htmlFor="care-condition">الحالة الحالية للشجرة</label>
          <select
            ref={conditionRef}
            id="care-condition"
            name="careCondition"
            value={condition}
            onChange={event => {
              onConditionChange(event.currentTarget.value);
              if (conditionError && event.currentTarget.value) setConditionError('');
            }}
            aria-invalid={!!conditionError}
            aria-describedby={conditionError ? 'care-condition-error' : undefined}
          >
            <option value="">اختار الحالة الحالية</option>
            {careConditions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          {conditionError && (
            <p id="care-condition-error" className="field-error" role="alert">{conditionError}</p>
          )}

          <label htmlFor="care-note">ملاحظة قصيرة عن الرعاية</label>
          <p id="care-note-help" className="survey-help">
            مثال: اتروت بمياه كافية، أو التربة ناشفة ومحتاجة ري، أو تم تنظيف الحوض.
          </p>
          <textarea
            ref={observationRef}
            id="care-note"
            name="careObservation"
            rows={2}
            maxLength={240}
            value={observation}
            onChange={event => {
              onObservationChange(event.currentTarget.value);
              if (observationError && event.currentTarget.value.trim()) setObservationError('');
            }}
            aria-invalid={!!observationError}
            aria-describedby={observationError ? 'care-note-help care-note-error' : 'care-note-help'}
          />
          {observationError && (
            <p id="care-note-error" className="field-error" role="alert">{observationError}</p>
          )}

          <label htmlFor="care-photo">صورة توثيق للمتابعة (اختياري)</label>
          <p id="care-photo-help" className="survey-help">
            صورة JPG أو PNG أو WebP أو GIF أو AVIF بحد أقصى ٥ ميجابايت. وجود صورة بيحتسب التاريخ ضمن التوثيق بالصورة.
          </p>
          <input
            ref={fileInputRef}
            id="care-photo"
            name="carePhoto"
            type="file"
            accept="image/*"
            tabIndex={-1}
            className="visually-hidden-file"
            onChange={handleFileSelect}
          />
          <div className="add-tree-actions">
            <button
              type="button"
              className="add-tree-photo-btn"
              disabled={checkingPhoto || saving}
              aria-describedby={photoError ? 'care-photo-help care-photo-error' : 'care-photo-help'}
              onClick={() => fileInputRef.current?.click()}
            >
              {checkingPhoto ? 'جاري فحص الصورة…' : photo ? 'تغيير الصورة' : 'اختار صورة للمتابعة (اختياري)'}
            </button>
            {photo && (
              <button
                type="button"
                disabled={checkingPhoto || saving}
                onClick={() => {
                  photoCheckSeq.current += 1;
                  setCheckingPhoto(false);
                  setPhotoError('');
                  onPhotoChange(null);
                }}
              >
                إزالة الصورة
              </button>
            )}
          </div>
          {photoError && <p id="care-photo-error" className="field-error" role="alert">{photoError}</p>}

          {photo && (
            <figure className="add-tree-preview">
              <img src={photo.previewUrl} alt="معاينة صورة متابعة الرعاية المختارة" />
              <figcaption>
                {formatPhotoSize(photo.size)} · <bdi dir="ltr">{photo.width}×{photo.height}</bdi>
              </figcaption>
            </figure>
          )}

          <button type="submit" className="care-save" disabled={checkingPhoto || saving || !effectiveTreeId}>
            {saving ? 'جاري الحفظ على الجهاز…' : 'سجّل متابعة الرعاية على الجهاز'}
          </button>
        </form>
      )}

      {notice && (
        <p className="add-tree-notice" role={notice.tone}>
          {notice.text}
        </p>
      )}

      <div className="care-tracked">
        <h3>الأشجار المتابَعة على هذا المتصفح ({format.format(trackedTrees.length)})</h3>
        {loading ? (
          <p className="add-tree-empty" role="status">جاري تحميل متابعات الرعاية…</p>
        ) : trackedTrees.length === 0 ? (
          <p className="add-tree-empty">لسه مفيش أشجار متسجل لها متابعة رعاية على المتصفح ده.</p>
        ) : (
          <ul className="care-tracked-list">
            {trackedTrees.map(item => (
              <li key={item.treeId} className="care-tracked-card">
                <div className="pending-tree-badges">
                  <span className="status">
                    {item.tree.properties.status === 'تجريبية' ? 'بيانات تجريبية' : item.tree.properties.status}
                  </span>
                  <span className={'status ' + (item.hasTrialBadge ? 'care-badge-earned' : 'care-badge-progress')}>
                    {item.hasTrialBadge
                      ? 'شارة محلية تجريبية: استمرار في الرعاية'
                      : `تقدّم تجريبي: ${format.format(item.documentedPhotoDateCount)} من ${format.format(provisionalPhotoDatesTarget)} تواريخ بصورة`}
                  </span>
                </div>
                <strong>
                  {item.tree.properties.name} (<bdi dir="ltr">{item.treeId}</bdi>)
                </strong>
                <dl className="care-summary-facts">
                  <div>
                    <dt>آخر متابعة</dt>
                    <dd><time dateTime={item.latestDate}>{formatArabicDate(item.latestDate)}</time></dd>
                  </div>
                  <div>
                    <dt>آخر حالة مسجلة</dt>
                    <dd>{item.latestCondition}</dd>
                  </div>
                  <div>
                    <dt>تواريخ موثّقة بالصورة</dt>
                    <dd>{format.format(item.documentedPhotoDateCount)} من {format.format(provisionalPhotoDatesTarget)} (مرات السجل: {format.format(item.totalLogs)})</dd>
                  </div>
                </dl>
                <p className="care-latest-note">آخر ملاحظة: {item.latestObservation}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {visibleLogs.length > 0 && (
        <div className="care-history">
          <h3>سجل المتابعات المحفوظ على الجهاز ({format.format(visibleLogs.length)})</h3>
          <ul className="care-log-list">
            {visibleLogs.map(log => {
              const tree = treeMap.get(log.treeId);
              return (
                <li key={log.id} className="care-log-card">
                  <div className="pending-tree-badges">
                    <span className="status local-status">محفوظة على الجهاز فقط</span>
                    <span className="status">{log.condition}</span>
                    {log.photo && <span className="status care-photo-pill">موثّقة بصورة</span>}
                  </div>
                  <p className="pending-tree-meta">
                    {tree?.properties.name ?? log.treeId} (<bdi dir="ltr">{log.treeId}</bdi>) ·{' '}
                    <time dateTime={log.followUpDate}>{formatArabicDate(log.followUpDate)}</time>
                  </p>
                  <p className="tree-story-body">{log.observation}</p>
                  {log.photo && (
                    <div className="pending-tree-media">
                      {brokenThumbs[log.id] ? (
                        <span className="pending-tree-media-fallback" role="img" aria-label="تعذّر عرض الصورة المحفوظة">
                          تعذّر عرض الصورة
                        </span>
                      ) : thumbUrls[log.id] ? (
                        <img
                          src={thumbUrls[log.id]}
                          alt={`صورة متابعة رعاية ${tree?.properties.name ?? log.treeId} بتاريخ ${formatArabicDate(log.followUpDate)}`}
                          onError={() => setBrokenThumbs(prev => ({ ...prev, [log.id]: true }))}
                        />
                      ) : (
                        <span className="pending-tree-media-fallback" role="status">
                          جاري تجهيز الصورة…
                        </span>
                      )}
                    </div>
                  )}
                  <div className="add-tree-actions">
                    <button
                      type="button"
                      className="pending-tree-delete"
                      disabled={deletingId === log.id}
                      onClick={() => handleDelete(log.id)}
                    >
                      {deletingId === log.id ? 'جاري المسح…' : 'امسح المتابعة من الجهاز'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
