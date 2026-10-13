import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { CameraData, getSourceBadgeStyle } from '../types/camera';
import { WeatherWarning } from '../types/weatherWarning';
import { fetchActiveWarnings, findNearbyCamerasForWarning, getWarningPriority } from '../services/weatherWarningService';
import { WeatherWarningPanel } from './WeatherWarningPanel';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, AlertTriangle } from 'lucide-react';

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

export const CameraMap: React.FC<CameraMapProps> = React.memo(({
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
  const warningsLayerRef = useRef<L.LayerGroup | null>(null);

  const [showRadar, setShowRadar] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);
  const [feedType, setFeedType] = useState<'ALL' | 'DATABASE' | 'RADAR_OMEGA' | 'WEATHER_WISE'>('ALL');
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  // Weather Warnings State
  const [warnings, setWarnings] = useState<WeatherWarning[]>([]);
  const [selectedWarningId, setSelectedWarningId] = useState<string | null>(null);

  // Region preset jump
  const handleRegionClick = useCallback((preset: typeof REGION_PRESETS[0]) => {
    setActiveRegion(preset.name);
    mapInstanceRef.current?.flyTo(preset.center, preset.zoom);

    const timer = setTimeout(() => {
      setActiveRegion((curr) => (curr === preset.name ? null : curr));
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Counts for the HUD filter
  const counts = useMemo(() => {
    let traffic = 0;
    let towers = 0;
    let chasers = 0;

    const basePool = selectedState
      ? cameras.filter((c) => c.stateCode?.toUpperCase() === selectedState.toUpperCase())
      : cameras;

    for (const c of basePool) {
      if (c.source === 'DATABASE') traffic++;
      else if (c.source === 'RADAR_OMEGA') towers++;
      else if (c.source === 'WEATHER_WISE') chasers++;
    }

    return {
      all: basePool.length,
      traffic,
      towers,
      chasers,
    };
  }, [cameras, selectedState]);

  // Fetch and poll active weather warnings
  useEffect(() => {
    let isMounted = true;

    const loadWarnings = async () => {
      try {
        const data = await fetchActiveWarnings();
        if (!isMounted) return;
        setWarnings(data);

        // If selected warning has expired or is no longer present, clear selection and restore map
        setSelectedWarningId((currId) => {
          if (!currId) return null;
          const stillExists = data.some((w) => w.id === currId);
          return stillExists ? currId : null;
        });
      } catch (err) {
        console.error('Failed to load active weather warnings', err);
      }
    };

    loadWarnings();
    const interval = setInterval(loadWarnings, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Currently selected warning
  const selectedWarning = useMemo(() => {
    if (!selectedWarningId) return null;
    return warnings.find((w) => w.id === selectedWarningId) || null;
  }, [warnings, selectedWarningId]);

  // Compute nearby cameras for the selected warning
  const nearbyCameras = useMemo(() => {
    if (!selectedWarning) return [];
    return findNearbyCamerasForWarning(selectedWarning, cameras, 25);
  }, [selectedWarning, cameras]);

  // Highest priority active warning for dynamic badge coloring
  const highestPriorityWarning = useMemo(() => {
    if (warnings.length === 0) return null;
    let highest = warnings[0];
    let maxPriority = getWarningPriority(highest.category);
    for (let i = 1; i < warnings.length; i++) {
      const p = getWarningPriority(warnings[i].category);
      if (p > maxPriority) {
        maxPriority = p;
        highest = warnings[i];
      }
    }
    return highest;
  }, [warnings]);

  const alertWidgetStyle = useMemo(() => {
    if (!showWarnings || warnings.length === 0) {
      return 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white';
    }
    const cat = highestPriorityWarning?.category;
    if (cat === 'EXTREME_WIND_WARNING') return 'bg-fuchsia-950/90 border-fuchsia-500/90 text-fuchsia-300 shadow-md shadow-fuchsia-900/50';
    if (cat === 'TORNADO_WARNING') return 'bg-red-950/90 border-red-500/90 text-red-300 shadow-md shadow-red-900/50';
    if (cat === 'TROPICAL_CYCLONE_WARNING') return 'bg-pink-950/90 border-pink-500/90 text-pink-300 shadow-md shadow-pink-900/50';
    if (cat === 'SEVERE_THUNDERSTORM_WARNING') return 'bg-amber-950/90 border-amber-500/90 text-amber-300 shadow-md shadow-amber-900/50';
    if (cat === 'FLASH_FLOOD_WARNING') return 'bg-emerald-950/90 border-emerald-500/90 text-emerald-300 shadow-md shadow-emerald-900/50';
    if (cat === 'SPECIAL_MARINE_WARNING') return 'bg-orange-950/90 border-orange-500/90 text-orange-300 shadow-md shadow-orange-900/50';
    return 'bg-amber-950/80 border-amber-500/80 text-amber-200 shadow-md';
  }, [showWarnings, warnings.length, highestPriorityWarning]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [39.0, -96.0],
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
    });

    // High-contrast Black and White base map using Esri World Dark Gray Canvas
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        attribution: '&copy; Esri, DeLorme, NAVTEQ',
        className: 'map-bw-tiles',
        zIndex: 1,
      }
    ).addTo(map);

    // Dark Gray Reference Overlay
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

    // Create custom panes for weather warning polygons
    // warningsPane: zIndex 350 (beneath dimming overlay at 380)
    map.createPane('warningsPane');
    const warningsPane = map.getPane('warningsPane');
    if (warningsPane) warningsPane.style.zIndex = '350';

    // selectedWarningPane: zIndex 450 (above dimming overlay at 380)
    map.createPane('selectedWarningPane');
    const selectedWarningPane = map.getPane('selectedWarningPane');
    if (selectedWarningPane) selectedWarningPane.style.zIndex = '450';

    // Warning polygons layer group
    warningsLayerRef.current = L.layerGroup().addTo(map);

    // Deselect warning on clicking unoccupied map background
    map.on('click', () => {
      setSelectedWarningId(null);
    });

    // Marker cluster group for camera pins
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
          bgStyle = 'background: rgba(37, 99, 235, 0.96); border: 2.5px solid #93c5fd; color: #ffffff; box-shadow: 0 0 20px rgba(59, 130, 246, 0.9);';
          diameter = 44;
        } else if (count >= 10) {
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
      warningsLayerRef.current = null;
    };
  }, []);

  // Handle NEXRAD Weather Radar overlay
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

  // Render & Update Weather Warning Polygons
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = warningsLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    if (!showWarnings || warnings.length === 0) return;

    for (const warning of warnings) {
      if (!warning.geometry || (warning.geometry.type !== 'Polygon' && warning.geometry.type !== 'MultiPolygon')) {
        continue;
      }
      const isSelected = selectedWarningId === warning.id;

      try {
        const geoLayer = L.geoJSON(warning.geometry, {
          pane: isSelected ? 'selectedWarningPane' : 'warningsPane',
          style: () => ({
            color: warning.color,
            weight: isSelected ? 4 : 2,
            opacity: isSelected ? 1 : 0.85,
            fillColor: warning.fillColor,
            fillOpacity: isSelected ? 0.45 : 0.22,
            className: isSelected ? 'selected-warning-polygon' : 'warning-polygon-interactive',
          }),
          onEachFeature: (_, layer) => {
            layer.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              // Toggle selection if clicking currently selected polygon, otherwise select new polygon
              setSelectedWarningId((curr) => (curr === warning.id ? null : warning.id));
            });
          },
        });

        layerGroup.addLayer(geoLayer);
      } catch (err) {
        console.error('Error drawing warning polygon', warning.id, err);
      }
    }
  }, [warnings, selectedWarningId, showWarnings]);

  const mapIcons = useMemo(() => ({
    chaser: L.divIcon({
      className: 'custom-type-pin',
      html: '<div style="width: 10px; height: 10px; border-radius: 50%; background: #3b82f6; border: 1.5px solid #000000; box-shadow: 0 0 6px rgba(59, 130, 246, 0.85);"></div>',
      iconSize: [10, 10],
    }),
    tower: L.divIcon({
      className: 'custom-type-pin',
      html: '<div style="width: 10px; height: 10px; border-radius: 50%; background: #10b981; border: 1.5px solid #000000; box-shadow: 0 0 6px rgba(16, 185, 129, 0.85);"></div>',
      iconSize: [10, 10],
    }),
    traffic: L.divIcon({
      className: 'custom-type-pin',
      html: '<div style="width: 9px; height: 9px; border-radius: 50%; background: #f59e0b; border: 1.5px solid #000000; box-shadow: 0 0 5px rgba(245, 158, 11, 0.6);"></div>',
      iconSize: [9, 9],
    }),
  }), []);

  // Update Camera Markers
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
        targetPool = targetPool.filter((c) => c.source === 'RADAR_OMEGA' || c.source === 'HAZCAMS' || c.source === 'HazCams');
      } else {
        targetPool = targetPool.filter((c) => c.source === feedType);
      }
    }

    const markersToAdd: L.Marker[] = [];

    for (let i = 0; i < targetPool.length; i++) {
      const cam = targetPool[i];
      const [lng, lat] = cam.coordinates;
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) continue;

      const icon = cam.source === 'WEATHER_WISE'
        ? mapIcons.chaser
        : (cam.source === 'RADAR_OMEGA' || cam.source === 'HAZCAMS' || cam.source === 'HazCams')
        ? mapIcons.tower
        : mapIcons.traffic;

      const marker = L.marker([lat, lng], { icon });

      marker.bindPopup(() => {
        const badgeStyle = getSourceBadgeStyle(cam);
        const badgeName = badgeStyle.label.toUpperCase();
        const badgeColor = badgeStyle.hex;
        const locationDisplay = cam.location && cam.location !== 'null' && cam.location.trim() !== '' ? cam.location : '';

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

        setTimeout(() => {
          document.getElementById(`view-cam-${cam.id}`)?.addEventListener('click', () => onSelectCamera(cam));
          document.getElementById(`grid-cam-${cam.id}`)?.addEventListener('click', () => onAddToGrid?.(cam));
        }, 0);

        return popupContent;
      }, {
        closeButton: true,
        className: 'custom-clean-popup',
      });

      markersToAdd.push(marker);
    }

    markersLayer.addLayers(markersToAdd);
  }, [cameras, selectedState, feedType, mapIcons, onSelectCamera, onAddToGrid]);

  return (
    <div className={`relative w-full h-full bg-[#000000] overflow-hidden rounded-xl border border-neutral-800 ${className}`}>
      {/* Leaflet map container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Dimming Overlay (z-index 380: above base tiles, radar, and unselected polygons; below selected polygon and markers) */}
      <div
        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300 ease-in-out z-[380]"
        style={{ opacity: selectedWarning && showWarnings ? 0.40 : 0 }}
      />

      {/* Selected Warning & Nearby Cameras Drawer */}
      <AnimatePresence>
        {selectedWarning && showWarnings && (
          <WeatherWarningPanel
            warning={selectedWarning}
            nearbyCameras={nearbyCameras}
            onClose={() => setSelectedWarningId(null)}
            onSelectCamera={onSelectCamera}
            onAddToGrid={onAddToGrid}
          />
        )}
      </AnimatePresence>

      {/* HUD Layer with Filtering System and Controls */}
      <div className="absolute top-3 left-3 z-[400] p-2.5 rounded-xl bg-black/95 border border-neutral-800 flex flex-col gap-2.5 shadow-2xl backdrop-blur-md max-w-xs select-none">
        {/* Header, Warnings & NEXRAD Toggles */}
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">US MAP (B&W)</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Warnings Toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const nextState = !showWarnings;
                setShowWarnings(nextState);
                if (!nextState) setSelectedWarningId(null);
              }}
              className={`px-2 py-1 rounded-md border text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${alertWidgetStyle}`}
              title="Toggle active weather alert polygons"
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>{showWarnings ? `ALERTS: ${warnings.length}` : 'ALERTS: OFF'}</span>
            </motion.button>

            {/* NEXRAD Radar Toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowRadar(!showRadar)}
              className={`px-2 py-1 rounded-md border text-[10px] font-bold transition-all cursor-pointer ${
                showRadar
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {showRadar ? 'RADAR: ON' : 'RADAR: OFF'}
            </motion.button>
          </div>
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
            {REGION_PRESETS.map((preset) => {
              const isActive = activeRegion === preset.name;
              return (
                <button
                  key={preset.name}
                  onClick={() => handleRegionClick(preset)}
                  className={`px-2 py-0.5 rounded border text-[10px] transition-all duration-700 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 border-blue-400 text-white font-bold shadow-[0_0_10px_rgba(59,130,246,0.8)]'
                      : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300 hover:text-white'
                  }`}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

CameraMap.displayName = 'CameraMap';
