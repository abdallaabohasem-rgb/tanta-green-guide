import type { Coordinates } from './plantingData';

export const streetInitiativeKey = 'tanta-green.street-initiative.v1';

export type InitiativeRoleId = 'planting' | 'care' | 'documentation';
export type InitiativeTaskStatus = 'todo' | 'in-progress' | 'done';

export interface DemoCandidateLocation {
  id: string;
  label: string;
  note: string;
  coordinates: Coordinates;
}

export interface InitiativeRoleDef {
  id: InitiativeRoleId;
  label: string;
  summary: string;
}

export interface InitiativeTaskDef {
  id: string;
  role: InitiativeRoleId;
  title: string;
  defaultStatus: InitiativeTaskStatus;
}

export interface StreetInitiativeState {
  version: 1;
  claimedRoles: InitiativeRoleId[];
  taskStatuses: Record<string, InitiativeTaskStatus>;
}

export interface StreetInitiativeLoadResult {
  state: StreetInitiativeState;
  hadInvalidData: boolean;
  storageError: boolean;
}

export interface InitiativeProgressSummary {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  percent: number;
}

// Fictional demo coordinates in central Tanta for map preview only — not an approved pilot street.
export const demoCandidateLocations: readonly DemoCandidateLocation[] = [
  {
    id: 'demo-spot-a',
    label: 'نقطة تجريبية أ — رصيف افتراضي أول',
    note: 'نقطة عرض افتراضية للمعاينة فقط',
    coordinates: [31.0004, 30.7898],
  },
  {
    id: 'demo-spot-b',
    label: 'نقطة تجريبية ب — رصيف افتراضي تاني',
    note: 'نقطة عرض افتراضية للمعاينة فقط',
    coordinates: [31.0029, 30.7879],
  },
  {
    id: 'demo-spot-c',
    label: 'نقطة تجريبية ج — رصيف افتراضي تالت',
    note: 'نقطة عرض افتراضية للمعاينة فقط',
    coordinates: [30.9986, 30.7912],
  },
];

export const initiativeRoles: readonly InitiativeRoleDef[] = [
  {
    id: 'planting',
    label: 'دور الزراعة',
    summary: 'متابعة جاهزية الحوض الافتراضي وترتيب غرس الشتلات',
  },
  {
    id: 'care',
    label: 'دور الرعاية',
    summary: 'متابعة جدول الري التجريبي وحماية الشتلات في البداية',
  },
  {
    id: 'documentation',
    label: 'دور التوثيق',
    summary: 'تصوير المواقع ومتابعة التغيّر عبر الزمن على المتصفح',
  },
];

export const initiativeTasks: readonly InitiativeTaskDef[] = [
  {
    id: 'task-plant-1',
    role: 'planting',
    title: 'معاينة النقاط الافتراضية على الرصيف والتأكد من المسافة الآمنة',
    defaultStatus: 'in-progress',
  },
  {
    id: 'task-plant-2',
    role: 'planting',
    title: 'تجهيز أحواض الزراعة الافتراضية وتثبيت الشتلات',
    defaultStatus: 'todo',
  },
  {
    id: 'task-care-1',
    role: 'care',
    title: 'توزيع أيام الري الأولية على المتطوعين في النموذج التجريبي',
    defaultStatus: 'todo',
  },
  {
    id: 'task-care-2',
    role: 'care',
    title: 'فحص التربة والدعامات الخشبية خلال الأسابيع الأولى',
    defaultStatus: 'todo',
  },
  {
    id: 'task-doc-1',
    role: 'documentation',
    title: 'توثيق صور الوضع القائم التجريبية قبل الغرس للمقارنة',
    defaultStatus: 'done',
  },
  {
    id: 'task-doc-2',
    role: 'documentation',
    title: 'تسجيل صور المتابعة الدورية في سجل الشارع التجريبي',
    defaultStatus: 'todo',
  },
];

export const taskStatusLabels: Record<InitiativeTaskStatus, string> = {
  todo: 'لسه ما بدأتش',
  'in-progress': 'قيد التنفيذ',
  done: 'اتنفذت',
};

const validRoleSet = new Set<string>(initiativeRoles.map(role => role.id));
const validTaskIds = new Set<string>(initiativeTasks.map(task => task.id));
const validStatusSet = new Set<string>(['todo', 'in-progress', 'done']);

export function createDefaultInitiativeState(): StreetInitiativeState {
  const taskStatuses: Record<string, InitiativeTaskStatus> = {};
  for (const task of initiativeTasks) {
    taskStatuses[task.id] = task.defaultStatus;
  }
  return {
    version: 1,
    claimedRoles: [],
    taskStatuses,
  };
}

export function computeInitiativeProgress(
  taskStatuses: Record<string, InitiativeTaskStatus>
): InitiativeProgressSummary {
  let done = 0;
  let inProgress = 0;
  let todo = 0;

  for (const task of initiativeTasks) {
    const status = taskStatuses[task.id] ?? task.defaultStatus;
    if (status === 'done') done += 1;
    else if (status === 'in-progress') inProgress += 1;
    else todo += 1;
  }

  const total = initiativeTasks.length;
  const percent = total > 0 ? Math.round(((done + inProgress * 0.5) / total) * 100) : 0;

  return { total, done, inProgress, todo, percent };
}

// Storage can be edited, corrupted, disabled, or left over from another version.
export function parseStreetInitiative(raw: string | null): {
  state: StreetInitiativeState;
  hadInvalidData: boolean;
} {
  const defaults = createDefaultInitiativeState();
  if (raw === null) return { state: defaults, hadInvalidData: false };

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
      return { state: defaults, hadInvalidData: true };
    }

    let hadInvalidData = false;
    const claimedRoles: InitiativeRoleId[] = [];
    const seenRoles = new Set<string>();

    if (!Array.isArray(parsed.claimedRoles)) {
      hadInvalidData = true;
    } else {
      for (const role of parsed.claimedRoles) {
        if (typeof role === 'string' && validRoleSet.has(role) && !seenRoles.has(role)) {
          seenRoles.add(role);
          claimedRoles.push(role as InitiativeRoleId);
        } else {
          hadInvalidData = true;
        }
      }
    }

    const taskStatuses: Record<string, InitiativeTaskStatus> = { ...defaults.taskStatuses };
    const rawStatuses = parsed.taskStatuses;
    if (!rawStatuses || typeof rawStatuses !== 'object' || Array.isArray(rawStatuses)) {
      hadInvalidData = true;
    } else {
      const statusMap = rawStatuses as Record<string, unknown>;
      for (const [taskId, status] of Object.entries(statusMap)) {
        if (!validTaskIds.has(taskId) || typeof status !== 'string' || !validStatusSet.has(status)) {
          hadInvalidData = true;
        }
      }
      for (const task of initiativeTasks) {
        const candidate = statusMap[task.id];
        if (typeof candidate === 'string' && validStatusSet.has(candidate)) {
          taskStatuses[task.id] = candidate as InitiativeTaskStatus;
        } else {
          hadInvalidData = true;
        }
      }
    }

    return {
      state: { version: 1, claimedRoles, taskStatuses },
      hadInvalidData,
    };
  } catch {
    return { state: defaults, hadInvalidData: true };
  }
}

export function loadStreetInitiative(): StreetInitiativeLoadResult {
  try {
    const { state, hadInvalidData } = parseStreetInitiative(localStorage.getItem(streetInitiativeKey));
    return { state, hadInvalidData, storageError: false };
  } catch {
    return { state: createDefaultInitiativeState(), hadInvalidData: false, storageError: true };
  }
}

export function saveStreetInitiative(state: StreetInitiativeState): boolean {
  try {
    localStorage.setItem(streetInitiativeKey, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
