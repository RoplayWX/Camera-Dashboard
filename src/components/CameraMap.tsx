import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { CameraData, getSourceBadgeStyle } from '../types/camera';
import { motion } from 'motion/react';
import { Radio, Car, RadioTower, Zap } from 'lucide-react';

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
  { name: 'Florida', center: [27.8, -82.0] as [number, number], zoom: 6 },
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
  const [feedType, setFeedType] = useState<'ALL' | 'DATABASE' | 'RADAR_OMEGA' | 'HazCams' | 'WEATHER_WISE'>('ALL');

  // Counts for the HUD filter
  const counts = useMemo(() => {
    let traffic = 0;
    let towers = 0;
    let hazcams = 0;
    let chasers = 0;

    const basePool = selectedState
      ? cameras.filter((c) => c.stateCode?.toUpperCase() === selectedState.toUpperCase())
      : cameras;

    for (const c of basePool) {
      if (c.source === 'DATABASE') traffic++;
      else if (c.source === 'RADAR_OMEGA' || c.source === 'HazCams') towers++;
      else if (c.source === 'HazCams') hazcams++;
      else if (c.source === 'WEATHER_WISE') chasers++;
    }

    return {
      all: basePool.length,
      traffic,
      towers,
      hazcams,
      chasers,
    };
  }, [cameras, selectedState]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [39.0, -96.0],
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
    });

    // High-contrast Black and White base map using Esri World Dark Gray Canvas (No Carto, No API Key)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        attribution: '&copy; Esri, DeLorme, NAVTEQ',
        className: 'map-bw-tiles',
        zIndex: 1,
      }
    ).addTo(map);

    // Dark Gray Reference Overlay (Boundaries & Labels)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        attribution: '',
        className: 'map-bw-tiles',
        zIndex: 2,
      }
    ).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Custom Marker Clustering with signature blue theme
    markersLayerRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 13,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let bgStyle = 'background: rgba(30, 58, 138, 0.9); border: 2px solid #3b82f6; color: #93c5fd; box-shadow: 0 0 10px rgba(30, 58, 138, 0.6);';
        let diameter = 34;

        if (count >= 100) {
          // Radiant bright blue for large density clusters
          bgStyle = 'background: rgba(37, 99, 235, 0.96); border: 2.5px solid #93c5fd; color: #ffffff; box-shadow: 0 0 20px rgba(59, 130, 246, 0.9);';
          diameter = 44;
        } else if (count >= 10) {
          // Medium rich blue
          bgStyle = 'background: rgba(29, 78, 216, 0.92); border: 2px solid #60a5fa; color: #ffffff; box-shadow: 0 0 14px rgba(59, 130, 246, 0.7);';
          diameter = 38;
        }

        return L.divIcon({
          html: `<div style="${bgStyle} width: ${diameter}px; height: ${diameter}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-family: Montserrat, sans-serif; font-size: ${count >= 1000 ? '10px' : '11px'}; letter-spacing: -0.02em;">${count}</div>`,
          className: 'custom-blue-cluster',
          iconSize: L.point(diameter, diameter),
        });
      },
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle NEXRAD / Weather Radar overlay via official NWS / IEM WMS service
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
      radarLayerRef.current = L.tileLayer.wms(
        'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi',
        {
          layers: 'nexrad-n0r',
          format: 'image/png',
          transparent: true,
          opacity: 0.72,
          zIndex: 10,
          attribution: '&copy; Iowa Environmental Mesonet / NWS NEXRAD',
        }
      ).addTo(map);
    }
  }, [showRadar]);

  // Update Markers with Category Filtering and Distinct Color Pins
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    let targetPool = selectedState
      ? cameras.filter((c) => c.stateCode?.toUpperCase() === selectedState.toUpperCase())
      : cameras;

    if (feedType !== 'ALL') {
      if (feedType === 'RADAR_OMEGA') {
        targetPool = targetPool.filter((c) => c.source === 'RADAR_OMEGA' || c.source === 'HazCams');
      } else {
        targetPool = targetPool.filter((c) => c.source === feedType);
      }
    }

    targetPool.forEach((cam) => {
      const [lng, lat] = cam.coordinates;
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;

      const isSelected = selectedCamera?.id === cam.id;

      // Color coding per camera kind:
      // - Storm Chasers (WEATHER_WISE): Bright Blue (#3b82f6)
      // - Tower Cameras (RADAR_OMEGA): Emerald Green (#10b981)
      // - HazCams (HazCams): Cyan (#06b6d4)
      // - Traffic Cameras (DATABASE): Amber / Warning Gold (#f59e0b)
      let pinColor = '#f59e0b';
      let haloColor = 'rgba(245, 158, 11, 0.6)';

      if (cam.source === 'WEATHER_WISE') {
        pinColor = '#3b82f6';
        haloColor = 'rgba(59, 130, 246, 0.85)';
      } else if (cam.source === 'RADAR_OMEGA' || cam.source === 'HazCams') {
        pinColor = '#10b981';
        haloColor = 'rgba(16, 185, 129, 0.85)';
      }

      const pinSize = isSelected ? 18 : 9;
      const borderSize = isSelected ? 3 : 1.5;

      const customIcon = L.divIcon({
        className: 'custom-type-pin',
        html: `<div style="width: ${pinSize}px; height: ${pinSize}px; border-radius: 50%; background: ${pinColor}; border: ${borderSize}px solid #000000; box-shadow: 0 0 ${isSelected ? '12px' : '6px'} ${haloColor};"></div>`,
        iconSize: [pinSize, pinSize],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      const locationDisplay =
        cam.location && cam.location !== 'null' && cam.location.trim() !== ''
          ? cam.location
          : '';

      const badgeStyle = getSourceBadgeStyle(cam.source);
      const badgeName = badgeStyle.label.toUpperCase();
      const badgeColor = badgeStyle.hex;

      const popupContent = document.createElement('div');
      popupContent.className =
        'font-sans text-xs text-white p-3 min-w-[230px] bg-neutral-950 rounded-lg shadow-2xl border border-neutral-800';
      popupContent.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
          <span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: rgba(0,0,0,0.6); border: 1px solid ${badgeColor}; color: ${badgeColor}; letter-spacing: 0.05em; text-transform: uppercase;">
            ${badgeName}
          </span>
          ${cam.stateCode ? `<span style="font-size: 10px; color: #9ca3af; font-weight: 700;">${cam.stateCode}</span>` : ''}
        </div>
        <div style="font-weight: 700; font-size: 13px; margin-bottom: 3px; color: #ffffff; line-height: 1.3;">${cam.cleanName}</div>
        ${locationDisplay ? `<div style="color: #9ca3af; font-size: 11px; margin-bottom: 8px;">${locationDisplay}</div>` : ''}
        <div style="display: flex; gap: 6px; margin-top: 8px;">
          <button id="view-cam-${cam.id}" style="flex: 1; padding: 6px 10px; background: #ffffff; color: #000000; border-radius: 4px; font-weight: 700; font-size: 11px; cursor: pointer;">MONITOR</button>
          <button id="grid-cam-${cam.id}" style="padding: 6px 10px; background: #262626; color: #ffffff; border-radius: 4px; font-weight: 700; font-size: 11px; cursor: pointer;">+ WALL</button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: true,
        className: 'custom-clean-popup',
      });

      marker.on('popupopen', () => {
        document.getElementById(`view-cam-${cam.id}`)?.addEventListener('click', () => onSelectCamera(cam));
        document.getElementById(`grid-cam-${cam.id}`)?.addEventListener('click', () => onAddToGrid?.(cam));
      });

      markersLayer.addLayer(marker);
    });
  }, [cameras, selectedCamera, selectedState, feedType, onSelectCamera, onAddToGrid]);

  return (
    <div className={`relative w-full h-full bg-[#000000] overflow-hidden rounded-xl border border-neutral-800 ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* HUD Layer with Filtering System and Controls */}
      <div className="absolute top-3 left-3 z-[400] p-2.5 rounded-xl bg-black/95 border border-neutral-800 flex flex-col gap-2.5 shadow-2xl backdrop-blur-md max-w-xs">
        {/* Header & NEXRAD Toggle */}
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">US MAP (B&W)</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowRadar(!showRadar)}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-bold transition-all cursor-pointer ${
              showRadar
                ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            {showRadar ? 'NEXRAD: ON' : 'NEXRAD: OFF'}
          </motion.button>
        </div>

        {/* Camera Category Filter Buttons */}
        <div className="flex flex-col gap-1 pt-1 border-t border-neutral-800/80">
          <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 px-0.5">Filter Cameras:</span>
          <div className="grid grid-cols-2 gap-1">
            {/* All */}
            <button
              onClick={() => setFeedType('ALL')}
              className={`px-2 py-1.5 rounded-md border text-[11px] font-bold flex items-center justify-between transition-all cursor-pointer ${
                feedType === 'ALL'
                  ? 'bg-neutral-800 border-neutral-600 text-white shadow-sm'
                  : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white inline-block" />
                All Feeds
              </span>
              <span className="text-[10px] text-neutral-400">{counts.all}</span>
            </button>

            {/* Traffic */}
            <button
              onClick={() => setFeedType('DATABASE')}
              className={`px-2 py-1.5 rounded-md border text-[11px] font-bold flex items-center justify-between transition-all cursor-pointer ${
                feedType === 'DATABASE'
                  ? 'bg-amber-950/70 border-amber-500/80 text-amber-200 shadow-sm'
                  : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-amber-300'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                Traffic
              </span>
              <span className="text-[10px] text-amber-400/80">{counts.traffic}</span>
            </button>

            {/* Towers */}
            <button
              onClick={() => setFeedType('RADAR_OMEGA')}
              className={`px-2 py-1.5 rounded-md border text-[11px] font-bold flex items-center justify-between transition-all cursor-pointer ${
                feedType === 'RADAR_OMEGA'
                  ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-200 shadow-sm'
                  : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-emerald-300'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Towers
              </span>
              <span className="text-[10px] text-emerald-400/80">{counts.towers}</span>
            </button>



            {/* Chasers */}
            <button
              onClick={() => setFeedType('WEATHER_WISE')}
              className={`px-2 py-1.5 rounded-md border text-[11px] font-bold flex items-center justify-between transition-all cursor-pointer ${
                feedType === 'WEATHER_WISE'
                  ? 'bg-blue-950/70 border-blue-500/80 text-blue-200 shadow-sm'
                  : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-blue-300'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                Chasers
              </span>
              <span className="text-[10px] text-blue-400/80">{counts.chasers}</span>
            </button>
          </div>
        </div>

        {/* Region Jumps */}
        <div className="flex flex-col gap-1 pt-1 border-t border-neutral-800/80">
          <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 px-0.5">Regions:</span>
          <div className="flex flex-wrap gap-1">
            {REGION_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => mapInstanceRef.current?.flyTo(preset.center, preset.zoom)}
                className={`px-2 py-0.5 rounded border text-[10px] transition-all cursor-pointer ${
                  preset.name === 'Florida'
                    ? 'bg-blue-950/60 border-blue-700/60 text-blue-300 hover:bg-blue-900/80 hover:text-white font-bold'
                    : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
