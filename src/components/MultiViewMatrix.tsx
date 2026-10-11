import React, { useState } from 'react';
import { CameraData, CapturedSnapshot, getSourceDisplayName, getSourceBadgeStyle } from '../types/camera';
import { HlsPlayer } from './HlsPlayer';
import { motion, AnimatePresence } from 'motion/react';
import {
  Maximize2,
  Shuffle,
  Volume2,
  VolumeX,
  X,
  Plus,
  Search,
  ArrowDownToLine,
  GripVertical,
  Check,
  Radio,
} from 'lucide-react';

interface MultiViewMatrixProps {
  layout: 'grid-2x2' | 'grid-3x3';
  activeCameras: CameraData[];
  allCameras: CameraData[];
  onSelectFocus: (camera: CameraData) => void;
  onUpdateSlot: (index: number, camera: CameraData) => void;
  onSnapshot?: (snapshot: CapturedSnapshot) => void;
  onInaccessible?: (cameraId: string) => void;
}

export const MultiViewMatrix: React.FC<MultiViewMatrixProps> = ({
  layout,
  activeCameras,
  allCameras,
  onSelectFocus,
  onUpdateSlot,
  onSnapshot,
  onInaccessible,
}) => {
  const slotCount = layout === 'grid-2x2' ? 4 : 9;
  const [activeAudioSlot, setActiveAudioSlot] = useState<number | null>(null);
  const [replacingSlotIndex, setReplacingSlotIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Drag and Drop States
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(null);
  const [dropSuccessIndex, setDropSuccessIndex] = useState<number | null>(null);
  const [draggedSlotSource, setDraggedSlotSource] = useState<number | null>(null);

  const slots: (CameraData | null)[] = Array.from({ length: slotCount }).map((_, i) => {
    return activeCameras[i] || (allCameras[i] ?? null);
  });

  const handleRandomizeSlot = (slotIdx: number) => {
    if (allCameras.length === 0) return;
    const randomCam = allCameras[Math.floor(Math.random() * allCameras.length)];
    onUpdateSlot(slotIdx, randomCam);
  };

  const handleRandomizeAll = () => {
    if (allCameras.length === 0) return;
    for (let i = 0; i < slotCount; i++) {
      const randomCam = allCameras[Math.floor(Math.random() * allCameras.length)];
      onUpdateSlot(i, randomCam);
    }
  };

  const handleSlotDragOver = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverSlotIndex !== idx) {
      setDragOverSlotIndex(idx);
    }
  };

  const handleSlotDragLeave = (idx: number, e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverSlotIndex((curr) => (curr === idx ? null : curr));
    }
  };

  const handleSlotDrop = (targetIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSlotIndex(null);
    setDraggedSlotSource(null);

    const slotIndexStr = e.dataTransfer.getData('application/slot-index');
    const camJson = e.dataTransfer.getData('application/camera-json');

    if (slotIndexStr) {
      // Reordering between slots within the wall
      const srcIdx = parseInt(slotIndexStr, 10);
      if (!isNaN(srcIdx) && srcIdx !== targetIdx) {
        const srcCam = slots[srcIdx];
        const targetCam = slots[targetIdx];
        if (srcCam) {
          onUpdateSlot(targetIdx, srcCam);
          if (targetCam) {
            onUpdateSlot(srcIdx, targetCam);
          }
          setDropSuccessIndex(targetIdx);
          setTimeout(() => setDropSuccessIndex(null), 1400);
        }
      }
    } else if (camJson) {
      // Dragged from sidebar camera list
      try {
        const droppedCam = JSON.parse(camJson) as CameraData;
        onUpdateSlot(targetIdx, droppedCam);
        setDropSuccessIndex(targetIdx);
        setTimeout(() => setDropSuccessIndex(null), 1400);
      } catch (err) {
        console.error('Failed to parse dropped camera payload', err);
      }
    }
  };

  const filteredForReplace = searchQuery.trim()
    ? allCameras
        .filter(
          (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.location.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 15)
    : allCameras.slice(0, 15);

  return (
    <div className="relative w-full h-full flex flex-col gap-2 p-2 bg-[#000000]">
      {/* Matrix Controls Top Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-neutral-950/95 border border-neutral-800 text-xs text-neutral-300">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] animate-pulse" />
            SURVEILLANCE WALL ({layout === 'grid-2x2' ? '4 FEEDS' : '9 FEEDS'})
          </span>
          <span className="hidden sm:inline text-neutral-700">•</span>
          <span className="hidden sm:inline text-neutral-400 text-[11px] font-mono">
            {activeAudioSlot !== null ? `SOLO AUDIO: CH 0${activeAudioSlot + 1}` : 'ALL AUDIO MUTED'}
          </span>
          <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-blue-300 font-mono bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-900/60">
            <ArrowDownToLine className="w-3 h-3 text-blue-400" />
            <span>DRAG & DROP TO ASSIGN / REARRANGE</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleRandomizeAll}
            className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
            title="Randomize all feeds in matrix"
          >
            <Shuffle className="w-3.5 h-3.5 text-blue-400" />
            <span>Randomize Wall</span>
          </motion.button>
        </div>
      </div>

      {/* Grid container */}
      <div
        className={`flex-1 grid gap-2 min-h-0 ${
          layout === 'grid-2x2' ? 'grid-cols-1 sm:grid-cols-2 grid-rows-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 grid-rows-3'
        }`}
      >
        {slots.map((camera, idx) => {
          const isDragOver = dragOverSlotIndex === idx;
          const isDropSuccess = dropSuccessIndex === idx;

          if (!camera) {
            return (
              <motion.div
                whileHover={{ scale: 1.01 }}
                key={`empty-slot-${idx}`}
                onDragOver={(e) => handleSlotDragOver(idx, e)}
                onDragLeave={(e) => handleSlotDragLeave(idx, e)}
                onDrop={(e) => handleSlotDrop(idx, e)}
                className={`relative rounded-xl border border-dashed flex flex-col items-center justify-center p-4 text-center group cursor-pointer transition-all overflow-hidden ${
                  isDragOver
                    ? 'border-blue-400 bg-blue-950/70 shadow-[0_0_25px_rgba(59,130,246,0.5)] animate-drop-pulse'
                    : 'border-neutral-800 bg-neutral-950 hover:border-neutral-600'
                }`}
                onClick={() => setReplacingSlotIndex(idx)}
              >
                {/* Holographic Drag Target Overlay */}
                <AnimatePresence>
                  {isDragOver && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute inset-0 z-50 bg-blue-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-center pointer-events-none"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center mb-1.5 animate-bounce">
                        <ArrowDownToLine className="w-5 h-5 text-blue-300" />
                      </div>
                      <span className="font-mono text-xs font-bold text-white tracking-wider uppercase">
                        ASSIGN CH 0{idx + 1}
                      </span>
                      <span className="text-[10px] text-blue-300 font-mono mt-0.5">
                        RELEASE TO LOCK FEED
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Plus className="w-7 h-7 text-neutral-600 group-hover:text-white transition-colors mb-1.5" />
                <span className="text-xs text-neutral-400 group-hover:text-white font-mono font-medium">
                  ASSIGN CH 0{idx + 1}
                </span>
                <span className="text-[10px] text-neutral-600 mt-1">
                  Click or drag camera here
                </span>
              </motion.div>
            );
          }

          const isAudioActive = activeAudioSlot === idx;
          const isBeingDragged = draggedSlotSource === idx;

          return (
            <motion.div
              layout
              key={`slot-${idx}-${camera.id}`}
              draggable={true}
              onDragStart={(e: any) => {
                if (e.dataTransfer) {
                  e.dataTransfer.setData('application/slot-index', String(idx));
                  e.dataTransfer.setData('application/camera-json', JSON.stringify(camera));
                  e.dataTransfer.effectAllowed = 'copyMove';
                }
                setDraggedSlotSource(idx);
              }}
              onDragEnd={() => setDraggedSlotSource(null)}
              onDragOver={(e) => handleSlotDragOver(idx, e)}
              onDragLeave={(e) => handleSlotDragLeave(idx, e)}
              onDrop={(e) => handleSlotDrop(idx, e)}
              className={`relative rounded-xl overflow-hidden border bg-black group/cell flex flex-col min-h-[170px] shadow-lg transition-all ${
                isDragOver
                  ? 'border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.6)]'
                  : 'border-neutral-800 hover:border-neutral-600'
              } ${isBeingDragged ? 'opacity-40 scale-95' : ''}`}
            >
              {/* Holographic Drag Target Overlay */}
              <AnimatePresence>
                {isDragOver && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 z-50 bg-blue-950/85 backdrop-blur-sm border-2 border-dashed border-blue-400 rounded-xl flex flex-col items-center justify-center p-3 text-center pointer-events-none animate-drop-pulse"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center mb-1.5 animate-bounce">
                      <ArrowDownToLine className="w-5 h-5 text-blue-300" />
                    </div>
                    <span className="font-mono text-xs font-bold text-white tracking-wider uppercase">
                      SWAP / ASSIGN CH {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                    </span>
                    <span className="text-[10px] text-blue-300 font-mono mt-0.5">
                      RELEASE CURSOR TO LOCK
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Drop Confirmation Flash */}
              <AnimatePresence>
                {isDropSuccess && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 1.4 }}
                    className="absolute inset-0 z-40 bg-blue-500/30 border-2 border-blue-400 rounded-xl pointer-events-none flex items-center justify-center"
                  >
                    <span className="px-3 py-1 rounded bg-black/90 border border-blue-400 text-blue-300 font-mono text-xs font-bold shadow-2xl flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-blue-400" />
                      CH {idx + 1 < 10 ? `0${idx + 1}` : idx + 1} LOCKED
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Header inside cell */}
              <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-2 bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-auto">
                <div className="flex items-center gap-1.5 min-w-0 pr-2">
                  <div
                    className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                    title="Drag to rearrange slot"
                  >
                    <GripVertical className="w-3 h-3" />
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md bg-black/90 border border-neutral-800 text-white font-mono text-[9px] font-bold flex items-center gap-1 shrink-0">
                    <span className="w-1 h-1 rounded-full bg-blue-500 inline-block" />
                    CH {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                  </span>
                  {(() => {
                    const badgeStyle = getSourceBadgeStyle(camera);
                    return (
                      <span className={`px-1.5 py-0.5 rounded-md border font-bold text-[9px] uppercase tracking-wide shrink-0 ${badgeStyle.bg} ${badgeStyle.border} ${badgeStyle.text}`}>
                        {badgeStyle.label}
                      </span>
                    );
                  })()}
                  <span className="text-xs text-white truncate drop-shadow font-semibold">
                    {camera.cleanName}
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover/cell:opacity-100 transition-opacity shrink-0">
                  {/* Remove Camera */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateSlot(idx, null);
                    }}
                    className="p-1 rounded-md bg-black/90 border border-neutral-800 text-neutral-400 hover:text-red-500 hover:border-red-900 transition-all cursor-pointer"
                    title="Remove Camera"
                  >
                    <X className="w-3 h-3" />
                  </motion.button>
                  {/* Solo Audio */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveAudioSlot(isAudioActive ? null : idx);
                    }}
                    className={`p-1 rounded-md bg-black/90 border transition-all cursor-pointer ${
                      isAudioActive
                        ? 'border-white text-white shadow-sm'
                        : 'border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                    title={isAudioActive ? 'Mute Channel' : 'Solo Audio'}
                  >
                    {isAudioActive ? <Volume2 className="w-3 h-3 text-blue-400" /> : <VolumeX className="w-3 h-3" />}
                  </motion.button>

                  {/* Shuffle Feed */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRandomizeSlot(idx);
                    }}
                    className="p-1 rounded-md bg-black/90 border border-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer"
                    title="Change Camera Feed"
                  >
                    <Shuffle className="w-3 h-3" />
                  </motion.button>

                  {/* Select slot from list */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplacingSlotIndex(idx);
                    }}
                    className="p-1 rounded-md bg-black/90 border border-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer"
                    title="Choose from All Cameras"
                  >
                    <Search className="w-3 h-3" />
                  </motion.button>

                  {/* Expand to Main Focus Mode */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onSelectFocus(camera)}
                    className="p-1 rounded-md bg-white text-black hover:bg-neutral-200 transition-all cursor-pointer"
                    title="Focus Fullscreen Single View"
                  >
                    <Maximize2 className="w-3 h-3 text-black" />
                  </motion.button>
                </div>
              </div>

              {/* Player - Pass showTopHud={false} to prevent overlapping HUD elements */}
              <div className="w-full h-full flex-1">
                <HlsPlayer
                  camera={camera}
                  autoPlay={true}
                  muted={!isAudioActive}
                  onSnapshot={onSnapshot}
                  onInaccessible={onInaccessible}
                  compact={true}
                  showTopHud={false}
                  showControls={false}
                  className="w-full h-full rounded-none border-0"
                />
              </div>

              {/* Bottom strip */}
              <div className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-between px-2.5 py-1 bg-gradient-to-t from-black via-black/80 to-transparent text-[10px] text-neutral-400">
                <span className="truncate max-w-[180px]">{camera.location}</span>
                <span
                  className={`uppercase font-bold text-[9px] tracking-wider px-1.5 py-0.5 rounded border ${
                    camera.source === 'RADAR_OMEGA'
                      ? 'bg-emerald-950/80 border-emerald-600/80 text-emerald-300'
                      : camera.source === 'WEATHER_WISE'
                      ? 'bg-blue-950/80 border-blue-600/80 text-blue-300'
                      : 'bg-amber-950/80 border-amber-600/80 text-amber-300'
                  }`}
                >
                  {getSourceDisplayName(camera.source)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Camera Selection Modal with Spring Animation */}
      <AnimatePresence>
        {replacingSlotIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-[#080808] border border-neutral-800 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-3.5 border-b border-neutral-800">
                <span className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                  <Search className="w-3.5 h-3.5 text-blue-400" />
                  Assign Channel #{replacingSlotIndex + 1}
                </span>
                <button
                  onClick={() => setReplacingSlotIndex(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 border-b border-neutral-800">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search 42,000+ camera locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-black border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-1 divide-y divide-neutral-900">
                {filteredForReplace.map((cam) => (
                  <div
                    key={cam.id}
                    onClick={() => {
                      onUpdateSlot(replacingSlotIndex, cam);
                      setReplacingSlotIndex(null);
                    }}
                    className="pt-2 pb-1.5 px-3 rounded-lg hover:bg-neutral-900 cursor-pointer flex items-center justify-between text-xs group"
                  >
                    <div className="flex flex-col gap-0.5 truncate pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-white group-hover:text-blue-300 font-semibold truncate">
                          {cam.cleanName}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase shrink-0 ${
                            cam.source === 'RADAR_OMEGA'
                              ? 'bg-emerald-950/80 border-emerald-600/80 text-emerald-300'
                              : cam.source === 'WEATHER_WISE'
                              ? 'bg-blue-950/80 border-blue-600/80 text-blue-300'
                              : 'bg-amber-950/80 border-amber-600/80 text-amber-300'
                          }`}
                        >
                          {getSourceDisplayName(cam.source)}
                        </span>
                      </div>
                      <span className="text-neutral-500 text-[10px] truncate">{cam.location}</span>
                    </div>
                    <button className="px-2.5 py-1 rounded-md bg-white text-black hover:bg-neutral-200 font-bold text-[10px] shrink-0 transition-colors">
                      SELECT
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
