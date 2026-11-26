import type { Tree } from './treeData';
import {
  allowedPendingTreeImageTypes,
  maxPendingTreePhotoBytes,
} from './observedTrees';
import { isValidEntryDate } from './treeStories';

export const careDbName = 'tanta-green-guide-care';
export const careStoreName = 'careLogs';
export const careDbVersion = 1;
export const provisionalPhotoDatesTarget = 3;

export const careConditions = [
  'جيدة — نمو سليم',
  'محتاجة ري',
  'محتاجة تقليم أو دعم',
  'متضررة أو تحت الملاحظة',
] as const;

export type CareCondition = (typeof careConditions)[number];

const careConditionSet = new Set<string>(careConditions);
const allowedImageTypeSet = new Set<string>(allowedPendingTreeImageTypes);

export interface CareFollowUpLog {
  id: string;
  treeId: string;
  followUpDate: string;
  condition: CareCondition;
  observation: string;
  createdAt: string;
  photo: Blob | null;
  photoName: string;
  photoType: string;
  photoSize: number;
}

export interface CareLoadResult {
  logs: CareFollowUpLog[];
  hadInvalidData: boolean;
  storageError: boolean;
}

export type SaveCareResult =
  | { ok: true }
  | { ok: false; reason: 'quota' | 'unavailable' };

export interface TrackedTreeCareSummary {
  tree: Tree;
  treeId: string;
  latestDate: string;
  latestCondition: CareCondition;
  latestObservation: string;
  latestCreatedAt: string;
  totalLogs: number;
  uniqueFollowUpDates: number;
  documentedPhotoDateCount: number;
  hasTrialBadge: boolean;
}

export function isValidCareLogRecord(
  entry: unknown,
  seenIds?: Set<string>
): entry is CareFollowUpLog {
  if (!entry || typeof entry !== 'object') return false;
  const candidate = entry as Record<string, unknown>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const treeId = typeof candidate.treeId === 'string' ? candidate.treeId.trim() : '';
  const condition = typeof candidate.condition === 'string' ? candidate.condition : '';
  const observation = typeof candidate.observation === 'string' ? candidate.observation.trim() : '';
  const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt : '';
  const photo = candidate.photo;

  if (
    !id ||
    seenIds?.has(id) ||
    !treeId ||
    !isValidEntryDate(candidate.followUpDate) ||
    !careConditionSet.has(condition) ||
    !observation ||
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

export function sortCareLogsNewestFirst(logs: CareFollowUpLog[]): CareFollowUpLog[] {
  return [...logs].sort((a, b) => {
    const dateDiff = b.followUpDate.localeCompare(a.followUpDate);
    if (dateDiff !== 0) return dateDiff;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

export function normalizeCareLogRecords(rawRecords: unknown[]): {
  logs: CareFollowUpLog[];
  hadInvalidData: boolean;
} {
  const logs: CareFollowUpLog[] = [];
  const seenIds = new Set<string>();
  let hadInvalidData = false;

  for (const entry of rawRecords) {
    if (!isValidCareLogRecord(entry, seenIds)) {
      hadInvalidData = true;
      continue;
    }
    const id = entry.id.trim();
    seenIds.add(id);
    logs.push({
      id,
      treeId: entry.treeId.trim(),
      followUpDate: entry.followUpDate,
      condition: entry.condition,
      observation: entry.observation.trim(),
      createdAt: entry.createdAt,
      photo: entry.photo,
      photoName: entry.photo
        ? (typeof entry.photoName === 'string' && entry.photoName.trim() ? entry.photoName : 'care-photo')
        : '',
      photoType: entry.photo ? entry.photo.type : '',
      photoSize: entry.photo ? entry.photo.size : 0,
    });
  }

  return { logs: sortCareLogsNewestFirst(logs), hadInvalidData };
}

export function summarizeCareByTree(logs: CareFollowUpLog[], trees: Tree[]): TrackedTreeCareSummary[] {
  const existingTrees = new Map(trees.map(tree => [String(tree.id), tree]));
  const grouped = new Map<string, CareFollowUpLog[]>();

  for (const log of sortCareLogsNewestFirst(logs)) {
    if (!existingTrees.has(log.treeId)) continue;
    const list = grouped.get(log.treeId);
    if (list) list.push(log);
    else grouped.set(log.treeId, [log]);
  }

  const summaries: TrackedTreeCareSummary[] = [];
  for (const [treeId, treeLogs] of grouped.entries()) {
    const tree = existingTrees.get(treeId);
    if (!tree || treeLogs.length === 0) continue;
    const latest = treeLogs[0];
    const allDates = new Set<string>();
    const photoDates = new Set<string>();

    for (const item of treeLogs) {
      allDates.add(item.followUpDate);
      if (item.photo !== null) {
        photoDates.add(item.followUpDate);
      }
    }

    const documentedPhotoDateCount = photoDates.size;
    summaries.push({
      tree,
      treeId,
      latestDate: latest.followUpDate,
      latestCondition: latest.condition,
      latestObservation: latest.observation,
      latestCreatedAt: latest.createdAt,
      totalLogs: treeLogs.length,
      uniqueFollowUpDates: allDates.size,
      documentedPhotoDateCount,
      hasTrialBadge: documentedPhotoDateCount >= provisionalPhotoDatesTarget,
    });
  }

  summaries.sort((a, b) => {
    const dateDiff = b.latestDate.localeCompare(a.latestDate);
    if (dateDiff !== 0) return dateDiff;
    return Date.parse(b.latestCreatedAt) - Date.parse(a.latestCreatedAt);
  });

  return summaries;
}

function openCareDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(careDbName, careDbVersion);
    } catch (error) {
      reject(error);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(careStoreName)) {
        const store = db.createObjectStore(careStoreName, { keyPath: 'id' });
        store.createIndex('byTreeId', 'treeId', { unique: false });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error('Failed to open care IndexedDB'));
    request.onblocked = () => reject(new Error('Care IndexedDB open blocked'));
  });
}

export async function loadCareLogs(): Promise<CareLoadResult> {
  let db: IDBDatabase | null = null;
  try {
    db = await openCareDb();
    const database = db;
    const rawRecords = await new Promise<unknown[]>((resolve, reject) => {
      const tx = database.transaction(careStoreName, 'readonly');
      const store = tx.objectStore(careStoreName);
      const request = store.getAll();
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
      request.onerror = () => reject(request.error ?? new Error('Failed to read care logs'));
      tx.onabort = () => reject(tx.error ?? new Error('Read care logs transaction aborted'));
    });
    const { logs, hadInvalidData } = normalizeCareLogRecords(rawRecords);
    return { logs, hadInvalidData, storageError: false };
  } catch {
    return { logs: [], hadInvalidData: false, storageError: true };
  } finally {
    db?.close();
  }
}

export async function addCareLog(entry: CareFollowUpLog): Promise<SaveCareResult> {
  if (!isValidCareLogRecord(entry)) {
    return { ok: false, reason: 'unavailable' };
  }
  let db: IDBDatabase | null = null;
  try {
    db = await openCareDb();
    const database = db;
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(careStoreName, 'readwrite');
      const store = tx.objectStore(careStoreName);
      store.add(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to save care log'));
      tx.onabort = () => reject(tx.error ?? new Error('Save care log transaction aborted'));
    });
    return { ok: true };
  } catch (error) {
    const errorName = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
    return { ok: false, reason: errorName === 'QuotaExceededError' ? 'quota' : 'unavailable' };
  } finally {
    db?.close();
  }
}

export async function deleteCareLog(id: string): Promise<boolean> {
  let db: IDBDatabase | null = null;
  try {
    db = await openCareDb();
    const database = db;
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(careStoreName, 'readwrite');
      const store = tx.objectStore(careStoreName);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to delete care log'));
      tx.onabort = () => reject(tx.error ?? new Error('Delete care log transaction aborted'));
    });
    return true;
  } catch {
    return false;
  } finally {
    db?.close();
  }
}

export function createCareLogId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `care-${crypto.randomUUID()}`;
  }
  return `care-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
