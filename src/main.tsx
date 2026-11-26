import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import treesUrl from '../trees-demo.geojson?url';
import { PlantingSurvey } from './PlantingSurvey';
import { Homepage } from './Homepage';
import { SpeciesGuide } from './SpeciesGuide';
import { RooftopGuide } from './RooftopGuide';
import { ShadeNeedPanel } from './ShadeNeedPanel';
import type { ShadeNotice } from './ShadeNeedPanel';
import { AddTreePanel } from './AddTreePanel';
import type { AddTreeNotice, DraftTreePhoto } from './AddTreePanel';
import { TreeDetailsPanel } from './TreeDetailsPanel';
import { TreeStoryPanel } from './TreeStoryPanel';
import type { TreeStoryNotice } from './TreeStoryPanel';
import { CareContinuityPanel } from './CareContinuityPanel';
import type { CareNotice } from './CareContinuityPanel';
import { StreetInitiativePanel } from './StreetInitiativePanel';
import type { StreetInitiativeNotice } from './StreetInitiativePanel';
import type { PickingMode } from './TantaMap';
import { parseTrees, treeFilters } from './treeData';
import type { Tree } from './treeData';
import { draftKey, loadDraft, parseDraft } from './plantingDraft';
import type { PlantingDraft } from './plantingDraft';
import { emptySurvey } from './plantingData';
import type { Coordinates, SurveyValues } from './plantingData';
import {
  createShadeNeedId,
  loadShadeNeeds,
  parseShadeNeeds,
  saveShadeNeeds,
  shadeNeedsKey,
} from './shadeNeeds';
import type { ShadeNeedReport } from './shadeNeeds';
import {
  addPendingTree,
  createPendingTreeId,
  deletePendingTree,
  loadPendingTrees,
  pendingTreeStatus,
} from './observedTrees';
import type { PendingTreeSubmission } from './observedTrees';
import { parseHashRoute, participateHash, treeHashForId } from './treeLinks';
import type { ParticipateSection } from './treeLinks';
import {
  addTreeStory,
  createTreeStoryId,
  deleteTreeStory,
  loadTreeStories,
  todayDateString,
} from './treeStories';
import type { TreeStoryEntry } from './treeStories';
import {
  addCareLog,
  careConditions,
  createCareLogId,
  deleteCareLog,
  loadCareLogs,
  sortCareLogsNewestFirst,
} from './careContinuity';
import type { CareCondition, CareFollowUpLog } from './careContinuity';
import {
  createDefaultInitiativeState,
  demoCandidateLocations,
  loadStreetInitiative,
  parseStreetInitiative,
  saveStreetInitiative,
  streetInitiativeKey,
} from './streetInitiative';
import type {
  DemoCandidateLocation,
  InitiativeRoleId,
  InitiativeTaskStatus,
  StreetInitiativeState,
} from './streetInitiative';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';

const format = new Intl.NumberFormat('ar-EG');
const emptyShadeNeeds: ShadeNeedReport[] = [];
const participateTabs: ReadonlyArray<{ id: ParticipateSection; label: string; href: string }> = [
  { id: 'plant', label: 'ازرع شجرة', href: participateHash('plant') },
  { id: 'shade', label: 'محتاجين ظل هنا', href: participateHash('shade') },
  { id: 'add-tree', label: 'أضف شجرة من شارعك', href: participateHash('add-tree') },
  { id: 'story', label: 'حكاية الشجرة ورمز QR', href: participateHash('story') },
  { id: 'care', label: 'تقدير الاستمرار في الرعاية', href: participateHash('care') },
  { id: 'initiative', label: 'شجّروا شارعكم مع بعض', href: participateHash('initiative') },
];
const participateTabLabels: Record<ParticipateSection, string> = {
  plant: 'ازرع شجرة',
  shade: 'محتاجين ظل هنا',
  'add-tree': 'أضف شجرة من شارعك',
  story: 'حكاية الشجرة ورمز QR',
  care: 'تقدير الاستمرار في الرعاية',
  initiative: 'شجّروا شارعكم مع بعض',
};
const invalidDeepLinkMessage =
  'الشجرة المطلوبة في الرابط مش موجودة في خريطة الأشجار الحالية (رقم المعرّف غير صالح أو الشجرة لسه قيد المراجعة).';
const TantaMap = lazy(() => import('./TantaMap').then(module => ({ default: module.TantaMap })));

function App() {
  const [initialRoute] = useState(() => parseHashRoute());
  const [page, setPage] = useState<'home' | 'map' | 'planting' | 'guide' | 'rooftop'>(initialRoute.page);
  const [participateSection, setParticipateSection] = useState<ParticipateSection>(
    initialRoute.page === 'planting' ? initialRoute.section : 'plant'
  );
  const [mapVisited, setMapVisited] = useState(initialRoute.page === 'map' || initialRoute.page === 'planting');
  const [trees, setTrees] = useState<Tree[]>([]);
  const [selected, setSelected] = useState<Tree['id'] | null>(null);
  const [pendingDeepLinkId, setPendingDeepLinkId] = useState<string | null>(
    initialRoute.page === 'map' ? initialRoute.treeId : null
  );
  const [invalidTreeNotice, setInvalidTreeNotice] = useState(
    initialRoute.page === 'map' && initialRoute.invalidDeepLink ? invalidDeepLinkMessage : ''
  );
  const [dataState, setDataState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pickingMode, setPickingMode] = useState<PickingMode>(null);
  const [plantingLocation, setPlantingLocation] = useState<Coordinates | null>(null);
  const [values, setValues] = useState<SurveyValues>({ ...emptySurvey });
  const [savedDraft, setSavedDraft] = useState(loadDraft);
  const [draftNotice, setDraftNotice] = useState('');
  const [surveyVersion, setSurveyVersion] = useState(0);
  const [focusLocation, setFocusLocation] = useState<Coordinates | null>(null);
  const [filter, setFilter] = useState('الكل');
  const [collapsed, setCollapsed] = useState(false);

  const [initialShadeLoad] = useState(loadShadeNeeds);
  const [shadeNeeds, setShadeNeeds] = useState<ShadeNeedReport[]>(initialShadeLoad.reports);
  const [selectedShadeNeedId, setSelectedShadeNeedId] = useState<string | null>(null);
  const [shadeDraftOpen, setShadeDraftOpen] = useState(false);
  const [shadeDraftLocation, setShadeDraftLocation] = useState<Coordinates | null>(null);
  const [shadeReason, setShadeReason] = useState('');
  const [shadeNotice, setShadeNotice] = useState<ShadeNotice | null>(() => {
    if (initialShadeLoad.storageError) {
      return { text: 'تعذّر قراءة بلاغات الظل من تخزين المتصفح على الجهاز ده.', tone: 'alert' };
    }
    if (initialShadeLoad.hadInvalidData) {
      return { text: 'لقينا بيانات غير صالحة في بلاغات الظل المحفوظة على الجهاز وتم تجاهلها.', tone: 'alert' };
    }
    return null;
  });
  const [shadeDeleteError, setShadeDeleteError] = useState('');

  const [pendingTrees, setPendingTrees] = useState<PendingTreeSubmission[]>([]);
  const [pendingTreesLoading, setPendingTreesLoading] = useState(true);
  const [addTreeDraftOpen, setAddTreeDraftOpen] = useState(false);
  const [addTreeDraftLocation, setAddTreeDraftLocation] = useState<Coordinates | null>(null);
  const [addTreeDescription, setAddTreeDescription] = useState('');
  const [addTreePhoto, setAddTreePhoto] = useState<DraftTreePhoto | null>(null);
  const [addTreeSaving, setAddTreeSaving] = useState(false);
  const [addTreeNotice, setAddTreeNotice] = useState<AddTreeNotice | null>(null);
  const addTreePhotoRef = useRef<DraftTreePhoto | null>(null);

  const [treeStories, setTreeStories] = useState<TreeStoryEntry[]>([]);
  const [treeStoriesLoading, setTreeStoriesLoading] = useState(true);
  const [treeStorySaving, setTreeStorySaving] = useState(false);
  const [treeStoryNotice, setTreeStoryNotice] = useState<TreeStoryNotice | null>(null);
  const [storyEditorTreeId, setStoryEditorTreeId] = useState(
    initialRoute.page === 'planting' && initialRoute.storyTreeId ? initialRoute.storyTreeId : ''
  );
  const [invalidStoryLink, setInvalidStoryLink] = useState(
    initialRoute.page === 'planting' && initialRoute.invalidStoryDeepLink
  );
  const [storyDraftText, setStoryDraftText] = useState('');
  const [storyDraftDate, setStoryDraftDate] = useState(todayDateString);
  const [storyDraftPhoto, setStoryDraftPhoto] = useState<DraftTreePhoto | null>(null);
  const storyPhotoRef = useRef<DraftTreePhoto | null>(null);

  const [careLogs, setCareLogs] = useState<CareFollowUpLog[]>([]);
  const [careLogsLoading, setCareLogsLoading] = useState(true);
  const [careSaving, setCareSaving] = useState(false);
  const [careNotice, setCareNotice] = useState<CareNotice | null>(null);
  const [careDraftTreeId, setCareDraftTreeId] = useState('');
  const [careDraftDate, setCareDraftDate] = useState(todayDateString);
  const [careDraftCondition, setCareDraftCondition] = useState<string>(careConditions[0]);
  const [careDraftObservation, setCareDraftObservation] = useState('');
  const [careDraftPhoto, setCareDraftPhoto] = useState<DraftTreePhoto | null>(null);
  const carePhotoRef = useRef<DraftTreePhoto | null>(null);

  const [initialInitiativeLoad] = useState(loadStreetInitiative);
  const [initiativeState, setInitiativeState] = useState<StreetInitiativeState>(initialInitiativeLoad.state);
  const [initiativePreviewId, setInitiativePreviewId] = useState<string | null>(null);
  const [initiativeNotice, setInitiativeNotice] = useState<StreetInitiativeNotice | null>(() => {
    if (initialInitiativeLoad.storageError) {
      return { text: 'تعذّر قراءة بيانات مبادرة الشارع من تخزين المتصفح على الجهاز ده.', tone: 'alert' };
    }
    if (initialInitiativeLoad.hadInvalidData) {
      return { text: 'لقينا بيانات غير صالحة في مبادرة الشارع المحفوظة ورجّعنا النموذج الافتراضي.', tone: 'alert' };
    }
    return null;
  });

  const opener = useRef<HTMLButtonElement | null>(null);
  const dismissButton = useRef<HTMLButtonElement>(null);
  const shadeOpener = useRef<HTMLButtonElement | null>(null);
  const dismissShadeButton = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const activeTabRef = useRef<HTMLAnchorElement | null>(null);
  const treesRef = useRef<Tree[]>([]);
  treesRef.current = trees;
  const cancelPickingRef = useRef<() => void>(() => {});

  const choosingPlanting = pickingMode === 'planting';
  const choosingShadeNeed = pickingMode === 'shade-need';
  const choosingAddTree = pickingMode === 'add-tree';

  function updateAddTreePhoto(next: DraftTreePhoto | null) {
    const previous = addTreePhotoRef.current;
    if (previous && previous.previewUrl !== next?.previewUrl) {
      URL.revokeObjectURL(previous.previewUrl);
    }
    addTreePhotoRef.current = next;
    setAddTreePhoto(next);
  }

  function updateStoryDraftPhoto(next: DraftTreePhoto | null) {
    const previous = storyPhotoRef.current;
    if (previous && previous.previewUrl !== next?.previewUrl) {
      URL.revokeObjectURL(previous.previewUrl);
    }
    storyPhotoRef.current = next;
    setStoryDraftPhoto(next);
  }

  function updateCareDraftPhoto(next: DraftTreePhoto | null) {
    const previous = carePhotoRef.current;
    if (previous && previous.previewUrl !== next?.previewUrl) {
      URL.revokeObjectURL(previous.previewUrl);
    }
    carePhotoRef.current = next;
    setCareDraftPhoto(next);
  }

  function startPicking() {
    cancelPicking();
    if (location.hash !== '#planting') history.pushState(null, '', '#planting');
    setPage('planting');
    setParticipateSection('plant');
    setSelected(null);
    setPendingDeepLinkId(null);
    setInvalidTreeNotice('');
    setSelectedShadeNeedId(null);
    setShadeDeleteError('');
    setInitiativePreviewId(null);
    setFocusLocation(null);
    setPickingMode('planting');
  }

  function selectTree(tree: Tree, trigger: HTMLButtonElement) {
    if (pickingMode) setPickingMode(null);
    setCollapsed(false);
    setSelectedShadeNeedId(null);
    setShadeDeleteError('');
    setPendingDeepLinkId(null);
    setInvalidTreeNotice('');
    opener.current = trigger;
    setSelected(tree.id);
    if (page === 'map') {
      const targetHash = treeHashForId(tree.id);
      if (location.hash !== targetHash) history.pushState(null, '', targetHash);
    }
    requestAnimationFrame(() => {
      sidebarRef.current?.scrollTo({ top: 0 });
      dismissButton.current?.focus({ preventScroll: true });
    });
  }

  function dismissTree() {
    setSelected(null);
    setPendingDeepLinkId(null);
    if (page === 'map' && location.hash.startsWith('#tree-map/')) {
      history.pushState(null, '', '#tree-map');
    }
    requestAnimationFrame(() => {
      if (opener.current?.isConnected) {
        if (!opener.current.closest('.map')) {
          opener.current.scrollIntoView({ block: 'nearest' });
        }
        opener.current.focus({ preventScroll: true });
      } else {
        const heading = document.getElementById(page === 'planting' ? 'planting-heading' : 'tree-map-heading');
        heading?.scrollIntoView({ block: 'nearest' });
        heading?.focus({ preventScroll: true });
      }
    });
  }

  function selectStoryTreeId(treeId: string) {
    setInvalidStoryLink(false);
    setStoryEditorTreeId(treeId);
    if (page === 'planting' && participateSection === 'story' && location.hash.startsWith('#planting/story/')) {
      const nextHash = participateHash('story', treeId || null);
      if (location.hash !== nextHash) history.replaceState(null, '', nextHash);
    }
  }

  function openStoryEditorForTree(treeId: string) {
    cancelPicking();
    setInvalidStoryLink(false);
    setStoryEditorTreeId(treeId);
    setSelected(null);
    setPendingDeepLinkId(null);
    setInvalidTreeNotice('');
    setSelectedShadeNeedId(null);
    setShadeDeleteError('');
    setInitiativePreviewId(null);
    setPickingMode(null);
    setFocusLocation(null);
    const targetHash = participateHash('story', treeId);
    if (location.hash !== targetHash) history.pushState(null, '', targetHash);
    setPage('planting');
    setParticipateSection('story');
    requestAnimationFrame(() => {
      const target = document.getElementById('story-text') ?? document.getElementById('tree-story-heading');
      target?.scrollIntoView({ block: 'nearest' });
      target?.focus({ preventScroll: true });
    });
  }

  function selectShadeNeed(report: ShadeNeedReport, trigger: HTMLButtonElement, focusOnMap = false) {
    setCollapsed(false);
    setSelected(null);
    setShadeDeleteError('');
    shadeOpener.current = trigger;
    setSelectedShadeNeedId(report.id);
    if (focusOnMap) setFocusLocation([...report.location]);
    requestAnimationFrame(() => {
      sidebarRef.current?.scrollTo({ top: 0 });
      dismissShadeButton.current?.focus({ preventScroll: true });
    });
  }

  function dismissShadeNeed() {
    setSelectedShadeNeedId(null);
    setShadeDeleteError('');
    setFocusLocation(null);
    requestAnimationFrame(() => {
      shadeOpener.current?.scrollIntoView({ block: 'nearest' });
      shadeOpener.current?.focus({ preventScroll: true });
    });
  }

  function pickLocation(location: Coordinates) {
    setPlantingLocation(location);
    setValues({ ...emptySurvey });
    setSurveyVersion(version => version + 1);
    setFocusLocation(null);
    setPickingMode(null);
    setDraftNotice('');
    requestAnimationFrame(() => document.getElementById('plant-child-heading')?.focus({ preventScroll: true }));
  }

  function startShadeNeedReport() {
    setSelected(null);
    setSelectedShadeNeedId(null);
    setShadeDeleteError('');
    setFocusLocation(null);
    if (addTreeDraftOpen && !addTreeDraftLocation && !addTreeDescription.trim() && !addTreePhoto) {
      setAddTreeDraftOpen(false);
    }
    setShadeDraftOpen(true);
    setShadeDraftLocation(null);
    setShadeReason('');
    setShadeNotice(null);
    setPickingMode('shade-need');
  }

  function startMovingShadePoint() {
    setSelected(null);
    setSelectedShadeNeedId(null);
    setShadeDeleteError('');
    setFocusLocation(null);
    setShadeNotice(null);
    setPickingMode('shade-need');
  }

  function startAddTreeReport() {
    setSelected(null);
    setSelectedShadeNeedId(null);
    setShadeDeleteError('');
    setFocusLocation(null);
    if (shadeDraftOpen && !shadeDraftLocation && !shadeReason.trim()) {
      setShadeDraftOpen(false);
    }
    setAddTreeDraftOpen(true);
    setAddTreeDraftLocation(null);
    setAddTreeDescription('');
    updateAddTreePhoto(null);
    setAddTreeNotice(null);
    setPickingMode('add-tree');
  }

  function startMovingAddTreePoint() {
    setSelected(null);
    setSelectedShadeNeedId(null);
    setShadeDeleteError('');
    setFocusLocation(null);
    setAddTreeNotice(null);
    setPickingMode('add-tree');
  }

  function cancelPicking() {
    if (pickingMode === 'shade-need' && !shadeDraftLocation) {
      setShadeDraftOpen(false);
      setShadeReason('');
    } else if (pickingMode === 'add-tree' && !addTreeDraftLocation) {
      setAddTreeDraftOpen(false);
      setAddTreeDescription('');
      updateAddTreePhoto(null);
    }
    setPickingMode(null);
  }
  cancelPickingRef.current = cancelPicking;

  function cancelShadeDraft() {
    if (pickingMode === 'shade-need') setPickingMode(null);
    setShadeDraftOpen(false);
    setShadeDraftLocation(null);
    setShadeReason('');
    setShadeNotice(null);
    requestAnimationFrame(() => {
      const heading = document.getElementById('shade-need-heading');
      heading?.scrollIntoView({ block: 'nearest' });
      heading?.focus({ preventScroll: true });
    });
  }

  function cancelAddTreeDraft() {
    if (pickingMode === 'add-tree') setPickingMode(null);
    setAddTreeDraftOpen(false);
    setAddTreeDraftLocation(null);
    setAddTreeDescription('');
    updateAddTreePhoto(null);
    setAddTreeNotice(null);
    requestAnimationFrame(() => {
      const heading = document.getElementById('add-tree-heading');
      heading?.scrollIntoView({ block: 'nearest' });
      heading?.focus({ preventScroll: true });
    });
  }

  function handleMapPick(pickedLocation: Coordinates) {
    if (pickingMode === 'shade-need') {
      setShadeDraftLocation(pickedLocation);
      setFocusLocation(null);
      setPickingMode(null);
      setShadeNotice(null);
      requestAnimationFrame(() => {
        const reasonInput = document.getElementById('shade-need-reason');
        const target = reasonInput ?? document.getElementById('shade-need-heading');
        target?.scrollIntoView({ block: 'nearest' });
        target?.focus({ preventScroll: true });
      });
    } else if (pickingMode === 'add-tree') {
      setAddTreeDraftLocation(pickedLocation);
      setFocusLocation(null);
      setPickingMode(null);
      setAddTreeNotice(null);
      requestAnimationFrame(() => {
        const nameInput = document.getElementById('add-tree-name');
        const target = nameInput ?? document.getElementById('add-tree-heading');
        target?.scrollIntoView({ block: 'nearest' });
        target?.focus({ preventScroll: true });
      });
    } else if (pickingMode === 'planting') {
      pickLocation(pickedLocation);
    }
  }

  function saveShadeNeed(): boolean {
    if (!shadeDraftLocation) return false;
    const trimmedReason = shadeReason.trim();
    if (!trimmedReason) return false;

    const newReport: ShadeNeedReport = {
      id: createShadeNeedId(),
      location: [...shadeDraftLocation],
      reason: trimmedReason,
      createdAt: new Date().toISOString(),
    };
    const nextReports = [...shadeNeeds, newReport];
    if (!saveShadeNeeds(nextReports)) {
      setShadeNotice({
        text: 'تعذّر حفظ البلاغ على الجهاز. تأكّد إن تخزين المتصفح متاح ومش ممتلئ وجرّب تاني.',
        tone: 'alert',
      });
      return false;
    }

    setShadeNeeds(nextReports);
    setPickingMode(null);
    setShadeDraftOpen(false);
    setShadeDraftLocation(null);
    setShadeReason('');
    setShadeNotice({
      text: 'اتحفظ البلاغ على المتصفح ده كـ«احتياج للظل».',
      tone: 'status',
    });
    requestAnimationFrame(() => {
      const heading = document.getElementById('shade-need-heading');
      heading?.scrollIntoView({ block: 'nearest' });
      heading?.focus({ preventScroll: true });
    });
    return true;
  }

  function deleteShadeNeed(id: string) {
    const nextReports = shadeNeeds.filter(report => report.id !== id);
    if (!saveShadeNeeds(nextReports)) {
      setShadeDeleteError('تعذّر مسح البلاغ من تخزين المتصفح. جرّب تاني.');
      return;
    }
    setShadeNeeds(nextReports);
    setSelectedShadeNeedId(null);
    setShadeDeleteError('');
    setFocusLocation(null);
    setShadeNotice({ text: 'اتمسح البلاغ من الجهاز.', tone: 'status' });
    requestAnimationFrame(() => {
      const heading = document.getElementById('shade-need-heading');
      heading?.scrollIntoView({ block: 'nearest' });
      heading?.focus({ preventScroll: true });
    });
  }

  async function saveAddTree(): Promise<boolean> {
    if (!addTreeDraftLocation || !addTreePhoto) return false;
    const trimmedDescription = addTreeDescription.trim();
    if (!trimmedDescription) return false;

    const submission: PendingTreeSubmission = {
      id: createPendingTreeId(),
      location: [...addTreeDraftLocation],
      description: trimmedDescription,
      status: pendingTreeStatus,
      photo: addTreePhoto.blob,
      photoName: addTreePhoto.name,
      photoType: addTreePhoto.type,
      photoSize: addTreePhoto.size,
      createdAt: new Date().toISOString(),
    };

    setAddTreeSaving(true);
    const saveResult = await addPendingTree(submission);
    setAddTreeSaving(false);

    if (!saveResult.ok) {
      setAddTreeNotice({
        text:
          saveResult.reason === 'quota'
            ? 'مساحة تخزين المتصفح ممتلئة ومش قادرة تحفظ الصورة. امسح عنصر قديم أو اختار صورة أصغر وجرّب تاني.'
            : 'تعذّر حفظ الإضافة على تخزين المتصفح (IndexedDB). تأكّد إن التخزين متاح وجرّب تاني.',
        tone: 'alert',
      });
      return false;
    }

    setPendingTrees(current => [submission, ...current]);
    setPickingMode(null);
    setAddTreeDraftOpen(false);
    setAddTreeDraftLocation(null);
    setAddTreeDescription('');
    updateAddTreePhoto(null);
    setAddTreeNotice({
      text: 'اتحفظت الشجرة وصورتها على المتصفح ده بحالة «بانتظار المراجعة»، ومش هتظهر على الخريطة العامة غير بعد المراجعة مستقبلًا.',
      tone: 'status',
    });
    requestAnimationFrame(() => {
      const heading = document.getElementById('add-tree-heading');
      heading?.scrollIntoView({ block: 'nearest' });
      heading?.focus({ preventScroll: true });
    });
    return true;
  }

  async function removePendingTree(id: string) {
    const deleted = await deletePendingTree(id);
    if (!deleted) {
      setAddTreeNotice({
        text: 'تعذّر مسح الإضافة من تخزين المتصفح (IndexedDB). جرّب تاني.',
        tone: 'alert',
      });
      return;
    }
    setPendingTrees(current => current.filter(item => item.id !== id));
    setAddTreeNotice({
      text: 'اتمسحت الشجرة المنتظرة من المتصفح ده.',
      tone: 'status',
    });
  }

  async function saveTreeStory(input: {
    treeId: string;
    story: string;
    entryDate: string;
    photo: DraftTreePhoto | null;
  }): Promise<boolean> {
    const validExistingTree = trees.some(tree => String(tree.id) === input.treeId);
    const trimmedStory = input.story.trim();
    if (!validExistingTree || !trimmedStory) return false;

    const entry: TreeStoryEntry = {
      id: createTreeStoryId(),
      treeId: input.treeId,
      story: trimmedStory,
      entryDate: input.entryDate,
      createdAt: new Date().toISOString(),
      photo: input.photo ? input.photo.blob : null,
      photoName: input.photo ? input.photo.name : '',
      photoType: input.photo ? input.photo.type : '',
      photoSize: input.photo ? input.photo.size : 0,
    };

    setTreeStorySaving(true);
    const result = await addTreeStory(entry);
    setTreeStorySaving(false);

    if (!result.ok) {
      setTreeStoryNotice({
        text:
          result.reason === 'quota'
            ? 'مساحة تخزين المتصفح ممتلئة ومش قادرة تحفظ المشاركة أو الصورة. امسح عنصر قديم أو اختار صورة أصغر وجرّب تاني.'
            : 'تعذّر حفظ الحكاية على تخزين المتصفح (IndexedDB). تأكّد إن التخزين متاح وجرّب تاني.',
        tone: 'alert',
      });
      return false;
    }

    setTreeStories(current =>
      [...current, entry].sort((a, b) => {
        const diff = a.entryDate.localeCompare(b.entryDate);
        return diff !== 0 ? diff : Date.parse(a.createdAt) - Date.parse(b.createdAt);
      })
    );
    setStoryDraftText('');
    setStoryDraftDate(todayDateString());
    updateStoryDraftPhoto(null);
    setTreeStoryNotice({
      text: 'اتحفظت حكاية الشجرة على المتصفح ده، وتقدر تشوفها في ملف الشجرة أو تفتحها برمز QR.',
      tone: 'status',
    });
    return true;
  }

  async function removeTreeStory(id: string) {
    const deleted = await deleteTreeStory(id);
    if (!deleted) {
      setTreeStoryNotice({
        text: 'تعذّر مسح الحكاية من تخزين المتصفح (IndexedDB). جرّب تاني.',
        tone: 'alert',
      });
      return;
    }
    setTreeStories(current => current.filter(entry => entry.id !== id));
    setTreeStoryNotice({
      text: 'اتمسحت الحكاية من المتصفح ده.',
      tone: 'status',
    });
  }

  async function saveCareLog(input: {
    treeId: string;
    followUpDate: string;
    condition: CareCondition;
    observation: string;
    photo: DraftTreePhoto | null;
  }): Promise<boolean> {
    const validExistingTree = trees.some(tree => String(tree.id) === input.treeId);
    const trimmedObservation = input.observation.trim();
    if (!validExistingTree || !trimmedObservation) return false;

    const entry: CareFollowUpLog = {
      id: createCareLogId(),
      treeId: input.treeId,
      followUpDate: input.followUpDate,
      condition: input.condition,
      observation: trimmedObservation,
      createdAt: new Date().toISOString(),
      photo: input.photo ? input.photo.blob : null,
      photoName: input.photo ? input.photo.name : '',
      photoType: input.photo ? input.photo.type : '',
      photoSize: input.photo ? input.photo.size : 0,
    };

    setCareSaving(true);
    const result = await addCareLog(entry);
    setCareSaving(false);

    if (!result.ok) {
      setCareNotice({
        text:
          result.reason === 'quota'
            ? 'مساحة تخزين المتصفح ممتلئة ومش قادرة تحفظ متابعة الرعاية أو الصورة. امسح عنصر قديم أو اختار صورة أصغر وجرّب تاني.'
            : 'تعذّر حفظ متابعة الرعاية على تخزين المتصفح (IndexedDB). تأكّد إن التخزين متاح وجرّب تاني.',
        tone: 'alert',
      });
      return false;
    }

    setCareLogs(current => sortCareLogsNewestFirst([entry, ...current]));
    setCareDraftDate(todayDateString());
    setCareDraftCondition(careConditions[0]);
    setCareDraftObservation('');
    updateCareDraftPhoto(null);
    setCareNotice({
      text: 'اتسجّلت متابعة الرعاية على المتصفح ده واتحدّث ملخص الشجرة.',
      tone: 'status',
    });
    return true;
  }

  async function removeCareLog(id: string) {
    const deleted = await deleteCareLog(id);
    if (!deleted) {
      setCareNotice({
        text: 'تعذّر مسح متابعة الرعاية من تخزين المتصفح (IndexedDB). جرّب تاني.',
        tone: 'alert',
      });
      return;
    }
    setCareLogs(current => current.filter(log => log.id !== id));
    setCareNotice({
      text: 'اتمسحت متابعة الرعاية من المتصفح ده.',
      tone: 'status',
    });
  }

  function toggleInitiativePreview(candidate: DemoCandidateLocation) {
    if (initiativePreviewId === candidate.id) {
      setInitiativePreviewId(null);
      setFocusLocation(null);
      return;
    }
    setInitiativePreviewId(candidate.id);
    setFocusLocation([...candidate.coordinates]);
  }

  function toggleInitiativeRole(roleId: InitiativeRoleId) {
    const hasRole = initiativeState.claimedRoles.includes(roleId);
    const nextState: StreetInitiativeState = {
      ...initiativeState,
      claimedRoles: hasRole
        ? initiativeState.claimedRoles.filter(id => id !== roleId)
        : [...initiativeState.claimedRoles, roleId],
    };
    if (!saveStreetInitiative(nextState)) {
      setInitiativeNotice({
        text: 'تعذّر حفظ اختيار الدور على المتصفح. تأكّد من سماح التخزين وجرّب تاني.',
        tone: 'alert',
      });
      return;
    }
    setInitiativeState(nextState);
    setInitiativeNotice({
      text: hasRole ? 'تم التنازل عن الدور على هذا المتصفح.' : 'اتحفظ اختيارك للدور على هذا المتصفح.',
      tone: 'status',
    });
  }

  function updateInitiativeTaskStatus(taskId: string, status: InitiativeTaskStatus) {
    const nextState: StreetInitiativeState = {
      ...initiativeState,
      taskStatuses: {
        ...initiativeState.taskStatuses,
        [taskId]: status,
      },
    };
    if (!saveStreetInitiative(nextState)) {
      setInitiativeNotice({
        text: 'تعذّر حفظ حالة المهمة على المتصفح. تأكّد من سماح التخزين وجرّب تاني.',
        tone: 'alert',
      });
      return;
    }
    setInitiativeState(nextState);
    setInitiativeNotice({
      text: 'اتحدّثت حالة المهمة واتحسب التقدّم محليًا على هذا المتصفح.',
      tone: 'status',
    });
  }

  function resetInitiativeDemo() {
    const defaults = createDefaultInitiativeState();
    if (!saveStreetInitiative(defaults)) {
      setInitiativeNotice({
        text: 'تعذّر إعادة تعيين المبادرة في تخزين المتصفح. جرّب تاني.',
        tone: 'alert',
      });
      return;
    }
    setInitiativeState(defaults);
    setInitiativePreviewId(null);
    setFocusLocation(null);
    setInitiativeNotice({
      text: 'رجّعنا النموذج التجريبي لوضعه الافتراضي على المتصفح ده.',
      tone: 'status',
    });
  }

  function saveDraft() {
    if (!plantingLocation) return;
    const draft: PlantingDraft = { version: 1, location: plantingLocation, values, updatedAt: new Date().toISOString() };
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setSavedDraft(draft);
      setDraftNotice('اتحفظت النقطة وقياساتها على الجهاز. أي تعديل بعدها يحتاج حفظ جديد.');
    } catch {
      setDraftNotice('تعذّر الحفظ على الجهاز. اسمح بتخزين بيانات الموقع في المتصفح وجرّب تاني.');
    }
  }

  function restoreDraft() {
    if (!savedDraft) return;
    setPlantingLocation(savedDraft.location);
    setValues({ ...savedDraft.values });
    setSurveyVersion(version => version + 1);
    setFocusLocation([...savedDraft.location]);
    setSelected(null);
    setSelectedShadeNeedId(null);
    setShadeDeleteError('');
    setPickingMode(null);
    setDraftNotice('رجّعنا المسودة المحفوظة وقياساتها.');
    requestAnimationFrame(() => document.getElementById('plant-child-heading')?.focus({ preventScroll: true }));
  }

  function removeDraft() {
    try {
      localStorage.removeItem(draftKey);
      setSavedDraft(null);
      setDraftNotice('اتمسحت النسخة المحفوظة على الجهاز.');
    } catch {
      setDraftNotice('تعذّر مسح المسودة من تخزين المتصفح. جرّب تاني.');
    }
  }

  useEffect(() => {
    function navigate() {
      const route = parseHashRoute();
      cancelPickingRef.current();
      setPage(route.page);
      setSelectedShadeNeedId(null);
      setShadeDeleteError('');
      setInitiativePreviewId(null);
      setFocusLocation(null);
      if (route.page === 'planting') {
        setParticipateSection(route.section);
        setSelected(null);
        setPendingDeepLinkId(null);
        setInvalidTreeNotice('');
        if (route.section === 'story') {
          if (route.invalidStoryDeepLink) {
            setInvalidStoryLink(true);
            setStoryEditorTreeId('');
            requestAnimationFrame(() => {
              const target = document.getElementById('story-tree-id') ?? document.getElementById('tree-story-heading');
              target?.scrollIntoView({ block: 'nearest' });
              target?.focus({ preventScroll: true });
            });
          } else if (route.storyTreeId) {
            setInvalidStoryLink(false);
            setStoryEditorTreeId(route.storyTreeId);
            const knownTree = treesRef.current.length === 0 || treesRef.current.some(tree => String(tree.id) === route.storyTreeId);
            requestAnimationFrame(() => {
              const target = knownTree
                ? (document.getElementById('story-text') ?? document.getElementById('tree-story-heading'))
                : (document.getElementById('story-tree-id') ?? document.getElementById('tree-story-heading'));
              target?.scrollIntoView({ block: 'nearest' });
              target?.focus({ preventScroll: true });
            });
          } else {
            setInvalidStoryLink(false);
            setStoryEditorTreeId(current =>
              current && treesRef.current.length > 0 && !treesRef.current.some(tree => String(tree.id) === current)
                ? ''
                : current
            );
            requestAnimationFrame(() => {
              sidebarRef.current?.scrollTo({ top: 0 });
            });
          }
        } else {
          requestAnimationFrame(() => {
            sidebarRef.current?.scrollTo({ top: 0 });
          });
        }
      } else if (route.page === 'map') {
        if (route.invalidDeepLink) {
          setSelected(null);
          setPendingDeepLinkId(null);
          setInvalidTreeNotice(invalidDeepLinkMessage);
        } else if (route.treeId !== null) {
          setPendingDeepLinkId(route.treeId);
          setInvalidTreeNotice('');
        } else {
          setSelected(null);
          setPendingDeepLinkId(null);
          setInvalidTreeNotice('');
        }
      } else {
        setSelected(null);
        setPendingDeepLinkId(null);
        setInvalidTreeNotice('');
      }
    }
    function syncStorage(event: StorageEvent) {
      if (event.key === draftKey || event.key === null) setSavedDraft(parseDraft(event.newValue));
      if (event.key === shadeNeedsKey || event.key === null) {
        const parsed = parseShadeNeeds(event.newValue);
        setShadeNeeds(parsed.reports);
        setSelectedShadeNeedId(current =>
          current && parsed.reports.some(report => report.id === current) ? current : null
        );
        if (parsed.hadInvalidData) {
          setShadeNotice({
            text: 'لقينا بيانات غير صالحة في بلاغات الظل المحفوظة على الجهاز وتم تجاهلها.',
            tone: 'alert',
          });
        }
      }
      if (event.key === streetInitiativeKey || event.key === null) {
        const parsed = parseStreetInitiative(event.newValue);
        setInitiativeState(parsed.state);
        if (parsed.hadInvalidData) {
          setInitiativeNotice({
            text: 'لقينا بيانات غير صالحة في مبادرة الشارع المحفوظة ورجّعنا النموذج الافتراضي.',
            tone: 'alert',
          });
        }
      }
    }
    window.addEventListener('hashchange', navigate);
    window.addEventListener('storage', syncStorage);
    return () => {
      window.removeEventListener('hashchange', navigate);
      window.removeEventListener('storage', syncStorage);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function initPendingTrees() {
      const result = await loadPendingTrees();
      if (cancelled) return;
      setPendingTrees(result.submissions);
      setPendingTreesLoading(false);
      if (result.storageError) {
        setAddTreeNotice({
          text: 'تعذّر فتح تخزين المتصفح (IndexedDB) لقراءة الأشجار المنتظرة على الجهاز ده.',
          tone: 'alert',
        });
      } else if (result.hadInvalidData) {
        setAddTreeNotice({
          text: 'لقينا سجلات غير صالحة في قائمة «بانتظار المراجعة» وتم تجاهلها.',
          tone: 'alert',
        });
      }
    }
    void initPendingTrees();
    return () => {
      cancelled = true;
      if (addTreePhotoRef.current) {
        URL.revokeObjectURL(addTreePhotoRef.current.previewUrl);
        addTreePhotoRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function initStories() {
      const result = await loadTreeStories();
      if (cancelled) return;
      setTreeStories(result.entries);
      setTreeStoriesLoading(false);
      if (result.storageError) {
        setTreeStoryNotice({
          text: 'تعذّر فتح تخزين المتصفح (IndexedDB) لقراءة حكايات الأشجار المحفوظة.',
          tone: 'alert',
        });
      } else if (result.hadInvalidData) {
        setTreeStoryNotice({
          text: 'لقينا سجلات غير صالحة في حكايات الأشجار المحفوظة وتم تجاهلها.',
          tone: 'alert',
        });
      }
    }
    void initStories();
    return () => {
      cancelled = true;
      if (storyPhotoRef.current) {
        URL.revokeObjectURL(storyPhotoRef.current.previewUrl);
        storyPhotoRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function initCareLogs() {
      const result = await loadCareLogs();
      if (cancelled) return;
      setCareLogs(result.logs);
      setCareLogsLoading(false);
      if (result.storageError) {
        setCareNotice({
          text: 'تعذّر فتح تخزين المتصفح (IndexedDB) لقراءة سجلات الرعاية المحفوظة.',
          tone: 'alert',
        });
      } else if (result.hadInvalidData) {
        setCareNotice({
          text: 'لقينا سجلات غير صالحة في متابعات الرعاية المحفوظة وتم تجاهلها.',
          tone: 'alert',
        });
      }
    }
    void initCareLogs();
    return () => {
      cancelled = true;
      if (carePhotoRef.current) {
        URL.revokeObjectURL(carePhotoRef.current.previewUrl);
        carePhotoRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (dataState !== 'ready' || pendingDeepLinkId === null) return;
    const matched = trees.find(tree => String(tree.id) === pendingDeepLinkId);
    if (matched) {
      setFilter('الكل');
      setSelected(matched.id);
      setInvalidTreeNotice('');
      setFocusLocation([matched.geometry.coordinates[0], matched.geometry.coordinates[1]]);
      requestAnimationFrame(() => {
        sidebarRef.current?.scrollTo({ top: 0 });
        dismissButton.current?.focus({ preventScroll: true });
      });
    } else {
      setSelected(null);
      setInvalidTreeNotice(invalidDeepLinkMessage);
    }
    setPendingDeepLinkId(null);
  }, [dataState, trees, pendingDeepLinkId]);

  useEffect(() => {
    if (page === 'map' || page === 'planting') setMapVisited(true);
    const titles = {
      home: 'الرئيسية',
      map: 'خريطة الأشجار',
      planting: `${participateTabLabels[participateSection]} | شارك في تشجير طنطا`,
      guide: 'دليل أنواع الأشجار',
      rooftop: 'دليل زراعة الأسطح',
    };
    document.title = titles[page] + ' | دليل طنطا الأخضر';
  }, [page, participateSection]);

  useEffect(() => {
    if (page !== 'planting') return;
    const raf = requestAnimationFrame(() => {
      activeTabRef.current?.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
        inline: 'nearest',
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [page, participateSection]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadTrees() {
      try {
        const response = await fetch(treesUrl, { signal: controller.signal });
        if (!response.ok) throw new Error('GeoJSON request failed');
        const data = parseTrees(await response.json());
        if (controller.signal.aborted) return;
        setTrees(data);
        setDataState('ready');
      } catch {
        if (!controller.signal.aborted) setDataState('error');
      }
    }
    void loadTrees();
    return () => controller.abort();
  }, []);

  const activeTree = trees.find(tree => tree.id === selected);
  const onPlantingRoute = page === 'planting';
  const onPlantingSection = onPlantingRoute && participateSection === 'plant';
  const onShadeSection = onPlantingRoute && participateSection === 'shade';
  const onAddTreeSection = onPlantingRoute && participateSection === 'add-tree';
  const onInitiativeSection = onPlantingRoute && participateSection === 'initiative';

  const activeShadeNeed = onShadeSection ? shadeNeeds.find(report => report.id === selectedShadeNeedId) : undefined;
  const visibleShadeNeeds = onShadeSection ? shadeNeeds : emptyShadeNeeds;
  const activeInitiativePreview = onInitiativeSection
    ? demoCandidateLocations.find(candidate => candidate.id === initiativePreviewId) ?? null
    : null;
  const hasActiveCard = Boolean(activeTree || activeShadeNeed);

  return (
    <div
      className="app-shell"
      onKeyDown={event => {
        if (event.key !== 'Escape') return;
        if (activeTree) dismissTree();
        else if (activeShadeNeed) dismissShadeNeed();
        else cancelPicking();
      }}>
      <header className={'site-header ' + (page === 'home' ? 'home-header' : '')}>
        <img src="./brand/logo-mark.svg" width="32" height="32" alt="" />
        <strong>دليل طنطا الأخضر</strong>
        <nav className="site-nav" aria-label="التنقل الرئيسي">
          <a href="#home" aria-current={page === 'home' ? 'page' : undefined}>الرئيسية</a>
          <a href="#tree-map" aria-current={page === 'map' ? 'page' : undefined}>خريطة الأشجار</a>
          <a href="#planting" aria-current={page === 'planting' ? 'page' : undefined}>شارك في تشجير طنطا</a>
          <a href="#species-guide" aria-current={page === 'guide' ? 'page' : undefined}>دليل الأشجار</a>
          <a href="#rooftop-guide" aria-current={page === 'rooftop' ? 'page' : undefined}>زراعة الأسطح</a>
        </nav>
        <button className="propose" aria-pressed={choosingPlanting} onClick={() => choosingPlanting ? cancelPicking() : startPicking()}>
          {choosingPlanting ? 'إلغاء الوضع' : 'اقترح موقع زراعة'}
        </button>
      </header>
      <main className={page === 'guide' || page === 'rooftop' ? 'guide-layout' : page === 'home' ? 'home-layout' : 'map-layout'}>
        {page === 'home' && <Homepage statuses={trees.map(tree => tree.properties.status)} state={dataState}
          propose={startPicking} explore={status => { setFilter(status); location.hash = 'tree-map'; }}
          rooftop={() => { location.hash = 'rooftop-guide'; }} />}
        <div className="map-page" hidden={page === 'guide' || page === 'rooftop' || page === 'home'}>
          {onPlantingRoute && (
            <section className="participate-bar" aria-labelledby="planting-heading">
              <h1 id="planting-heading" tabIndex={-1}>شارك في تشجير طنطا</h1>
              <nav className="participate-tabs" aria-label="أقسام شارك في تشجير طنطا">
                {participateTabs.map(tab => (
                  <a
                    key={tab.id}
                    href={tab.href}
                    ref={participateSection === tab.id ? activeTabRef : undefined}
                    aria-current={participateSection === tab.id ? 'page' : undefined}
                  >
                    {tab.label}
                  </a>
                ))}
              </nav>
            </section>
          )}
          <div className={'workspace ' + (onPlantingRoute ? 'planting-page' : '')}>
            {mapVisited && (
              <Suspense fallback={<section className="map-frame" role="status">جاري فتح الخريطة…</section>}>
                <TantaMap trees={trees} selected={selected} filter={page === 'map' ? filter : 'الكل'}
                  pickingMode={pickingMode} plantingLocation={onPlantingSection ? plantingLocation : null}
                  shadeNeeds={visibleShadeNeeds} selectedShadeNeedId={onShadeSection ? selectedShadeNeedId : null}
                  shadeDraftLocation={onShadeSection ? shadeDraftLocation : null}
                  addTreeDraftLocation={onAddTreeSection ? addTreeDraftLocation : null}
                  initiativePreviewLocation={activeInitiativePreview ? { label: activeInitiativePreview.label, coordinates: activeInitiativePreview.coordinates } : null}
                  focusLocation={focusLocation}
                  onPick={handleMapPick} onSelect={selectTree}
                  onSelectShadeNeed={selectShadeNeed} onCancelPicking={cancelPicking} />
              </Suspense>
            )}
            <aside ref={sidebarRef} className={hasActiveCard && collapsed ? 'folded' : undefined}
              aria-label={onPlantingRoute ? `محتوى ${participateTabLabels[participateSection]}` : 'بطاقات الأشجار'}>
              {activeTree && (
                <section className="tree-card" aria-labelledby="selected-tree">
                  <button className="sheet-toggle" aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)} aria-label="تغيير ارتفاع البطاقة"><span /></button>
                  <button ref={dismissButton} className="back" onClick={dismissTree}>×　رجوع للخريطة</button>
                  <h2 id="selected-tree">{activeTree.properties.name}</h2>
                  <span className="status">{activeTree.properties.status === 'تجريبية' ? 'بيانات تجريبية' : activeTree.properties.status}</span>
                  <dl>
                    <dt>معرّف الشجرة</dt><dd>{activeTree.id}</dd>
                    <dt>خط الطول، خط العرض</dt><dd dir="ltr">{activeTree.geometry.coordinates.join(', ')}</dd>
                  </dl>
                  <TreeDetailsPanel
                    tree={activeTree}
                    entries={treeStories}
                    loading={treeStoriesLoading}
                    onOpenEditor={openStoryEditorForTree}
                  />
                </section>
              )}
              {activeShadeNeed && (
                <section className="tree-card shade-need-card" aria-labelledby="selected-shade-need">
                  <button className="sheet-toggle" aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)} aria-label="تغيير ارتفاع البطاقة"><span /></button>
                  <button ref={dismissShadeButton} className="back" onClick={dismissShadeNeed}>×　رجوع للخريطة</button>
                  <h2 id="selected-shade-need">بلاغ احتياج للظل</h2>
                  <div className="shade-need-badges">
                    <span className="status shade-status">احتياج للظل</span>
                    <span className="status local-status">محفوظ على الجهاز فقط</span>
                  </div>
                  <dl>
                    <dt>سبب الاحتياج</dt><dd>{activeShadeNeed.reason}</dd>
                    <dt>تاريخ الحفظ</dt><dd><time dateTime={activeShadeNeed.createdAt}>{new Date(activeShadeNeed.createdAt).toLocaleString('ar-EG')}</time></dd>
                    <dt>خط الطول، خط العرض</dt><dd dir="ltr">{activeShadeNeed.location.map(value => value.toFixed(5)).join(', ')}</dd>
                  </dl>
                  <p className="shade-need-footnote">
                    النقطة دي مسجلة على المتصفح ده فقط كـ«احتياج للظل»، وبتفضل منفصلة عن الأشجار ومقترحات الزراعة لحد مراجعتها مستقبلًا.
                  </p>
                  <div className="shade-need-actions">
                    <button type="button" className="shade-need-delete" onClick={() => deleteShadeNeed(activeShadeNeed.id)}>امسح البلاغ من الجهاز</button>
                  </div>
                  {shadeDeleteError && <p className="field-error" role="alert">{shadeDeleteError}</p>}
                </section>
              )}
              <div hidden={!onPlantingRoute || hasActiveCard}>
                {onPlantingRoute && participateSection === 'plant' && (
                  <section className="planting" aria-labelledby="plant-child-heading">
                    <h2 id="plant-child-heading" tabIndex={-1}>ازرع شجرة</h2>
                    <section className="saved-draft" aria-labelledby="draft-heading">
                      <h3 id="draft-heading">مسودة الزراعة</h3>
                      <p>تقدر تحفظ مسودة واحدة بإحداثياتها وقياساتها على المتصفح ده وترجع لها بعدين.</p>
                      {savedDraft && <>
                        <p>آخر حفظ <time dateTime={savedDraft.updatedAt}>{new Date(savedDraft.updatedAt).toLocaleString('ar-EG')}</time></p>
                        <div className="planting-actions">
                          <button onClick={restoreDraft}>استرجع المسودة</button>
                          <button onClick={removeDraft}>امسح المسودة المحفوظة</button>
                        </div>
                      </>}
                      <p role="status">{draftNotice}</p>
                    </section>
                    <div className="planting-actions">
                      <button disabled={choosingPlanting} onClick={startPicking}>{plantingLocation ? 'غيّر الموقع' : 'اقترح موقع زراعة'}</button>
                      {(choosingPlanting || plantingLocation) && <button onClick={() => {
                        if (!choosingPlanting) {
                          setPlantingLocation(null);
                          setValues({ ...emptySurvey });
                          setFocusLocation(null);
                        }
                        setPickingMode(null);
                      }}>{choosingPlanting ? 'إلغاء الاختيار' : 'إلغاء النقطة'}</button>}
                    </div>
                    <div aria-live="polite">
                      {choosingPlanting && <p>اضغط على المكان اللي تقترحه أو حرّك الخريطة واختار مركزها.</p>}
                      {!choosingPlanting && plantingLocation && <p>نقطة قيد الدراسة <bdi>{plantingLocation.map(value => value.toFixed(5)).join(', ')}</bdi></p>}
                    </div>
                    {plantingLocation && <PlantingSurvey key={surveyVersion} location={plantingLocation} values={values}
                      onChange={next => { setValues(next); setDraftNotice(''); }} onSave={saveDraft} />}
                  </section>
                )}
                {onPlantingRoute && participateSection === 'shade' && (
                  <ShadeNeedPanel
                    reports={shadeNeeds}
                    activeId={selectedShadeNeedId}
                    picking={choosingShadeNeed}
                    draftOpen={shadeDraftOpen}
                    draftLocation={shadeDraftLocation}
                    reason={shadeReason}
                    notice={shadeNotice}
                    onStartReport={startShadeNeedReport}
                    onStartMovingPoint={startMovingShadePoint}
                    onCancelPicking={cancelPicking}
                    onCancelDraft={cancelShadeDraft}
                    onReasonChange={setShadeReason}
                    onSave={saveShadeNeed}
                    onSelectReport={(report, trigger) => selectShadeNeed(report, trigger, true)}
                  />
                )}
                {onPlantingRoute && participateSection === 'add-tree' && (
                  <AddTreePanel
                    submissions={pendingTrees}
                    loading={pendingTreesLoading}
                    picking={choosingAddTree}
                    draftOpen={addTreeDraftOpen}
                    draftLocation={addTreeDraftLocation}
                    description={addTreeDescription}
                    photo={addTreePhoto}
                    saving={addTreeSaving}
                    notice={addTreeNotice}
                    onStartReport={startAddTreeReport}
                    onStartMovingPoint={startMovingAddTreePoint}
                    onCancelPicking={cancelPicking}
                    onCancelDraft={cancelAddTreeDraft}
                    onDescriptionChange={setAddTreeDescription}
                    onPhotoChange={updateAddTreePhoto}
                    onSave={saveAddTree}
                    onDeleteSubmission={removePendingTree}
                    onFocusLocation={setFocusLocation}
                  />
                )}
                {onPlantingRoute && participateSection === 'story' && (
                  <TreeStoryPanel
                    trees={trees}
                    treesState={dataState}
                    selectedTreeId={storyEditorTreeId}
                    hasInvalidLink={
                      invalidStoryLink ||
                      (Boolean(storyEditorTreeId) &&
                        dataState === 'ready' &&
                        !trees.some(tree => String(tree.id) === storyEditorTreeId))
                    }
                    story={storyDraftText}
                    entryDate={storyDraftDate}
                    photo={storyDraftPhoto}
                    entries={treeStories}
                    loading={treeStoriesLoading}
                    saving={treeStorySaving}
                    notice={treeStoryNotice}
                    onSelectTreeId={selectStoryTreeId}
                    onStoryChange={setStoryDraftText}
                    onDateChange={setStoryDraftDate}
                    onPhotoChange={updateStoryDraftPhoto}
                    onSave={saveTreeStory}
                    onDeleteEntry={removeTreeStory}
                  />
                )}
                {onPlantingRoute && participateSection === 'care' && (
                  <CareContinuityPanel
                    trees={trees}
                    treesState={dataState}
                    selectedTreeId={careDraftTreeId}
                    followUpDate={careDraftDate}
                    condition={careDraftCondition}
                    observation={careDraftObservation}
                    photo={careDraftPhoto}
                    logs={careLogs}
                    loading={careLogsLoading}
                    saving={careSaving}
                    notice={careNotice}
                    onSelectTreeId={setCareDraftTreeId}
                    onDateChange={setCareDraftDate}
                    onConditionChange={setCareDraftCondition}
                    onObservationChange={setCareDraftObservation}
                    onPhotoChange={updateCareDraftPhoto}
                    onSave={saveCareLog}
                    onDeleteLog={removeCareLog}
                  />
                )}
                {onPlantingRoute && participateSection === 'initiative' && (
                  <StreetInitiativePanel
                    state={initiativeState}
                    previewCandidateId={initiativePreviewId}
                    notice={initiativeNotice}
                    onTogglePreview={toggleInitiativePreview}
                    onToggleRole={toggleInitiativeRole}
                    onUpdateTaskStatus={updateInitiativeTaskStatus}
                    onResetDemo={resetInitiativeDemo}
                  />
                )}
              </div>
              <div hidden={page !== 'map' || hasActiveCard}>
                <h1 id="tree-map-heading" tabIndex={-1}>خريطة الأشجار</h1><span className="status">بيانات تجريبية</span>
                <p>اختار علامة على خريطة طنطا أو شجرة من القائمة لعرض بياناتها.</p>
                {invalidTreeNotice && (
                  <p className="invalid-tree-notice" role="alert">{invalidTreeNotice}</p>
                )}
                {pendingDeepLinkId !== null && dataState === 'loading' && (
                  <p role="status">جاري فتح ملف الشجرة…</p>
                )}
                <div className="chips">{[...new Set([...treeFilters, ...trees.map(tree => tree.properties.status)])].map(status => (
                  <button key={status} aria-pressed={filter === status} onClick={() => setFilter(status)}>{status}</button>
                ))}</div>
                {dataState === 'loading' && <p role="status">جاري تحميل النقاط…</p>}
                {dataState === 'error' && <p role="alert">تعذّر تحميل بيانات الأشجار. جرّب تحديث الصفحة.</p>}
                {dataState === 'ready' && filter !== 'الكل' && !trees.some(tree => tree.properties.status === filter) && <p>لا توجد نقاط بهذه الحالة في العينة الحالية.</p>}
                <ul className="tree-list">
                  {trees.map((tree, index) => (
                    <li key={tree.id} hidden={filter !== 'الكل' && tree.properties.status !== filter}>
                      <button aria-pressed={tree.id === selected} onClick={event => selectTree(tree, event.currentTarget)}>
                        <span className="tree-number" aria-hidden="true">{format.format(index + 1)}</span>{tree.properties.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
        <div hidden={page !== 'guide'}><SpeciesGuide /></div>
        <div hidden={page !== 'rooftop'}><RooftopGuide /></div>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
