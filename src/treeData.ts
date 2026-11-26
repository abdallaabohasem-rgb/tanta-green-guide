import type { Feature, Point } from 'geojson';

export type Tree = Feature<Point, { name: string; status: string }> & { id: string | number };
export const treeFilters = ['الكل', 'شجرة قائمة', 'مزروعة ضمن المبادرة', 'موقع مقترح'];

export function parseTrees(data: unknown): Tree[] {
  const collection = data as { type?: string; features?: unknown[] } | null;
  if (collection?.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
    throw new Error('Invalid GeoJSON collection');
  }
  const ids = new Set<string>();
  return collection.features.map(item => {
    const tree = item as Tree | null;
    const coords = tree?.geometry?.coordinates;
    if (tree?.type !== 'Feature' || tree.geometry?.type !== 'Point'
      || !Array.isArray(coords) || coords.length < 2
      || !coords.every(n => typeof n === 'number' && Number.isFinite(n))
      || Math.abs(coords[0]) > 180 || Math.abs(coords[1]) > 90
      || !['string', 'number'].includes(typeof tree.id) || String(tree.id).trim() === ''
      || (typeof tree.id === 'number' && !Number.isFinite(tree.id))
      || ids.has(String(tree.id))
      || typeof tree.properties?.name !== 'string' || !tree.properties.name.trim()
      || typeof tree.properties?.status !== 'string' || !tree.properties.status.trim()) {
      throw new Error('Invalid tree record or duplicate ID');
    }
    ids.add(String(tree.id));
    return {
      ...tree,
      properties: {
        ...tree.properties,
        status: tree.properties.status === 'شجرة مزروعة ضمن المبادرة'
          ? 'مزروعة ضمن المبادرة' : tree.properties.status,
      },
    };
  });
}
