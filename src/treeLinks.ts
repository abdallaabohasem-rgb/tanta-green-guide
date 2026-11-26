export type ParticipateSection =
  | 'plant'
  | 'shade'
  | 'add-tree'
  | 'story'
  | 'care'
  | 'initiative';

export type HashRoute =
  | { page: 'home' }
  | {
      page: 'planting';
      section: ParticipateSection;
      storyTreeId: string | null;
      invalidStoryDeepLink: boolean;
    }
  | { page: 'guide' }
  | { page: 'rooftop' }
  | { page: 'map'; treeId: string | null; invalidDeepLink: boolean };

const participateSlugMap = new Map<string, ParticipateSection>([
  ['plant', 'plant'],
  ['shade', 'shade'],
  ['add-tree', 'add-tree'],
  ['story', 'story'],
  ['care', 'care'],
  ['initiative', 'initiative'],
]);

export function participateHash(section: ParticipateSection, storyTreeId?: string | null): string {
  if (section === 'plant') return '#planting';
  if (section === 'story' && storyTreeId?.trim()) {
    return `#planting/story/${encodeURIComponent(storyTreeId.trim())}`;
  }
  return `#planting/${section}`;
}

export function parseHashRoute(hash: string = typeof location !== 'undefined' ? location.hash : ''): HashRoute {
  if (hash.startsWith('#species-')) return { page: 'guide' };
  if (hash === '#rooftop-guide') return { page: 'rooftop' };
  if (hash === '#planting' || hash === '#planting/') {
    return { page: 'planting', section: 'plant', storyTreeId: null, invalidStoryDeepLink: false };
  }
  if (hash.startsWith('#planting/')) {
    const rest = hash.slice('#planting/'.length);
    if (rest.startsWith('story/')) {
      const rawId = rest.slice('story/'.length);
      if (!rawId) {
        return { page: 'planting', section: 'story', storyTreeId: null, invalidStoryDeepLink: true };
      }
      try {
        const decoded = decodeURIComponent(rawId).trim();
        if (!decoded) {
          return { page: 'planting', section: 'story', storyTreeId: null, invalidStoryDeepLink: true };
        }
        return { page: 'planting', section: 'story', storyTreeId: decoded, invalidStoryDeepLink: false };
      } catch {
        return { page: 'planting', section: 'story', storyTreeId: null, invalidStoryDeepLink: true };
      }
    }
    const section = participateSlugMap.get(rest) ?? 'plant';
    return { page: 'planting', section, storyTreeId: null, invalidStoryDeepLink: false };
  }
  if (hash === '#tree-map') return { page: 'map', treeId: null, invalidDeepLink: false };
  if (hash.startsWith('#tree-map/')) {
    const rawId = hash.slice('#tree-map/'.length);
    if (!rawId) return { page: 'map', treeId: null, invalidDeepLink: true };
    try {
      const decoded = decodeURIComponent(rawId).trim();
      if (!decoded) return { page: 'map', treeId: null, invalidDeepLink: true };
      return { page: 'map', treeId: decoded, invalidDeepLink: false };
    } catch {
      return { page: 'map', treeId: null, invalidDeepLink: true };
    }
  }
  return { page: 'home' };
}

export function treeHashForId(treeId: string | number): string {
  return `#tree-map/${encodeURIComponent(String(treeId))}`;
}

export function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host.endsWith('.localhost')
  );
}

export function buildCanonicalTreeUrl(
  treeId: string | number,
  configuredPublicBaseUrl: string | undefined = import.meta.env?.VITE_PUBLIC_BASE_URL,
  fallbackHref: string = typeof window !== 'undefined' ? window.location.href : 'http://localhost/'
): { url: string; isLocalOnly: boolean; usedConfiguredBase: boolean } {
  const hash = treeHashForId(treeId);
  const trimmedBase = configuredPublicBaseUrl?.trim();
  let urlObj: URL | null = null;
  let usedConfiguredBase = false;

  if (trimmedBase) {
    try {
      const parsed = new URL(trimmedBase);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        parsed.hash = hash;
        urlObj = parsed;
        usedConfiguredBase = true;
      }
    } catch {
      // Fall back to current origin/path when configured URL is malformed.
    }
  }

  if (!urlObj) {
    urlObj = new URL(fallbackHref);
    urlObj.search = '';
    urlObj.hash = hash;
  }

  return {
    url: urlObj.toString(),
    isLocalOnly: isLocalHostname(urlObj.hostname),
    usedConfiguredBase,
  };
}
