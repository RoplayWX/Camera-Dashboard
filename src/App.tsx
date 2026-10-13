import React, { useState, useEffect, useCallback } from 'react';
import { CameraData, ViewMode, CapturedSnapshot } from './types/camera';
import {
  fetchCameras,
  CURATED_FEATURED_CAMERAS,
  getFavoriteIds,
  toggleFavorite,
} from './services/cameraService';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FocusView } from './components/FocusView';
import { MultiViewMatrix } from './components/MultiViewMatrix';
import { CameraMap } from './components/CameraMap';
import { SnapshotGalleryModal } from './components/SnapshotGalleryModal';
import { SystemLoadingScreen } from './components/SystemLoadingScreen';
import { motion, AnimatePresence } from 'motion/react';
import { Radio } from 'lucide-react';

export default function App() {
  const [cameras, setCameras] = useState<CameraData[]>(CURATED_FEATURED_CAMERAS);
  const [selectedCamera, setSelectedCamera] = useState<CameraData>(() => {
    const randomIndex = Math.floor(Math.random() * CURATED_FEATURED_CAMERAS.length);
    return CURATED_FEATURED_CAMERAS[randomIndex] || CURATED_FEATURED_CAMERAS[0];
  });
  const [gridCameras, setGridCameras] = useState<(CameraData | null)[]>(CURATED_FEATURED_CAMERAS.slice(0, 9));
  const [viewMode, setViewMode] = useState<ViewMode>('focus');

  // Loading state
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [showLoadingScreen, setShowLoadingScreen] = useState<boolean>(true);

  // Auto-patrol
  const [autoPatrol, setAutoPatrol] = useState<boolean>(false);
  const [patrolCountdown, setPatrolCountdown] = useState<number>(15);

  // Favorites & Snapshots
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => getFavoriteIds());
  const [snapshots, setSnapshots] = useState<CapturedSnapshot[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);

  // Responsive UI & State Filter
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [selectedState, setSelectedState] = useState<string>('');
  const [promotedCameraId, setPromotedCameraId] = useState<string | null>(null);

  // Fetch full camera dataset on mount and randomize landing camera
  useEffect(() => {
    let isMounted = true;
    fetchCameras((count) => {
      if (isMounted) setLoadedCount(count);
    })
      .then((data) => {
        if (!isMounted) return;
        setCameras(data);
        setIsInitializing(false);

        if (data.length > 0) {
          // Randomize landing camera on launch across all loaded camera streams
          const randomIndex = Math.floor(Math.random() * data.length);
          setSelectedCamera(data[randomIndex]);

          const initialGrid = [
            ...data.filter((c) => c.source === 'WEATHER_WISE'),
            ...data.filter((c) => c.source === 'RADAR_OMEGA' || c.source === 'HAZCAMS').slice(0, 4),
            ...data.filter((c) => c.source === 'DATABASE').slice(0, 4),
          ].slice(0, 9);
          setGridCameras(initialGrid);
        }
      })
      .catch((err) => {
        console.error('Initial cameras fetch error', err);
        setIsInitializing(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-Patrol interval
  useEffect(() => {
    if (!autoPatrol || cameras.length === 0) return;

    const timer = setInterval(() => {
      setPatrolCountdown((prev) => {
        if (prev <= 1) {
          setSelectedCamera((curr) => {
            const currIdx = cameras.findIndex((c) => c.id === curr.id);
            const nextIdx = (currIdx + 1) % cameras.length;
            return cameras[nextIdx];
          });
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoPatrol, cameras]);

  // Camera navigation
  const handleNextCamera = useCallback(() => {
    if (cameras.length === 0) return;
    const currIdx = cameras.findIndex((c) => c.id === selectedCamera.id);
    const nextIdx = (currIdx + 1) % cameras.length;
    setSelectedCamera(cameras[nextIdx]);
  }, [cameras, selectedCamera]);

  const handlePrevCamera = useCallback(() => {
    if (cameras.length === 0) return;
    const currIdx = cameras.findIndex((c) => c.id === selectedCamera.id);
    const prevIdx = currIdx <= 0 ? cameras.length - 1 : currIdx - 1;
    setSelectedCamera(cameras[prevIdx]);
  }, [cameras, selectedCamera]);

  const handleRandomFeed = useCallback(() => {
    if (cameras.length === 0) return;
    const randomIndex = Math.floor(Math.random() * cameras.length);
    setSelectedCamera(cameras[randomIndex]);
  }, [cameras]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextCamera();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevCamera();
      } else if (e.key === '1') {
        setViewMode('focus');
      } else if (e.key === '2') {
        setViewMode('grid-2x2');
      } else if (e.key === '3') {
        setViewMode('grid-3x3');
      } else if (e.key === '4') {
        setViewMode('map');
      } else if (e.key.toLowerCase() === 'p') {
        setAutoPatrol((v) => !v);
      } else if (e.key.toLowerCase() === 'r') {
        handleRandomFeed();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextCamera, handlePrevCamera, handleRandomFeed]);

  const handleToggleFav = useCallback((id: string) => {
    toggleFavorite(id);
    setFavoriteIds(new Set(getFavoriteIds()));
  }, []);

  const handleAddToGrid = useCallback((cam: CameraData) => {
    setGridCameras((prev) => {
      const exists = prev.find((c) => c?.id === cam.id);
      if (exists) return prev;
      // If there's an empty slot, fill the first empty slot
      const emptyIdx = prev.findIndex((c) => c === null);
      if (emptyIdx !== -1) {
        const updated = [...prev];
        updated[emptyIdx] = cam;
        return updated;
      }
      return [cam, ...prev.slice(0, 8)];
    });
    setViewMode('grid-2x2');
  }, []);

  const handleUpdateGridSlot = useCallback((index: number, cam: CameraData | null) => {
    setGridCameras((prev) => {
      const updated = [...prev];
      while (updated.length <= index) {
        updated.push(null);
      }
      updated[index] = cam;
      return updated;
    });
  }, []);

  const handleSnapshotCaptured = useCallback((snap: CapturedSnapshot) => {
    setSnapshots((prev) => [snap, ...prev]);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#000000] text-white antialiased font-sans">
      {/* Top Header */}
      <Header
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        cameraCount={cameras.length}
        autoPatrol={autoPatrol}
        onToggleAutoPatrol={() => {
          setAutoPatrol((v) => !v);
          setPatrolCountdown(15);
        }}
        patrolCountdown={patrolCountdown}
        snapshotCount={snapshots.length}
        onOpenSnapshots={() => setIsGalleryOpen(true)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
        onRandomizeCamera={handleRandomFeed}
      />

      {/* Main App Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <div
          className={`h-full transition-all duration-300 ease-in-out shrink-0 ${
            isSidebarOpen
              ? 'w-full sm:w-80 md:w-96 fixed sm:static inset-y-14 left-0 z-40'
              : 'w-16 hidden sm:block'
          }`}
        >
          <Sidebar
            cameras={cameras}
            selectedCamera={selectedCamera}
            selectedState={selectedState}
            onSelectState={setSelectedState}
            onSelectCamera={(cam) => {
              setSelectedCamera(cam);
              setViewMode('focus');
              if (window.innerWidth < 1024) {
                setIsSidebarOpen(false);
              }
            }}
            onAddToGrid={handleAddToGrid}
            onToggleFavorite={handleToggleFav}
            favoriteIds={favoriteIds}
            onRandomFeed={handleRandomFeed}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen((v) => !v)}
            promotedCameraId={promotedCameraId}
            onPromoteCamera={setPromotedCameraId}
            onGoBack={
              selectedState || promotedCameraId
                ? () => {
                    if (promotedCameraId) setPromotedCameraId(null);
                    if (selectedState) setSelectedState('');
                  }
                : undefined
            }
            className="w-full h-full"
          />
        </div>

        {/* Center Viewport with Animated Presence */}
        <main className="flex-1 h-full min-w-0 overflow-hidden relative flex flex-col bg-[#000000]">
          <AnimatePresence mode="wait">
            {viewMode === 'focus' && (
              <motion.div
                key="view-focus"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.18 }}
                className="w-full h-full"
              >
                <FocusView
                  camera={selectedCamera}
                  onNextCamera={handleNextCamera}
                  onPrevCamera={handlePrevCamera}
                  onAddToGrid={handleAddToGrid}
                  onToggleFavorite={handleToggleFav}
                  isFavorite={favoriteIds.has(selectedCamera.id)}
                  onSnapshot={handleSnapshotCaptured}
                  onJumpToMap={() => setViewMode('map')}
                  onSelectCamera={setSelectedCamera}
                />
              </motion.div>
            )}

            {(viewMode === 'grid-2x2' || viewMode === 'grid-3x3') && (
              <motion.div
                key={`view-${viewMode}`}
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.18 }}
                className="w-full h-full"
              >
                <MultiViewMatrix
                  layout={viewMode}
                  activeCameras={gridCameras}
                  allCameras={cameras}
                  onSelectFocus={(cam) => {
                    setSelectedCamera(cam);
                    setViewMode('focus');
                  }}
                  onUpdateSlot={handleUpdateGridSlot}
                  onSnapshot={handleSnapshotCaptured}
                />
              </motion.div>
            )}

            {viewMode === 'map' && (
              <motion.div
                key="view-map"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.18 }}
                className="w-full h-full"
              >
                <CameraMap
                  cameras={cameras}
                  selectedCamera={selectedCamera}
                  selectedState={selectedState}
                  onSelectCamera={(cam) => {
                    setPromotedCameraId(cam.id);
                    setSelectedCamera(cam);
                    setViewMode('focus');
                  }}
                  onAddToGrid={handleAddToGrid}
                  className="w-full h-full"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Syncing dataset banner with motion */}
          <AnimatePresence>
            {isInitializing && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="absolute bottom-3 right-3 z-30 px-3 py-1.5 rounded-lg bg-neutral-950/95 border border-neutral-800 shadow-2xl backdrop-blur-md flex items-center gap-2 text-[11px] text-neutral-300 font-medium"
              >
                <Radio className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                <span>Cataloging 42,000+ camera nodes ({loadedCount.toLocaleString()})...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Snapshot Gallery Modal */}
      <SnapshotGalleryModal
        snapshots={snapshots}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onClear={() => setSnapshots([])}
        onDeleteOne={(id) => setSnapshots((prev) => prev.filter((s) => s.id !== id))}
      />

      {/* High-Tech System Loading / Assets Initializing Screen */}
      {showLoadingScreen && (
        <SystemLoadingScreen
          loadedCount={loadedCount}
          isReady={!isInitializing}
          onComplete={() => setShowLoadingScreen(false)}
        />
      )}
    </div>
  );
}
