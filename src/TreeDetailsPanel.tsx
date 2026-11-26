import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { Tree } from './treeData';
import { buildCanonicalTreeUrl } from './treeLinks';
import type { TreeStoryEntry } from './treeStories';

interface Props {
  tree: Tree;
  entries: TreeStoryEntry[];
  loading: boolean;
  onOpenEditor: (treeId: string) => void;
}

type QrState =
  | { status: 'loading'; url: string; isLocalOnly: boolean }
  | { status: 'ready'; url: string; isLocalOnly: boolean; dataUrl: string }
  | { status: 'error'; url: string; isLocalOnly: boolean };

function formatEntryDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function TreeDetailsPanel({ tree, entries, loading, onOpenEditor }: Props) {
  const treeId = String(tree.id);
  const treeEntries = entries.filter(entry => entry.treeId === treeId);

  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});
  const [qrState, setQrState] = useState<QrState>(() => {
    const { url, isLocalOnly } = buildCanonicalTreeUrl(tree.id);
    return { status: 'loading', url, isLocalOnly };
  });
  const [copyNotice, setCopyNotice] = useState('');

  useEffect(() => {
    const nextUrls: Record<string, string> = {};
    for (const entry of treeEntries) {
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
  }, [treeId, entries]);

  useEffect(() => {
    let cancelled = false;
    const { url, isLocalOnly } = buildCanonicalTreeUrl(tree.id);
    setQrState({ status: 'loading', url, isLocalOnly });
    setCopyNotice('');

    QRCode.toDataURL(url, {
      width: 184,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#133A2B', light: '#FFFFFF' },
    })
      .then(dataUrl => {
        if (!cancelled) setQrState({ status: 'ready', url, isLocalOnly, dataUrl });
      })
      .catch(() => {
        if (!cancelled) setQrState({ status: 'error', url, isLocalOnly });
      });

    return () => {
      cancelled = true;
    };
  }, [tree.id]);

  async function copyCanonicalUrl() {
    if (!navigator.clipboard?.writeText) {
      setCopyNotice('النسخ التلقائي غير متاح هنا. انسخ الرابط الظاهر يدويًا.');
      return;
    }
    try {
      await navigator.clipboard.writeText(qrState.url);
      setCopyNotice('اتنسخ رابط ملف الشجرة.');
    } catch {
      setCopyNotice('تعذّر النسخ التلقائي. انسخ الرابط الظاهر يدويًا.');
    }
  }

  return (
    <div className="tree-card-extras">
      <section className="tree-story-view" aria-labelledby="tree-timeline-heading">
        <div className="tree-extra-head">
          <h3 id="tree-timeline-heading">حكاية الشجرة والصور المؤرخة</h3>
          <span className="status local-status">محفوظة على الجهاز فقط</span>
        </div>

        {loading ? (
          <p className="tree-extra-note" role="status">جاري تحميل حكايات الشجرة…</p>
        ) : treeEntries.length === 0 ? (
          <p className="tree-extra-note">
            لسه مفيش حكايات أو صور نمو محفوظة على الجهاز ده للشجرة دي.
          </p>
        ) : (
          <ol className="tree-timeline">
            {treeEntries.map(entry => (
              <li key={entry.id} className="tree-timeline-item">
                <time className="tree-timeline-date" dateTime={entry.entryDate}>
                  {formatEntryDate(entry.entryDate)}
                </time>
                <p className="tree-timeline-story">{entry.story}</p>
                {entry.photo && (
                  <div className="tree-timeline-media">
                    {brokenThumbs[entry.id] ? (
                      <span className="pending-tree-media-fallback" role="img" aria-label="تعذّر عرض الصورة المحفوظة">
                        تعذّر عرض الصورة
                      </span>
                    ) : thumbUrls[entry.id] ? (
                      <img
                        src={thumbUrls[entry.id]}
                        alt={`صورة مؤرخة لـ ${tree.properties.name} بتاريخ ${formatEntryDate(entry.entryDate)}`}
                        onError={() => setBrokenThumbs(prev => ({ ...prev, [entry.id]: true }))}
                      />
                    ) : (
                      <span className="pending-tree-media-fallback" role="status">
                        جاري تجهيز الصورة…
                      </span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}

        <button
          type="button"
          className="tree-story-goto"
          onClick={() => onOpenEditor(treeId)}
        >
          أضف حكاية أو صورة مؤرخة من «شارك في تشجير طنطا»
        </button>
      </section>

      <section className="tree-qr-box" aria-labelledby="tree-qr-heading">
        <div className="tree-extra-head">
          <h3 id="tree-qr-heading">رمز QR لملف الشجرة</h3>
          <span className={'status ' + (qrState.isLocalOnly ? 'qr-local-badge' : 'local-status')}>
            {qrState.isLocalOnly ? 'معاينة محلية (localhost)' : 'رابط مباشر للشجرة'}
          </span>
        </div>

        <p className="tree-extra-note">
          {qrState.isLocalOnly
            ? 'الرمز ده مولّد محليًا لرابط المعاينة على الجهاز ده فقط (localhost)، ومش هيفتح على جهاز أو موبايل تاني غير لما الموقع يتنشر أو يتضبط له رابط عام.'
            : 'الرمز ده مولّد محليًا على المتصفح لفتح ملف الشجرة دي مباشرة على الرابط العام المحدّد.'}
        </p>

        {qrState.status === 'loading' && (
          <p className="tree-extra-note" role="status">جاري تجهيز رمز QR محليًا…</p>
        )}
        {qrState.status === 'error' && (
          <p className="field-error" role="alert">تعذّر توليد رمز QR محليًا. تقدر تستخدم الرابط الظاهر تحت.</p>
        )}
        {qrState.status === 'ready' && (
          <div className="tree-qr-frame">
            <img
              className="tree-qr-image"
              src={qrState.dataUrl}
              width={184}
              height={184}
              alt={`رمز QR يفتح ملف ${tree.properties.name}`}
            />
          </div>
        )}

        <p className="tree-qr-url">
          <code dir="ltr">{qrState.url}</code>
        </p>

        <div className="tree-qr-actions">
          <button type="button" onClick={copyCanonicalUrl}>انسخ رابط الشجرة</button>
        </div>
        {copyNotice && <p className="tree-extra-note" role="status">{copyNotice}</p>}
      </section>
    </div>
  );
}
