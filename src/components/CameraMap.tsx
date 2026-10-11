import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { CameraData } from '../types/camera';
import { motion } from 'motion/react';
import { Navigation, Radio, CloudRain } from 'lucide-react';

interface CameraMapProps {
  cameras: CameraData[];
  selectedCamera: CameraData | null;
  selectedState?: string;
  onSelectCamera: (cam: CameraData) => void;
  onAddToGrid?: (cam: CameraData) => void;
  className?: string;
}

const REGION_PRESETS = [
  { name: 'National', center: [39.0, -96.0] as [number, number], zoom: 4 },
  { name: 'Northwest', center: [45.5, -120.5] as [number, number], zoom: 6 },
  { name: 'Northeast', center: [42.0, -73.5] as [number, number], zoom: 6 },
  { name: 'Southwest', center: [33.5, -105.0] as [number, number], zoom: 6 },
  { name: 'Southeast', center: [32.8, -83.6] as [number, number], zoom: 6 },
  { name: 'Midwest', center: [41.5, -87.6] as [number, number], zoom: 6 },
  { name: 'West Coast', center: [37.0, -120.0] as [number, number], zoom: 6 },
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
  const markersLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  const radarLayerRef = useRef<L.TileLayer.WMS | null>(null);

  const [showRadar, setShowRadar] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [39.0, -96.0],
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
    });

    // OSM with Dark Mode Filter
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
      className: 'map-dark-filter',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Marker Clustering
    markersLayerRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 12,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle NEXRAD / Weather Radar overlay via RainViewer API
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!showRadar) {
      if (radarLayerRef.current) {
        map.removeLayer(radarLayerRef.current);
        radarLayerRef.current = null;
      }
      return;
    }

    if (!radarLayerRef.current) {
      radarLayerRef.current = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi', {
        layers: 'nexrad-n0r',
        format: 'image/png',
        transparent: true,
        opacity: 0.65,
        attribution: '&copy; Iowa Environmental Mesonet / NWS',
      }).addTo(map);
    }
  }, [showRadar]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const targetPool = selectedState
      ? cameras.filter((c) => c.stateCode?.toUpperCase() === selectedState.toUpperCase())
      : cameras;

    targetPool.forEach((cam) => {
      const [lng, lat] = cam.coordinates;
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;

      const isSelected = selectedCamera?.id === cam.id;
      const customIcon = L.divIcon({
        className: 'custom-midnight-pin',
        html: `<div style="width: ${isSelected ? 16 : 8}px; height: ${isSelected ? 16 : 8}px; border-radius: 50%; background: ${isSelected ? '#3b82f6' : '#737373'}; border: 2px solid white;"></div>`,
        iconSize: [isSelected ? 16 : 8, isSelected ? 16 : 8],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      const locationDisplay = (cam.location && cam.location !== 'null' && cam.location.trim() !== '') ? cam.location : '';

      const popupContent = document.createElement('div');
      popupContent.className = 'font-sans text-xs text-white p-2 min-w-[220px] bg-neutral-900 rounded-lg shadow-lg border border-neutral-700';
      popupContent.innerHTML = `
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: white;">${cam.cleanName}</div>
        ${locationDisplay ? `<div style="color: #a3a3a3; font-size: 11px; margin-bottom: 8px;">${locationDisplay}</div>` : ''}
        <div style="display: flex; gap: 6px; margin-top: 8px;">
          <button id="view-cam-${cam.id}" style="flex: 1; padding: 6px; background: white; color: black; border-radius: 4px; font-weight: bold; font-size: 11px;">MONITOR</button>
          <button id="grid-cam-${cam.id}" style="padding: 6px; background: #333; color: white; border-radius: 4px; font-weight: bold; font-size: 11px;">+ WALL</button>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('popupopen', () => {
        document.getElementById(`view-cam-${cam.id}`)?.addEventListener('click', () => onSelectCamera(cam));
        document.getElementById(`grid-cam-${cam.id}`)?.addEventListener('click', () => onAddToGrid?.(cam));
      });
      markersLayer.addLayer(marker);
    });
  }, [cameras, selectedCamera, selectedState, onSelectCamera, onAddToGrid]);

  return (
    <div className={`relative w-full h-full bg-[#000000] overflow-hidden rounded-xl border border-neutral-800 ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* HUD Layer */}
      <div className="absolute top-3 left-3 z-[400] p-2.5 rounded-xl bg-black/95 border border-neutral-800 flex flex-col gap-2">
        <div className="flex items-center gap-2 px-1">
          <Radio className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">US MAP</span>
        </div>
        
        <motion.button
          onClick={() => setShowRadar(!showRadar)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
            showRadar ? 'bg-blue-600 text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-300'
          }`}
        >
          {showRadar ? 'NEXRAD: ON' : 'NEXRAD: OFF'}
        </motion.button>

        <div className="flex flex-wrap gap-1">
          {REGION_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => mapInstanceRef.current?.flyTo(preset.center, preset.zoom)}
              className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
