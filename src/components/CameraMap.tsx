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

    const initialCenter: [number, number] = selectedCamera
      ? [selectedCamera.coordinates[1], selectedCamera.coordinates[0]]
      : [39.0, -96.0];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: selectedCamera ? 8 : 4,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    markersLayerRef.current = L.markerClusterGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle NEXRAD Radar overlay via official NWS/IEM WMS service
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
      const rLayer = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi', {
        layers: 'nexrad-n0r',
        format: 'image/png',
        transparent: true,
        opacity: 0.65,
        attribution: '&copy; Iowa Environmental Mesonet / NWS',
      }).addTo(map);
      radarLayerRef.current = rLayer;
    }
  }, [showRadar]);

  // Update Markers (ALL cameras, no density filtering)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const targetPool = selectedState
      ? cameras.filter((c) => c.stateCode?.toUpperCase() === selectedState.toUpperCase())
      : cameras;

    const displaySet = new Set<CameraData>(targetPool);
    if (selectedCamera) displaySet.add(selectedCamera);

    const activeList = Array.from(displaySet);

    activeList.forEach((cam) => {
      const [lng, lat] = cam.coordinates;
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;
      if (lat === 0 && lng === 0) return;

      const isSelected = selectedCamera?.id === cam.id;
      const isRadar = cam.source === 'RADAR_OMEGA' || cam.source === 'WEATHER_WISE';

      const customIcon = L.divIcon({
        className: 'custom-midnight-pin',
        html: `
          <div style="position: relative; width: ${isSelected ? 22 : 11}px; height: ${isSelected ? 22 : 11}px;">
            <div style="
              width: 100%;
              height: 100%;
              border-radius: 50%;
              background: ${isSelected ? '#ffffff' : isRadar ? '#f5f5f5' : '#737373'};
              border: 2px solid ${isSelected ? '#3b82f6' : '#000000'};
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              box-shadow: ${isSelected ? '0 0 10px #3b82f6' : '0 1px 4px rgba(0,0,0,0.8)'};
            ">
              ${isRadar ? `<div style="width: 3px; height: 3px; border-radius: 50%; background: #3b82f6;"></div>` : ''}
            </div>
          </div>
        `,
        iconSize: [isSelected ? 22 : 11, isSelected ? 22 : 11],
        iconAnchor: [isSelected ? 11 : 5.5, isSelected ? 11 : 5.5],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      const popupContent = document.createElement('div');
      popupContent.className = 'font-sans text-xs text-white p-1 min-w-[220px]';
      popupContent.innerHTML = `
        <div style="font-weight: 700; font-size: 13px; color: #ffffff; margin-bottom: 4px;">${cam.cleanName}</div>
        <div style="color: #a3a3a3; font-size: 10px; margin-bottom: 8px;">${cam.location || cam.stateCode}</div>
      `;

      marker.bindPopup(popupContent);
      markersLayer.addLayer(marker);
    });
  }, [cameras, selectedCamera, selectedState]);

  return (
    <div className={`relative w-full h-full bg-[#000000] overflow-hidden rounded-xl border border-neutral-800 ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full midnight-osm-map" />
      <div className="absolute top-3 left-3 z-[400] p-2.5 rounded-xl bg-black/95 border border-neutral-800 shadow-2xl flex flex-col gap-2">
        <motion.button
          onClick={() => setShowRadar(!showRadar)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
            showRadar
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'bg-neutral-900 border-neutral-800 text-neutral-300'
          }`}
        >
          {showRadar ? 'NEXRAD: ON' : 'NEXRAD: OFF'}
        </motion.button>
      </div>
    </div>
  );
};
