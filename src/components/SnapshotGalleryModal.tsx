import React, { useState } from 'react';
import { CapturedSnapshot, getSourceDisplayName } from '../types/camera';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Trash2, Camera, Calendar, MapPin, ZoomIn } from 'lucide-react';

interface SnapshotGalleryModalProps {
  snapshots: CapturedSnapshot[];
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
  onDeleteOne: (id: string) => void;
}

export const SnapshotGalleryModal: React.FC<SnapshotGalleryModalProps> = ({
  snapshots,
  isOpen,
  onClose,
  onClear,
  onDeleteOne,
}) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<CapturedSnapshot | null>(null);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-[#080808] border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-black">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800">
                  <Camera className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-white font-bold text-sm tracking-tight uppercase">
                  Snapshot Archive ({snapshots.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {snapshots.length > 0 && (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={onClear}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear All
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Gallery Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {snapshots.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center text-neutral-500">
                  <Camera className="w-10 h-10 mb-2 opacity-30 text-white" />
                  <p className="text-sm text-neutral-200 font-semibold">No snapshots recorded yet.</p>
                  <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                    Click the 'SNAP' button on any camera feed to record high-resolution frame captures with modern metadata watermark.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {snapshots.map((snap) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={snap.id}
                      className="bg-black border border-neutral-800 rounded-xl overflow-hidden flex flex-col group hover:border-neutral-700 transition-all shadow-md"
                    >
                      <div
                        onClick={() => setSelectedSnapshot(snap)}
                        className="relative aspect-video bg-black overflow-hidden cursor-pointer"
                      >
                        <img
                          src={snap.dataUrl}
                          alt={snap.cameraName}
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <span className="px-2.5 py-1 rounded-md bg-black/80 text-white text-[11px] font-semibold flex items-center gap-1.5 border border-white/20">
                            <ZoomIn className="w-3.5 h-3.5 text-blue-400" /> Preview
                          </span>
                        </div>
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <a
                            href={snap.dataUrl}
                            download={`camera_capture_${snap.id}.png`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg bg-black/90 text-white hover:bg-white hover:text-black border border-neutral-700 transition-all"
                            title="Download PNG"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteOne(snap.id);
                            }}
                            className="p-1.5 rounded-lg bg-black/90 text-neutral-400 hover:text-white border border-neutral-700 transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3 text-xs flex flex-col gap-1.5 flex-1 justify-between bg-neutral-950">
                        <div>
                          <div className="text-white font-bold truncate mb-0.5">{snap.cameraName}</div>
                          <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                            <MapPin className="w-2.5 h-2.5 text-blue-400" />
                            <span>[{snap.coordinates[1].toFixed(3)}, {snap.coordinates[0].toFixed(3)}]</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-neutral-900 text-[10px] text-neutral-500">
                          <div className="flex items-center gap-1 font-mono">
                            <Calendar className="w-2.5 h-2.5 text-neutral-400" />
                            <span>{new Date(snap.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded border font-bold uppercase text-[9px] ${
                              snap.source === 'RADAR_OMEGA'
                                ? 'bg-blue-950/80 border-blue-800 text-blue-300'
                                : snap.source === 'WEATHER_WISE'
                                ? 'bg-neutral-900 border-neutral-700 text-white'
                                : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                            }`}
                          >
                            {getSourceDisplayName(snap.source)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Lightbox Modal for Enlarge Preview */}
            <AnimatePresence>
              {selectedSnapshot && (
                <div
                  className="fixed inset-0 z-60 bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center p-4"
                  onClick={() => setSelectedSnapshot(null)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    onClick={(e) => e.stopPropagation()}
                    className="max-w-5xl w-full flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between text-white px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{selectedSnapshot.cameraName}</span>
                        <span className="text-xs text-neutral-400 font-mono">
                          {new Date(selectedSnapshot.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={selectedSnapshot.dataUrl}
                          download={`camera_capture_${selectedSnapshot.id}.png`}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Image
                        </a>
                        <button
                          onClick={() => setSelectedSnapshot(null)}
                          className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="relative rounded-xl overflow-hidden border border-neutral-800 bg-black shadow-2xl">
                      <img
                        src={selectedSnapshot.dataUrl}
                        alt={selectedSnapshot.cameraName}
                        className="w-full max-h-[75vh] object-contain"
                      />
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
