import type { Coordinates } from './plantingData';

export const shadeNeedsKey = 'tanta-green.shade-needs.v1';

export interface ShadeNeedReport {
  id: string;
  location: Coordinates;
  reason: string;
  createdAt: string;
}

export interface ShadeNeedLoadResult {
  reports: ShadeNeedReport[];
  hadInvalidData: boolean;
  storageError: boolean;
}

function isValidCoordinates(value: unknown): value is Coordinates {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n): n is number => typeof n === 'number' && Number.isFinite(n)) &&
    Math.abs(value[0]) <= 180 &&
    Math.abs(value[1]) <= 90
  );
}

// Storage can be edited, corrupted, disabled, or left over from another version.
export function parseShadeNeeds(raw: string | null): { reports: ShadeNeedReport[]; hadInvalidData: boolean } {
  if (raw === null) return { reports: [], hadInvalidData: false };
  try {
    const parsed = JSON.parse(raw) as { version?: unknown; reports?: unknown } | null;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1 || !Array.isArray(parsed.reports)) {
      return { reports: [], hadInvalidData: true };
    }

    const reports: ShadeNeedReport[] = [];
    const seenIds = new Set<string>();
    let hadInvalidData = false;

    for (const entry of parsed.reports) {
      if (!entry || typeof entry !== 'object') {
        hadInvalidData = true;
        continue;
      }
      const candidate = entry as Record<string, unknown>;
      const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
      const reason = typeof candidate.reason === 'string' ? candidate.reason.trim() : '';
      const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt : '';

      if (
        !id ||
        seenIds.has(id) ||
        !isValidCoordinates(candidate.location) ||
        !reason ||
        !Number.isFinite(Date.parse(createdAt))
      ) {
        hadInvalidData = true;
        continue;
      }

      seenIds.add(id);
      reports.push({
        id,
        location: [candidate.location[0], candidate.location[1]],
        reason,
        createdAt,
      });
    }

    return { reports, hadInvalidData };
  } catch {
    return { reports: [], hadInvalidData: true };
  }
}

export function loadShadeNeeds(): ShadeNeedLoadResult {
  try {
    const { reports, hadInvalidData } = parseShadeNeeds(localStorage.getItem(shadeNeedsKey));
    return { reports, hadInvalidData, storageError: false };
  } catch {
    return { reports: [], hadInvalidData: false, storageError: true };
  }
}

export function saveShadeNeeds(reports: ShadeNeedReport[]): boolean {
  try {
    localStorage.setItem(shadeNeedsKey, JSON.stringify({ version: 1, reports }));
    return true;
  } catch {
    return false;
  }
}

export function createShadeNeedId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `shade-${crypto.randomUUID()}`;
  }
  return `shade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
