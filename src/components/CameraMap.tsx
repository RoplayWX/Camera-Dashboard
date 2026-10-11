import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { CameraData } from '../types/camera';
import { motion } from 'motion/react';
import { Navigation, Radio } from 'lucide-react';

interface CameraMapProps {
  cameras: CameraData[];
  selectedCamera: CameraData | null;
  selectedState?: string;
  onSelectCamera: (cam: CameraData) => void;
  onAddToGrid?: (cam: CameraData) => void;
  className?: string;
}

const REGION_PRESETS = [
  { name: 'US National', center: [39.0, -96.0] as [number, number], zoom: 4 },
  { name: 'Rocky Mountains (CO)', center: [39.5, -105.5] as [number, number], zoom: 8 },
  { name: 'Southeast Radar (GA/SC)', center: [33.8, -82.5] as [number, number], zoom: 7 },
  { name: 'Midwest Storm Alley', center: [36.5, -94.0] as [number, number], zoom: 6 },
  { name: 'West Coast', center: [37.5, -120.0] as [number, number], zoom: 6 },
];

export const CameraMap: React.FC<CameraMapProps> = ({
  cameras,
  selectedCamera,
  selectedState,
  onSelectCamera,
  onAddToGrid,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapStyle, setMapStyle] = useState<'osm-midnight' | 'esri-satellite'>('osm-midnight');

  // Initialize Map with 100% free tile provider (No API key needed)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = selectedCamera
      ? [selectedCamera.coordinates[1], selectedCamera.coordinates[0]]
      : [39.0, -96.0];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: selectedCamera ? 8 : 4,
      zoomControl: false,
      attributionControl: false,
    });

    const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Tile Layer when style toggle changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const url =
      mapStyle === 'osm-midnight'
        ? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    const newLayer = L.tileLayer(url, {
      maxZoom: 19,
      attribution: mapStyle === 'osm-midnight' ? '&copy; OpenStreetMap' : '&copy; Esri',
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [mapStyle]);

  // Update Markers when cameras, selectedState or selectedCamera change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const targetPool = selectedState
      ? cameras.filter((c) => c.stateCode?.toUpperCase() === selectedState.toUpperCase())
      : cameras;

    const weatherWise = targetPool.filter((c) => c.source === 'WEATHER_WISE');
    const radarOmega = targetPool.filter((c) => c.source === 'RADAR_OMEGA');
    const databaseSample = targetPool.filter((c) => c.source === 'DATABASE').slice(0, 500);

    const displaySet = new Set<CameraData>([...weatherWise, ...radarOmega, ...databaseSample]);
    if (selectedCamera) displaySet.add(selectedCamera);

    const activeList = Array.from(displaySet);

    // Group cameras by coordinate proximity to disperse overlapping markers (e.g. shared stations in Walls/Stonewall)
    const coordGroups = new Map<string, CameraData[]>();
    activeList.forEach((cam) => {
      const [lng, lat] = cam.coordinates;
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;
      if (lat === 0 && lng === 0) return;
      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      if (!coordGroups.has(key)) coordGroups.set(key, []);
      coordGroups.get(key)!.push(cam);
    });

    activeList.forEach((cam) => {
      const [lng, lat] = cam.coordinates;
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;
      if (lat === 0 && lng === 0) return;

      const group = coordGroups.get(`${lat.toFixed(4)},${lng.toFixed(4)}`) || [cam];
      const indexInGroup = group.findIndex((c) => c.id === cam.id);
      let placedLat = lat;
      let placedLng = lng;

      // Disperse overlapping markers in a clean radial arc so they never cover each other
      if (group.length > 1) {
        const angle = (2 * Math.PI * indexInGroup) / group.length;
        const offsetDist = 0.00045; // ~40 meters offset
        placedLat = lat + offsetDist * Math.cos(angle);
        placedLng = lng + (offsetDist * Math.sin(angle)) / Math.cos((lat * Math.PI) / 180);
      }

      const isSelected = selectedCamera?.id === cam.id;
      const size = isSelected ? 22 : group.length > 1 ? 14 : 11;
      const isRadar = cam.source === 'RADAR_OMEGA' || cam.source === 'WEATHER_WISE';

      const customIcon = L.divIcon({
        className: 'custom-midnight-pin',
        html: `
          <div style="position: relative; width: ${size}px; height: ${size}px;">
            <div style="
              width: 100%;
              height: 100%;
              border-radius: 50%;
              background: ${isSelected ? '#ffffff' : isRadar ? '#f5f5f5' : '#737373'};
              border: 2px solid ${isSelected ? '#3b82f6' : group.length > 1 ? '#3b82f6' : '#000000'};
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              box-shadow: ${isSelected ? '0 0 10px #3b82f6' : '0 1px 4px rgba(0,0,0,0.8)'};
              transition: transform 0.2s ease;
            ">
              ${isRadar ? `<div style="width: 3px; height: 3px; border-radius: 50%; background: #3b82f6;"></div>` : ''}
              ${group.length > 1 && !isRadar && !isSelected ? `<div style="width: 2px; height: 2px; border-radius: 50%; background: #93c5fd;"></div>` : ''}
            </div>
            ${
              isSelected
                ? `<div style="position: absolute; inset: -4px; border: 1.5px solid #3b82f6; border-radius: 50%; animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
                : ''
            }
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([placedLat, placedLng], { icon: customIcon });

      const sourceBadgeText =
        cam.source === 'RADAR_OMEGA'
          ? 'RADAR OMEGA'
          : cam.source === 'WEATHER_WISE'
          ? 'WEATHER WISE'
          : 'TRAFFIC DOT';

      const sourceBadgeStyle =
        cam.source === 'RADAR_OMEGA'
          ? 'background: rgba(30, 58, 138, 0.6); border: 1px solid rgba(59, 130, 246, 0.6); color: #93c5fd;'
          : cam.source === 'WEATHER_WISE'
          ? 'background: #262626; border: 1px solid #525252; color: #ffffff;'
          : 'background: #171717; border: 1px solid #404040; color: #d4d4d4;';

      const clusterHtml =
        group.length > 1
          ? `
        <div style="margin-bottom: 6px; padding: 3px 6px; background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.35); border-radius: 4px; font-size: 10px; color: #93c5fd; font-weight: 700; display: flex; align-items: center; justify-content: space-between;">
          <span>MULTI-FEED SITE</span>
          <span style="font-family: monospace;">FEED ${indexInGroup + 1} OF ${group.length}</span>
        </div>
      `
          : '';

      const popupContent = document.createElement('div');
      popupContent.className = 'font-sans text-xs text-white p-1 min-w-[220px]';
      popupContent.innerHTML = `
        ${clusterHtml}
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; gap: 6px;">
          <span style="font-size: 9px; padding: 2px 6px; border-radius: 4px; ${sourceBadgeStyle} font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em;">
            ${sourceBadgeText}
          </span>
          <span style="color: #a3a3a3; font-size: 10px; font-weight: 600;">${cam.location || cam.stateCode}</span>
        </div>
        <div style="font-weight: 700; font-size: 13px; color: #ffffff; margin-bottom: 4px; line-height: 1.25;">
          ${cam.cleanName}
        </div>
        <div style="color: #737373; font-size: 10px; margin-bottom: 8px; font-family: monospace;">
          [${lat.toFixed(4)}, ${lng.toFixed(4)}]
        </div>
        <div style="display: flex; gap: 6px;">
          <button id="view-cam-${cam.id}" style="
            flex: 1;
            padding: 6px 10px;
            background: #ffffff;
            color: #000000;
            border: none;
            border-radius: 6px;
            font-weight: 700;
            cursor: pointer;
            font-family: inherit;
            font-size: 11px;
            transition: all 0.15s;
          ">MONITOR</button>
          <button id="grid-cam-${cam.id}" style="
            padding: 6px 10px;
            background: #171717;
            color: #ffffff;
            border: 1px solid #404040;
            border-radius: 6px;
            font-weight: 700;
            cursor: pointer;
            font-family: inherit;
            font-size: 11px;
            transition: all 0.15s;
          ">+ WALL</button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'tactical-popup',
      });

      marker.on('popupopen', () => {
        const viewBtn = document.getElementById(`view-cam-${cam.id}`);
        if (viewBtn) {
          viewBtn.onclick = () => {
            onSelectCamera(cam);
            map.closePopup();
          };
        }
        const gridBtn = document.getElementById(`grid-cam-${cam.id}`);
        if (gridBtn && onAddToGrid) {
          gridBtn.onclick = () => {
            onAddToGrid(cam);
            map.closePopup();
          };
        }
      });

      markersLayer.addLayer(marker);
    });
  }, [cameras, selectedCamera, selectedState, onSelectCamera, onAddToGrid]);

  // Center map on selectedCamera
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedCamera) return;
    const [lng, lat] = selectedCamera.coordinates;
    if (lat && lng) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 8), { duration: 1.0 });
    }
  }, [selectedCamera]);

  // Fly to state cluster when selectedState changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedState) return;
    const stateCams = cameras.filter((c) => c.stateCode?.toUpperCase() === selectedState.toUpperCase());
    if (stateCams.length > 0) {
      const [lng, lat] = stateCams[0].coordinates;
      if (lat && lng) {
        map.flyTo([lat, lng], 7, { duration: 1.0 });
      }
    }
  }, [selectedState, cameras]);

  return (
    <div className={`relative w-full h-full bg-[#000000] overflow-hidden rounded-xl border border-neutral-800 ${className}`}>
      {/* Map DOM container */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full ${mapStyle === 'osm-midnight' ? 'midnight-osm-map' : 'midnight-sat-map'}`}
      />

      {/* Floating HUD Layer for Map Presets & Style Switcher */}
      <div className="absolute top-3 left-3 z-[400] flex flex-col gap-2 pointer-events-auto">
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/95 border border-neutral-800 shadow-2xl text-xs text-white">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-neutral-400" />
            <span className="font-bold tracking-tight text-white uppercase">Radar Mesh</span>
            <span className="px-1.5 py-0.5 rounded-md bg-neutral-900 text-neutral-300 font-bold text-[10px] border border-neutral-800 font-mono">
              {cameras.length.toLocaleString()}
            </span>
          </div>

          {/* Style toggle */}
          <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
            <button
              onClick={() => setMapStyle('osm-midnight')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                mapStyle === 'osm-midnight'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Mono
            </button>
            <button
              onClick={() => setMapStyle('esri-satellite')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                mapStyle === 'esri-satellite'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
          </div>
        </div>

        {/* Region Quick Jump */}
        <div className="flex flex-wrap gap-1 max-w-sm">
          {REGION_PRESETS.map((preset) => (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              key={preset.name}
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo(preset.center, preset.zoom, { duration: 0.8 });
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-black/90 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-md"
            >
              <Navigation className="w-2.5 h-2.5 text-blue-400" />
              {preset.name}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-[400] p-2.5 rounded-xl bg-black/90 border border-neutral-800 text-[10px] text-neutral-300 flex items-center gap-3.5 shadow-xl flex-wrap">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-white border border-blue-500 shadow-[0_0_6px_#3b82f6]" />
          <span>Radar Omega / Weather Wise</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-neutral-500 border border-black" />
          <span>Traffic DOT</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-neutral-700 border-2 border-blue-400" />
          <span>Multi-Feed Site</span>
        </div>
      </div>
    </div>
  );
};
