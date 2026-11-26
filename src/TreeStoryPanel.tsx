import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { Tree } from './treeData';
import type { DraftTreePhoto } from './AddTreePanel';
import { validateAndDecodeTreeImage } from './observedTrees';
import { treeHashForId } from './treeLinks';
import { isValidEntryDate } from './treeStories';
import type { TreeStoryEntry } from './treeStories';

export interface TreeStoryNotice {
  text: string;
  tone: 'status' | 'alert';
}

interface Props {
  trees: Tree[];
  treesState: 'loading' | 'ready' | 'error';
  selectedTreeId: string;
  hasInvalidLink: boolean;
  story: string;
  entryDate: string;
  photo: DraftTreePhoto | null;
  entries: TreeStoryEntry[];
  loading: boolean;
  saving: boolean;
  notice: TreeStoryNotice | null;
  onSelectTreeId: (treeId: string) => void;
  onStoryChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onPhotoChange: (photo: DraftTreePhoto | null) => void;
  onSave: (input: {
    treeId: string;
    story: string;
    entryDate: string;
    photo: DraftTreePhoto | null;
  }) => Promise<boolean>;
  onDeleteEntry: (id: string) => Promise<void>;
}

const format = new Intl.NumberFormat('ar-EG');
const sizeFormat = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 });

function formatPhotoSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${sizeFormat.format(bytes / (1024 * 1024))} ميجابايت`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} كيلوبايت`;
}

function formatEntryDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function TreeStoryPanel({
  trees,
  treesState,
  selectedTreeId,
  hasInvalidLink,
  story,
  entryDate,
  photo,
  entries,
  loading,
  saving,
  notice,
  onSelectTreeId,
  onStoryChange,
  onDateChange,
  onPhotoChange,
  onSave,
  onDeleteEntry,
}: Props) {
  const [treeError, setTreeError] = useState('');
  const [dateError, setDateError] = useState('');
  const [storyError, setStoryError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [checkingPhoto, setCheckingPhoto] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});

  const selectRef = useRef<HTMLSelectElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const storyRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoButtonRef = useRef<HTMLButtonElement>(null);
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
    for (const entry of entries) {
      if (entry.photo) {
        nextUrls[entry.id] = URL.createObjectURL(entry.photo);
      }
    }
    setThumbUrls(nextUrls);
    setBrokenThumbs({});
    return () => {
      for (const url of Object.values(nextUrls)) {
        URL.revokeObjectURL(url);
      }
    };
  }, [entries]);

  const matchedSelectedTree = Boolean(
    selectedTreeId && trees.some(tree => String(tree.id) === selectedTreeId)
  );
  const effectiveTreeId = hasInvalidLink
    ? ''
    : matchedSelectedTree
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
      setTreeError('اختار شجرة موجودة من القائمة الأول.');
      firstInvalid = selectRef.current;
    } else {
      setTreeError('');
    }

    if (!isValidEntryDate(entryDate)) {
      setDateError('اختار تاريخ صحيح للحكاية أو صورة النمو.');
      if (!firstInvalid) firstInvalid = dateRef.current;
    } else {
      setDateError('');
    }

    if (!story.trim()) {
      setStoryError('اكتب حكاية الشجرة أو وصفًا للنمو قبل الحفظ (ما ينفعش يبقى فاضي).');
      if (!firstInvalid) firstInvalid = storyRef.current;
    } else {
      setStoryError('');
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const saved = await onSave({
      treeId: effectiveTreeId,
      story,
      entryDate,
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
      await onDeleteEntry(id);
    } finally {
      setDeletingId(null);
    }
  }

  const treeNames = new Map(trees.map(tree => [String(tree.id), tree.properties.name]));

  return (
    <section className="tree-story-panel" aria-labelledby="tree-story-heading">
      <div className="tree-story-header">
        <h2 id="tree-story-heading" tabIndex={-1}>حكاية الشجرة ورمز QR</h2>
        <span className="status local-status">حفظ على الجهاز فقط</span>
      </div>
      <p className="tree-story-intro">
        أضف قصة زراعة أو ذكرى أو صورة نمو مؤرخة لأي شجرة موجودة من العينة التجريبية. المشاركات بتتحفظ محليًا على المتصفح ده ومربوطة بمعرّف الشجرة الثابت، وإضافات «أضف شجرة من شارعك» المنتظرة بتفضل خاصة ومش بتظهر هنا.
      </p>

      {hasInvalidLink && (
        <p id="story-invalid-link-error" className="invalid-tree-notice" role="alert">
          رابط الشجرة المطلوب غير صالح أو الشجرة مش موجودة في خريطة الأشجار الحالية. اختار شجرة موجودة من القائمة قبل الحفظ.
        </p>
      )}
      {treesState === 'loading' && <p role="status">جاري تحميل قائمة الأشجار…</p>}
      {treesState === 'error' && (
        <p className="field-error" role="alert">تعذّر تحميل قائمة الأشجار الحالية لإضافة حكاية.</p>
      )}

      {treesState === 'ready' && (
        <form className="tree-story-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="story-tree-id">الشجرة الموجودة</label>
          <select
            ref={selectRef}
            id="story-tree-id"
            name="storyTreeId"
            value={effectiveTreeId}
            onChange={event => {
              onSelectTreeId(event.currentTarget.value);
              if (treeError) setTreeError('');
            }}
            aria-invalid={Boolean(treeError || hasInvalidLink)}
            aria-describedby={
              [hasInvalidLink ? 'story-invalid-link-error' : '', treeError ? 'story-tree-error' : '']
                .filter(Boolean)
                .join(' ') || undefined
            }
          >
            {!effectiveTreeId && (
              <option value="" disabled>
                -- اختار شجرة موجودة من القائمة --
              </option>
            )}
            {trees.map(tree => (
              <option key={tree.id} value={String(tree.id)}>
                {tree.properties.name} ({tree.id})
              </option>
            ))}
          </select>
          {treeError && (
            <p id="story-tree-error" className="field-error" role="alert">{treeError}</p>
          )}

          <label htmlFor="story-date">تاريخ الحكاية أو الصورة</label>
          <input
            ref={dateRef}
            id="story-date"
            name="storyDate"
            type="date"
            value={entryDate}
            onChange={event => {
              onDateChange(event.currentTarget.value);
              if (dateError && isValidEntryDate(event.currentTarget.value)) setDateError('');
            }}
            aria-invalid={!!dateError}
            aria-describedby={dateError ? 'story-date-error' : undefined}
          />
          {dateError && (
            <p id="story-date-error" className="field-error" role="alert">{dateError}</p>
          )}

          <label htmlFor="story-text">حكاية الشجرة أو ملاحظة النمو</label>
          <p id="story-text-help" className="survey-help">
            مثال: اتزرعت قدام البيت سنة ٢٠١٩ وبقت تظلل ممر المشاة وقت الظهر.
          </p>
          <textarea
            ref={storyRef}
            id="story-text"
            name="storyText"
            rows={3}
            maxLength={500}
            value={story}
            onChange={event => {
              onStoryChange(event.currentTarget.value);
              if (storyError && event.currentTarget.value.trim()) setStoryError('');
            }}
            aria-invalid={!!storyError}
            aria-describedby={storyError ? 'story-text-help story-text-error' : 'story-text-help'}
          />
          {storyError && (
            <p id="story-text-error" className="field-error" role="alert">{storyError}</p>
          )}

          <label htmlFor="story-photo">صورة مؤرخة للنمو (اختياري)</label>
          <p id="story-photo-help" className="survey-help">
            صورة JPG أو PNG أو WebP أو GIF أو AVIF بحد أقصى ٥ ميجابايت.
          </p>
          <input
            ref={fileInputRef}
            id="story-photo"
            name="storyPhoto"
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
              aria-describedby={photoError ? 'story-photo-help story-photo-error' : 'story-photo-help'}
              onClick={() => fileInputRef.current?.click()}
            >
              {checkingPhoto ? 'جاري فحص الصورة…' : photo ? 'تغيير الصورة' : 'اختار صورة مؤرخة (اختياري)'}
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
          {photoError && (
            <p id="story-photo-error" className="field-error" role="alert">{photoError}</p>
          )}

          {photo && (
            <figure className="add-tree-preview">
              <img
                src={photo.previewUrl}
                alt="معاينة الصورة المؤرخة المختارة للشجرة"
              />
              <figcaption>
                {formatPhotoSize(photo.size)} · <bdi dir="ltr">{photo.width}×{photo.height}</bdi>
              </figcaption>
            </figure>
          )}

          <button type="submit" className="tree-story-save" disabled={checkingPhoto || saving || !effectiveTreeId}>
            {saving ? 'جاري الحفظ على الجهاز…' : 'احفظ الحكاية على الجهاز'}
          </button>
        </form>
      )}

      {notice && (
        <p className="add-tree-notice" role={notice.tone}>
          {notice.text}
        </p>
      )}

      <div className="tree-story-saved">
        <h3>
          الحكايات والصور المحفوظة على هذا المتصفح ({format.format(entries.length)})
        </h3>
        {loading ? (
          <p className="add-tree-empty" role="status">جاري تحميل الحكايات المحفوظة…</p>
        ) : entries.length === 0 ? (
          <p className="add-tree-empty">لسه مفيش حكايات أو صور نمو محفوظة على المتصفح ده.</p>
        ) : (
          <ul className="tree-story-list">
            {entries.map(entry => (
              <li key={entry.id} className="tree-story-card">
                <div className="pending-tree-badges">
                  <span className="status local-status">محفوظة على الجهاز فقط</span>
                  <span className="status">{treeNames.get(entry.treeId) ?? entry.treeId}</span>
                </div>
                <p className="pending-tree-meta">
                  التاريخ: <time dateTime={entry.entryDate}>{formatEntryDate(entry.entryDate)}</time> · المعرّف: <bdi dir="ltr">{entry.treeId}</bdi>
                </p>
                <p className="tree-story-body">{entry.story}</p>
                {entry.photo && (
                  <div className="pending-tree-media">
                    {brokenThumbs[entry.id] ? (
                      <span className="pending-tree-media-fallback" role="img" aria-label="تعذّر عرض الصورة المحفوظة">
                        تعذّر عرض الصورة
                      </span>
                    ) : thumbUrls[entry.id] ? (
                      <img
                        src={thumbUrls[entry.id]}
                        alt={`صورة مؤرخة لـ ${treeNames.get(entry.treeId) ?? entry.treeId}`}
                        onError={() => setBrokenThumbs(prev => ({ ...prev, [entry.id]: true }))}
                      />
                    ) : (
                      <span className="pending-tree-media-fallback" role="status">
                        جاري تجهيز الصورة…
                      </span>
                    )}
                  </div>
                )}
                <div className="add-tree-actions">
                  <a className="story-open-link" href={treeHashForId(entry.treeId)}>
                    افتح ملف الشجرة ورمز QR
                  </a>
                  <button
                    type="button"
                    className="pending-tree-delete"
                    disabled={deletingId === entry.id}
                    onClick={() => handleDelete(entry.id)}
                  >
                    {deletingId === entry.id ? 'جاري المسح…' : 'امسح من الجهاز'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
