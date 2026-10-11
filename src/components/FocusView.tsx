import React, { useState } from 'react';
import { CameraData, CapturedSnapshot } from '../types/camera';
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
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showMetadata, setShowMetadata] = useState<boolean>(false);

  const handleCopyUrl = () => {
    if (camera.streamUrl) {
      navigator.clipboard.writeText(camera.streamUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-2 md:p-3 gap-2 overflow-hidden bg-[#000000]">
      {/* Top Feed Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
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
              <span
                className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 border ${
                  camera.source === 'RADAR_OMEGA'
                    ? 'bg-blue-950/80 border-blue-800 text-blue-300'
                    : camera.source === 'WEATHER_WISE'
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                }`}
              >
                {camera.source === 'RADAR_OMEGA'
                  ? 'Radar Omega'
                  : camera.source === 'WEATHER_WISE'
                  ? 'Weather Wise'
                  : 'Traffic DOT'}
              </span>
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
      <div className="flex-1 min-h-0 relative rounded-xl overflow-hidden flex flex-col">
        <HlsPlayer
          camera={camera}
          autoPlay={true}
          muted={false}
          onSnapshot={onSnapshot}
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
              className="p-3 bg-neutral-950 border-t border-neutral-800 text-xs text-neutral-300 flex flex-wrap items-center justify-between gap-4 overflow-hidden"
            >
              <div className="flex items-center gap-5">
                <div>
                  <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-wider">Source Network</span>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
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
