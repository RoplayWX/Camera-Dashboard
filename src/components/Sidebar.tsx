import React, { useState, useMemo } from 'react';
import { CameraData, CameraSourceFilter } from '../types/camera';
import { US_STATES } from '../services/cameraService';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Star,
  Radio,
  CloudLightning,
  Video,
  Navigation,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Plus,
  Car,
  Layers,
  MapPin,
  RotateCcw,
  GripVertical,
  ArrowDownToLine,
} from 'lucide-react';

interface SidebarProps {
  cameras: CameraData[];
  selectedCamera: CameraData | null;
  onSelectCamera: (camera: CameraData) => void;
  onAddToGrid: (camera: CameraData) => void;
  onToggleFavorite: (id: string) => void;
  favoriteIds: Set<string>;
  onRandomFeed: () => void;
  className?: string;
  selectedState?: string;
  onSelectState?: (state: string) => void;
  onClose?: () => void;
  isOpen?: boolean;
}

const ITEMS_PER_PAGE = 40;

const POPULAR_QUICK_STATES = ['GA', 'FL', 'TX', 'CA', 'CO', 'NY', 'VA', 'SC', 'MO'];

export const Sidebar: React.FC<SidebarProps> = ({
  cameras,
  selectedCamera,
  onSelectCamera,
  onAddToGrid,
  onToggleFavorite,
  favoriteIds,
  onRandomFeed,
  className = '',
  selectedState: externalSelectedState,
  onSelectState: externalOnSelectState,
  onClose,
  isOpen = true,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<CameraSourceFilter>('ALL');
  const [internalSelectedState, setInternalSelectedState] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const selectedState = externalSelectedState !== undefined ? externalSelectedState : internalSelectedState;
  const setSelectedState = (st: string) => {
    if (externalOnSelectState) externalOnSelectState(st);
    setInternalSelectedState(st);
    setPage(1);
  };

  // Compute camera counts per state dynamically
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cam of cameras) {
      if (cam.stateCode) {
        counts[cam.stateCode] = (counts[cam.stateCode] || 0) + 1;
      }
    }
    return counts;
  }, [cameras]);

  // Sorted list of all active states with counts in alphabetical order
  const availableStates = useMemo(() => {
    return Object.keys(stateCounts)
      .map((code) => ({
        code,
        name: US_STATES[code] || code,
        count: stateCounts[code] || 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [stateCounts]);

  // Compute counts per source
  const sourceCounts = useMemo(() => {
    let ww = 0;
    let ro = 0; // Tower cameras (RadarOmega + HazCams)
    let hz = 0;
    let db = 0;
    for (const c of cameras) {
      if (c.source === 'WEATHER_WISE') ww++;
      else if (c.source === 'RADAR_OMEGA' || c.source === 'HazCams') ro++;
      else if (c.source === 'HazCams') hz++;
      else if (c.source === 'DATABASE') db++;
    }
    return {
      ww,
      ro,
      hz,
      db,
      total: cameras.length,
      favs: favoriteIds.size,
    };
  }, [cameras, favoriteIds]);

  // Compute filtered cameras
  const filteredCameras = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return cameras.filter((cam) => {
      if (sourceFilter === 'FAVORITES') {
        if (!favoriteIds.has(cam.id)) return false;
      } else if (sourceFilter === 'RADAR_OMEGA') {
        if (cam.source !== 'RADAR_OMEGA' && cam.source !== 'HazCams') return false;
      } else if (sourceFilter !== 'ALL') {
        if (cam.source !== sourceFilter) return false;
      }

      if (selectedState && cam.stateCode?.toUpperCase() !== selectedState.toUpperCase()) {
        return false;
      }

      if (!q) return true;
      return (
        cam.name.toLowerCase().includes(q) ||
        cam.cleanName.toLowerCase().includes(q) ||
        cam.location.toLowerCase().includes(q) ||
        cam.source.toLowerCase().includes(q) ||
        cam.stateCode.toLowerCase().includes(q)
      );
    });
  }, [cameras, searchQuery, sourceFilter, selectedState, favoriteIds]);

  const totalPages = Math.max(1, Math.ceil(filteredCameras.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCameras.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCameras, currentPage]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setSourceFilter('ALL');
    setSelectedState('');
    setPage(1);
  };

  const hasActiveFilters = searchQuery !== '' || sourceFilter !== 'ALL' || selectedState !== '';

  if (!isOpen) {
    return (
      <aside className={`flex flex-col items-center py-4 bg-[#000000] border-r border-neutral-800 h-full select-none gap-4 ${className}`}>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer border border-neutral-800 shadow-lg"
          title="Expand Sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </motion.button>
        <div className="w-8 h-[1px] bg-neutral-800 my-1" />
        <button
          onClick={onClose}
          className="p-2.5 rounded-xl bg-neutral-900/50 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer relative"
          title="Camera Feeds"
        >
          <Radio className="w-4 h-4 text-blue-500" />
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[8px] font-bold bg-blue-600 text-white rounded-full">
            {cameras.length}
          </span>
        </button>
        <button
          onClick={onRandomFeed}
          className="p-2.5 rounded-xl bg-neutral-900/50 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          title="Random Feed"
        >
          <Shuffle className="w-4 h-4 text-neutral-400" />
        </button>
      </aside>
    );
  }

  return (
    <aside className={`flex flex-col bg-[#000000] border-r border-neutral-800 h-full select-none ${className}`}>
      {/* Top Header & Search */}
      <div className="p-3.5 border-b border-neutral-800 space-y-3 bg-[#050505]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-neutral-400" />
              Camera Feeds
            </span>
            {onClose && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-1 rounded-md bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer border border-neutral-800"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {hasActiveFilters && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetAllFilters}
                className="px-2 py-0.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-[10px] flex items-center gap-1 transition-colors cursor-pointer border border-neutral-800 font-medium"
                title="Reset all filters"
              >
                <RotateCcw className="w-2.5 h-2.5 text-blue-400" />
                <span>Reset</span>
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRandomFeed}
              className="px-2.5 py-1 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white text-[10px] flex items-center gap-1.5 transition-all cursor-pointer font-semibold shadow-sm"
              title="Jump to Random Live Camera Feed"
            >
              <Shuffle className="w-3 h-3 text-blue-400" />
              <span>Surprise</span>
            </motion.button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Search city, highway, chaser..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-8 pr-7 py-2 bg-[#0a0a0a] border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setPage(1);
              }}
              className="absolute right-2 top-2.5 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* SECTION 1: FILTER BY SOURCE */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold mb-1.5 tracking-wider uppercase">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-blue-400" />
              Filter by Source
            </span>
            <span className="text-neutral-500 font-normal">
              {sourceFilter === 'ALL'
                ? 'All Sources'
                : sourceFilter === 'RADAR_OMEGA'
                ? 'Tower Cameras'
                : sourceFilter === 'WEATHER_WISE'
                ? 'Storm Chasers'
                : sourceFilter === 'DATABASE'
                ? 'Traffic Cameras'
                : 'Starred'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setSourceFilter('ALL');
                setPage(1);
              }}
              className={`py-1.5 px-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                sourceFilter === 'ALL'
                  ? 'bg-white text-black border-white font-bold shadow-sm'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <span>All Sources</span>
              <span className="opacity-75 font-mono">{sourceCounts.total.toLocaleString()}</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setSourceFilter('RADAR_OMEGA');
                setPage(1);
              }}
              className={`py-1.5 px-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                sourceFilter === 'RADAR_OMEGA'
                  ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 font-bold shadow-sm'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-emerald-300'
              }`}
            >
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Tower Cameras
              </span>
              <span className="opacity-75 font-mono text-emerald-400/80">{sourceCounts.ro}</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setSourceFilter('WEATHER_WISE');
                setPage(1);
              }}
              className={`py-1.5 px-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                sourceFilter === 'WEATHER_WISE'
                  ? 'bg-blue-950/70 border-blue-500 text-blue-200 font-bold shadow-sm'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-blue-300'
              }`}
            >
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                Storm Chasers
              </span>
              <span className="opacity-75 font-mono text-blue-400/80">{sourceCounts.ww}</span>
            </motion.button>



            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setSourceFilter('DATABASE');
                setPage(1);
              }}
              className={`py-1.5 px-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                sourceFilter === 'DATABASE'
                  ? 'bg-amber-950/70 border-amber-500 text-amber-200 font-bold shadow-sm'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-amber-300'
              }`}
            >
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                Traffic Cameras
              </span>
              <span className="opacity-75 font-mono text-amber-400/80">{sourceCounts.db.toLocaleString()}</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setSourceFilter('FAVORITES');
                setPage(1);
              }}
              className={`py-1.5 px-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer col-span-2 ${
                sourceFilter === 'FAVORITES'
                  ? 'bg-white text-black border-white font-bold shadow-sm'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1">
                <Star className={`w-2.5 h-2.5 ${sourceFilter === 'FAVORITES' ? 'fill-black text-black' : 'text-blue-400 fill-blue-400'}`} />
                Starred / Favorites
              </span>
              <span className="opacity-75 font-mono">{sourceCounts.favs}</span>
            </motion.button>
          </div>
        </div>

        {/* SECTION 2: FILTER BY STATE */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold mb-1.5 tracking-wider uppercase">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-blue-400" />
              Filter by State
            </span>
            {selectedState && (
              <button
                onClick={() => setSelectedState('')}
                className="text-[9px] text-blue-400 hover:underline cursor-pointer"
              >
                Clear State ({selectedState})
              </button>
            )}
          </div>

          {/* Quick State Pills */}
          <div className="flex flex-wrap gap-1 mb-1.5">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setSelectedState('')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                !selectedState
                  ? 'bg-white text-black border-white shadow-sm'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              All States
            </motion.button>
            {POPULAR_QUICK_STATES.map((code) => {
              const count = stateCounts[code] || 0;
              const isSelected = selectedState.toUpperCase() === code;
              return (
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  key={code}
                  onClick={() => setSelectedState(isSelected ? '' : code)}
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-0.5 ${
                    isSelected
                      ? 'bg-white text-black border-white shadow-sm'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                  title={`${US_STATES[code] || code} (${count.toLocaleString()} cameras)`}
                >
                  <span>{code}</span>
                  {isSelected && <span className="w-1 h-1 rounded-full bg-blue-500 ml-0.5" />}
                </motion.button>
              );
            })}
          </div>

          {/* Full State Dropdown with Counts */}
          <div className="relative">
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-neutral-500 cursor-pointer font-medium"
            >
              <option value="" className="bg-black text-white">
                All US States & Territories ({cameras.length.toLocaleString()})
              </option>
              {availableStates.map((st) => (
                <option key={st.code} value={st.code} className="bg-black text-white">
                  {st.name} ({st.code}) — {st.count.toLocaleString()} feeds
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Header with Page controls */}
      <div className="px-3.5 py-2 bg-black border-b border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
        <div className="flex items-center gap-2 truncate">
          <span className="font-medium">
            MATCHING: <span className="text-white font-bold font-mono">{filteredCameras.length.toLocaleString()}</span>
          </span>
          {selectedState && (
            <span className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-blue-300 text-[10px] font-bold">
              {selectedState}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 text-[9px] text-blue-400 font-mono mr-1">
            <ArrowDownToLine className="w-2.5 h-2.5" /> DRAG TO WALL
          </span>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-neutral-900 disabled:opacity-30 cursor-pointer text-neutral-300"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </motion.button>
          <span className="text-[10px] text-neutral-400 font-mono">
            {currentPage}/{totalPages}
          </span>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1 rounded hover:bg-neutral-900 disabled:opacity-30 cursor-pointer text-neutral-300"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>

      {/* Scrollable Camera List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-900 p-1.5 space-y-0.5">
        {paginatedList.length === 0 ? (
          <div className="py-12 px-4 text-center text-neutral-500 text-xs">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-30 text-white" />
            <p className="text-neutral-200 font-bold mb-1">No camera feeds found</p>
            <p className="text-[11px] text-neutral-500 mb-3">
              No feeds match the selected state ({selectedState || 'Any'}) and source ({sourceFilter}).
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={resetAllFilters}
              className="px-3.5 py-1.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-neutral-200 cursor-pointer"
            >
              Reset Filters
            </motion.button>
          </div>
        ) : (
          paginatedList.map((cam) => {
            const isSelected = selectedCamera?.id === cam.id;
            const isFav = favoriteIds.has(cam.id);

            return (
              <motion.div
                whileHover={{ x: 2 }}
                key={cam.id}
                draggable={true}
                onDragStart={(e: any) => {
                  if (e.dataTransfer) {
                    e.dataTransfer.setData('application/camera-json', JSON.stringify(cam));
                    e.dataTransfer.setData('text/plain', cam.id);
                    e.dataTransfer.effectAllowed = 'copyMove';
                  }
                }}
                onClick={() => onSelectCamera(cam)}
                className={`p-2.5 rounded-lg cursor-pointer transition-all flex flex-col gap-1 group relative select-none ${
                  isSelected
                    ? 'bg-neutral-900 border border-neutral-700 shadow-sm'
                    : 'hover:bg-neutral-950 border border-transparent hover:border-neutral-800'
                }`}
                title="Click to focus or drag onto wall slots"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <div
                        className="cursor-grab active:cursor-grabbing p-0.5 rounded text-neutral-600 group-hover:text-neutral-400 hover:text-white transition-colors"
                        title="Drag feed to wall slots"
                      >
                        <GripVertical className="w-3 h-3" />
                      </div>
                      {cam.source === 'RADAR_OMEGA' || cam.source === 'HazCams' ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/80 text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Radio className="w-2.5 h-2.5 text-emerald-400" />
                          Tower Camera
                        </span>
                      ) : cam.source === 'WEATHER_WISE' ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-600/80 text-blue-300 font-bold uppercase tracking-wider flex items-center gap-1">
                          <CloudLightning className="w-2.5 h-2.5 text-blue-400" />
                          Storm Chaser
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-600/80 text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Car className="w-2.5 h-2.5 text-amber-400" />
                          Traffic Camera
                        </span>
                      )}
                      {cam.stateCode && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-white font-bold">
                          {cam.stateCode}
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[9px] text-white font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_#3b82f6] inline-block" />
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs font-semibold truncate ${
                        isSelected ? 'text-white' : 'text-neutral-200 group-hover:text-white'
                      }`}
                      title={cam.name}
                    >
                      {cam.cleanName}
                    </p>
                    {(() => {
                      const cityPart = cam.location ? cam.location.split(',')[0].trim().toLowerCase() : '';
                      const cleanLower = cam.cleanName ? cam.cleanName.toLowerCase().trim() : '';
                      const isCityOnlyName = !cam.location || cam.location === 'United States' || cleanLower === cityPart || cleanLower === (cam.location ? cam.location.toLowerCase() : '');
                      
                      const sourceText = cam.source === 'RADAR_OMEGA'
                        ? 'Source: RadarOmega'
                        : cam.source === 'HazCams'
                        ? 'Source: HazCams'
                        : cam.source === 'WEATHER_WISE'
                        ? 'Source: WeatherWise'
                        : cam.streamUrl.includes('weatherfront') || cam.streamUrl.includes('maxvelocity')
                        ? 'Source: WeatherFront'
                        : 'Source: Traffic DOT';

                      return (
                        <div className="flex items-center text-[10px] text-neutral-400 truncate gap-1.5 mt-1">
                          {!isCityOnlyName && cam.location && (
                            <>
                              <span className="truncate">{cam.location}</span>
                              <span className="text-neutral-600 shrink-0">•</span>
                            </>
                          )}
                          <span className="text-neutral-500 font-mono text-[9px] shrink-0 translate-y-[1.5px]">
                            {sourceText}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(cam.id);
                      }}
                      className={`p-1.5 rounded hover:bg-neutral-800 transition-colors cursor-pointer ${
                        isFav ? 'text-blue-400' : 'text-neutral-600 hover:text-neutral-300'
                      }`}
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-blue-400 text-blue-400' : ''}`} />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToGrid(cam);
                      }}
                      className="p-1.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer border border-neutral-800"
                      title="Add to Multi-View Wall"
                    >
                      <Plus className="w-3 h-3" />
                    </motion.button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-0.5 font-mono">
                  <span>
                    {cam.coordinates[1].toFixed(2)}°, {cam.coordinates[0].toFixed(2)}°
                  </span>
                  <span className="text-neutral-400">
                    LIVE
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      <div className="p-2.5 border-t border-neutral-800 bg-[#050505] flex items-center justify-between text-xs text-neutral-400">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          className="px-2.5 py-1 rounded-md bg-neutral-900 text-neutral-300 hover:text-white disabled:opacity-30 cursor-pointer text-[11px] border border-neutral-800 font-medium"
        >
          Prev
        </motion.button>
        <span className="text-[11px] text-white font-mono">
          Page {currentPage} of {totalPages}
        </span>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages}
          className="px-2.5 py-1 rounded-md bg-neutral-900 text-neutral-300 hover:text-white disabled:opacity-30 cursor-pointer text-[11px] border border-neutral-800 font-medium"
        >
          Next
        </motion.button>
      </div>
    </aside>
  );
};
