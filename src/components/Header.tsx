import React, { useState, useEffect } from 'react';
import { ViewMode } from '../types/camera';
import { motion } from 'motion/react';
import {
  Radio,
  Grid2X2,
  Grid3X3,
  Maximize,
  Map,
  Camera,
  Play,
  Pause,
  Menu,
  Clock,
} from 'lucide-react';

interface HeaderProps {
  viewMode: ViewMode;
  onSetViewMode: (mode: ViewMode) => void;
  cameraCount: number;
  autoPatrol: boolean;
  onToggleAutoPatrol: () => void;
  patrolCountdown: number;
  snapshotCount: number;
  onOpenSnapshots: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const VIEW_MODES: { id: ViewMode; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'focus', label: 'Focus', icon: Maximize },
  { id: 'grid-2x2', label: '2x2 Wall', icon: Grid2X2 },
  { id: 'grid-3x3', label: '3x3 Wall', icon: Grid3X3 },
  { id: 'map', label: 'Map', icon: Map },
];

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  onSetViewMode,
  cameraCount,
  autoPatrol,
  onToggleAutoPatrol,
  patrolCountdown,
  snapshotCount,
  onOpenSnapshots,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-[#000000] border-b border-neutral-800 px-3 md:px-4 flex items-center justify-between select-none z-30 shrink-0">
      {/* Brand & Status */}
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white lg:hidden cursor-pointer"
          title="Toggle Sidebar"
        >
          <Menu className="w-4 h-4" />
        </motion.button>

        <div className="flex items-center gap-2.5">
          <div className="relative w-7 h-7 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center overflow-hidden">
            <Radio className="w-3.5 h-3.5 text-white" />
            <div className="absolute inset-0 bg-neutral-800/40 animate-radar origin-center pointer-events-none" />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm md:text-base tracking-tight text-white uppercase">
              CAMERA <span className="text-blue-500">DASHBOARD</span>
            </span>
            <div className="text-[10px] text-neutral-400 hidden sm:flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_#3b82f6] animate-pulse" />
              <span className="text-neutral-400">
                {cameraCount > 0 ? `${cameraCount.toLocaleString()} Nodes` : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center Layout Mode Switcher with Liquid Animated Pill Indicator */}
      <div className="relative flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-850">
        {VIEW_MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = viewMode === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => onSetViewMode(mode.id)}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer z-10 ${
                isActive ? 'text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeViewTab"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{mode.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Auto Patrol Toggle with Animated Indicator */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onToggleAutoPatrol}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            autoPatrol
              ? 'bg-white text-black border-white shadow-[0_0_12px_rgba(255,255,255,0.2)]'
              : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
          }`}
          title={autoPatrol ? 'Disable Auto-Patrol' : 'Enable Auto-Patrol (15s rotation)'}
        >
          {autoPatrol ? (
            <Pause className="w-3 h-3 text-black animate-pulse" />
          ) : (
            <Play className="w-3 h-3 text-white" />
          )}
          <span className="hidden md:inline">Patrol</span>
          {autoPatrol && (
            <span className="text-[10px] text-blue-600 font-bold font-mono">
              ({patrolCountdown}s)
            </span>
          )}
        </motion.button>

        {/* Snapshot Archive Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenSnapshots}
          className="relative p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer"
          title="Open Snapshot Archive"
        >
          <Camera className="w-4 h-4" />
          {snapshotCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 px-1 rounded-full bg-blue-500 text-white font-bold text-[9px] min-w-[14px] text-center shadow-[0_0_8px_#3b82f6]"
            >
              {snapshotCount}
            </motion.span>
          )}
        </motion.button>

        {/* UTC Clock */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-300 font-mono">
          <Clock className="w-3 h-3 text-neutral-400" />
          <span>{utcTime || 'UTC 00:00:00'}</span>
        </div>
      </div>
    </header>
  );
};
