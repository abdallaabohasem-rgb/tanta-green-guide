import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Map, Marker, NavigationControl, LngLatBounds } from 'maplibre-gl';
import type { MapMouseEvent } from 'maplibre-gl';
import type { FeatureCollection, Feature, Point } from 'geojson';
import treesUrl from '../trees-demo.geojson?url';
import { arabicTextReady, basemapUrl, localizeBasemap } from './basemap';
import { PlantingSurvey } from './PlantingSurvey';
import { SpeciesGuide } from './SpeciesGuide';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';

type Tree = Feature<Point, { name: string; status: string }>;
const format = new Intl.NumberFormat('ar-EG');
function pageFromHash() {
  if (location.hash.startsWith('#species-')) return 'guide';
  if (location.hash === '#planting') return 'planting';
  return 'map';
}

function App() {
  const [page, setPage] = useState(pageFromHash);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markerButtons = useRef<HTMLButtonElement[]>([]);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [dataState, setDataState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [mapError, setMapError] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [plantingLocation, setPlantingLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    function navigate() {
      setPage(pageFromHash());
      setChoosing(false);
      setSelected(null);
    }
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => mapRef.current?.resize());
    return () => cancelAnimationFrame(frame);
  }, [page]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadTrees() {
      try {
        const response = await fetch(treesUrl, { signal: controller.signal });
        if (!response.ok) throw new Error(`GeoJSON request failed: ${response.status}`);
        const data: FeatureCollection<Point, Tree['properties']> = await response.json();
        if (controller.signal.aborted) return;
        setTrees(data.features);
        setDataState('ready');
      } catch {
        if (!controller.signal.aborted) setDataState('error');
      }
    }
    void loadTrees();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || dataState === 'loading') return;
    let map: Map;
    try {
      map = new Map({ container: mapContainer.current, center: [31.0019, 30.7885], zoom: 13, dragRotate: false, pitchWithRotate: false, renderWorldCopies: false });
    } catch {
      setMapError(true);
      return;
    }
    mapRef.current = map;
    void arabicTextReady.catch(() => {}).then(() => {
      if (mapRef.current === map) map.setStyle(basemapUrl, { transformStyle: localizeBasemap });
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), 'top-left');
    map.on('error', () => setMapError(true));
    map.on('idle', () => {
      if (map.isStyleLoaded()) setMapError(false);
    });

    const bounds = new LngLatBounds();
    const markers = trees.map((tree, index) => {
      const [longitude, latitude] = tree.geometry.coordinates;
      const coordinates: [number, number] = [longitude, latitude];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tree-pin';
      button.textContent = format.format(index + 1);
      button.setAttribute('aria-label', `${tree.properties.name}، ${tree.properties.status}`);
      button.addEventListener('click', event => {
        event.stopPropagation();
        setChoosing(false);
        setSelected(index);
      });
      bounds.extend(coordinates);
      return new Marker({ element: button }).setLngLat(coordinates).addTo(map);
    });
    markerButtons.current = markers.map(marker => marker.getElement() as HTMLButtonElement);
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: { top: 65, right: 65, bottom: 88, left: 65 },
        maxZoom: 14,
        duration: 0,
      });
    }
    return () => {
      markers.forEach(marker => marker.remove());
      markerButtons.current = [];
      mapRef.current = null;
      map.remove();
    };
  }, [trees, dataState]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !choosing) return;
    function pick(event: MapMouseEvent) {
      const { lng, lat } = event.lngLat.wrap();
      setPlantingLocation([lng, lat]);
      setChoosing(false);
    }
    map.getCanvas().style.cursor = 'crosshair';
    map.on('click', pick);
    return () => {
      map.off('click', pick);
      map.getCanvas().style.cursor = '';
    };
  }, [choosing, dataState]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !plantingLocation) return;
    const pin = document.createElement('span');
    pin.className = 'planting-pin';
    pin.setAttribute('aria-label', 'موقع الزراعة المؤقت');
    pin.setAttribute('role', 'img');
    pin.textContent = '+';
    const marker = new Marker({ element: pin }).setLngLat(plantingLocation).addTo(map);
    return () => { marker.remove(); };
  }, [plantingLocation, dataState]);

  useEffect(() => {
    markerButtons.current.forEach((button, index) => button.setAttribute('aria-pressed', String(index === selected)));
  }, [selected, trees]);

  const activeTree = selected === null ? undefined : trees[selected];
  return (
    <>
      <header className="site-header">
        <span className="brand-icon" aria-hidden="true">♧</span>
        <strong>دليل طنطا الأخضر</strong>
        <nav className="site-nav" aria-label="التنقل الرئيسي">
          <a href="#tree-map" aria-current={page === 'map' ? 'page' : undefined}>الخريطة</a>
          <a href="#planting" aria-current={page === 'planting' ? 'page' : undefined}>ازرع شجرة</a>
          <a href="#species-guide" aria-current={page === 'guide' ? 'page' : undefined}>دليل الأشجار</a>
        </nav>
      </header>
      <main>
        <div hidden={page === 'guide'}>
        <div className="intro" id={page === 'planting' ? 'planting' : 'tree-map'}>
          <h1>{page === 'planting' ? 'ازرع شجرة' : 'خريطة الأشجار'}</h1>
          <p>{page === 'planting' ? 'حدد موقع الزراعة على الخريطة وسجّل بيانات المكان.' : 'اختار نقطة على خريطة طنطا عشان تشوف بطاقة الشجرة.'}</p>
        </div>
        <div className={`workspace ${page === 'planting' ? 'planting-page' : ''}`}>
          <section className="map-frame" aria-label="خريطة طنطا التفاعلية">
            <div className="map" ref={mapContainer} dir="ltr" />
            <div className="legend">
              {page === 'map' && <><span aria-hidden="true" /> نقاط تجريبية</>}
              {page === 'planting' && !plantingLocation && 'اختار موقع الزراعة'}
              {plantingLocation && <><i aria-hidden="true" /> موقع مؤقت</>}
            </div>
            {mapError && <p className="map-notice" role="status">تعذّر تحميل جزء من الخريطة. تقدر تفتح البطاقات من القائمة.</p>}
          </section>
          <aside aria-label={page === 'planting' ? 'بيانات موقع الزراعة' : 'بطاقات الأشجار'}>
            <section hidden={page !== 'planting'} className="planting" aria-labelledby="planting-heading">
              <h2 id="planting-heading">ازرع شجرة</h2>
              <div className="planting-actions">
                <button disabled={dataState === 'loading' || mapError || choosing} onClick={() => {
                  setSelected(null);
                  setChoosing(true);
                  mapContainer.current?.scrollIntoView({ block: 'nearest' });
                }}>{plantingLocation ? 'غيّر الموقع' : 'اختار موقع'}</button>
                {(choosing || plantingLocation) && <button onClick={() => {
                  if (!choosing) setPlantingLocation(null);
                  setChoosing(false);
                }}>{choosing ? 'إلغاء الاختيار' : 'احذف الموقع'}</button>}
              </div>
              <div aria-live="polite">
                {choosing && <p>اضغط على المكان اللي تقترحه على الخريطة.</p>}
                {!choosing && plantingLocation && <p>الموقع المختار <bdi>{plantingLocation.map(value => value.toFixed(5)).join(', ')}</bdi></p>}
              </div>
              {plantingLocation && <PlantingSurvey key={plantingLocation.join(',')} location={plantingLocation} />}
            </section>
            <div hidden={page !== 'map'}>
            <h2>الأشجار التجريبية</h2>
            {dataState === 'loading' && <p role="status">جاري تحميل النقاط…</p>}
            {dataState === 'error' && <p role="alert">تعذّر تحميل بيانات الأشجار. جرّب تحديث الصفحة.</p>}
            <ul className="tree-list">
              {trees.map((tree, index) => (
                <li key={tree.id}>
                  <button aria-pressed={index === selected} onClick={() => {
                    setChoosing(false);
                    setSelected(index);
                  }}>
                    <span className="tree-number" aria-hidden="true">{format.format(index + 1)}</span>
                    {tree.properties.name}
                  </button>
                </li>
              ))}
            </ul>
            <div aria-live="polite">
              {activeTree && (
                <section className="tree-card" aria-label="بطاقة الشجرة المختارة">
                  <button className="close" aria-label="إغلاق بطاقة الشجرة" onClick={() => setSelected(null)}>×</button>
                  <span className="status">{activeTree.properties.status}</span>
                  <h3>{activeTree.properties.name}</h3>
                  <p>معرّف الشجرة <bdi>{activeTree.id}</bdi></p>
                </section>
              )}
            </div>
            </div>
          </aside>
        </div>
        </div>
        <div hidden={page !== 'guide'}>
          <SpeciesGuide />
        </div>
      </main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
