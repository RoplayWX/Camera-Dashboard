import { CameraData, CameraFeature } from '../types/camera';

const API_ENDPOINT = 'https://scriptkitty.cafe/relay/atmosx/cameras';
const STORAGE_KEY_FAVORITES = 'camera_dashboard_favorites_v1';
const LEGACY_STORAGE_KEY_FAVORITES = 'atmosx_favorite_cameras_v1';

export const US_STATES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
};

// High-reliability curated cameras for immediate fallback / featured rotation
export const CURATED_FEATURED_CAMERAS: CameraData[] = [
  {
    id: 'cam-ww-1',
    name: 'Jaden Pappenheim (Lexington, Lexington County, SC)',
    cleanName: 'Jaden Pappenheim Storm Chaser',
    location: 'Lexington, SC',
    stateCode: 'SC',
    coordinates: [-81.25067, 33.95152],
    streamUrl: 'https://video1-cdn.weatherwise.app/chaser/jadenpappenheim/index.m3u8',
    model: 'USER',
    source: 'WEATHER_WISE',
  },
  {
    id: 'cam-ro-1',
    name: 'Systems Atlanta (Kennesaw, Georgia)',
    cleanName: 'Systems Atlanta Radar Cam',
    location: 'Kennesaw, GA',
    stateCode: 'GA',
    coordinates: [-84.61072, 34.00545],
    streamUrl: 'https://video5.cdn.radaromega.com/live/9ef01ebc06c2/stream.m3u8',
    model: 'DEVICE',
    source: 'RADAR_OMEGA',
  },
  {
    id: 'cam-ro-2',
    name: 'Stoddard Co EMA - Essex, MO (Essex, Missouri)',
    cleanName: 'Stoddard Co Emergency Doppler',
    location: 'Essex, MO',
    stateCode: 'MO',
    coordinates: [-89.855, 36.812],
    streamUrl: 'https://video4.cdn.radaromega.com/live/9b8854ebcb7b/stream.m3u8',
    model: 'DEVICE',
    source: 'RADAR_OMEGA',
  },
  {
    id: 'cam-db-1',
    name: '085S19850CAM1SWC at W Highlands Ranch Pkwy (CO)',
    cleanName: 'Highlands Ranch Pkwy Traffic',
    location: 'Highlands Ranch, CO',
    stateCode: 'CO',
    coordinates: [-105.03658, 39.53809],
    streamUrl: 'https://publicstreamer3.cotrip.org:443/rtplive/085S19850CAM1SWC/playlist.m3u8',
    model: 'DEVICE',
    source: 'DATABASE',
  },
  {
    id: 'cam-ww-2',
    name: 'Freddy McKinney (Lexington, Lexington County, SC)',
    cleanName: 'Freddy McKinney Live Chaser',
    location: 'Lexington, SC',
    stateCode: 'SC',
    coordinates: [-81.23505, 33.95681],
    streamUrl: 'https://video1-cdn.weatherwise.app/chaser/freddymckinney/index.m3u8',
    model: 'USER',
    source: 'WEATHER_WISE',
  },
  {
    id: 'cam-ww-3',
    name: 'DL Scales - WCSC (Las Cruces, Dona Ana County, NM)',
    cleanName: 'DL Scales Desert Severe Cam',
    location: 'Las Cruces, NM',
    stateCode: 'NM',
    coordinates: [-106.778, 32.319],
    streamUrl: 'https://video1-cdn.weatherwise.app/chaser/dlscales/index.m3u8',
    model: 'USER',
    source: 'WEATHER_WISE',
  },
];

let inMemoryCameras: CameraData[] | null = null;
let fetchPromise: Promise<CameraData[]> | null = null;

function parseLocationDetails(name: string): { cleanName: string; location: string; stateCode: string } {
  let cleanName = name;
  let location = 'United States';
  let stateCode = '';

  // 1. Try matching paren at end, e.g. "(Lexington, SC)" or "(CO)" or "(Essex, Missouri)"
  const matchParen = name.match(/\(([^)]+)\)$/);
  if (matchParen) {
    const inside = matchParen[1].trim();
    cleanName = name.replace(/\s*\([^)]+\)$/, '').trim();
    const parts = inside.split(',').map((p) => p.trim());
    const lastPart = parts[parts.length - 1];

    if (lastPart.length === 2 && US_STATES[lastPart.toUpperCase()]) {
      stateCode = lastPart.toUpperCase();
      location = parts.length >= 2 ? `${parts[0]}, ${stateCode}` : `${stateCode}, USA`;
    } else {
      // Check if full state name
      for (const [code, fullName] of Object.entries(US_STATES)) {
        if (lastPart.toLowerCase() === fullName.toLowerCase()) {
          stateCode = code;
          location = parts.length >= 2 ? `${parts[0]}, ${code}` : `${fullName}, USA`;
          break;
        }
      }
      if (!stateCode) {
        location = inside;
      }
    }
  }

  // 2. If no state code yet, test against full state names or two-letter code in text
  if (!stateCode) {
    for (const [code, fullName] of Object.entries(US_STATES)) {
      const reg = new RegExp(`(\\b${code}\\b|\\b${fullName}\\b)`, 'i');
      if (reg.test(name)) {
        stateCode = code;
        if (location === 'United States') {
          location = fullName;
        }
        break;
      }
    }
  }

  return { cleanName, location, stateCode };
}

export async function fetchCameras(onProgress?: (loaded: number) => void): Promise<CameraData[]> {
  if (inMemoryCameras && inMemoryCameras.length > 0) {
    return inMemoryCameras;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch(API_ENDPOINT, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const geoJson = await res.json();
      const features: CameraFeature[] = geoJson.features || [];

      const favorites = getFavoriteIds();

      const parsed: CameraData[] = features.map((feat, index) => {
        const coords = feat.geometry?.coordinates || [0, 0];
        const rawName = feat.properties?.name || `Camera #${index + 1}`;
        const { cleanName, location, stateCode } = parseLocationDetails(rawName);
        const id = `cam-${index}-${(rawName || '').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24)}`;

        return {
          id,
          name: rawName,
          cleanName: cleanName || rawName,
          location,
          stateCode,
          coordinates: coords,
          streamUrl: feat.properties?.stream_url || '',
          model: feat.properties?.model || 'DEVICE',
          source: (feat.properties?.source as any) || 'DATABASE',
          isFavorite: favorites.has(id),
        };
      });

      if (onProgress) {
        onProgress(parsed.length);
      }

      inMemoryCameras = parsed;
      return parsed;
    } catch (err) {
      console.warn('Failed to load camera feed from remote API, falling back to curated stations:', err);
      inMemoryCameras = CURATED_FEATURED_CAMERAS;
      return CURATED_FEATURED_CAMERAS;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function getFavoriteIds(): Set<string> {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY_FAVORITES) ||
      localStorage.getItem(LEGACY_STORAGE_KEY_FAVORITES) ||
      localStorage.getItem('live_camera_matrix_favorites_v1');
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function toggleFavorite(cameraId: string): boolean {
  const current = getFavoriteIds();
  const willBeFav = !current.has(cameraId);
  if (willBeFav) {
    current.add(cameraId);
  } else {
    current.delete(cameraId);
  }
  try {
    localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.error('Failed saving favorites to localStorage', e);
  }
  return willBeFav;
}

export function filterCameras(
  cameras: CameraData[],
  query: string,
  source: string,
  selectedState: string,
  favoritesOnly: boolean = false
): CameraData[] {
  const q = query.trim().toLowerCase();
  const favs = favoritesOnly ? getFavoriteIds() : null;

  return cameras.filter((cam) => {
    if (favoritesOnly && (!cam.isFavorite && !favs?.has(cam.id))) {
      return false;
    }

    if (source !== 'ALL' && source !== 'FAVORITES' && cam.source !== source) {
      return false;
    }

    if (selectedState && cam.stateCode && cam.stateCode.toUpperCase() !== selectedState.toUpperCase()) {
      return false;
    }

    if (!q) return true;

    return (
      cam.name.toLowerCase().includes(q) ||
      cam.cleanName.toLowerCase().includes(q) ||
      cam.location.toLowerCase().includes(q) ||
      cam.source.toLowerCase().includes(q) ||
      cam.model.toLowerCase().includes(q)
    );
  });
}
