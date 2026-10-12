import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  AlertTriangle,
  Radio,
  Activity,
  Layers,
  MessageSquare,
  Tv,
  Camera,
  Check,
  Download,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  Image,
} from 'lucide-react';
import { BroadcastMode } from '../../types/scheduler';
import { extractYouTubeId, getYouTubeEmbedUrl } from '../../services/youtubeHelper';
import {
  captureFrameFromMediaElement,
  generateSyntheticSnapshot,
  createLiveStreamKeyframe,
  VideoSnapshot,
} from '../../services/videoMediaExtractor';

interface VideoPlayerProps {
  videoUrl?: string;
  isStalled: boolean;
  playerBufferSeconds: number;
  mode: BroadcastMode;
  bandwidthKbps: number;
  activeItemTitle?: string;
  activeSubtitle?: string;
  isLive: boolean;
  latestSnapshotUrl?: string;
  onCaptureSnapshot?: (snapshot: VideoSnapshot) => void;
  onUserPlayStateChange?: (playing: boolean) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  isStalled,
  playerBufferSeconds,
  mode,
  bandwidthKbps,
  activeItemTitle,
  activeSubtitle,
  isLive,
  latestSnapshotUrl,
  onCaptureSnapshot,
  onUserPlayStateChange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.8);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(45);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [showCaptions, setShowCaptions] = useState<boolean>(true);

  // Snapshot capture state
  const [capturedSnapshot, setCapturedSnapshot] = useState<VideoSnapshot | null>(null);
  const [autoSnapshotHistory, setAutoSnapshotHistory] = useState<VideoSnapshot[]>([]);
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);
  const [showSnapshotPreview, setShowSnapshotPreview] = useState<boolean>(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [lastCapturedTimestamp, setLastCapturedTimestamp] = useState<number>(0);
  const [isAutoCapturedFlash, setIsAutoCapturedFlash] = useState<boolean>(false);

  // Auto-snapshot 5-second timer state
  const [autoSnapshotEnabled, setAutoSnapshotEnabled] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(5);

  const youtubeId = extractYouTubeId(videoUrl);
  const isYouTube = !!youtubeId;
  const [useCanvasPattern, setUseCanvasPattern] = useState<boolean>(!videoUrl && !isYouTube);

  // Core Snapshot Capture Handler (Automatic every 5s or Manual)
  const takeSnapshot = (isManual: boolean = false): VideoSnapshot => {
    let snap: VideoSnapshot | null = null;
    const currentSecs =
      (videoRef.current && !isNaN(videoRef.current.currentTime) && videoRef.current.currentTime > 0
        ? videoRef.current.currentTime
        : currentTime) || Math.floor((Date.now() / 1000) % 3600);

    if (isYouTube && youtubeId) {
      // YouTube live stream cross-origin keyframe generator
      snap = {
        id: `snap_auto_${Date.now()}`,
        dataUrl: createLiveStreamKeyframe(
          youtubeId,
          activeItemTitle || 'Live Broadcast Stream',
          currentSecs,
          isManual
            ? `Manual User Keyframe · T+${Math.round(currentSecs)}s`
            : `Auto 5s Keyframe · SMPTE T+${Math.round(currentSecs)}s`
        ),
        timestampSeconds: currentSecs,
        label: isManual
          ? `Instant Keyframe (T+${Math.round(currentSecs)}s)`
          : `Auto 5s Keyframe (T+${Math.round(currentSecs)}s)`,
        width: 640,
        height: 360,
      };
    } else if (videoRef.current) {
      snap = captureFrameFromMediaElement(
        videoRef.current,
        activeItemTitle || (isManual ? 'Manual Keyframe' : 'Auto 5s Keyframe')
      );
    } else if (canvasRef.current) {
      snap = captureFrameFromMediaElement(
        canvasRef.current,
        activeItemTitle || (isManual ? 'Manual Canvas Keyframe' : 'Auto 5s Canvas Keyframe')
      );
    }

    if (!snap) {
      snap = {
        id: `snap_fallback_${Date.now()}`,
        dataUrl: generateSyntheticSnapshot(
          activeItemTitle || 'Live Broadcast Keyframe',
          currentSecs || 5,
          'Real-time Tier 3 Keyframe'
        ),
        timestampSeconds: currentSecs || 5,
        label: `Auto 5s Snapshot (T+${Math.round(currentSecs || 5)}s)`,
        width: 640,
        height: 360,
      };
    }

    setCapturedSnapshot(snap);
    setLastCapturedTimestamp(currentSecs);
    setAutoSnapshotHistory((prev) => [snap!, ...prev.filter((p) => p.id !== snap!.id).slice(0, 11)]);
    onCaptureSnapshot?.(snap);

    if (isManual) {
      setSnapshotToast(`Snapshot captured at T+${Math.round(snap.timestampSeconds)}s!`);
      setTimeout(() => setSnapshotToast(null), 4000);
    } else {
      setIsAutoCapturedFlash(true);
      setTimeout(() => setIsAutoCapturedFlash(false), 1200);
    }

    return snap;
  };

  const handleTakeSnapshot = () => {
    takeSnapshot(true);
    setCountdown(5); // reset 5-second countdown on manual capture
  };

  // Initial automatic snapshot 1 second after mount so a snapshot is always available
  useEffect(() => {
    if (!autoSnapshotEnabled) return;
    const initialTimer = setTimeout(() => {
      if (!isStalled) {
        takeSnapshot(false);
      }
    }, 1200);

    return () => clearTimeout(initialTimer);
  }, [autoSnapshotEnabled, videoUrl, isYouTube, youtubeId]);

  // Automated 5-Second Interval Engine
  useEffect(() => {
    if (!autoSnapshotEnabled || !isPlaying) return;

    const timer = setInterval(() => {
      // During severe buffering / lag stall, pause countdown so we don't spam frozen duplicate frames,
      // and preserve the freshest pre-stall 5-second frame for automated display!
      if (isStalled) return;

      setCountdown((prev) => {
        if (prev <= 1) {
          takeSnapshot(false);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoSnapshotEnabled, isPlaying, isStalled, isYouTube, youtubeId, currentTime, activeItemTitle]);

  // Sync canvas pattern if videoUrl is unavailable or fails
  useEffect(() => {
    setUseCanvasPattern(!videoUrl && !isYouTube);
  }, [videoUrl, isYouTube]);

  // Handle stall / freeze from scheduler
  useEffect(() => {
    if (!videoRef.current) return;
    if (isStalled) {
      if (!videoRef.current.paused) {
        videoRef.current.pause();
      }
    } else if (isPlaying) {
      videoRef.current.play().catch(() => {
        // Autoplay may be restricted without user interaction
      });
    }
  }, [isStalled, isPlaying]);

  // Draw animated broadcast test pattern on canvas when no user video is supplied
  useEffect(() => {
    if (!useCanvasPattern) return;
    let animId: number;
    let tick = 0;

    const renderCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Dark studio canvas background
      ctx.fillStyle = '#0a101f';
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Moving scanning beam (unless stalled)
      if (!isStalled && isPlaying) {
        tick = (tick + 2) % width;
      }

      const grad = ctx.createLinearGradient(tick - 60, 0, tick + 60, 0);
      grad.addColorStop(0, 'rgba(6, 182, 212, 0)');
      grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.25)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(tick - 60, 0, 120, height);

      // Center broadcast emblem
      const cx = width / 2;
      const cy = height / 2 - 20;

      ctx.beginPath();
      ctx.arc(cx, cy, 64, 0, Math.PI * 2);
      ctx.strokeStyle = isStalled ? 'rgba(239, 68, 68, 0.4)' : 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Broadcast target rings
      ctx.beginPath();
      ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      ctx.fillStyle = isStalled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(6, 182, 212, 0.1)';
      ctx.fill();

      // Audio waveform bars inside canvas
      const numBars = 24;
      const barWidth = 6;
      const barGap = 4;
      const startX = cx - ((numBars * (barWidth + barGap)) / 2);
      const waveformBaseY = cy + 90;

      for (let i = 0; i < numBars; i++) {
        const heightMultiplier = isStalled && mode === 'BASELINE' ? 0.05 : Math.sin(tick * 0.05 + i * 0.4) * 0.5 + 0.5;
        const barH = 8 + heightMultiplier * 36;
        ctx.fillStyle = isStalled && mode === 'BASELINE' ? '#ef4444' : '#38bdf8';
        ctx.fillRect(startX + i * (barWidth + barGap), waveformBaseY - barH / 2, barWidth, barH);
      }

      // Studio label
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.fillText('AURA LIVE STREAMING FEED', cx, cy - 8);

      ctx.font = '500 12px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94a3b8';
      const tc = new Date().toISOString().substring(11, 23);
      ctx.fillText(`UTC TIMECODE: ${tc} · SMPTE TIMELINE`, cx, cy + 14);

      if (isStalled) {
        ctx.font = '700 13px "JetBrains Mono", monospace';
        ctx.fillStyle = '#f87171';
        ctx.fillText('STREAM STALLED: INSUFFICIENT MEDIA BUFFER', cx, cy + 130);
      } else {
        ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(activeItemTitle ? `Broadcasting: ${activeItemTitle}` : 'Broadcasting Program Feed', cx, cy + 130);
      }

      animId = requestAnimationFrame(renderCanvas);
    };

    renderCanvas();
    return () => cancelAnimationFrame(animId);
  }, [useCanvasPattern, isStalled, isPlaying, mode, activeItemTitle]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
        onUserPlayStateChange?.(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
        onUserPlayStateChange?.(false);
      }
    } else {
      setIsPlaying(!isPlaying);
      onUserPlayStateChange?.(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Rendition calculation based on bandwidth
  const currentRendition =
    bandwidthKbps > 2000
      ? '1080p · 60fps'
      : bandwidthKbps > 800
      ? '720p · 30fps'
      : bandwidthKbps > 200
      ? '360p · 24fps'
      : bandwidthKbps > 60
      ? '144p · Low-FPS'
      : 'Audio Priority Only';

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col group select-none shadow-2xl"
    >
      {/* Top Overlay Bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isStalled ? 'bg-rose-500 animate-ping' : 'bg-red-500 animate-pulse'}`} />
            <span className="text-xs font-bold font-mono tracking-wider text-white">LIVE</span>
          </div>
          <span className="text-slate-500">·</span>
          <span className="text-xs text-slate-300 font-medium truncate max-w-[200px] sm:max-w-md">
            {activeItemTitle || 'AURA Program Stream'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Rendition Badge */}
          <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded">
            {currentRendition}
          </span>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
            BUF: {playerBufferSeconds.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Main Video Screen / YouTube Embed / Canvas Generator */}
      <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {useCanvasPattern ? (
          <canvas
            ref={canvasRef}
            width={960}
            height={540}
            className="w-full h-full object-contain"
          />
        ) : isYouTube && youtubeId ? (
          <div className="w-full h-full relative bg-black">
            <iframe
              src={getYouTubeEmbedUrl(youtubeId, { autoplay: isPlaying, mute: isMuted })}
              title="YouTube Live Broadcast Stream"
              className="w-full h-full border-0 absolute inset-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            playsInline
            loop
            muted={isMuted}
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
                setDuration(videoRef.current.duration || 45);
              }
            }}
            onError={() => {
              // Video decode error fallback to canvas test pattern
              setUseCanvasPattern(true);
            }}
          />
        )}

        {/* Buffering Stall: Automatic Seamless 5-Second Keyframe Fallback (Zero Manual Action Required) */}
        {isStalled && (
          <div className="absolute inset-0 z-30 bg-slate-950 flex flex-col items-center justify-center animate-fade-in overflow-hidden">
            {capturedSnapshot?.dataUrl || latestSnapshotUrl ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                {/* Full-view Automatic 5s Keyframe */}
                <img
                  src={capturedSnapshot?.dataUrl || latestSnapshotUrl}
                  alt="Auto 5s Keyframe Fallback"
                  className="w-full h-full object-contain filter contrast-[1.03]"
                />

                {/* Top Telemetry HUD Banner */}
                <div className="absolute top-3 inset-x-3 z-30 flex flex-wrap items-center justify-between gap-2 bg-slate-950/90 backdrop-blur-md border border-cyan-500/70 rounded-xl px-3.5 py-2 text-xs shadow-2xl">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                    </span>
                    <span className="font-mono font-bold text-cyan-300 text-[11px] tracking-wide">
                      AUTOMATIC 5s KEYFRAME ACTIVE
                    </span>
                    <span className="text-slate-300 text-[10px] hidden sm:inline">
                      · Buffering / Lag Detected ({bandwidthKbps} kbps) · No manual capture needed
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/80">
                      FRAME T+{Math.round(lastCapturedTimestamp || currentTime || 5)}s
                    </span>
                    <span className="text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                      <Radio className="w-3 h-3 animate-pulse" />
                      <span>Audio & Alerts Continuous</span>
                    </span>
                  </div>
                </div>

                {/* Bottom Auto-Recovery Banner */}
                <div className="absolute bottom-3 inset-x-4 z-30 flex justify-center">
                  <div className="bg-slate-950/92 backdrop-blur-md border border-slate-700/80 rounded-xl px-4 py-1.5 text-center shadow-xl max-w-lg">
                    <p className="text-[11px] text-slate-300 leading-snug">
                      <strong className="text-cyan-300">
                        {mode === 'AURA' ? 'AURA Graceful Degradation' : 'Buffer Depletion Fallback'}
                      </strong>
                      : Automatically displaying recent 5-second snapshot during stream lag. Video resumes automatically upon buffer replenishment.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Fallback if initial snapshot was not yet registered */
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2 animate-spin">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">Stream Buffering</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Waiting for media segments... Automated 5s keyframe will display immediately once captured.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Synchronized Transcript Subtitle Overlay */}
        {showCaptions && activeSubtitle && (
          <div className="absolute bottom-3 inset-x-4 z-20 flex justify-center pointer-events-none">
            <div className="bg-slate-950/95 backdrop-blur-md text-white px-4 py-2 rounded-lg border border-cyan-500/60 text-xs sm:text-sm font-medium max-w-xl text-center shadow-2xl animate-fade-in">
              <span className="text-cyan-400 font-mono text-[10px] font-bold mr-2 tracking-wider">[LIVE TRANSCRIPT]</span>
              <span>{activeSubtitle}</span>
            </div>
          </div>
        )}
      </div>

      {/* Buffer Health Indicator Bar */}
      <div className="h-1.5 w-full bg-slate-900 relative">
        {/* Safe buffer threshold marker at 4 seconds */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-600 z-10"
          style={{ left: '33%' }}
          title="Safe Buffer Threshold (4s)"
        />
        <div
          className={`h-full transition-all duration-300 ${
            playerBufferSeconds > 4
              ? 'bg-emerald-500'
              : playerBufferSeconds > 1.5
              ? 'bg-amber-400'
              : 'bg-rose-500'
          }`}
          style={{ width: `${Math.min(100, (playerBufferSeconds / 12) * 100)}%` }}
        />
      </div>

      {/* Bottom Controls Bar */}
      <div className="px-4 py-3 bg-slate-900/90 border-t border-slate-800/80 flex flex-col gap-2">
        {/* Timeline Slider */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400 w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <span className="text-[11px] font-mono text-slate-400 w-10">
            {formatTime(duration)}
          </span>
        </div>

        {/* Action Controls & Volume */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <div className="w-20 hidden sm:block">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded text-[11px] font-mono text-slate-300">
              {[0.5, 1.0, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => {
                    setPlaybackRate(rate);
                    if (videoRef.current) videoRef.current.playbackRate = rate;
                  }}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${
                    playbackRate === rate ? 'bg-cyan-500 text-slate-950 font-bold' : 'hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Instant Snapshot Capture Button */}
            <button
              type="button"
              onClick={handleTakeSnapshot}
              className="px-2.5 h-8 rounded-lg font-mono text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/50 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Manual snapshot capture (Auto-capture runs automatically every 5s)"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-400" />
              <span>Snapshot</span>
            </button>

            {/* Closed Captions CC Toggle */}
            <button
              type="button"
              onClick={() => setShowCaptions(!showCaptions)}
              className={`px-2 h-8 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer border ${
                showCaptions
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
              }`}
              title={showCaptions ? 'Subtitles / Captions ON' : 'Subtitles / Captions OFF'}
            >
              CC
            </button>

            <button
              type="button"
              onClick={handleFullscreen}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Automated 5-Second Snapshot Status Bar */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setAutoSnapshotEnabled(!autoSnapshotEnabled)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                autoSnapshotEnabled
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
              title="Toggle automatic 5-second snapshot interval"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  autoSnapshotEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span>Auto 5s Snapshot: {autoSnapshotEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {autoSnapshotEnabled && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                {isStalled ? (
                  <span className="text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/70 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    Buffering Stall: Auto-fallback active (no manual capture needed)
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>Next auto-capture in:</span>
                    <span className="text-cyan-300 font-bold bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                      {countdown}s
                    </span>
                    {isAutoCapturedFlash && (
                      <span className="text-emerald-400 font-bold text-[10px] animate-pulse">
                        📸 Captured
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer bg-slate-950 px-2 py-0.5 rounded border border-slate-800"
            title="Inspect rolling 5-second snapshot gallery"
          >
            <Image className="w-3 h-3 text-cyan-400" />
            <span>5s Keyframes ({autoSnapshotHistory.length})</span>
            {showHistoryDrawer ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Rolling 5-Second Snapshot History Drawer */}
        {showHistoryDrawer && (
          <div className="p-2.5 rounded-lg bg-slate-950/95 border border-slate-800 space-y-2 animate-fade-in mt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-300 font-mono flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Automatic 5-Second Keyframe Stream</span>
              </span>
              <span className="text-slate-500 font-mono text-[10px]">
                Captured automatically every 5s · Ready for lag fallback
              </span>
            </div>

            {autoSnapshotHistory.length === 0 ? (
              <div className="text-center py-3 text-slate-500 text-xs font-mono">
                Waiting for first 5-second automatic capture...
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {autoSnapshotHistory.map((snap, idx) => (
                  <div
                    key={snap.id}
                    className={`relative shrink-0 rounded border overflow-hidden transition-all bg-black ${
                      idx === 0
                        ? 'border-cyan-500 ring-1 ring-cyan-500/50'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <img
                      src={snap.dataUrl}
                      alt={snap.label}
                      className="w-24 h-14 object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-slate-950/90 py-0.5 px-1 flex items-center justify-between text-[9px] font-mono text-cyan-300">
                      <span>T+{Math.round(snap.timestampSeconds)}s</span>
                      <a
                        href={snap.dataUrl}
                        download={`aura-keyframe-${Math.round(snap.timestampSeconds)}s.jpg`}
                        className="text-slate-400 hover:text-white"
                        title="Download keyframe"
                      >
                        <Download className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    {idx === 0 && (
                      <span className="absolute top-0.5 right-0.5 bg-cyan-500 text-slate-950 text-[8px] font-mono font-bold px-1 rounded">
                        LATEST
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Snapshot Captured Toast */}
        {snapshotToast && (
          <div className="absolute top-12 right-4 z-40 bg-indigo-950/95 border border-indigo-500 text-white px-3 py-2 rounded-xl text-xs flex items-center gap-2 shadow-2xl animate-fade-in backdrop-blur-md">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold text-indigo-200">{snapshotToast}</span>
              <div className="text-[10px] text-slate-300 mt-0.5 flex items-center gap-2">
                <span>Tier 3 Media frame ready</span>
                {capturedSnapshot && (
                  <a
                    href={capturedSnapshot.dataUrl}
                    download="aura-live-snapshot.jpg"
                    className="text-cyan-300 underline font-medium hover:text-white flex items-center gap-0.5"
                  >
                    <Download className="w-2.5 h-2.5" /> Download
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
