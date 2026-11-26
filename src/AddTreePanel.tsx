import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { Coordinates } from './plantingData';
import { validateAndDecodeTreeImage } from './observedTrees';
import type { PendingTreeSubmission } from './observedTrees';

export interface AddTreeNotice {
  text: string;
  tone: 'status' | 'alert';
}

export interface DraftTreePhoto {
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
  name: string;
  type: string;
  size: number;
}

interface Props {
  submissions: PendingTreeSubmission[];
  loading: boolean;
  picking: boolean;
  draftOpen: boolean;
  draftLocation: Coordinates | null;
  description: string;
  photo: DraftTreePhoto | null;
  saving: boolean;
  notice: AddTreeNotice | null;
  onStartReport: () => void;
  onStartMovingPoint: () => void;
  onCancelPicking: () => void;
  onCancelDraft: () => void;
  onDescriptionChange: (value: string) => void;
  onPhotoChange: (photo: DraftTreePhoto | null) => void;
  onSave: () => Promise<boolean>;
  onDeleteSubmission: (id: string) => Promise<void>;
  onFocusLocation: (location: Coordinates) => void;
}

const format = new Intl.NumberFormat('ar-EG');
const sizeFormat = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 });

function formatPhotoSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${sizeFormat.format(bytes / (1024 * 1024))} ميجابايت`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} كيلوبايت`;
}

export function AddTreePanel({
  submissions,
  loading,
  picking,
  draftOpen,
  draftLocation,
  description,
  photo,
  saving,
  notice,
  onStartReport,
  onStartMovingPoint,
  onCancelPicking,
  onCancelDraft,
  onDescriptionChange,
  onPhotoChange,
  onSave,
  onDeleteSubmission,
  onFocusLocation,
}: Props) {
  const [descriptionError, setDescriptionError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [checkingPhoto, setCheckingPhoto] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});

  const descriptionRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoButtonRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useRef(true);
  const photoCheckSeq = useRef(0);
  const activeDraftOpen = useRef(draftOpen);
  activeDraftOpen.current = draftOpen;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      photoCheckSeq.current += 1;
    };
  }, []);

  useEffect(() => {
    const nextUrls: Record<string, string> = {};
    for (const item of submissions) {
      nextUrls[item.id] = URL.createObjectURL(item.photo);
    }
    setThumbUrls(nextUrls);
    setBrokenThumbs({});
    return () => {
      for (const url of Object.values(nextUrls)) {
        URL.revokeObjectURL(url);
      }
    };
  }, [submissions]);

  function handleDescriptionChange(value: string) {
    onDescriptionChange(value);
    if (descriptionError && value.trim()) setDescriptionError('');
  }

  async function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const seq = ++photoCheckSeq.current;
    setCheckingPhoto(true);
    setPhotoError('');

    const result = await validateAndDecodeTreeImage(file);
    if (!mountedRef.current || seq !== photoCheckSeq.current || !activeDraftOpen.current) {
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

  function removeDraftPhoto() {
    photoCheckSeq.current += 1;
    setCheckingPhoto(false);
    setPhotoError('');
    onPhotoChange(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftLocation || checkingPhoto || saving) return;

    let hasError = false;
    if (!description.trim()) {
      setDescriptionError('اكتب اسم قصير أو وصف للشجرة قبل الحفظ.');
      descriptionRef.current?.focus();
      hasError = true;
    } else {
      setDescriptionError('');
    }

    if (!photo) {
      setPhotoError('أرفق صورة واحدة للشجرة من الكاميرا أو المعرض قبل الحفظ.');
      if (!hasError) photoButtonRef.current?.focus();
      hasError = true;
    } else {
      setPhotoError('');
    }

    if (hasError) return;
    await onSave();
  }

  function startOrReset() {
    photoCheckSeq.current += 1;
    setCheckingPhoto(false);
    setDescriptionError('');
    setPhotoError('');
    onStartReport();
  }

  function cancelWholeDraft() {
    photoCheckSeq.current += 1;
    setCheckingPhoto(false);
    setDescriptionError('');
    setPhotoError('');
    onCancelDraft();
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await onDeleteSubmission(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="add-tree-panel" aria-labelledby="add-tree-heading">
      <div className="add-tree-header">
        <h2 id="add-tree-heading" tabIndex={-1}>أضف شجرة من شارعك</h2>
        {!draftOpen && (
          <button type="button" className="add-tree-start" onClick={startOrReset}>
            أضف شجرة جديدة
          </button>
        )}
      </div>
      <p className="add-tree-intro">
        صوّر شجرة موجودة وحدد مكانها على الخريطة. الإضافات دي بتتحفظ محليًا على المتصفح ده بحالة «بانتظار المراجعة»، ومش بتظهر على خريطة الأشجار المرصودة للجميع إلا بعد مراجعتها في مرحلة مستقبلية.
      </p>

      {draftOpen && (
        <div className="add-tree-draft">
          {picking && !draftLocation && (
            <>
              <p className="add-tree-prompt" role="status">
                اضغط على مكان الشجرة على الخريطة، أو حرّك الخريطة واضغط «اختار مركز الخريطة».
              </p>
              <div className="add-tree-actions">
                <button type="button" onClick={cancelWholeDraft}>إلغاء الإضافة</button>
              </div>
            </>
          )}

          {draftLocation && (
            <>
              <p className="add-tree-coords">
                الموقع المختار:{' '}
                <bdi dir="ltr">{draftLocation.map(value => value.toFixed(5)).join(', ')}</bdi>
              </p>
              {picking ? (
                <>
                  <p className="add-tree-prompt" role="status">
                    اضغط على المكان الجديد على الخريطة أو استخدم «اختار مركز الخريطة» لنقل النقطة.
                  </p>
                  <div className="add-tree-actions">
                    <button type="button" onClick={onCancelPicking}>إلغاء تحريك النقطة</button>
                    <button type="button" onClick={cancelWholeDraft}>إلغاء الإضافة</button>
                  </div>
                </>
              ) : (
                <div className="add-tree-actions">
                  <button type="button" onClick={onStartMovingPoint} disabled={saving}>حرّك النقطة</button>
                  <button type="button" onClick={cancelWholeDraft} disabled={saving}>إلغاء الإضافة</button>
                </div>
              )}

              <form className="add-tree-form" onSubmit={handleSubmit} noValidate>
                <label htmlFor="add-tree-name">اسم الشجرة أو وصف قصير</label>
                <p id="add-tree-name-help" className="survey-help">
                  مثال: شجرة فيكوس عند مدخل المدرسة، أو شجرة ظل بجانب موقف السيارات.
                </p>
                <input
                  ref={descriptionRef}
                  id="add-tree-name"
                  name="treeDescription"
                  type="text"
                  maxLength={120}
                  value={description}
                  onChange={event => handleDescriptionChange(event.currentTarget.value)}
                  aria-invalid={!!descriptionError}
                  aria-describedby={descriptionError ? 'add-tree-name-help add-tree-name-error' : 'add-tree-name-help'}
                />
                {descriptionError && (
                  <p id="add-tree-name-error" className="field-error" role="alert">
                    {descriptionError}
                  </p>
                )}

                <label htmlFor="add-tree-photo">صورة الشجرة (صورة واحدة)</label>
                <p id="add-tree-photo-help" className="survey-help">
                  اختار صورة من الكاميرا أو المعرض (JPG أو PNG أو WebP أو GIF أو AVIF، بحد أقصى ٥ ميجابايت).
                </p>
                <input
                  ref={fileInputRef}
                  id="add-tree-photo"
                  name="treePhoto"
                  type="file"
                  accept="image/*"
                  tabIndex={-1}
                  className="visually-hidden-file"
                  onChange={handleFileSelect}
                />
                <div className="add-tree-actions">
                  <button
                    ref={photoButtonRef}
                    type="button"
                    className="add-tree-photo-btn"
                    disabled={checkingPhoto || saving}
                    aria-invalid={!!photoError}
                    aria-describedby={photoError ? 'add-tree-photo-help add-tree-photo-error' : 'add-tree-photo-help'}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {checkingPhoto ? 'جاري فحص الصورة…' : photo ? 'تغيير الصورة' : 'اختار صورة من الكاميرا أو المعرض'}
                  </button>
                  {photo && (
                    <button type="button" disabled={checkingPhoto || saving} onClick={removeDraftPhoto}>
                      إزالة الصورة
                    </button>
                  )}
                </div>
                {photoError && (
                  <p id="add-tree-photo-error" className="field-error" role="alert">
                    {photoError}
                  </p>
                )}

                {photo && (
                  <figure className="add-tree-preview">
                    <img
                      src={photo.previewUrl}
                      alt={description.trim() ? `معاينة صورة: ${description.trim()}` : 'معاينة صورة الشجرة المختارة'}
                    />
                    <figcaption>
                      {formatPhotoSize(photo.size)} · <bdi dir="ltr">{photo.width}×{photo.height}</bdi>
                    </figcaption>
                  </figure>
                )}

                <button type="submit" className="add-tree-save" disabled={checkingPhoto || saving}>
                  {saving ? 'جاري الحفظ على الجهاز…' : 'احفظ الشجرة «بانتظار المراجعة»'}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {notice && (
        <p className="add-tree-notice" role={notice.tone}>
          {notice.text}
        </p>
      )}

      <div className="add-tree-saved">
        <h3>
          شجر شارعك «بانتظار المراجعة» على هذا المتصفح ({format.format(submissions.length)})
        </h3>
        {loading ? (
          <p className="add-tree-empty" role="status">جاري تحميل الإضافات المحفوظة…</p>
        ) : submissions.length === 0 ? (
          <p className="add-tree-empty">لسه مفيش أشجار مضافة من شارعك محفوظة على المتصفح ده.</p>
        ) : (
          <ul className="pending-tree-list">
            {submissions.map(item => (
              <li key={item.id} className="pending-tree-card">
                <div className="pending-tree-media">
                  {brokenThumbs[item.id] ? (
                    <span className="pending-tree-media-fallback" role="img" aria-label="تعذّر عرض الصورة المحفوظة">
                      تعذّر عرض الصورة
                    </span>
                  ) : thumbUrls[item.id] ? (
                    <img
                      src={thumbUrls[item.id]}
                      alt={`صورة الشجرة: ${item.description}`}
                      onError={() => setBrokenThumbs(prev => ({ ...prev, [item.id]: true }))}
                    />
                  ) : (
                    <span className="pending-tree-media-fallback" role="status">
                      جاري تجهيز الصورة…
                    </span>
                  )}
                </div>
                <div className="pending-tree-body">
                  <div className="pending-tree-badges">
                    <span className="status pending-status">{item.status}</span>
                    <span className="status local-status">محفوظة على هذا المتصفح</span>
                  </div>
                  <strong>{item.description}</strong>
                  <p className="pending-tree-meta">
                    الموقع: <bdi dir="ltr">{item.location.map(value => value.toFixed(5)).join(', ')}</bdi>
                  </p>
                  <p className="pending-tree-meta">
                    <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('ar-EG')}</time>
                  </p>
                  <div className="add-tree-actions">
                    <button type="button" onClick={() => onFocusLocation([...item.location])}>
                      اعرض الموقع على الخريطة
                    </button>
                    <button
                      type="button"
                      className="pending-tree-delete"
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item.id)}
                    >
                      {deletingId === item.id ? 'جاري المسح…' : 'امسح من الجهاز'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
