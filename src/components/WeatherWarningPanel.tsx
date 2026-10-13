import React from 'react';
import { motion } from 'motion/react';
import {
  X,
  AlertTriangle,
  Clock,
  MapPin,
  Building,
  Video,
  Plus,
  Radio,
  Car,
  CloudLightning,
} from 'lucide-react';
import { WeatherWarning, NearbyCameraMatch } from '../types/weatherWarning';
import { CameraData, isChaser } from '../types/camera';
import { WARNING_STYLES } from '../services/weatherWarningService';

interface WeatherWarningPanelProps {
  warning: WeatherWarning;
  nearbyCameras: NearbyCameraMatch[];
  onClose: () => void;
  onSelectCamera: (cam: CameraData) => void;
  onAddToGrid?: (cam: CameraData) => void;
}

export const WeatherWarningPanel: React.FC<WeatherWarningPanelProps> = ({
  warning,
  nearbyCameras,
  onClose,
  onSelectCamera,
  onAddToGrid,
}) => {
  const style = WARNING_STYLES[warning.category] || WARNING_STYLES.SEVERE_THUNDERSTORM_WARNING;

  // Format expiration time
  const formattedExpiry = (() => {
    if (!warning.expires) return null;
    try {
      const exp = new Date(warning.expires);
      const now = new Date();
      const diffMs = exp.getTime() - now.getTime();
      const diffMins = Math.max(0, Math.round(diffMs / (1000 * 60)));

      const timeStr = exp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (diffMins <= 0) return `Expired at ${timeStr}`;
      if (diffMins < 60) return `Expires in ${diffMins}m (${timeStr})`;
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `Expires in ${hours}h ${mins}m (${timeStr})`;
    } catch {
      return warning.expires;
    }
  })();

  const insideCount = nearbyCameras.filter((m) => m.isInside).length;
  const nearbyCount = nearbyCameras.length - insideCount;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.98 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="absolute top-3 right-3 z-[500] w-full max-w-[340px] sm:max-w-[380px] max-h-[calc(100%-24px)] flex flex-col bg-black/95 border border-neutral-800 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden select-none"
    >
      {/* Warning Card Header with Severity Colored Top Border */}
      <div
        className="p-3.5 border-b border-neutral-800 relative"
        style={{ borderTop: `3px solid ${warning.color}` }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border flex items-center gap-1 shadow-sm ${style.badgeBg} ${style.badgeText} ${style.badgeBorder}`}
            >
              <AlertTriangle className="w-3 h-3" />
              {warning.event}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 font-mono">
              {warning.severity}
            </span>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Deselect warning polygon"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Issuing Office & Expiration */}
        <div className="flex flex-col gap-1 text-[11px] text-neutral-400 font-sans">
          {formattedExpiry && (
            <div className="flex items-center gap-1.5 text-neutral-300 font-mono">
              <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>{formattedExpiry}</span>
            </div>
          )}
          {warning.senderName && (
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Building className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span className="truncate">{warning.senderName}</span>
            </div>
          )}
          {warning.areaDesc && (
            <div className="flex items-start gap-1.5 text-neutral-400 pt-0.5">
              <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
              <span className="line-clamp-2 text-[10px] text-neutral-300">{warning.areaDesc}</span>
            </div>
          )}
        </div>

        {/* Warning Headline if available */}
        {warning.headline && (
          <p className="mt-2 text-[10px] text-neutral-400 italic line-clamp-2 border-l-2 border-neutral-700 pl-2">
            {warning.headline}
          </p>
        )}
      </div>

      {/* Nearby Cameras Section Header */}
      <div className="px-3.5 py-2 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <Video className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-white font-bold tracking-wide uppercase">
            NEARBY CAMERAS ({nearbyCameras.length})
          </span>
        </div>
        <span className="text-[10px] text-neutral-400 font-mono">
          {insideCount > 0 ? `${insideCount} in-polygon` : 'within 25 mi'}
        </span>
      </div>

      {/* Scrollable Camera Results List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-900 p-1.5 space-y-1">
        {nearbyCameras.length === 0 ? (
          <div className="py-8 px-4 text-center text-neutral-400">
            <Video className="w-7 h-7 mx-auto mb-2 opacity-30 text-neutral-400" />
            <p className="text-xs font-semibold text-neutral-300 mb-1">
              No nearby cameras with available location data.
            </p>
            <p className="text-[10px] text-neutral-400 leading-relaxed max-w-xs mx-auto">
              No camera feeds with verified geographic coordinates were found within 25 miles of this warning area.
            </p>
          </div>
        ) : (
          nearbyCameras.map(({ camera, isInside, distanceMiles }) => {
            const isStormChaser = isChaser(camera);
            const isTower =
              camera.source === 'RADAR_OMEGA' || camera.source === 'HAZCAMS' || camera.source === 'HazCams';

            return (
              <div
                key={camera.id}
                className={`p-2.5 rounded-lg border transition-all flex flex-col gap-1.5 ${
                  isInside
                    ? 'bg-neutral-900/90 border-red-500/40 shadow-sm'
                    : 'bg-neutral-950/70 border-neutral-800/80 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {/* Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      {isInside ? (
                        <span className="px-1.5 py-0.5 rounded bg-red-950/90 border border-red-500/80 text-red-300 text-[9px] font-extrabold uppercase tracking-wide flex items-center gap-1 shadow-[0_0_8px_rgba(239,68,68,0.3)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                          INSIDE WARNING AREA
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-600/80 text-blue-300 text-[9px] font-bold font-mono">
                          NEARBY • {distanceMiles} MI
                        </span>
                      )}

                      {/* Source badge */}
                      {isStormChaser ? (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-blue-950/70 text-blue-300 font-bold uppercase flex items-center gap-0.5">
                          <CloudLightning className="w-2 h-2 text-blue-400" /> CHASER
                        </span>
                      ) : isTower ? (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-950/70 text-emerald-300 font-bold uppercase flex items-center gap-0.5">
                          <Radio className="w-2 h-2 text-emerald-400" /> TOWER
                        </span>
                      ) : (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-amber-950/70 text-amber-300 font-bold uppercase flex items-center gap-0.5">
                          <Car className="w-2 h-2 text-amber-400" /> TRAFFIC
                        </span>
                      )}

                      {camera.stateCode && (
                        <span className="text-[9px] text-neutral-400 font-mono font-bold">
                          {camera.stateCode}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-white truncate" title={camera.name}>
                      {camera.cleanName}
                    </p>
                    {camera.location && (
                      <p className="text-[10px] text-neutral-400 truncate">
                        {camera.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-900">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectCamera(camera)}
                    className="flex-1 py-1 px-2 rounded bg-white hover:bg-neutral-200 text-black text-[10px] font-bold transition-colors cursor-pointer text-center"
                  >
                    MONITOR FEED
                  </motion.button>
                  {onAddToGrid && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onAddToGrid(camera)}
                      className="py-1 px-2 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-[10px] font-bold transition-colors border border-neutral-800 cursor-pointer flex items-center gap-1"
                      title="Add to Multi-View Wall"
                    >
                      <Plus className="w-3 h-3" /> WALL
                    </motion.button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2 bg-black border-t border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400">
        <span className="font-mono">PROXIMITY: 25 MILES</span>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          Dismiss Selection
        </button>
      </div>
    </motion.div>
  );
};
