import { CameraData, CameraFeature } from '../types/camera';
import { HAZCAMS_TOWER_CAMERAS } from './hazcamsData';

const API_ENDPOINT = 'https://scriptkitty.cafe/relay/atmosx/cameras';
const STORAGE_KEY_FAVORITES = 'camera_dashboard_favorites_v1';
const LEGACY_STORAGE_KEY_FAVORITES = 'atmosx_favorite_cameras_v1';
const STORAGE_KEY_INACCESSIBLE = 'camera_dashboard_inaccessible_v1';

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
    id: 'cam-fl-axds-1',
    name: 'Jupiter Inlet (Jupiter Inlet, FL)',
    cleanName: 'Jupiter Inlet Coastal Cam',
    location: 'Jupiter Inlet, FL',
    stateCode: 'FL',
    coordinates: [-80.078, 26.948],
    streamUrl: 'https://stage-ams.srv.axds.co/stream/adaptive/noaa/jupiterinlet/hls.m3u8',
    model: 'DEVICE',
    source: 'DATABASE',
  },
  {
    id: 'cam-fl-axds-2',
    name: 'Panama City Beach East Cam (Panama City Beach, FL)',
    cleanName: 'Panama City Beach Ocean Cam',
    location: 'Panama City Beach, FL',
    stateCode: 'FL',
    coordinates: [-85.886, 30.22],
    streamUrl: 'https://stage-ams.srv.axds.co/stream/adaptive/gcoos/tidewaterpcb_east/hls.m3u8',
    model: 'DEVICE',
    source: 'DATABASE',
  },
  {
    id: 'cam-fl-axds-3',
    name: 'Panama City Beach West Cam (Panama City Beach, FL)',
    cleanName: 'Panama City Beach West Cam',
    location: 'Panama City Beach, FL',
    stateCode: 'FL',
    coordinates: [-85.886, 30.22],
    streamUrl: 'https://stage-ams.srv.axds.co/stream/adaptive/gcoos/tidewaterpcb_west/hls.m3u8',
    model: 'DEVICE',
    source: 'DATABASE',
  },
  {
    id: 'cam-ro-fl-1',
    name: 'Ocean Grill - Vero Beach (Florida)',
    cleanName: 'Ocean Grill Coastal Cam',
    location: 'Vero Beach, FL',
    stateCode: 'FL',
    coordinates: [-80.355364, 27.653072],
    streamUrl: 'https://video1.cdn.radaromega.com/live/8867d90c4528/stream.m3u8',
    model: 'DEVICE',
    source: 'RADAR_OMEGA',
  },
  {
    id: 'cam-ro-fl-2',
    name: 'Lous Blues Bar and Grill (Melbourne Beach, Florida)',
    cleanName: 'Melbourne Beach Coast Cam',
    location: 'Melbourne Beach, FL',
    stateCode: 'FL',
    coordinates: [-80.574, 28.11583],
    streamUrl: 'https://video1.cdn.radaromega.com/live/0198e19058c4/stream.m3u8',
    model: 'DEVICE',
    source: 'RADAR_OMEGA',
  },
  {
    id: 'cam-fl-dot-1',
    name: '0517N_75_Alligator_Alley_M052 (FL)',
    cleanName: 'Alligator Alley I-75 MM 52 Traffic Cam',
    location: 'Alligator Alley, FL',
    stateCode: 'FL',
    coordinates: [-80.892882, 26.17325],
    streamUrl: 'https://images-dis.divas.cloud/DGI/chan-1_h.jpg',
    model: 'DEVICE',
    source: 'DATABASE',
  },
  {
    id: 'cam-fl-dot-2',
    name: '0555S_75_Alligator_Alley_M056 (FL)',
    cleanName: 'Alligator Alley I-75 MM 56 Traffic Cam',
    location: 'Alligator Alley, FL',
    stateCode: 'FL',
    coordinates: [-80.954844, 26.17025],
    streamUrl: 'https://images-dis.divas.cloud/DGI/chan-3_h.jpg',
    model: 'DEVICE',
    source: 'DATABASE',
  },
  {
    id: 'cam-fl-dot-3',
    name: '0595N_75_Alligator_Alley_M060 (FL)',
    cleanName: 'Alligator Alley I-75 MM 60 Traffic Cam',
    location: 'Alligator Alley, FL',
    stateCode: 'FL',
    coordinates: [-81.01725, 26.1705],
    streamUrl: 'https://images-dis.divas.cloud/DGI/chan-5_h.jpg',
    model: 'DEVICE',
    source: 'DATABASE',
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
    id: 'cam-db-ca-1',
    name: 'Eureka 5th & R St (Eureka, CA)',
    cleanName: 'Eureka 5th & R St Traffic',
    location: 'Eureka, CA',
    stateCode: 'CA',
    coordinates: [-124.163, 40.802],
    streamUrl: 'https://wzmedia.dot.ca.gov/D1/eureka_5th_r_320x240.stream/playlist.m3u8',
    model: 'DEVICE',
    source: 'DATABASE',
  },
  {
    id: 'cam-db-va-1',
    name: 'Fairfax Video I-66 E MM 57 (Fairfax, VA)',
    cleanName: 'I-66 E MM 57 Traffic Cam',
    location: 'Fairfax, VA',
    stateCode: 'VA',
    coordinates: [-77.306, 38.846],
    streamUrl: 'https://media-sfs8.vdotcameras.com:443/rtplive/FairfaxVideo031/playlist.m3u8',
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

export function isStreamInaccessible(streamUrl?: string): boolean {
  if (!streamUrl || typeof streamUrl !== 'string') return true;
  const url = streamUrl.trim().toLowerCase();

  // Must be valid HTTP/HTTPS URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) return true;

  // HazCams live tower cameras are verified active feeds
  if (url.includes('hazcams.com')) return false;

  // 1. DIVAS / Arcadis IVDS systems on port 8200 (require HTTP Basic Auth login prompt dialog)
  // Images from images-dis.divas.cloud are public 200 OK. Any remaining port 8200 or arcadis is blocked.
  if (
    url.includes(':8200') ||
    url.includes('arcadis-ivds.com') ||
    (url.includes('divas.cloud') && !url.includes('images-dis.divas.cloud'))
  ) {
    return true;
  }

  // 2. Deprecated / decommissioned feeds returning 401/403/404/405/503
  if (
    url.includes('navigator.dot.ga.gov') ||     // GDOT Navigator (401 unauthorized sign-in)
    url.includes('actis.idrivearkansas.com') || // Arkansas (403 forbidden API)
    url.includes('cdn3.wowza.com') ||           // Wowza test CDN (403 forbidden)
    url.includes('earthcam.com') ||             // Earthcam (403 hotlink forbidden)
    url.includes('iowadot.gov:8888') ||         // Iowa DOT port 8888 (404 offline)
    url.includes(':8888') ||
    url.includes('ncdot.gov:8887') ||           // NCDOT port 8887 (404 offline)
    url.includes(':8887') ||
    url.includes('oktraffic.org') ||            // Oklahoma (404 not found)
    url.includes('modot.org/tisvc') ||          // Missouri Tisvc API (405 method error)
    url.includes('video.dot.state.mn.us') ||    // Minnesota DOT (503 service unavailable)
    url.includes('iowadotsfs')                  // Iowa DOT SkyVDN (offline / timeout)
  ) {
    return true;
  }

  // 3. SkyVDN endpoints that require token authentication (TxDOT returning 401)
  // Note: NYSDOT (*.nysdot.skyvdn.com) and McLean (*.mcleansfs*.skyvdn.com) return 200 OK and are preserved!
  if (
    url.includes('skyvdn.com') &&
    (url.includes('txdot') ||
      url.includes('/rtplive/tx_') ||
      /s7[0-9]\.us-east-1\.skyvdn\.com/.test(url) ||
      url.includes('token=') ||
      url.includes('auth='))
  ) {
    return true;
  }

  // 4. Explicit login / signin endpoints
  if (
    url.includes('/login') ||
    url.includes('/signin') ||
    url.includes('/weblogin') ||
    url.includes('/auth/login') ||
    url.includes('require-auth') ||
    url.includes('password')
  ) {
    return true;
  }

  return false;
}

function parseLocationDetails(
  name: string,
  coords: [number, number] = [0, 0]
): { cleanName: string; location: string; stateCode: string } {
  let cleanName = name || '';
  let location = 'United States';
  let stateCode = '';

  // Clean out any literal 'null' or '(null)' strings from name
  cleanName = cleanName.replace(/\s*\(\s*null\s*\)/gi, '').replace(/\bnull\b/gi, '').trim();

  // 1. Try matching paren at end, e.g. "(Lexington, SC)" or "(Florida, Bay)" or "(FL, Destin)"
  const matchParen = cleanName.match(/\(([^)]+)\)$/);
  if (matchParen) {
    const inside = matchParen[1].trim();
    cleanName = cleanName.replace(/\s*\([^)]+\)$/, '').trim();
    const parts = inside.split(',').map((p) => p.trim());

    // Check every part for 2-letter state code or full state name
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.length === 2 && US_STATES[p.toUpperCase()]) {
        stateCode = p.toUpperCase();
        const otherPart = parts.find((_, idx) => idx !== i && _.length > 0 && _.toLowerCase() !== 'null');
        location = otherPart ? `${otherPart}, ${stateCode}` : `${US_STATES[stateCode]}, USA`;
        break;
      }
      for (const [code, fullName] of Object.entries(US_STATES)) {
        if (p.toLowerCase() === fullName.toLowerCase()) {
          stateCode = code;
          const otherPart = parts.find((_, idx) => idx !== i && _.length > 0 && _.toLowerCase() !== 'null');
          location = otherPart ? `${otherPart}, ${code}` : `${fullName}, USA`;
          break;
        }
      }
      if (stateCode) break;
    }

    if (!stateCode && inside.toLowerCase() !== 'null') {
      location = inside;
    }
  }

  // Remove any remaining parenthetical location text from cleanName
  cleanName = cleanName.replace(/\s*\([^)]*\)/g, '').trim();

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

  // 3. Geographic bounding fallback if stateCode is still missing but coordinates exist
  if (!stateCode && coords && (coords[0] !== 0 || coords[1] !== 0)) {
    const [lng, lat] = coords;
    if (lat >= 24.0 && lat <= 31.5 && lng >= -88.0 && lng <= -79.5) {
      stateCode = 'FL';
      location = 'Florida, USA';
    } else if (lat >= 32.5 && lat <= 42.0 && lng >= -124.5 && lng <= -114.1) {
      stateCode = 'CA';
      location = 'California, USA';
    } else if (lat >= 36.5 && lat <= 39.5 && lng >= -83.7 && lng <= -75.2) {
      stateCode = 'VA';
      location = 'Virginia, USA';
    } else if (lat >= 36.9 && lat <= 41.0 && lng >= -109.1 && lng <= -102.0) {
      stateCode = 'CO';
      location = 'Colorado, USA';
    }
  }

  // If cleanName contains trailing location after dash, strip duplicate
  if (stateCode) {
    const stateName = US_STATES[stateCode] || '';
    cleanName = cleanName.replace(new RegExp(`\\s*[-–—]\\s*[^,]+,\\s*(${stateCode}|${stateName})$`, 'i'), '').trim();
    cleanName = cleanName.replace(new RegExp(`\\s*[-–—]\\s*(${stateCode}|${stateName})$`, 'i'), '').trim();
  }

  cleanName = cleanName.replace(/[-–—]\s*$/, '').trim();
  if (!cleanName) {
    cleanName = name.replace(/\s*\([^)]*\)/g, '').replace(/\bnull\b/gi, '').trim() || name;
  }

  // Clean out any accidental null in location string
  if (location.toLowerCase().includes('null')) {
    location = stateCode ? `${US_STATES[stateCode] || stateCode}, USA` : 'United States';
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
      const inaccessible = getInaccessibleIds();

      // Combine curated stations first so Florida & primary chasers are immediately present
      const combinedList: CameraData[] = [...CURATED_FEATURED_CAMERAS];
      const seenIds = new Set<string>(CURATED_FEATURED_CAMERAS.map((c) => c.id));
      const seenUrls = new Set<string>(CURATED_FEATURED_CAMERAS.map((c) => c.streamUrl));

      for (let index = 0; index < features.length; index++) {
        const feat = features[index];
        let streamUrl = feat.properties?.stream_url || '';

        // Florida DIVAS traffic cameras: convert protected port-8200 stream URL into the official public live image endpoint!
        const divasMatch = streamUrl.match(/divas\.cloud.*\/chan-([0-9]+)_[a-z0-9]+/i);
        if (divasMatch) {
          streamUrl = `https://images-dis.divas.cloud/DGI/chan-${divasMatch[1]}_h.jpg`;
        }

        // Completely renovated stream filter: removes inaccessible/auth/dead feeds while keeping all valid ones!
        if (isStreamInaccessible(streamUrl)) {
          continue;
        }

        if (seenUrls.has(streamUrl)) {
          continue;
        }

        const coords: [number, number] = feat.geometry?.coordinates || [0, 0];
        const rawName = feat.properties?.name || `Camera #${index + 1}`;
        let { cleanName, location, stateCode } = parseLocationDetails(rawName, coords);
        if (!stateCode && (streamUrl.includes('images-dis.divas.cloud') || rawName.includes('FL'))) {
          stateCode = 'FL';
          if (location === 'United States') location = 'Florida, USA';
        }
        const id = `cam-${index}-${(rawName || '').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24)}`;

        if (seenIds.has(id) || inaccessible.has(id)) {
          continue;
        }

        seenIds.add(id);
        seenUrls.add(streamUrl);

        combinedList.push({
          id,
          name: rawName,
          cleanName: cleanName || rawName,
          location,
          stateCode,
          coordinates: coords,
          streamUrl,
          model: feat.properties?.model || 'DEVICE',
          source: (feat.properties?.source as any) || 'DATABASE',
          isFavorite: favorites.has(id),
        });
      }

      // Incorporate all 212 HazCams severe weather tower cameras!
      for (const hzCam of HAZCAMS_TOWER_CAMERAS) {
        if (!seenIds.has(hzCam.id) && !seenUrls.has(hzCam.streamUrl) && !inaccessible.has(hzCam.id)) {
          seenIds.add(hzCam.id);
          seenUrls.add(hzCam.streamUrl);
          combinedList.push({
            ...hzCam,
            isFavorite: favorites.has(hzCam.id),
          });
        }
      }

      if (onProgress) {
        onProgress(combinedList.length);
      }

      inMemoryCameras = combinedList;
      return combinedList;
    } catch (err) {
      console.warn('Failed to load camera feed from remote API, falling back to curated stations:', err);
      const fallbackList = [...CURATED_FEATURED_CAMERAS, ...HAZCAMS_TOWER_CAMERAS];
      inMemoryCameras = fallbackList;
      return fallbackList;
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

export function getInaccessibleIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INACCESSIBLE);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    const valid = (Array.isArray(arr) ? arr : []).filter(
      (id: string) => !id.startsWith('hazcam-') && !id.startsWith('haz-')
    );
    return new Set(valid);
  } catch {
    return new Set();
  }
}

export function markCameraInaccessible(cameraId: string): void {
  // HazCams cameras are verified 24/7 weather networks and should not be hidden
  if (cameraId.startsWith('hazcam-') || cameraId.startsWith('haz-')) {
    return;
  }
  try {
    const current = getInaccessibleIds();
    current.add(cameraId);
    localStorage.setItem(STORAGE_KEY_INACCESSIBLE, JSON.stringify(Array.from(current)));
    if (inMemoryCameras) {
      inMemoryCameras = inMemoryCameras.filter((c) => c.id !== cameraId);
    }
  } catch (e) {
    console.error('Failed marking camera inaccessible', e);
  }
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
  const inaccessible = getInaccessibleIds();

  return cameras.filter((cam) => {
    if (inaccessible.has(cam.id)) {
      return false;
    }

    if (favoritesOnly && (!cam.isFavorite && !favs?.has(cam.id))) {
      return false;
    }

    if (source !== 'ALL' && source !== 'FAVORITES') {
      if (source === 'RADAR_OMEGA') {
        if (cam.source !== 'RADAR_OMEGA' && cam.source !== 'HAZCAMS' && cam.source !== 'HazCams') return false;
      } else if (cam.source !== source) {
        return false;
      }
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
