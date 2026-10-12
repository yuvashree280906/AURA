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
} from 'lucide-react';
import { BroadcastMode } from '../../types/scheduler';
import { extractYouTubeId, getYouTubeEmbedUrl } from '../../services/youtubeHelper';

interface VideoPlayerProps {
  videoUrl?: string;
  isStalled: boolean;
  playerBufferSeconds: number;
  mode: BroadcastMode;
  bandwidthKbps: number;
  activeItemTitle?: string;
  activeSubtitle?: string;
  isLive: boolean;
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

  const youtubeId = extractYouTubeId(videoUrl);
  const isYouTube = !!youtubeId;
  const [useCanvasPattern, setUseCanvasPattern] = useState<boolean>(!videoUrl && !isYouTube);

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

        {/* Buffering Stall Overlay (Triggered by scheduler) */}
        {isStalled && (
          <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 animate-spin">
              <RotateCcw className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">
              {mode === 'BASELINE'
                ? 'Video Frozen: Severe Network Buffering'
                : 'Video Paused to Free Channel for Urgent Alerts'}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mb-3">
              {mode === 'BASELINE'
                ? `Conventional baseline cannot deliver heavy video frames under ${bandwidthKbps} kbps. Playback is paused waiting for segment download.`
                : `AURA preserved audio and critical text channels while holding video until bandwidth recovers.`}
            </p>
            {mode === 'AURA' && (
              <div className="flex items-center gap-2 text-xs font-medium text-cyan-300 bg-cyan-950/60 border border-cyan-800 px-3 py-1.5 rounded-lg">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Text and Audio Feeds Remain Active in Background</span>
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
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
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
                  onClick={() => {
                    setPlaybackRate(rate);
                    if (videoRef.current) videoRef.current.playbackRate = rate;
                  }}
                  className={`px-1.5 py-0.5 rounded ${
                    playbackRate === rate ? 'bg-cyan-500 text-slate-950 font-bold' : 'hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

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
      </div>
    </div>
  );
};
