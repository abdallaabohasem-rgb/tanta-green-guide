import { useEffect, useRef, useState } from 'react';
import { Map, Marker, NavigationControl, ScaleControl, LngLatBounds } from 'maplibre-gl';
import type { MapMouseEvent } from 'maplibre-gl';
import { arabicTextReady, basemapUrl, localizeBasemap } from './basemap';
import type { Tree } from './treeData';
import type { Coordinates } from './plantingData';
import type { ShadeNeedReport } from './shadeNeeds';

export type PickingMode = 'planting' | 'shade-need' | 'add-tree' | null;

interface Props {
  trees: Tree[];
  selected: Tree['id'] | null;
  filter: string;
  pickingMode: PickingMode;
  plantingLocation: Coordinates | null;
  shadeNeeds: ShadeNeedReport[];
  selectedShadeNeedId: string | null;
  shadeDraftLocation: Coordinates | null;
  addTreeDraftLocation: Coordinates | null;
  initiativePreviewLocation: { label: string; coordinates: Coordinates } | null;
  focusLocation: Coordinates | null;
  onPick: (location: Coordinates) => void;
  onSelect: (tree: Tree, trigger: HTMLButtonElement) => void;
  onSelectShadeNeed: (report: ShadeNeedReport, trigger: HTMLButtonElement) => void;
  onCancelPicking: () => void;
}

const format = new Intl.NumberFormat('ar-EG');

export function TantaMap(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [error, setError] = useState(false);
  const callbacks = useRef(props);
  const buttons = useRef<HTMLButtonElement[]>([]);
  const shadeButtons = useRef<HTMLButtonElement[]>([]);
  const resetView = useRef<() => void>(() => {});
  const choosing = props.pickingMode !== null;

  useEffect(() => { callbacks.current = props; });

  useEffect(() => {
    let instance: Map;
    try {
      instance = new Map({
        container: container.current!,
        center: [31.0019, 30.7885], zoom: 13,
        dragRotate: false, pitchWithRotate: false, renderWorldCopies: false,
      });
    } catch {
      setError(true);
      return;
    }
    setMap(instance);
    let disposed = false;
    void arabicTextReady.catch(() => {}).then(() => {
      if (!disposed) instance.setStyle(basemapUrl, { transformStyle: localizeBasemap });
    });
    instance.touchZoomRotate.disableRotation();
    instance.addControl(new NavigationControl({ showCompass: false }), 'top-left');
    instance.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left');
    const zoomIn = instance.getContainer().querySelector('.maplibregl-ctrl-zoom-in');
    const zoomOut = instance.getContainer().querySelector('.maplibregl-ctrl-zoom-out');
    zoomIn?.setAttribute('aria-label', 'تكبير الخريطة');
    zoomOut?.setAttribute('aria-label', 'تصغير الخريطة');
    instance.on('error', () => setError(true));
    instance.on('idle', () => { if (instance.isStyleLoaded()) setError(false); });
    const observer = new ResizeObserver(() => {
      if (container.current?.clientWidth && container.current.clientHeight) instance.resize();
    });
    observer.observe(instance.getContainer());
    return () => {
      disposed = true;
      observer.disconnect();
      instance.remove();
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    const bounds = new LngLatBounds();
    const markers = props.trees.map((tree, index) => {
      const coordinates: Coordinates = [tree.geometry.coordinates[0], tree.geometry.coordinates[1]];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tree-pin';
      button.dataset.status = tree.properties.status;
      button.textContent = format.format(index + 1);
      button.setAttribute('aria-label', `${tree.properties.name}، ${tree.properties.status}`);
      button.addEventListener('click', event => {
        event.stopPropagation();
        const mode = callbacks.current.pickingMode;
        if (!mode || mode === 'planting') callbacks.current.onSelect(tree, button);
      });
      bounds.extend(coordinates);
      return new Marker({ element: button }).setLngLat(coordinates).addTo(map);
    });
    buttons.current = markers.map(marker => marker.getElement() as HTMLButtonElement);
    resetView.current = () => {
      if (bounds.isEmpty()) map.jumpTo({ center: [31.0019, 30.7885], zoom: 13 });
      else map.fitBounds(bounds, { padding: 65, maxZoom: 14, duration: 0 });
    };
    // Initial framing only unless a deep-linked or selected focus location is already active.
    if (callbacks.current.focusLocation) {
      map.jumpTo({ center: callbacks.current.focusLocation, zoom: Math.max(map.getZoom(), 15) });
    } else {
      resetView.current();
    }
    return () => {
      buttons.current = [];
      markers.forEach(marker => marker.remove());
    };
  }, [map, props.trees]);

  useEffect(() => {
    buttons.current.forEach((button, index) => {
      button.setAttribute('aria-pressed', String(props.trees[index]?.id === props.selected));
      button.setAttribute('aria-disabled', String(choosing && props.pickingMode !== 'planting'));
      button.hidden = props.filter !== 'الكل' && button.dataset.status !== props.filter;
    });
  }, [map, props.trees, props.selected, choosing, props.pickingMode, props.filter]);

  useEffect(() => {
    if (!map) return;
    const markers = props.shadeNeeds.map((report, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'shade-need-pin';
      button.textContent = `ظل ${format.format(index + 1)}`;
      button.title = `احتياج للظل: ${report.reason}`;
      button.setAttribute('aria-label', `احتياج للظل ${format.format(index + 1)}: ${report.reason}`);
      button.addEventListener('click', event => {
        event.stopPropagation();
        if (!callbacks.current.pickingMode) callbacks.current.onSelectShadeNeed(report, button);
      });
      return new Marker({ element: button }).setLngLat(report.location).addTo(map);
    });
    shadeButtons.current = markers.map(marker => marker.getElement() as HTMLButtonElement);
    return () => {
      shadeButtons.current = [];
      markers.forEach(marker => marker.remove());
    };
  }, [map, props.shadeNeeds]);

  useEffect(() => {
    shadeButtons.current.forEach((button, index) => {
      button.setAttribute('aria-pressed', String(props.shadeNeeds[index]?.id === props.selectedShadeNeedId));
      button.setAttribute('aria-disabled', String(choosing));
    });
  }, [map, props.shadeNeeds, props.selectedShadeNeedId, choosing]);

  useEffect(() => {
    if (!map || !choosing) return;
    function pick(event: MapMouseEvent) {
      // A marker click must never bubble through into a new picked point.
      if ((event.originalEvent.target as Element | null)?.closest('.tree-pin, .shade-need-pin')) return;
      const { lng, lat } = event.lngLat.wrap();
      callbacks.current.onPick([lng, lat]);
    }
    map.getCanvas().style.cursor = 'crosshair';
    map.on('click', pick);
    return () => {
      map.off('click', pick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, choosing]);

  useEffect(() => {
    if (!map || !props.plantingLocation) return;
    const pin = document.createElement('span');
    pin.className = 'planting-pin';
    pin.setAttribute('role', 'img');
    pin.setAttribute('aria-label', 'موقع زراعة مؤقت');
    pin.textContent = '+';
    const marker = new Marker({ element: pin }).setLngLat(props.plantingLocation).addTo(map);
    return () => { marker.remove(); };
  }, [map, props.plantingLocation]);

  useEffect(() => {
    if (!map || !props.shadeDraftLocation) return;
    const pin = document.createElement('span');
    pin.className = 'shade-draft-pin';
    pin.setAttribute('role', 'img');
    pin.setAttribute('aria-label', 'نقطة احتياج للظل قيد التحديد');
    pin.textContent = 'ظل؟';
    const marker = new Marker({ element: pin }).setLngLat(props.shadeDraftLocation).addTo(map);
    return () => { marker.remove(); };
  }, [map, props.shadeDraftLocation]);

  useEffect(() => {
    if (!map || !props.addTreeDraftLocation) return;
    const pin = document.createElement('span');
    pin.className = 'add-tree-draft-pin';
    pin.setAttribute('role', 'img');
    pin.setAttribute('aria-label', 'موقع شجرة قيد الإضافة');
    pin.textContent = 'شجرة؟';
    const marker = new Marker({ element: pin }).setLngLat(props.addTreeDraftLocation).addTo(map);
    return () => { marker.remove(); };
  }, [map, props.addTreeDraftLocation]);

  useEffect(() => {
    if (!map || !props.initiativePreviewLocation) return;
    const pin = document.createElement('span');
    pin.className = 'initiative-preview-pin';
    pin.setAttribute('role', 'img');
    pin.setAttribute('aria-label', `معاينة نقطة تجريبية: ${props.initiativePreviewLocation.label}`);
    pin.textContent = 'عينة';
    const marker = new Marker({ element: pin }).setLngLat(props.initiativePreviewLocation.coordinates).addTo(map);
    return () => { marker.remove(); };
  }, [map, props.initiativePreviewLocation]);

  useEffect(() => {
    if (map && props.focusLocation) map.jumpTo({ center: props.focusLocation, zoom: Math.max(map.getZoom(), 15) });
  }, [map, props.focusLocation]);

  return (
    <section className="map-frame" aria-label="خريطة طنطا التفاعلية">
      <div className="map" ref={container} dir="ltr" />
      <button type="button" className="reset-map" onClick={() => resetView.current()} aria-label="رجوع لخريطة طنطا">⌖</button>
      <div className="legend" role="status">
        <span className="legend-item"><span aria-hidden="true" /> نقاط العينة</span>
        {props.shadeNeeds.length > 0 && <span className="legend-item"><em className="legend-shade" aria-hidden="true" /> احتياج للظل</span>}
        {props.shadeDraftLocation && <span className="legend-item"><em className="legend-shade-draft" aria-hidden="true" /> نقطة بلاغ مؤقتة</span>}
        {props.addTreeDraftLocation && <span className="legend-item"><em className="legend-add-tree-draft" aria-hidden="true" /> نقطة شجرة مؤقتة</span>}
        {props.initiativePreviewLocation && <span className="legend-item"><em className="legend-initiative-preview" aria-hidden="true" /> معاينة مبادرة تجريبية</span>}
        {props.pickingMode === 'planting' && <span className="legend-prompt">· اضغط لتحديد موقع زراعة <button type="button" onClick={props.onCancelPicking}>إلغاء الوضع</button></span>}
        {props.pickingMode === 'shade-need' && <span className="legend-prompt">· اضغط لتحديد مكان محتاج ظل <button type="button" onClick={props.onCancelPicking}>إلغاء الوضع</button></span>}
        {props.pickingMode === 'add-tree' && <span className="legend-prompt">· اضغط لتحديد مكان الشجرة <button type="button" onClick={props.onCancelPicking}>إلغاء الوضع</button></span>}
        {props.plantingLocation && <span className="legend-item"><i aria-hidden="true" /> مسودة موقع</span>}
      </div>
      {choosing && (
        <button type="button" className="pick-center" onClick={() => {
          const center = map?.getCenter();
          if (center) props.onPick([center.lng, center.lat]);
        }}>اختار مركز الخريطة</button>
      )}
      {error && <p className="map-notice" role="status">تعذّر تحميل جزء من الخريطة. تقدر تفتح البطاقات من القائمة.</p>}
    </section>
  );
}
