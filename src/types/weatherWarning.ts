export type WarningCategory =
  | 'TORNADO_WARNING'
  | 'SEVERE_THUNDERSTORM_WARNING'
  | 'FLASH_FLOOD_WARNING'
  | 'SPECIAL_MARINE_WARNING'
  | 'TROPICAL_CYCLONE_WARNING'
  | 'EXTREME_WIND_WARNING';

export interface WeatherWarning {
  id: string;
  event: string;
  category: WarningCategory;
  headline?: string;
  description?: string;
  instruction?: string;
  areaDesc: string;
  senderName: string;
  severity: string;
  urgency: string;
  certainty: string;
  onset?: string;
  expires?: string;
  ends?: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  color: string;
  fillColor: string;
}

export interface NearbyCameraMatch {
  camera: import('./camera').CameraData;
  isInside: boolean;
  distanceMiles: number;
}
