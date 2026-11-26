import type { Coordinates } from './plantingData';

export const observedTreesDbName = 'tanta-green-guide';
export const observedTreesStoreName = 'pendingTrees';
export const observedTreesDbVersion = 1;
export const pendingTreeStatus = 'بانتظار المراجعة' as const;

export const maxPendingTreePhotoBytes = 5 * 1024 * 1024;
export const maxPendingTreeImageDimension = 8192;
export const allowedPendingTreeImageTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

const allowedImageTypeSet = new Set<string>(allowedPendingTreeImageTypes);

export interface PendingTreeSubmission {
  id: string;
  location: Coordinates;
  description: string;
  status: typeof pendingTreeStatus;
  photo: Blob;
  photoName: string;
  photoType: string;
  photoSize: number;
  createdAt: string;
}

export interface PendingTreeLoadResult {
  submissions: PendingTreeSubmission[];
  hadInvalidData: boolean;
  storageError: boolean;
}

export type ImageValidationResult =
  | {
      ok: true;
      blob: Blob;
      previewUrl: string;
      width: number;
      height: number;
      name: string;
      type: string;
      size: number;
    }
  | {
      ok: false;
      error: string;
    };

export type SavePendingTreeResult =
  | { ok: true }
  | { ok: false; reason: 'quota' | 'unavailable' };

function isValidCoordinates(value: unknown): value is Coordinates {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n): n is number => typeof n === 'number' && Number.isFinite(n)) &&
    Math.abs(value[0]) <= 180 &&
    Math.abs(value[1]) <= 90
  );
}

export function isValidPendingTreeRecord(
  entry: unknown,
  seenIds?: Set<string>
): entry is PendingTreeSubmission {
  if (!entry || typeof entry !== 'object') return false;
  const candidate = entry as Record<string, unknown>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const description = typeof candidate.description === 'string' ? candidate.description.trim() : '';
  const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt : '';
  const photo = candidate.photo;

  if (
    !id ||
    seenIds?.has(id) ||
    !isValidCoordinates(candidate.location) ||
    !description ||
    candidate.status !== pendingTreeStatus ||
    !Number.isFinite(Date.parse(createdAt)) ||
    !(photo instanceof Blob) ||
    photo.size <= 0 ||
    photo.size > maxPendingTreePhotoBytes ||
    !allowedImageTypeSet.has(photo.type)
  ) {
    return false;
  }

  return true;
}

export function normalizePendingTreeRecords(rawRecords: unknown[]): {
  submissions: PendingTreeSubmission[];
  hadInvalidData: boolean;
} {
  const submissions: PendingTreeSubmission[] = [];
  const seenIds = new Set<string>();
  let hadInvalidData = false;

  for (const entry of rawRecords) {
    if (!isValidPendingTreeRecord(entry, seenIds)) {
      hadInvalidData = true;
      continue;
    }
    seenIds.add(entry.id.trim());
    submissions.push({
      id: entry.id.trim(),
      location: [entry.location[0], entry.location[1]],
      description: entry.description.trim(),
      status: pendingTreeStatus,
      photo: entry.photo,
      photoName: typeof entry.photoName === 'string' && entry.photoName.trim() ? entry.photoName : 'tree-photo',
      photoType: entry.photo.type,
      photoSize: entry.photo.size,
      createdAt: entry.createdAt,
    });
  }

  submissions.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return { submissions, hadInvalidData };
}

function decodeImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        if (typeof img.decode === 'function') {
          await img.decode();
        }
      } catch {
        // Fallback to natural dimensions if decode() throws after onload on valid images.
      }
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      } else {
        reject(new Error('Invalid image dimensions'));
      }
    };
    img.onerror = () => reject(new Error('Image decode failed'));
    img.src = url;
  });
}

export async function validateAndDecodeTreeImage(file: File): Promise<ImageValidationResult> {
  if (file.size <= 0) {
    return { ok: false, error: 'الملف المختار فاضي. اختار صورة سليمة.' };
  }
  if (!allowedImageTypeSet.has(file.type)) {
    return {
      ok: false,
      error: 'نوع الملف غير مدعوم. اختار صورة بصيغة JPG أو PNG أو WebP أو GIF أو AVIF.',
    };
  }
  if (file.size > maxPendingTreePhotoBytes) {
    return {
      ok: false,
      error: 'حجم الصورة أكبر من الحد المسموح (٥ ميجابايت). اختار صورة أصغر أو صغّرها وجرّب تاني.',
    };
  }

  let previewUrl = '';
  try {
    const bytes = await file.arrayBuffer();
    const blob = new Blob([bytes], { type: file.type });
    previewUrl = URL.createObjectURL(blob);
    const { width, height } = await decodeImageDimensions(previewUrl);
    if (width > maxPendingTreeImageDimension || height > maxPendingTreeImageDimension) {
      URL.revokeObjectURL(previewUrl);
      return {
        ok: false,
        error: `أبعاد الصورة كبيرة جدًا (${width}×${height}). الحد الأقصى المسموح ${maxPendingTreeImageDimension} بكسل.`,
      };
    }
    return {
      ok: true,
      blob,
      previewUrl,
      width,
      height,
      name: file.name || 'tree-photo',
      type: file.type,
      size: blob.size,
    };
  } catch {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    return {
      ok: false,
      error: 'تعذّر قراءة الصورة أو فك ترميزها. تأكّد إنها صورة سليمة وجرّب صورة تانية.',
    };
  }
}

function openObservedTreesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(observedTreesDbName, observedTreesDbVersion);
    } catch (error) {
      reject(error);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(observedTreesStoreName)) {
        db.createObjectStore(observedTreesStoreName, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    request.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
}

export async function loadPendingTrees(): Promise<PendingTreeLoadResult> {
  let db: IDBDatabase | null = null;
  try {
    db = await openObservedTreesDb();
    const database = db;
    const rawRecords = await new Promise<unknown[]>((resolve, reject) => {
      const tx = database.transaction(observedTreesStoreName, 'readonly');
      const store = tx.objectStore(observedTreesStoreName);
      const request = store.getAll();
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
      request.onerror = () => reject(request.error ?? new Error('Failed to read pending trees'));
      tx.onabort = () => reject(tx.error ?? new Error('Read transaction aborted'));
    });
    const { submissions, hadInvalidData } = normalizePendingTreeRecords(rawRecords);
    return { submissions, hadInvalidData, storageError: false };
  } catch {
    return { submissions: [], hadInvalidData: false, storageError: true };
  } finally {
    db?.close();
  }
}

export async function addPendingTree(submission: PendingTreeSubmission): Promise<SavePendingTreeResult> {
  if (!isValidPendingTreeRecord(submission)) {
    return { ok: false, reason: 'unavailable' };
  }
  let db: IDBDatabase | null = null;
  try {
    db = await openObservedTreesDb();
    const database = db;
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(observedTreesStoreName, 'readwrite');
      const store = tx.objectStore(observedTreesStoreName);
      store.put(submission);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to save pending tree'));
      tx.onabort = () => reject(tx.error ?? new Error('Write transaction aborted'));
    });
    return { ok: true };
  } catch (error) {
    const errorName = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
    return { ok: false, reason: errorName === 'QuotaExceededError' ? 'quota' : 'unavailable' };
  } finally {
    db?.close();
  }
}

export async function deletePendingTree(id: string): Promise<boolean> {
  let db: IDBDatabase | null = null;
  try {
    db = await openObservedTreesDb();
    const database = db;
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(observedTreesStoreName, 'readwrite');
      const store = tx.objectStore(observedTreesStoreName);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to delete pending tree'));
      tx.onabort = () => reject(tx.error ?? new Error('Delete transaction aborted'));
    });
    return true;
  } catch {
    return false;
  } finally {
    db?.close();
  }
}

export function createPendingTreeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `pending-tree-${crypto.randomUUID()}`;
  }
  return `pending-tree-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
