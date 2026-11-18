import { setRTLTextPlugin } from 'maplibre-gl';
import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl';
import rtlPluginUrl from '../node_modules/@mapbox/mapbox-gl-rtl-text/dist/mapbox-gl-rtl-text.js?url';

export const basemapUrl = 'https://tiles.openfreemap.org/styles/liberty';

export const arabicTextReady = setRTLTextPlugin(rtlPluginUrl, false);
// Handle an early rejection while the tree data is still loading.
void arabicTextReady.catch(() => {});

const roadNames = new Set(['highway-name-path', 'highway-name-minor', 'highway-name-major']);
const roadLayers = /^(road|bridge|tunnel)_(motorway|trunk_primary|secondary_tertiary|minor|street|link|motorway_link|service_track)(_casing)?$/;

function roadWidth(casing: boolean): ExpressionSpecification {
  const base: ExpressionSpecification = [
    'match', ['get', 'class'],
    'motorway', 8,
    'trunk', 7,
    'primary', 6,
    'secondary', 4.5,
    'tertiary', 3.5,
    'minor', 2.4,
    1.6,
  ];
  return ['interpolate', ['exponential', 1.3], ['zoom'],
    8, ['*', base, 0.12],
    13, ['+', ['*', base, 0.55], casing ? 0.8 : 0],
    16, ['+', base, casing ? 1.5 : 0],
    19, ['+', ['*', base, 2.25], casing ? 2.5 : 0],
  ];
}

export function localizeBasemap(_previous: StyleSpecification | undefined, next: StyleSpecification): StyleSpecification {
  return {
    ...next,
    layers: next.layers.map(layer => {
      if (layer.type === 'symbol' && roadNames.has(layer.id)) {
        return {
          ...layer,
          layout: {
            ...layer.layout,
            'text-field': ['coalesce', ['get', 'name:ar'], ['get', 'name:nonlatin'], ['get', 'name'], ['get', 'name_en'], ['get', 'name:latin']],
          },
        };
      }
      if (layer.type === 'line' && layer['source-layer'] === 'transportation' && roadLayers.test(layer.id)) {
        return { ...layer, paint: { ...layer.paint, 'line-width': roadWidth(layer.id.endsWith('_casing')) } };
      }
      return layer;
    }),
  };
}
