export interface CameraFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    name: string;
    stream_url: string;
    model: 'USER' | 'DEVICE' | string;
    source: 'WEATHER_WISE' | 'RADAR_OMEGA' | 'DATABASE' | string;
  };
}

export interface CameraData {
  id: string;
  name: string;
  cleanName: string;
  location: string;
  stateCode: string;
  coordinates: [number, number]; // [longitude, latitude]
  streamUrl: string;
  model: string;
  source: 'WEATHER_WISE' | 'RADAR_OMEGA' | 'DATABASE' | string;
  isFavorite?: boolean;
}

export type ViewMode = 'focus' | 'grid-2x2' | 'grid-3x3' | 'map';

export type CameraSourceFilter = 'ALL' | 'RADAR_OMEGA' | 'WEATHER_WISE' | 'DATABASE' | 'FAVORITES';

export interface PTZState {
  zoom: number; // 1.0 to 4.0
  panX: number; // -100 to 100%
  panY: number; // -100 to 100%
  brightness: number; // 70 to 150
  contrast: number; // 70 to 150
  nightVision: 'off' | 'green' | 'amber' | 'flir';
  aspectRatio: '16:9' | '4:3' | 'fill';
}

export interface CapturedSnapshot {
  id: string;
  timestamp: number;
  cameraName: string;
  coordinates: [number, number];
  dataUrl: string;
  source: string;
}

export function getSourceDisplayName(source: string): string {
  switch (source) {
    case 'RADAR_OMEGA':
      return 'RadarOmega';
    case 'WEATHER_WISE':
      return 'WeatherWise';
    case 'DATABASE':
      return 'Traffic DOT';
    default:
      return source ? source.replace(/_/g, ' ') : 'Live Feed';
  }
}

export function isChaser(cam: CameraData): boolean {
  const name = cam.cleanName.toLowerCase();
  const source = cam.source.toLowerCase();
  const url = cam.streamUrl.toLowerCase();

  // Explicit overrides for these specific chasers
  if (name.includes('tornado paigeyy') || name.includes('connor croff')) {
      return true;
  }

  return source === 'weather_wise' ||
         name.includes('croff') ||
         name.includes('weatherfront') ||
         url.includes('weatherfront') ||
         url.includes('maxvelocity');
}

export function getSourceBadgeStyle(cam: Partial<CameraData>): {
  bg: string;
  text: string;
  border: string;
  dot: string;
  label: string;
  hex: string;
} {
  // We need to cast back to CameraData for isChaser, but since we only need source, cleanName and streamUrl,
  // we can provide default values if they are missing.
  const camData = {
    ...cam,
    cleanName: cam.cleanName || '',
    source: cam.source || 'DATABASE',
    streamUrl: cam.streamUrl || '',
  } as CameraData;

  if (isChaser(camData)) {
    return {
      bg: 'bg-blue-950/70',
      text: 'text-blue-300',
      border: 'border-blue-500/80',
      dot: 'bg-blue-400',
      label: 'Storm Chaser',
      hex: '#3b82f6',
    };
  }

  switch (camData.source) {
    case 'RADAR_OMEGA':
      return {
        bg: 'bg-emerald-950/70',
        text: 'text-emerald-300',
        border: 'border-emerald-500/80',
        dot: 'bg-emerald-400',
        label: 'Tower Camera',
        hex: '#10b981',
      };
    case 'WEATHER_WISE':
      return {
        bg: 'bg-blue-950/70',
        text: 'text-blue-300',
        border: 'border-blue-500/80',
        dot: 'bg-blue-400',
        label: 'Storm Chaser',
        hex: '#3b82f6',
      };
    case 'DATABASE':
    default:
      return {
        bg: 'bg-amber-950/70',
        text: 'text-amber-300',
        border: 'border-amber-500/80',
        dot: 'amber-400',
        label: 'Traffic Feed',
        hex: '#f59e0b',
      };
  }
}

