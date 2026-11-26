import {
  allowedPendingTreeImageTypes,
  maxPendingTreePhotoBytes,
} from './observedTrees';

export const treeStoriesDbName = 'tanta-green-guide-stories';
export const treeStoriesStoreName = 'treeStories';
export const treeStoriesDbVersion = 1;

const allowedImageTypeSet = new Set<string>(allowedPendingTreeImageTypes);

export interface TreeStoryEntry {
  id: string;
  treeId: string;
  story: string;
  entryDate: string;
  createdAt: string;
  photo: Blob | null;
  photoName: string;
  photoType: string;
  photoSize: number;
}

export interface TreeStoryLoadResult {
  entries: TreeStoryEntry[];
  hadInvalidData: boolean;
  storageError: boolean;
}

export type SaveTreeStoryResult =
  | { ok: true }
  | { ok: false; reason: 'quota' | 'unavailable' };

export function isValidEntryDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidTreeStoryRecord(
  entry: unknown,
  seenIds?: Set<string>
): entry is TreeStoryEntry {
  if (!entry || typeof entry !== 'object') return false;
  const candidate = entry as Record<string, unknown>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const treeId = typeof candidate.treeId === 'string' ? candidate.treeId.trim() : '';
  const story = typeof candidate.story === 'string' ? candidate.story.trim() : '';
  const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt : '';
  const photo = candidate.photo;

  if (
    !id ||
    seenIds?.has(id) ||
    !treeId ||
    !story ||
    !isValidEntryDate(candidate.entryDate) ||
    !Number.isFinite(Date.parse(createdAt))
  ) {
    return false;
  }

  if (photo !== null) {
    if (
      !(photo instanceof Blob) ||
      photo.size <= 0 ||
      photo.size > maxPendingTreePhotoBytes ||
      !allowedImageTypeSet.has(photo.type)
    ) {
      return false;
    }
  }

  return true;
}

export function normalizeTreeStoryRecords(rawRecords: unknown[]): {
  entries: TreeStoryEntry[];
  hadInvalidData: boolean;
} {
  const entries: TreeStoryEntry[] = [];
  const seenIds = new Set<string>();
  let hadInvalidData = false;

  for (const entry of rawRecords) {
    if (!isValidTreeStoryRecord(entry, seenIds)) {
      hadInvalidData = true;
      continue;
    }
    const id = entry.id.trim();
    seenIds.add(id);
    entries.push({
      id,
      treeId: entry.treeId.trim(),
      story: entry.story.trim(),
      entryDate: entry.entryDate,
      createdAt: entry.createdAt,
      photo: entry.photo,
      photoName: entry.photo
        ? (typeof entry.photoName === 'string' && entry.photoName.trim() ? entry.photoName : 'tree-growth-photo')
        : '',
      photoType: entry.photo ? entry.photo.type : '',
      photoSize: entry.photo ? entry.photo.size : 0,
    });
  }

  entries.sort((a, b) => {
    const dateDiff = a.entryDate.localeCompare(b.entryDate);
    if (dateDiff !== 0) return dateDiff;
    return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  });

  return { entries, hadInvalidData };
}

function openTreeStoriesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(treeStoriesDbName, treeStoriesDbVersion);
    } catch (error) {
      reject(error);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(treeStoriesStoreName)) {
        const store = db.createObjectStore(treeStoriesStoreName, { keyPath: 'id' });
        store.createIndex('byTreeId', 'treeId', { unique: false });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error('Failed to open tree stories IndexedDB'));
    request.onblocked = () => reject(new Error('Tree stories IndexedDB open blocked'));
  });
}

export async function loadTreeStories(): Promise<TreeStoryLoadResult> {
  let db: IDBDatabase | null = null;
  try {
    db = await openTreeStoriesDb();
    const database = db;
    const rawRecords = await new Promise<unknown[]>((resolve, reject) => {
      const tx = database.transaction(treeStoriesStoreName, 'readonly');
      const store = tx.objectStore(treeStoriesStoreName);
      const request = store.getAll();
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
      request.onerror = () => reject(request.error ?? new Error('Failed to read tree stories'));
      tx.onabort = () => reject(tx.error ?? new Error('Read tree stories transaction aborted'));
    });
    const { entries, hadInvalidData } = normalizeTreeStoryRecords(rawRecords);
    return { entries, hadInvalidData, storageError: false };
  } catch {
    return { entries: [], hadInvalidData: false, storageError: true };
  } finally {
    db?.close();
  }
}

export async function addTreeStory(entry: TreeStoryEntry): Promise<SaveTreeStoryResult> {
  if (!isValidTreeStoryRecord(entry)) {
    return { ok: false, reason: 'unavailable' };
  }
  let db: IDBDatabase | null = null;
  try {
    db = await openTreeStoriesDb();
    const database = db;
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(treeStoriesStoreName, 'readwrite');
      const store = tx.objectStore(treeStoriesStoreName);
      store.put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to save tree story'));
      tx.onabort = () => reject(tx.error ?? new Error('Save tree story transaction aborted'));
    });
    return { ok: true };
  } catch (error) {
    const errorName = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
    return { ok: false, reason: errorName === 'QuotaExceededError' ? 'quota' : 'unavailable' };
  } finally {
    db?.close();
  }
}

export async function deleteTreeStory(id: string): Promise<boolean> {
  let db: IDBDatabase | null = null;
  try {
    db = await openTreeStoriesDb();
    const database = db;
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(treeStoriesStoreName, 'readwrite');
      const store = tx.objectStore(treeStoriesStoreName);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to delete tree story'));
      tx.onabort = () => reject(tx.error ?? new Error('Delete tree story transaction aborted'));
    });
    return true;
  } catch {
    return false;
  } finally {
    db?.close();
  }
}

export function createTreeStoryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `story-${crypto.randomUUID()}`;
  }
  return `story-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
