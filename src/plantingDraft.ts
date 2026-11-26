import { conditions, emptySurvey, fields, sidewalkMessage } from './plantingData';
import type { Coordinates, SurveyValues } from './plantingData';

export const draftKey = 'tanta-green.planting-draft.v1';

export interface PlantingDraft {
  version: 1;
  location: Coordinates;
  values: SurveyValues;
  updatedAt: string;
}

// Storage can be edited, disabled or left over from an older version.
export function parseDraft(raw: string | null): PlantingDraft | null {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw);
    if (draft?.version !== 1 || !Array.isArray(draft.location) || draft.location.length !== 2
      || !draft.location.every((n: unknown) => typeof n === 'number' && Number.isFinite(n))
      || Math.abs(draft.location[0]) > 180 || Math.abs(draft.location[1]) > 90
      || typeof draft.updatedAt !== 'string' || !Number.isFinite(Date.parse(draft.updatedAt))
      || !draft.values || typeof draft.values !== 'object') return null;

    const values: SurveyValues = { ...emptySurvey };
    for (const field of fields) {
      const value: unknown = draft.values[field.key] ?? '';
      if (typeof value !== 'string') return null;
      if (value !== '') {
        const number = Number(value);
        if (!value.trim() || !Number.isFinite(number) || number < field.min
          || ('max' in field && number > field.max)
          || ('floors' in field && !Number.isInteger(number))) return null;
      }
      values[field.key] = value;
    }
    for (const condition of conditions) {
      const value: unknown = draft.values[condition.key] ?? '';
      if (typeof value !== 'string' || (value !== '' && !condition.options.some(option => option === value))) return null;
      values[condition.key] = value;
    }
    if (sidewalkMessage(values)) return null;
    return { version: 1, location: draft.location, values, updatedAt: draft.updatedAt };
  } catch {
    return null;
  }
}

export function loadDraft(): PlantingDraft | null {
  try {
    return parseDraft(localStorage.getItem(draftKey));
  } catch {
    return null;
  }
}
