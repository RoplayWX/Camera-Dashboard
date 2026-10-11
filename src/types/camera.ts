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
      return 'Radar Omega';
    case 'WEATHER_WISE':
      return 'Weather Wise';
    case 'DATABASE':
      return 'Traffic DOT';
    default:
      return source ? source.replace(/_/g, ' ') : 'Live Feed';
  }
}

export function getSourceBadgeStyle(source: string): { bg: string; text: string; border: string; label: string } {
  switch (source) {
    case 'RADAR_OMEGA':
      return {
        bg: 'bg-blue-950/70',
        text: 'text-blue-400',
        border: 'border-blue-800/80',
        label: 'Radar Omega',
      };
    case 'WEATHER_WISE':
      return {
        bg: 'bg-neutral-900',
        text: 'text-white',
        border: 'border-neutral-700',
        label: 'Weather Wise',
      };
    case 'DATABASE':
    default:
      return {
        bg: 'bg-neutral-950',
        text: 'text-neutral-300',
        border: 'border-neutral-800',
        label: 'Traffic DOT',
      };
  }
}
