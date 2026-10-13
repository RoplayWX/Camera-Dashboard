import { CameraData } from '../types/camera';
import { WeatherWarning, WarningCategory, NearbyCameraMatch } from '../types/weatherWarning';

const NWS_ALERTS_ENDPOINT = 'https://api.weather.gov/alerts/active?status=actual&message_type=alert';
const NWS_COUNT_ENDPOINT = 'https://api.weather.gov/alerts/active/count';

// Color definitions adhering to NWS meteorological color standards
export const WARNING_STYLES: Record<WarningCategory, {
  color: string;
  fillColor: string;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}> = {
  TORNADO_WARNING: {
    color: '#ef4444',
    fillColor: '#ef4444',
    label: 'Tornado Warning',
    badgeBg: 'bg-red-950/90',
    badgeText: 'text-red-400',
    badgeBorder: 'border-red-600',
  },
  SEVERE_THUNDERSTORM_WARNING: {
    color: '#f59e0b',
    fillColor: '#f59e0b',
    label: 'Severe Thunderstorm Warning',
    badgeBg: 'bg-amber-950/90',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-600',
  },
  FLASH_FLOOD_WARNING: {
    color: '#10b981',
    fillColor: '#10b981',
    label: 'Flash Flood Warning',
    badgeBg: 'bg-emerald-950/90',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-600',
  },
  SPECIAL_MARINE_WARNING: {
    color: '#f97316',
    fillColor: '#f97316',
    label: 'Special Marine Warning',
    badgeBg: 'bg-orange-950/90',
    badgeText: 'text-orange-400',
    badgeBorder: 'border-orange-600',
  },
  TROPICAL_CYCLONE_WARNING: {
    color: '#ec4899',
    fillColor: '#ec4899',
    label: 'Tropical Cyclone Warning',
    badgeBg: 'bg-pink-950/90',
    badgeText: 'text-pink-400',
    badgeBorder: 'border-pink-600',
  },
  EXTREME_WIND_WARNING: {
    color: '#d946ef',
    fillColor: '#d946ef',
    label: 'Extreme Wind Warning',
    badgeBg: 'bg-fuchsia-950/90',
    badgeText: 'text-fuchsia-400',
    badgeBorder: 'border-fuchsia-600',
  },
};

/**
 * Strict classifier for qualifying active weather warnings.
 * Strictly adheres to prompt specifications (Tornado, Severe Thunderstorm,
 * Flash Flood, Special Marine, and all Tropical Cyclone products).
 */
export function classifyWarningEvent(eventName: string): WarningCategory | null {
  if (!eventName) return null;
  const normalized = eventName.trim();

  // 1. Tornado Warning
  if (normalized === 'Tornado Warning') {
    return 'TORNADO_WARNING';
  }

  // 2. Severe Thunderstorm Warning
  if (normalized === 'Severe Thunderstorm Warning') {
    return 'SEVERE_THUNDERSTORM_WARNING';
  }

  // 3. Flash Flood Warning
  if (normalized === 'Flash Flood Warning') {
    return 'FLASH_FLOOD_WARNING';
  }

  // 4. Special Marine Warning
  if (normalized === 'Special Marine Warning') {
    return 'SPECIAL_MARINE_WARNING';
  }

  // 5. Extreme Wind Warning
  if (normalized === 'Extreme Wind Warning') {
    return 'EXTREME_WIND_WARNING';
  }

  // 6. Tropical Cyclone Products
  const tropicalExactMatches = new Set([
    'Hurricane Warning',
    'Hurricane Watch',
    'Tropical Storm Warning',
    'Tropical Storm Watch',
    'Storm Surge Warning',
    'Storm Surge Watch',
    'Hurricane Force Wind Warning',
    'Hurricane Force Wind Watch',
    'Typhoon Warning',
    'Typhoon Watch',
    'Tropical Depression Warning',
    'Tropical Depression Watch',
  ]);

  if (tropicalExactMatches.has(normalized)) {
    return 'TROPICAL_CYCLONE_WARNING';
  }

  // Handle any other official tropical cyclone warning/watch product designation
  const lower = normalized.toLowerCase();
  const isTropical =
    lower.includes('hurricane') ||
    lower.includes('tropical storm') ||
    lower.includes('storm surge') ||
    lower.includes('typhoon') ||
    lower.includes('tropical depression');

  const isWarningOrWatch = lower.includes('warning') || lower.includes('watch');

  if (isTropical && isWarningOrWatch) {
    return 'TROPICAL_CYCLONE_WARNING';
  }

  // Exclude all other alerts
  return null;
}

/**
 * Get numerical priority of a warning category for dynamic priority color ranking.
 */
export function getWarningPriority(category: WarningCategory): number {
  switch (category) {
    case 'EXTREME_WIND_WARNING': return 6;
    case 'TORNADO_WARNING': return 5;
    case 'TROPICAL_CYCLONE_WARNING': return 4;
    case 'SEVERE_THUNDERSTORM_WARNING': return 3;
    case 'FLASH_FLOOD_WARNING': return 2;
    case 'SPECIAL_MARINE_WARNING': return 1;
    default: return 0;
  }
}

/**
 * Fetch total active NWS alerts count from official count endpoint.
 */
export async function fetchActiveAlertsCount(): Promise<number> {
  try {
    const res = await fetch(NWS_COUNT_ENDPOINT, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CameraDashboard/1.5 (contact@cameradashboard.app)',
      },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return typeof data.total === 'number' ? data.total : 0;
  } catch (err) {
    console.warn('Failed to fetch NWS alert count', err);
    return 0;
  }
}

/**
 * Fetch and filter active weather warnings from NWS API.
 */
export async function fetchActiveWarnings(): Promise<WeatherWarning[]> {
  try {
    const res = await fetch(NWS_ALERTS_ENDPOINT, {
      headers: {
        'Accept': 'application/geo+json',
        'User-Agent': 'CameraDashboard/1.5 (contact@cameradashboard.app)',
      },
    });

    if (!res.ok) {
      console.warn(`NWS alerts endpoint returned status ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.features)) {
      console.warn('NWS alerts response missing features array', data);
      return [];
    }

    const now = new Date();
    const results: WeatherWarning[] = [];

    for (const feature of data.features) {
      const props = feature.properties;
      if (!props || !props.event) continue;

      // Strict qualification check
      const category = classifyWarningEvent(props.event);
      if (!category) continue;

      // Check expiration robustly
      if (props.expires) {
        const expDate = new Date(props.expires);
        if (!isNaN(expDate.getTime()) && expDate <= now) continue;
      }
      if (props.ends) {
        const endDate = new Date(props.ends);
        if (!isNaN(endDate.getTime()) && endDate <= now) continue;
      }

      const styles = WARNING_STYLES[category];
      const geo = feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') ? feature.geometry : null;

      results.push({
        id: feature.id || props.id || `alert-${Math.random()}`,
        event: props.event,
        category,
        headline: props.headline,
        description: props.description,
        instruction: props.instruction,
        areaDesc: props.areaDesc || 'Affected Area',
        senderName: props.senderName || 'National Weather Service',
        severity: props.severity || 'Severe',
        urgency: props.urgency || 'Immediate',
        certainty: props.certainty || 'Observed',
        onset: props.onset,
        expires: props.expires,
        ends: props.ends,
        geometry: geo,
        color: styles.color,
        fillColor: styles.fillColor,
      });
    }

    console.log(`Successfully parsed ${results.length} qualifying NWS warnings from ${data.features.length} total active alerts.`);
    return results;
  } catch (err) {
    console.error('Error fetching NWS active warnings', err);
    return [];
  }
}

/**
 * Validates if coordinates are present, non-null, numeric, and geographically valid.
 */
export function isValidCameraCoordinates(coords: any): coords is [number, number] {
  if (!Array.isArray(coords) || coords.length < 2) return false;
  const [lng, lat] = coords;
  if (typeof lng !== 'number' || typeof lat !== 'number') return false;
  if (isNaN(lng) || isNaN(lat)) return false;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return false;
  // Exclude null island (0, 0)
  if (lng === 0 && lat === 0) return false;
  return true;
}

/**
 * Standard ray-casting point-in-polygon test for a 2D ring of [lng, lat] vertices.
 */
function isPointInRing(point: [number, number], ring: [number, number][]): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Tests if point [lng, lat] falls inside GeoJSON Polygon or MultiPolygon.
 */
export function isPointInPolygonGeometry(
  point: [number, number],
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
): boolean {
  if (geometry.type === 'Polygon') {
    if (!geometry.coordinates || geometry.coordinates.length === 0) return false;
    const exterior = geometry.coordinates[0] as [number, number][];
    if (isPointInRing(point, exterior)) {
      // Check holes
      for (let h = 1; h < geometry.coordinates.length; h++) {
        if (isPointInRing(point, geometry.coordinates[h] as [number, number][])) {
          return false;
        }
      }
      return true;
    }
    return false;
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      if (!poly || poly.length === 0) continue;
      const exterior = poly[0] as [number, number][];
      if (isPointInRing(point, exterior)) {
        let inHole = false;
        for (let h = 1; h < poly.length; h++) {
          if (isPointInRing(point, poly[h] as [number, number][])) {
            inHole = true;
            break;
          }
        }
        if (!inHole) return true;
      }
    }
  }
  return false;
}

/**
 * Distance from point (lat, lng) to line segment (alat, alng)-(blat, blng) in miles.
 */
function distancePointToSegmentMiles(
  plat: number,
  plng: number,
  alat: number,
  alng: number,
  blat: number,
  blng: number
): number {
  const cosLat = Math.cos((alat * Math.PI) / 180);
  const px = plng * cosLat * 69.172;
  const py = plat * 69.172;
  const ax = alng * cosLat * 69.172;
  const ay = alat * 69.172;
  const bx = blng * cosLat * 69.172;
  const by = blat * 69.172;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

/**
 * Calculates shortest distance from point [lng, lat] to polygon perimeter in statute miles.
 */
export function getDistanceToPolygonMiles(
  point: [number, number],
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
): number {
  const [plng, plat] = point;
  let minDistance = Infinity;

  const rings: [number, number][][] = [];
  if (geometry.type === 'Polygon') {
    if (geometry.coordinates?.[0]) {
      rings.push(geometry.coordinates[0] as [number, number][]);
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      if (poly?.[0]) {
        rings.push(poly[0] as [number, number][]);
      }
    }
  }

  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [alng, alat] = ring[i];
      const [blng, blat] = ring[i + 1];
      const d = distancePointToSegmentMiles(plat, plng, alat, alng, blat, blng);
      if (d < minDistance) {
        minDistance = d;
      }
    }
  }

  return minDistance === Infinity ? 999 : minDistance;
}

/**
 * Finds cameras relevant to a warning polygon:
 * 1. Inside the polygon boundary.
 * 2. Outside the polygon but within threshold miles (default 25 miles).
 * Strictly excludes any camera without valid coordinates.
 */
export function findNearbyCamerasForWarning(
  warning: WeatherWarning,
  cameras: CameraData[],
  thresholdMiles = 25
): NearbyCameraMatch[] {
  if (!warning.geometry) return [];
  const matches: NearbyCameraMatch[] = [];

  for (const cam of cameras) {
    // STRICT: Cameras without valid coordinates must be completely excluded
    if (!isValidCameraCoordinates(cam.coordinates)) {
      continue;
    }

    const point: [number, number] = [cam.coordinates[0], cam.coordinates[1]];
    const isInside = isPointInPolygonGeometry(point, warning.geometry);

    if (isInside) {
      matches.push({
        camera: cam,
        isInside: true,
        distanceMiles: 0,
      });
    } else {
      const dist = getDistanceToPolygonMiles(point, warning.geometry);
      if (dist <= thresholdMiles) {
        matches.push({
          camera: cam,
          isInside: false,
          distanceMiles: Math.round(dist * 10) / 10,
        });
      }
    }
  }

  // Sort: Inside cameras first, then by distance ascending
  matches.sort((a, b) => {
    if (a.isInside && !b.isInside) return -1;
    if (!a.isInside && b.isInside) return 1;
    return a.distanceMiles - b.distanceMiles;
  });

  return matches;
}
