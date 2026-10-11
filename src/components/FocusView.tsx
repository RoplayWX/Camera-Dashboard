import React, { useState } from 'react';
import { CameraData, CapturedSnapshot, getSourceBadgeStyle } from '../types/camera';
import { HlsPlayer } from './HlsPlayer';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Info,
  Compass,
  ArrowDownToLine,
  Activity,
} from 'lucide-react';

interface FocusViewProps {
  camera: CameraData;
  onNextCamera: () => void;
  onPrevCamera: () => void;
  onAddToGrid: (camera: CameraData) => void;
  onToggleFavorite: (id: string) => void;
  isFavorite: boolean;
  onSnapshot?: (snapshot: CapturedSnapshot) => void;
  onJumpToMap: () => void;
  onSelectCamera?: (camera: CameraData) => void;
  onInaccessible?: (cameraId: string) => void;
}

export const FocusView: React.FC<FocusViewProps> = ({
  camera,
  onNextCamera,
  onPrevCamera,
  onAddToGrid,
  onToggleFavorite,
  isFavorite,
  onSnapshot,
  onJumpToMap,
  onSelectCamera,
  onInaccessible,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showMetadata, setShowMetadata] = useState<boolean>(false);
  const [ambientColor, setAmbientColor] = useState<string>('59, 130, 246');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const handleCopyUrl = () => {
    if (camera.streamUrl) {
      navigator.clipboard.writeText(camera.streamUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const camJson = e.dataTransfer.getData('application/camera-json');
    if (camJson && onSelectCamera) {
      try {
        const dropped = JSON.parse(camJson) as CameraData;
        onSelectCamera(dropped);
      } catch (err) {
        console.error('Failed to parse dropped camera', err);
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative w-full h-full flex flex-col p-2 md:p-3 gap-2 overflow-hidden bg-[#000000] cyber-grid-bg"
    >
      {/* Ambient Lighting Background Mesh Reflected from Stream */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700 -z-10"
        style={{
          background: `radial-gradient(circle at 50% 40%, rgba(${ambientColor}, 0.28) 0%, rgba(${ambientColor}, 0.1) 45%, rgba(${ambientColor}, 0.02) 75%, transparent 100%)`,
        }}
      />

      {/* Holographic Drop Overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="absolute inset-3 z-50 bg-blue-950/85 backdrop-blur-md border-2 border-dashed border-blue-400 rounded-xl flex flex-col items-center justify-center p-6 text-center animate-drop-pulse shadow-[0_0_40px_rgba(59,130,246,0.6)]"
          >
            <div className="w-14 h-14 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center mb-3 animate-bounce">
              <ArrowDownToLine className="w-7 h-7 text-blue-300" />
            </div>
            <h3 className="font-mono text-sm md:text-base font-bold text-white tracking-widest uppercase">
              ENGAGE FEED IN FOCUS VIEW
            </h3>
            <p className="text-[11px] text-blue-300 mt-1 font-mono">
              Release to switch active command feed
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Top Feed Header & Actions */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-neutral-950/90 border border-neutral-800 text-xs transition-all duration-500"
        style={{
          boxShadow: `0 4px 24px rgba(${ambientColor}, 0.12)`,
          borderColor: `rgba(${ambientColor}, 0.25)`,
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onPrevCamera}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-all cursor-pointer"
            title="Previous Camera"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onNextCamera}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-all cursor-pointer"
            title="Next Camera"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-sm md:text-base tracking-tight truncate max-w-sm md:max-w-md">
                {camera.cleanName}
              </span>
              {(() => {
                const badgeStyle = getSourceBadgeStyle(camera);
                return (
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 border ${badgeStyle.bg} ${badgeStyle.border} ${badgeStyle.text}`}>
                    {badgeStyle.label}
                  </span>
                );
              })()}
              <motion.button
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.8 }}
                onClick={() => onToggleFavorite(camera.id)}
                className={`p-1 rounded hover:bg-neutral-800 cursor-pointer transition-colors ${
                  isFavorite ? 'text-blue-400' : 'text-neutral-600 hover:text-neutral-300'
                }`}
                title={isFavorite ? 'Remove Favorite' : 'Save Favorite'}
              >
                <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-blue-400 text-blue-400' : ''}`} />
              </motion.button>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
              <span className="flex items-center gap-1 font-medium">
                <MapPin className="w-3 h-3 text-neutral-400" />
                {camera.location}
              </span>
              <span>•</span>
              <button
                onClick={onJumpToMap}
                className="text-neutral-300 hover:text-white hover:underline cursor-pointer flex items-center gap-1 font-mono text-[10px]"
              >
                <Compass className="w-3 h-3 text-blue-400" />
                <span>
                  {camera.coordinates[1].toFixed(4)}°, {camera.coordinates[0].toFixed(4)}°
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onAddToGrid(camera)}
            className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-bold shadow-sm"
            title="Pin this feed to multi-view wall"
          >
            <Plus className="w-3.5 h-3.5 text-black" />
            <span className="hidden sm:inline">Pin to Wall</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopyUrl}
            className="p-1.5 px-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer text-xs flex items-center gap-1 font-medium"
            title="Copy Raw HLS Stream URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copied ? 'Copied' : 'Stream URL'}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMetadata((v) => !v)}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              showMetadata
                ? 'bg-neutral-800 text-white border-neutral-600'
                : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400'
            }`}
            title="Carrier Diagnostics"
          >
            <Info className="w-4 h-4" />
          </motion.button>

          <motion.a
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href={camera.streamUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-all"
            title="Open Raw Stream in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </motion.a>
        </div>
      </div>

      {/* Main Player Display */}
      <div className="flex-1 min-h-0 relative flex flex-col p-1 sm:p-2.5">
        <HlsPlayer
          camera={camera}
          autoPlay={true}
          muted={false}
          onSnapshot={onSnapshot}
          onAmbientColorChange={setAmbientColor}
          onInaccessible={onInaccessible}
          className="w-full h-full flex-1"
        />

        {/* Collapsible Metadata Drawer with Spring Motion */}
        <AnimatePresence>
          {showMetadata && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 flex flex-wrap items-center justify-between gap-4 overflow-hidden shadow-lg"
            >
              <div className="flex items-center gap-5">
                <div>
                  <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-wider">Source Network</span>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        camera.source === 'RADAR_OMEGA'
                          ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]'
                          : camera.source === 'WEATHER_WISE'
                          ? 'bg-blue-400 shadow-[0_0_6px_#3b82f6]'
                          : 'bg-amber-400 shadow-[0_0_6px_#f59e0b]'
                      }`}
                    />
                    {camera.source === 'RADAR_OMEGA'
                      ? 'Radar Omega'
                      : camera.source === 'WEATHER_WISE'
                      ? 'Weather Wise'
                      : 'Traffic DOT'}{' '}
                    <span className="text-neutral-500 text-[10px] font-mono">({camera.source})</span>
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-wider">Model Type</span>
                  <span className="font-bold text-white uppercase">{camera.model}</span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-wider">GPS Coordinates</span>
                  <span className="font-bold text-white font-mono text-[11px]">
                    LAT {camera.coordinates[1].toFixed(5)}, LNG {camera.coordinates[0].toFixed(5)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider">HLS URL:</span>
                <span className="text-neutral-300 text-[11px] font-mono bg-black px-2 py-0.5 rounded border border-neutral-800 truncate max-w-xs">
                  {camera.streamUrl}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
