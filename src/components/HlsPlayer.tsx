import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Camera,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Sliders,
  AlertTriangle,
  Eye,
  Tv,
  ExternalLink,
  Zap,
  Sparkles,
} from 'lucide-react';
import { CameraData, CapturedSnapshot, PTZState, getSourceDisplayName } from '../types/camera';

interface HlsPlayerProps {
  camera: CameraData;
  autoPlay?: boolean;
  muted?: boolean;
  onSnapshot?: (snapshot: CapturedSnapshot) => void;
  showControls?: boolean;
  showTopHud?: boolean;
  compact?: boolean;
  onClose?: () => void;
  className?: string;
  ambientMode?: boolean;
  onAmbientColorChange?: (color: string) => void;
  onInaccessible?: (cameraId: string) => void;
}

// Compute atmospheric ambient backlight derived from stream coordinates and solar position
const getAtmosphericDefault = (camera: CameraData): string => {
  if (camera.source === 'RADAR_OMEGA') return '16, 185, 129';
  if (camera.source === 'HazCams') return '6, 182, 212';
  if (camera.source === 'WEATHER_WISE') return '59, 130, 246';
  const [lng] = camera.coordinates || [-96, 39];
  const now = new Date();
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const localSolarHours = (utcHours + lng / 15 + 24) % 24;

  if (localSolarHours >= 6 && localSolarHours <= 8.5) {
    return '245, 158, 77'; // Dawn golden hour
  } else if (localSolarHours > 8.5 && localSolarHours < 17.5) {
    return '56, 189, 248'; // Daylight cyan sky
  } else if (localSolarHours >= 17.5 && localSolarHours <= 19.5) {
    return '249, 115, 22'; // Sunset dusk amber
  }
  return '59, 130, 246'; // Nighttime indigo
};

export const HlsPlayer: React.FC<HlsPlayerProps> = ({
  camera,
  autoPlay = true,
  muted = true,
  onSnapshot,
  showControls = true,
  showTopHud,
  compact = false,
  className = '',
  ambientMode = true,
  onAmbientColorChange,
  onInaccessible,
}) => {
  const isTopHudEnabled = showTopHud !== undefined ? showTopHud : !compact;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [imageTimestamp, setImageTimestamp] = useState<number>(() => Date.now());

  const isImageStream = Boolean(
    camera.streamUrl &&
      (camera.streamUrl.endsWith('.jpg') ||
        camera.streamUrl.endsWith('.jpeg') ||
        camera.streamUrl.endsWith('.png') ||
        camera.streamUrl.includes('.jpg') ||
        camera.streamUrl.includes('.jpeg') ||
        camera.streamUrl.includes('.png'))
  );

  // Stream state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(muted);
  const [volume, setVolume] = useState<number>(0.8);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [resolution, setResolution] = useState<string>('Detecting...');
  const [liveLatency, setLiveLatency] = useState<string>('0.8s');

  // Auto-refresh interval for live traffic snapshot feeds (every 3.5 seconds)
  useEffect(() => {
    if (!isImageStream || hasError) return;
    const interval = setInterval(() => {
      setImageTimestamp(Date.now());
    }, 3500);
    return () => clearInterval(interval);
  }, [isImageStream, hasError]);

  // HUD & PTZ visual states
  const [showHud, setShowHud] = useState<boolean>(true);
  const [showScanlines, setShowScanlines] = useState<boolean>(false);
  const [showPtzMenu, setShowPtzMenu] = useState<boolean>(false);
  const [snapshotFlash, setSnapshotFlash] = useState<boolean>(false);

  // Dynamic Ambient Video Lighting
  const [isAmbientEnabled, setIsAmbientEnabled] = useState<boolean>(ambientMode);
  const [ambientRgb, setAmbientRgb] = useState<string>(() => getAtmosphericDefault(camera));
  const ambientCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep ambient color synced when camera changes
  useEffect(() => {
    const initialColor = getAtmosphericDefault(camera);
    setAmbientRgb(initialColor);
    if (onAmbientColorChange) {
      onAmbientColorChange(initialColor);
    }
  }, [camera.id, camera.source, onAmbientColorChange]);

  const [ptz, setPtz] = useState<PTZState>({
    zoom: 1.0,
    panX: 0,
    panY: 0,
    brightness: 100,
    contrast: 100,
    nightVision: 'off',
    aspectRatio: '16:9',
  });

  // Pan dragging state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number }>({
    x: 0,
    y: 0,
    startPanX: 0,
    startPanY: 0,
  });

  // Jump to low-latency live edge with safe audio buffer
  const jumpToLiveEdge = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (video.seekable && video.seekable.length > 0) {
        const liveTip = video.seekable.end(video.seekable.length - 1);
        video.currentTime = Math.max(0, liveTip - 2.5);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Initialize HLS player or Live Snapshot Image Feed
  const setupStream = useCallback(() => {
    if (!camera.streamUrl) {
      setIsLoading(false);
      setHasError(true);
      setErrorMessage('No stream URL available');
      return;
    }

    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Direct Image Feeds (e.g. Florida DOT CCTV live refreshing feeds)
    if (isImageStream) {
      setImageTimestamp(Date.now());
      setLiveLatency('LIVE (3s)');
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    // Specialized high-efficiency player overhaul ONLY for HazCams
    if (camera.source === 'HazCams') {
      setIsLoading(false);
      setHasError(false);
      setErrorMessage('');

      if (hlsRef.current) {
        (hlsRef.current as any).destroy();
        hlsRef.current = null;
      }

      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = camera.streamUrl;
      } else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: false,
          lowLatencyMode: true,
          maxBufferLength: 8,
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          },
        });
        hlsRef.current = hls;
        hls.loadSource(camera.streamUrl);
        hls.attachMedia(video);
      } else {
        video.src = camera.streamUrl;
      }

      video.muted = isMuted;
      video.play().catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {});
      });
      jumpToLiveEdge();
      return;
    }

    const isHlsSupported = Hls.isSupported();
    const canPlayNative = video.canPlayType('application/vnd.apple.mpegurl');

    if (isHlsSupported) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false, // Disabling aggressive LL mode prevents audio frame drops on demuxed streams
        liveSyncDurationCount: 4, // 4-segment buffer prevents underruns
        liveMaxLatencyDurationCount: 8,
        maxBufferLength: 30, // 30s buffer completely resolves audio clicks and cut-outs on storm chasers and live streams
        maxMaxBufferLength: 60,
        backBufferLength: 15,
        manifestLoadingTimeOut: 12000,
        manifestLoadingMaxRetry: 4,
        levelLoadingTimeOut: 12000,
        fragLoadingTimeOut: 15000,
        enableSoftwareAES: true,
        stretchShortVideoTrack: true,
        maxAudioFramesDrift: 2,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        },
      });

      hlsRef.current = hls;
      hls.loadSource(camera.streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsLoading(false);
        if (autoPlay) {
          video.play().catch(() => {
            video.muted = true;
            setIsMuted(true);
            video.play().catch(() => {});
          });
        }
        if (data.levels && data.levels.length > 0) {
          const l = data.levels[0];
          setResolution(`${l.width}x${l.height}`);
        }
        jumpToLiveEdge();
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level];
        if (level) {
          setResolution(`${level.width}x${level.height}`);
        }
      });

      let networkRetries = 0;
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR: {
              const code = data.response?.code || (data.response as any)?.status;
              networkRetries++;
              if ((code && code >= 400 && code < 500) || networkRetries > 3) {
                setHasError(true);
                setErrorMessage(code ? `Signal inaccessible (HTTP ${code})` : 'Feed refused connection / offline');
                setIsLoading(false);
                hls.destroy();
                hlsRef.current = null;
                onInaccessible?.(camera.id);
                return;
              }
              hls.startLoad();
              break;
            }
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setHasError(true);
              setErrorMessage('Signal lost or feed offline');
              setIsLoading(false);
              hls.destroy();
              hlsRef.current = null;
              onInaccessible?.(camera.id);
              break;
          }
        }
      });
    } else if (canPlayNative) {
      video.src = camera.streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        setResolution(`${video.videoWidth}x${video.videoHeight}`);
        if (autoPlay) video.play().catch(() => {});
        jumpToLiveEdge();
      });
      video.addEventListener('error', () => {
        setHasError(true);
        setErrorMessage('Native video playback failed');
        setIsLoading(false);
        onInaccessible?.(camera.id);
      });
    } else {
      setHasError(true);
      setErrorMessage('HLS playback is not supported on this browser');
      setIsLoading(false);
    }
  }, [camera.streamUrl, camera.id, autoPlay, jumpToLiveEdge, onInaccessible, isImageStream]);

  useEffect(() => {
    setupStream();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [setupStream]);

  // Smooth Low-Latency Live Drift Monitor (prevents playbackRate flapping & audio clicks)
  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video || !isPlaying) return;

      if (video.seekable && video.seekable.length > 0) {
        const liveEnd = video.seekable.end(video.seekable.length - 1);
        const drift = Math.max(0, liveEnd - video.currentTime);
        setLiveLatency(`${drift.toFixed(1)}s`);

        // Only soft-resync if stream has fallen massively behind (> 25 seconds)
        if (drift > 25) {
          try {
            video.currentTime = Math.max(0, liveEnd - 3);
          } catch {
            // Ignore
          }
        }

        // Maintain steady 1.0x playback rate to eliminate audio pitch distortion and resampler clicks
        if (video.playbackRate !== 1.0) {
          video.playbackRate = 1.0;
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Real-time Ambient Lighting Frame Sampler
  useEffect(() => {
    if (!isAmbientEnabled) {
      return;
    }

    const canvas = ambientCanvasRef.current;
    if (!canvas) return;

    let animId: number;
    let lastSampleTime = 0;

    const sampleLoop = (now: number) => {
      // Sample at ~20fps for silky smooth ambient responsiveness
      if (now - lastSampleTime > 50) {
        lastSampleTime = now;
        const targetElement = isImageStream ? imageRef.current : videoRef.current;
        if (!targetElement) return;

        const isReady = isImageStream
          ? Boolean(imageRef.current?.complete && imageRef.current?.naturalWidth > 0)
          : Boolean(videoRef.current && videoRef.current.readyState >= 2 && !videoRef.current.paused && !videoRef.current.ended);

        if (isReady) {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            try {
              ctx.drawImage(targetElement, 0, 0, canvas.width, canvas.height);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const d = imgData.data;
              let r = 0, g = 0, b = 0, count = 0;
              for (let i = 0; i < d.length; i += 16) {
                const pr = d[i], pg = d[i + 1], pb = d[i + 2];
                // Filter out pitch-black pillarbox borders
                if (pr > 15 || pg > 15 || pb > 15) {
                  r += pr;
                  g += pg;
                  b += pb;
                  count++;
                }
              }
              if (count > 0) {
                const avgR = Math.min(255, Math.round((r / count) * 1.3));
                const avgG = Math.min(255, Math.round((g / count) * 1.3));
                const avgB = Math.min(255, Math.round((b / count) * 1.3));
                if (Math.max(avgR, avgG, avgB) > 20) {
                  const colorStr = `${avgR}, ${avgG}, ${avgB}`;
                  setAmbientRgb(colorStr);
                  if (onAmbientColorChange) onAmbientColorChange(colorStr);
                }
              }
            } catch {
              // Canvas tainted by cross-origin stream:
              // The canvas still paints live video frames visually with CSS blur!
              // In addition, ensure ambientRgb has the atmospheric color
              const fallback = getAtmosphericDefault(camera);
              setAmbientRgb(fallback);
              if (onAmbientColorChange) onAmbientColorChange(fallback);
            }
          }
        }
      }
      animId = requestAnimationFrame(sampleLoop);
    };

    animId = requestAnimationFrame(sampleLoop);
    return () => cancelAnimationFrame(animId);
  }, [isAmbientEnabled, camera, onAmbientColorChange]);

  // Handle Play/Pause
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
      jumpToLiveEdge();
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Handle Mute
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // Handle Volume Change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val === 0) {
        videoRef.current.muted = true;
        setIsMuted(true);
      } else if (isMuted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  // Handle Fullscreen
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Digital PTZ Pan Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (ptz.zoom <= 1.0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: ptz.panX,
      startPanY: ptz.panY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = (e.clientX - dragStartRef.current.x) / ptz.zoom;
    const deltaY = (e.clientY - dragStartRef.current.y) / ptz.zoom;
    const maxOffset = 100 * (ptz.zoom - 1);

    setPtz((prev) => ({
      ...prev,
      panX: Math.max(-maxOffset, Math.min(maxOffset, dragStartRef.current.startPanX + deltaX)),
      panY: Math.max(-maxOffset, Math.min(maxOffset, dragStartRef.current.startPanY + deltaY)),
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const adjustZoom = (delta: number) => {
    setPtz((prev) => {
      const nextZoom = Math.min(4.0, Math.max(1.0, +(prev.zoom + delta).toFixed(1)));
      return {
        ...prev,
        zoom: nextZoom,
        panX: nextZoom === 1.0 ? 0 : prev.panX,
        panY: nextZoom === 1.0 ? 0 : prev.panY,
      };
    });
  };

  const resetPtz = () => {
    setPtz({
      zoom: 1.0,
      panX: 0,
      panY: 0,
      brightness: 100,
      contrast: 100,
      nightVision: 'off',
      aspectRatio: '16:9',
    });
  };

  // Frame Capture / Snapshot with modern, minimal watermark
  const captureSnapshot = () => {
    const targetElement = isImageStream ? imageRef.current : videoRef.current;
    if (!targetElement) return;

    try {
      const canvas = document.createElement('canvas');
      const w = isImageStream
        ? (imageRef.current?.naturalWidth || 1280)
        : (videoRef.current?.videoWidth || 1280);
      const h = isImageStream
        ? (imageRef.current?.naturalHeight || 720)
        : (videoRef.current?.videoHeight || 720);

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Apply video/image filter if active (night vision, brightness/contrast)
      if (ptz.nightVision !== 'off' || ptz.brightness !== 100 || ptz.contrast !== 100) {
        ctx.filter = getFilterStyle();
      }
      ctx.drawImage(targetElement, 0, 0, w, h);
      ctx.filter = 'none';

      // Modern Minimal Watermark - Compact & Refined HUD
      // Proportional scale factor optimized for a subtle, smaller footprint
      const scale = Math.max(0.65, Math.min(w / 1600, 1.35));

      // Compact, equalized padding and spacing
      const padY = Math.round(9 * scale); // Top & bottom vertical padding
      const padX = Math.round(13 * scale); // Left & right horizontal padding
      const rowGap = Math.round(5 * scale); // Tight vertical gap between rows

      const titleFontSize = Math.round(11 * scale);
      const badgeFontSize = Math.round(8 * scale);
      const subFontSize = Math.round(9 * scale);

      const titleFont = `600 ${titleFontSize}px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const badgeFont = `600 ${badgeFontSize}px "Plus Jakarta Sans", sans-serif`;
      const subFont = `500 ${subFontSize}px "JetBrains Mono", monospace`;

      const sourceName = getSourceDisplayName(camera.source).toUpperCase();
      const cameraTitle = (camera.cleanName || camera.name || 'CAMERA').trim();
      const nowUtc = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

      const locationText = (camera.location || camera.stateCode || 'US').trim();
      const hasLocation = locationText !== '' && locationText !== 'null';
      const lat = camera.coordinates?.[1] != null ? `${camera.coordinates[1].toFixed(4)}°` : '0.0000°';
      const lon = camera.coordinates?.[0] != null ? `${camera.coordinates[0].toFixed(4)}°` : '0.0000°';
      const coordsText = `[${lat}, ${lon}]`;
      const brandText = 'CAMERA DASHBOARD';

      // Helper for rounded rectangle with native roundRect or fallback
      const roundRect = (
        c: CanvasRenderingContext2D,
        rx: number,
        ry: number,
        rw: number,
        rh: number,
        rad: number
      ) => {
        c.beginPath();
        if (typeof c.roundRect === 'function') {
          c.roundRect(rx, ry, rw, rh, rad);
        } else {
          c.moveTo(rx + rad, ry);
          c.lineTo(rx + rw - rad, ry);
          c.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rad);
          c.lineTo(rx + rw, ry + rh - rad);
          c.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rad, ry + rh);
          c.lineTo(rx + rad, ry + rh);
          c.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rad);
          c.lineTo(rx, ry + rad);
          c.quadraticCurveTo(rx, ry, rx + rad, ry);
          c.closePath();
        }
      };

      // Measure components for adaptive layout
      ctx.font = titleFont;
      const titleWidth = ctx.measureText(cameraTitle).width;

      ctx.font = badgeFont;
      const badgeTextWidth = ctx.measureText(sourceName).width;
      const badgePadX = Math.round(5 * scale);
      const badgeWidth = badgeTextWidth + badgePadX * 2;
      const badgeHeight = Math.round(16 * scale);

      ctx.font = subFont;
      const locationWidth = ctx.measureText(locationText).width;
      const bullet1Text = ' • ';
      const bullet1Width = ctx.measureText(bullet1Text).width;
      const coordsWidth = ctx.measureText(coordsText).width;
      const bullet2Text = ' • ';
      const bullet2Width = ctx.measureText(bullet2Text).width;
      const timeWidth = ctx.measureText(nowUtc).width;
      const bullet3Text = ' • ';
      const bullet3Width = ctx.measureText(bullet3Text).width;
      const brandWidth = ctx.measureText(brandText).width;
      const row2Width = locationWidth + bullet1Width + coordsWidth + bullet2Width + timeWidth + bullet3Width + brandWidth;

      const dotRadius = Math.max(2.5, Math.round(3 * scale));
      const dotSpacing = Math.round(6 * scale);
      const titleToBadgeGap = Math.round(8 * scale);

      const row1Height = badgeHeight;
      const row2Height = Math.round(11 * scale);

      const row1Width = dotRadius * 2 + dotSpacing + titleWidth + titleToBadgeGap + badgeWidth;
      const cardInnerWidth = Math.max(row1Width, row2Width);
      const cardWidth = cardInnerWidth + padX * 2;

      // Equalized compact height: padY (top) + row1Height + rowGap + row2Height + padY (bottom)
      const cardHeight = padY + row1Height + rowGap + row2Height + padY;

      const margin = Math.round(14 * scale);
      const cardX = margin;
      const cardY = h - cardHeight - margin;
      const borderRadius = Math.round(7 * scale);

      // Centers for Row 1 and Row 2
      const row1CenterY = cardY + padY + row1Height / 2;
      const row2CenterY = cardY + padY + row1Height + rowGap + row2Height / 2;

      ctx.save();

      // Subtle, minimal soft shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = Math.round(10 * scale);
      ctx.shadowOffsetY = Math.round(2 * scale);

      // Card Background (modern dark translucent glass)
      ctx.fillStyle = 'rgba(9, 9, 11, 0.72)';
      roundRect(ctx, cardX, cardY, cardWidth, cardHeight, borderRadius);
      ctx.fill();

      // Subtle hairline border
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = Math.max(0.75, Math.round(0.85 * scale));
      ctx.stroke();

      // Subtle top highlight inset line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.moveTo(cardX + borderRadius, cardY + 0.75);
      ctx.lineTo(cardX + cardWidth - borderRadius, cardY + 0.75);
      ctx.stroke();

      // Row 1: Camera Title placeholder start


      // Camera Title
      ctx.font = titleFont;
      ctx.fillStyle = '#f8fafc';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      const textX = cardX + padX;
      ctx.fillText(cameraTitle, textX, row1CenterY);

      // Source Badge Capsule
      const badgeX = textX + titleWidth + titleToBadgeGap;
      const badgeY = row1CenterY - badgeHeight / 2;

      let badgeFill = 'rgba(245, 158, 11, 0.3)';
      let badgeStroke = 'rgba(245, 158, 11, 0.75)';
      let badgeTextFill = '#fef3c7';

      if (camera.source === 'RADAR_OMEGA' || camera.source === 'HazCams') {
        badgeFill = 'rgba(16, 185, 129, 0.3)';
        badgeStroke = 'rgba(16, 185, 129, 0.75)';
        badgeTextFill = '#d1fae5';
      } else if (camera.source === 'WEATHER_WISE') {
        badgeFill = 'rgba(59, 130, 246, 0.3)';
        badgeStroke = 'rgba(59, 130, 246, 0.75)';
        badgeTextFill = '#dbeafe';
      }

      ctx.fillStyle = badgeFill;
      roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, Math.round(3.5 * scale));
      ctx.fill();

      ctx.strokeStyle = badgeStroke;
      ctx.lineWidth = 0.75;
      ctx.stroke();

      ctx.font = badgeFont;
      ctx.fillStyle = badgeTextFill;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sourceName, badgeX + badgeWidth / 2, row1CenterY);

      // Row 2: Subtitle Line: Location • [Coordinates] • Timestamp • Brand
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = subFont;
      const subLineY = row2CenterY;



      let currentX = cardX + padX;

      // Location Text (conditional)
      if (hasLocation) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(locationText, currentX, subLineY);
        currentX += locationWidth;
        
        ctx.fillStyle = '#475569';
        ctx.fillText(bullet1Text, currentX, subLineY);
        currentX += bullet1Width;
      }

      // Coordinates
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(coordsText, currentX, subLineY);
      currentX += coordsWidth;

      // Bullet 2
      ctx.fillStyle = '#475569';
      ctx.fillText(bullet2Text, currentX, subLineY);
      currentX += bullet2Width;

      // UTC Timestamp
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(nowUtc, currentX, subLineY);
      currentX += timeWidth;

      // Bullet 3
      ctx.fillStyle = '#475569';
      ctx.fillText(bullet3Text, currentX, subLineY);
      currentX += bullet3Width;

      // Generic Brand Tag
      ctx.fillStyle = '#60a5fa';
      ctx.fillText(brandText, currentX, subLineY);

      ctx.restore();

      const dataUrl = canvas.toDataURL('image/png');

      setSnapshotFlash(true);
      setTimeout(() => setSnapshotFlash(false), 250);

      const snapshot: CapturedSnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: Date.now(),
        cameraName: camera.name,
        coordinates: camera.coordinates,
        dataUrl,
        source: camera.source,
      };

      if (onSnapshot) {
        onSnapshot(snapshot);
      }

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `camera_${camera.cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.png`;
      a.click();
    } catch (err) {
      console.warn('Snapshot capture failed:', err);
    }
  };

  const getFilterStyle = () => {
    let base = `brightness(${ptz.brightness}%) contrast(${ptz.contrast}%)`;
    if ((ptz.nightVision as any) === 'mono') {
      return `${base} grayscale(100%) brightness(1.2) contrast(1.4)`;
    }
    if ((ptz.nightVision as any) === 'blue') {
      return `${base} sepia(100%) hue-rotate(185deg) saturate(320%)`;
    }
    if (ptz.nightVision === 'flir') {
      return `${base} invert(100%) hue-rotate(190deg) saturate(220%)`;
    }
    return base;
  };

  return (
    <div className={`relative ${className} flex flex-col`}>
      {/* Dynamic Ambient Video Glow Aura */}
      {isAmbientEnabled && (
        <div className="absolute -inset-4 sm:-inset-8 -z-10 pointer-events-none transition-opacity duration-500">
          <canvas
            ref={ambientCanvasRef}
            width={64}
            height={36}
            className="w-full h-full object-cover blur-3xl opacity-80 sm:opacity-95 saturate-200 brightness-125 transform scale-110 pointer-events-none"
          />
          <div
            className="absolute -inset-4 transition-all duration-700 blur-3xl opacity-75"
            style={{
              background: `radial-gradient(ellipse at center, rgba(${ambientRgb}, 0.45) 0%, rgba(${ambientRgb}, 0.18) 50%, transparent 80%)`,
            }}
          />
        </div>
      )}

      <div
        ref={containerRef}
        className="relative group bg-[#000000] overflow-hidden rounded-xl border border-neutral-800 shadow-2xl select-none w-full h-full flex-1 flex flex-col transition-all duration-300"
        style={{
          borderColor: isAmbientEnabled && ambientRgb ? `rgba(${ambientRgb}, 0.5)` : undefined,
          boxShadow: isAmbientEnabled && ambientRgb
            ? `0 0 35px rgba(${ambientRgb}, 0.25), 0 0 70px rgba(${ambientRgb}, 0.1)`
            : undefined,
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Media element wrapper with digital transform */}
        <div
          className="w-full h-full relative overflow-hidden flex items-center justify-center bg-black cursor-default"
          onMouseDown={handleMouseDown}
        >
          {isImageStream ? (
          <img
            ref={imageRef}
            src={`${camera.streamUrl}${camera.streamUrl.includes('?') ? '&' : '?'}t=${imageTimestamp}`}
            alt={camera.cleanName}
            onLoad={(e) => {
              setIsLoading(false);
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) {
                setResolution(`${img.naturalWidth}x${img.naturalHeight}`);
              }
              setLiveLatency('LIVE SNAPSHOT (3s)');
            }}
            onError={() => {
              setHasError(true);
              setErrorMessage('Feed currently unavailable (404/Network)');
              setIsLoading(false);
              onInaccessible?.(camera.id);
            }}
            className={`w-full h-full transition-transform duration-100 ease-out select-none ${
              ptz.aspectRatio === 'fill' ? 'object-cover' : 'object-contain'
            }`}
            style={{
              transform: `scale(${ptz.zoom}) translate(${ptz.panX}px, ${ptz.panY}px)`,
              filter: getFilterStyle(),
            }}
          />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted={isMuted}
            className={`w-full h-full transition-transform duration-100 ease-out ${
              ptz.aspectRatio === 'fill' ? 'object-cover' : 'object-contain'
            }`}
            style={{
              transform: `scale(${ptz.zoom}) translate(${ptz.panX}px, ${ptz.panY}px)`,
              filter: getFilterStyle(),
            }}
          />
        )}

        {showScanlines && <div className="absolute inset-0 scanlines pointer-events-none" />}

        {snapshotFlash && (
          <motion.div
            initial={{ opacity: 0.95 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-white z-40 pointer-events-none"
          />
        )}

        {isLoading && !hasError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm gap-3">
            <div className="w-9 h-9 rounded-full border-2 border-neutral-800 border-t-white animate-spin" />
            <div className="flex flex-col items-center gap-0.5 text-xs">
              <span className="text-white tracking-wide font-bold uppercase">CONNECTING FEED...</span>
              <span className="text-neutral-400 text-[11px] truncate max-w-xs">{camera.cleanName}</span>
            </div>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-6 text-center">
            <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5 text-neutral-300" />
            </div>
            <h4 className="text-white text-sm uppercase font-bold tracking-wider mb-1">SIGNAL INTERRUPTED</h4>
            <p className="text-neutral-400 text-xs max-w-md mb-4">{errorMessage || 'Carrier stream offline or rate-limited'}</p>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={setupStream}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reconnect
              </motion.button>
              <a
                href={camera.streamUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs transition-colors border border-neutral-800"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Direct URL
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Top HUD Bar */}
      {showHud && isTopHudEnabled && (
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3 bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-auto">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-900/90 border border-neutral-700 text-[10px] text-white font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_#3b82f6] animate-pulse inline-block" />
              <span>LIVE</span>
            </div>

            <span
              className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide ${
                camera.source === 'RADAR_OMEGA' || camera.source === 'HazCams'
                  ? 'bg-emerald-950/80 border-emerald-600/80 text-emerald-300'
                  : camera.source === 'WEATHER_WISE'
                  ? 'bg-blue-950/80 border-blue-600/80 text-blue-300'
                  : 'bg-amber-950/80 border-amber-600/80 text-amber-300'
              }`}
            >
              Tower Camera
            </span>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={jumpToLiveEdge}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-950/80 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer font-mono"
              title="Click to sync to lowest latency live edge"
            >
              <Zap className="w-2.5 h-2.5 text-blue-400" />
              <span>{liveLatency}</span>
            </motion.button>

            <span className="text-xs text-white font-semibold truncate max-w-[200px] md:max-w-xs drop-shadow">
              {camera.cleanName}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-neutral-400">
            {!compact && (
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-neutral-900/80 border border-neutral-800 text-neutral-400 text-[10px] font-mono">
                {camera.coordinates[1].toFixed(3)}°N, {camera.coordinates[0].toFixed(3)}°W
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-neutral-900/90 border border-neutral-800 text-white font-bold text-[10px] font-mono">
              {resolution}
            </span>
          </div>
        </div>
      )}

      {/* Optics & PTZ Adjustment Flyout Menu with Motion Spring */}
      <AnimatePresence>
        {showPtzMenu && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.16 }}
            className="absolute top-12 right-3 z-30 p-3.5 rounded-xl bg-neutral-950/95 border border-neutral-800 shadow-2xl backdrop-blur-md w-64 space-y-3 text-xs text-white"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                <Sliders className="w-3.5 h-3.5" /> Sensor & Optics
              </span>
              <button
                onClick={resetPtz}
                className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer"
              >
                Reset
              </button>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span>Zoom Level</span>
                <span className="text-white font-bold font-mono">{ptz.zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="0.1"
                value={ptz.zoom}
                onChange={(e) =>
                  setPtz((p) => ({
                    ...p,
                    zoom: parseFloat(e.target.value),
                    panX: parseFloat(e.target.value) === 1 ? 0 : p.panX,
                    panY: parseFloat(e.target.value) === 1 ? 0 : p.panY,
                  }))
                }
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span>Sensor Mode</span>
                <span className="text-neutral-400 capitalize">{ptz.nightVision}</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: 'off', label: 'Color' },
                  { id: 'mono', label: 'B&W IR' },
                  { id: 'blue', label: 'Cobalt' },
                  { id: 'flir', label: 'FLIR' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPtz((p) => ({ ...p, nightVision: m.id as any }))}
                    className={`py-1 text-[10px] rounded-md border text-center font-bold transition-all ${
                      (ptz.nightVision as string) === m.id
                        ? 'bg-white text-black border-white shadow-sm'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span>Aspect Ratio</span>
                <span className="text-white font-mono">{ptz.aspectRatio}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(['16:9', '4:3', 'fill'] as const).map((ar) => (
                  <button
                    key={ar}
                    onClick={() => setPtz((p) => ({ ...p, aspectRatio: ar }))}
                    className={`py-1 text-[10px] rounded-md border text-center font-bold transition-all ${
                      ptz.aspectRatio === ar
                        ? 'bg-white text-black border-white shadow-sm'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span>Gain / Exposure</span>
                <span className="text-white font-mono">{ptz.brightness}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="160"
                value={ptz.brightness}
                onChange={(e) => setPtz((p) => ({ ...p, brightness: parseInt(e.target.value) }))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls Bar */}
      {showControls && (
        <div className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black via-black/85 to-transparent">
          {/* Left Controls */}
          <div className="flex items-center gap-1.5">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={togglePlay}
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white transition-all cursor-pointer"
              title={isPlaying ? 'Pause Feed' : 'Resume Feed'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </motion.button>

            <div className="flex items-center gap-1.5 group/vol">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={toggleMute}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-neutral-500" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
              </motion.button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 accent-blue-500 h-1 hidden sm:block opacity-60 group-hover/vol:opacity-100 transition-opacity cursor-pointer"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={setupStream}
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer"
              title="Reload Stream / Re-sync"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={jumpToLiveEdge}
              className="px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] font-semibold text-neutral-300 hover:text-white flex items-center gap-1 transition-all cursor-pointer"
              title="Sync to real-time live edge"
            >
              <Zap className="w-2.5 h-2.5 text-blue-400" />
              <span className="hidden sm:inline">Sync Live</span>
            </motion.button>
          </div>

          {/* Center Zoom indicator */}
          <div className="flex items-center gap-1 text-xs">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => adjustZoom(-0.2)}
              disabled={ptz.zoom <= 1.0}
              className="p-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 disabled:opacity-30 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </motion.button>
            <span className="px-2 py-0.5 rounded-md bg-black border border-neutral-800 text-white font-bold font-mono text-[10px] min-w-[38px] text-center">
              {ptz.zoom.toFixed(1)}x
            </span>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => adjustZoom(0.2)}
              disabled={ptz.zoom >= 4.0}
              className="p-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 disabled:opacity-30 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </motion.button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={captureSnapshot}
              className="px-2.5 py-1 rounded-lg bg-white text-black hover:bg-neutral-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-sm"
              title="Capture Frame Snapshot (.PNG)"
            >
              <Camera className="w-3.5 h-3.5 text-black" />
              <span>SNAP</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowScanlines((v) => !v)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                showScanlines
                  ? 'bg-neutral-800 text-white border-neutral-600'
                  : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400'
              }`}
              title="Toggle CRT Scanline Overlay"
            >
              <Tv className="w-3.5 h-3.5" />
            </motion.button>

            {/* Dynamic Ambient Glow Toggle */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsAmbientEnabled((v) => !v)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isAmbientEnabled
                  ? 'bg-blue-950/80 text-blue-300 border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.35)]'
                  : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400'
              }`}
              title={isAmbientEnabled ? 'Disable Ambient Video Glow' : 'Enable Dynamic Ambient Video Glow'}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowPtzMenu((v) => !v)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                showPtzMenu
                  ? 'bg-neutral-800 text-white border-neutral-600'
                  : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400'
              }`}
              title="Optics & Sensors"
            >
              <Sliders className="w-3.5 h-3.5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowHud((v) => !v)}
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer"
              title={showHud ? 'Hide HUD' : 'Show HUD'}
            >
              <Eye className="w-3.5 h-3.5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </motion.button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
