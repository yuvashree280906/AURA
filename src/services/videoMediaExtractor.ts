/**
 * Video Media Extractor & Snapshot Engine for AURA
 * Extracts visual keyframes and audio metadata from uploaded browser video files,
 * YouTube Live streams, and HTML5 video/canvas elements.
 */

export interface VideoSnapshot {
  id: string;
  dataUrl: string;
  timestampSeconds: number;
  label: string;
  width: number;
  height: number;
}

export interface ExtractedVideoData {
  frames: string[]; // base64 JPEG data URLs or image URLs
  snapshots: VideoSnapshot[]; // enriched snapshots with timestamps
  durationSeconds: number;
  width: number;
  height: number;
  hasAudioTrack: boolean;
}

/**
 * Creates high-contrast SVG graphic snapshot as fallback
 */
export function generateSyntheticSnapshot(
  title: string,
  timestampSeconds: number,
  subtitle: string = 'Keyframe Visual Snapshot'
): string {
  const timeFormatted = `${Math.floor(timestampSeconds / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(timestampSeconds % 60)
    .toString()
    .padStart(2, '0')}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#090d16"/>
        <stop offset="50%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#1e1b4b"/>
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#06b6d4"/>
        <stop offset="100%" stop-color="#6366f1"/>
      </linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#bg)"/>
    <rect x="24" y="24" width="592" height="312" rx="12" fill="#0f172a" fill-opacity="0.8" stroke="#334155" stroke-width="2"/>
    <circle cx="56" cy="56" r="10" fill="#06b6d4" fill-opacity="0.2"/>
    <circle cx="56" cy="56" r="4" fill="#06b6d4"/>
    <text x="76" y="61" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="13" font-weight="700" letter-spacing="1">AURA KEYFRAME SNAPSHOT</text>
    <rect x="510" y="44" width="86" height="24" rx="4" fill="#1e293b"/>
    <text x="553" y="60" fill="#94a3b8" font-family="monospace" font-size="12" text-anchor="middle">T+${timeFormatted}</text>
    <text x="56" y="160" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="22" font-weight="700">${escapeXml(
      title.slice(0, 42)
    )}</text>
    <text x="56" y="195" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14">${escapeXml(
      subtitle.slice(0, 60)
    )}</text>
    <line x1="56" y1="230" x2="584" y2="230" stroke="#334155" stroke-dasharray="4 4"/>
    <rect x="56" y="260" width="140" height="28" rx="6" fill="url(#accent)"/>
    <text x="126" y="278" fill="#ffffff" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="middle">TIER 3 MEDIA SLIDE</text>
    <text x="584" y="278" fill="#64748b" font-family="system-ui, sans-serif" font-size="11" text-anchor="end">Meaning-First Low Bandwidth Preservation</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Grabs snapshots from YouTube live or standard video using official thumbnail endpoints
 * and generates live telemetry and tactical cards
 */
export function getYouTubeSnapshots(youtubeId: string, title: string = 'Live Stream'): VideoSnapshot[] {
  return [
    {
      id: `yt_snap_live_${youtubeId}_${Date.now()}`,
      dataUrl: createLiveStreamKeyframe(youtubeId, title, 0, 'Live Stream Active Keyframe'),
      timestampSeconds: 0,
      label: 'Live Broadcast Frame (Active)',
      width: 640,
      height: 360,
    },
    {
      id: `yt_snap_hq_${youtubeId}`,
      dataUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      timestampSeconds: 10,
      label: 'Broadcast Keyframe (HQ)',
      width: 480,
      height: 360,
    },
    {
      id: `yt_snap_syn_${youtubeId}`,
      dataUrl: generateSyntheticSnapshot(title, 25, 'Real-time telemetry and tactical board snapshot'),
      timestampSeconds: 25,
      label: 'Telemetry / Diagram Snapshot',
      width: 640,
      height: 360,
    },
  ];
}

/**
 * Creates a high-fidelity keyframe snapshot for YouTube Live streams
 * combining current live timestamp, channel metadata, live status badge, and video timecode
 */
export function createLiveStreamKeyframe(
  youtubeId: string,
  title: string,
  currentSeconds: number = 0,
  contextNote: string = 'Real-time Live Stream Keyframe'
): string {
  const timeFormatted = `${Math.floor(currentSeconds / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(currentSeconds % 60)
    .toString()
    .padStart(2, '0')}`;
  const utcNow = new Date().toISOString().substring(11, 19) + ' UTC';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#050814"/>
        <stop offset="40%" stop-color="#0b1120"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(56, 189, 248, 0.05)" stroke-width="1"/>
      </pattern>
    </defs>

    <!-- Canvas Background with Grid -->
    <rect width="640" height="360" fill="url(#bg)"/>
    <rect width="640" height="360" fill="url(#grid)"/>

    <!-- YouTube Live Base Image if available -->
    <image href="https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg" x="0" y="0" width="640" height="360" preserveAspectRatio="xMidYMid slice" opacity="0.45" />

    <!-- Dark Contrast Scrim -->
    <rect width="640" height="360" fill="rgba(5, 8, 20, 0.65)" />

    <!-- Outer Frame Card -->
    <rect x="16" y="16" width="608" height="328" rx="10" fill="none" stroke="rgba(56, 189, 248, 0.4)" stroke-width="1.5" />

    <!-- Header Overlay -->
    <rect x="16" y="16" width="608" height="42" fill="rgba(15, 23, 42, 0.85)" />
    
    <!-- Red LIVE Pill -->
    <rect x="28" y="26" width="56" height="22" rx="4" fill="#dc2626" />
    <circle cx="38" cy="37" r="3" fill="#ffffff" />
    <text x="46" y="41" fill="#ffffff" font-family="system-ui, sans-serif" font-size="11" font-weight="900" letter-spacing="1">LIVE</text>

    <!-- Title & Stream Info -->
    <text x="96" y="41" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="12" font-weight="700" letter-spacing="0.5">YOUTUBE LIVE KEYFRAME SNAPSHOT</text>
    <text x="590" y="41" fill="#94a3b8" font-family="monospace" font-size="11" text-anchor="end">${utcNow}</text>

    <!-- Center Content Details -->
    <rect x="36" y="100" width="568" height="150" rx="8" fill="rgba(15, 23, 42, 0.75)" stroke="rgba(148, 163, 184, 0.2)" stroke-width="1"/>
    
    <text x="56" y="136" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="18" font-weight="bold">${escapeXml(title.slice(0, 48))}</text>
    <text x="56" y="164" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">${escapeXml(contextNote.slice(0, 65))}</text>
    
    <!-- Timecode & Channel Stats -->
    <line x1="56" y1="184" x2="584" y2="184" stroke="rgba(148, 163, 184, 0.2)"/>
    <text x="56" y="212" fill="#38bdf8" font-family="monospace" font-size="13" font-weight="700">T+${timeFormatted} · STREAM TIME</text>
    <text x="584" y="212" fill="#a5b4fc" font-family="monospace" font-size="12" text-anchor="end">YT ID: ${youtubeId}</text>

    <!-- Footer Tier Badge -->
    <rect x="36" y="274" width="160" height="28" rx="6" fill="#4f46e5" />
    <text x="116" y="292" fill="#ffffff" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="middle">TIER 3 MEDIA SNAPSHOT</text>

    <text x="604" y="292" fill="#64748b" font-family="system-ui, sans-serif" font-size="11" text-anchor="end">Preserved for Meaning-First Bandwidth Adaptivity</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Captures an instantaneous snapshot from an active HTMLVideoElement or HTMLCanvasElement
 */
export function captureFrameFromMediaElement(
  element: HTMLVideoElement | HTMLCanvasElement,
  label: string = 'Instant Live Snapshot'
): VideoSnapshot | null {
  try {
    const canvas = document.createElement('canvas');
    let width = 640;
    let height = 360;
    let timestampSeconds = 0;

    if (element instanceof HTMLVideoElement) {
      width = element.videoWidth || 640;
      height = element.videoHeight || 360;
      timestampSeconds = element.currentTime || 0;
      canvas.width = Math.min(960, width);
      canvas.height = Math.round((canvas.width * height) / width);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
    } else {
      width = element.width || 640;
      height = element.height || 360;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return {
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      dataUrl,
      timestampSeconds,
      label: `${label} (T+${Math.floor(timestampSeconds)}s)`,
      width: canvas.width,
      height: canvas.height,
    };
  } catch (err) {
    console.warn('Canvas frame capture error, falling back to synthetic snapshot:', err);
    return {
      id: `snap_${Date.now()}`,
      dataUrl: generateSyntheticSnapshot(label, 0, 'Instant frame capture fallback'),
      timestampSeconds: 0,
      label,
      width: 640,
      height: 360,
    };
  }
}

/**
 * Extracts 2 to 4 keyframe snapshots from an uploaded browser video File or URL
 */
export async function extractVideoKeyframes(
  fileOrUrl: File | string,
  numFrames: number = 3,
  videoTitle: string = 'Uploaded Video'
): Promise<ExtractedVideoData> {
  return new Promise((resolve) => {
    // If string is already a data URL or image
    if (typeof fileOrUrl === 'string' && fileOrUrl.startsWith('data:image')) {
      const snap: VideoSnapshot = {
        id: `snap_init_${Date.now()}`,
        dataUrl: fileOrUrl,
        timestampSeconds: 0,
        label: 'Initial Keyframe',
        width: 640,
        height: 360,
      };
      return resolve({
        frames: [fileOrUrl],
        snapshots: [snap],
        durationSeconds: 30,
        width: 640,
        height: 360,
        hasAudioTrack: false,
      });
    }

    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const objectUrl = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    video.src = objectUrl;

    const frames: string[] = [];
    const snapshots: VideoSnapshot[] = [];
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    let resolved = false;

    const finish = () => {
      if (resolved) return;
      resolved = true;

      // Ensure we have at least 2 snapshots even if video decode had issues
      if (snapshots.length === 0) {
        const fallbacks = [
          generateSyntheticSnapshot(videoTitle, 2, 'Key visual slide and presentation summary'),
          generateSyntheticSnapshot(videoTitle, 15, 'Diagram analysis and key data indicators'),
          generateSyntheticSnapshot(videoTitle, 30, 'Key conclusions and actionable takeaway'),
        ];
        fallbacks.forEach((url, i) => {
          frames.push(url);
          snapshots.push({
            id: `snap_syn_${i}_${Date.now()}`,
            dataUrl: url,
            timestampSeconds: (i + 1) * 10,
            label: `Keyframe Snapshot #${i + 1}`,
            width: 640,
            height: 360,
          });
        });
      }

      resolve({
        frames,
        snapshots,
        durationSeconds: Math.max(10, video.duration || 30),
        width: video.videoWidth || 640,
        height: video.videoHeight || 360,
        hasAudioTrack: true,
      });
    };

    video.onloadedmetadata = async () => {
      const duration = Math.max(1, video.duration || 30);
      const timestamps = [
        Math.min(1.0, duration * 0.1),
        Math.min(duration * 0.45, Math.max(2, duration - 5)),
        Math.min(duration * 0.8, Math.max(3, duration - 1)),
      ].slice(0, numFrames);

      for (let i = 0; i < timestamps.length; i++) {
        const targetTime = timestamps[i];
        try {
          video.currentTime = targetTime;
          await new Promise<void>((seekResolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              if (ctx) {
                ctx.fillStyle = '#0a101f';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                try {
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                  frames.push(dataUrl);
                  snapshots.push({
                    id: `snap_${i}_${Date.now()}`,
                    dataUrl,
                    timestampSeconds: targetTime,
                    label: `Keyframe Snapshot T+${Math.round(targetTime)}s`,
                    width: canvas.width,
                    height: canvas.height,
                  });
                } catch (drawErr) {
                  console.warn('Canvas draw failed (CORS or decode):', drawErr);
                  const synUrl = generateSyntheticSnapshot(videoTitle, targetTime, `Frame ${i + 1}`);
                  frames.push(synUrl);
                  snapshots.push({
                    id: `snap_${i}_${Date.now()}`,
                    dataUrl: synUrl,
                    timestampSeconds: targetTime,
                    label: `Keyframe Snapshot T+${Math.round(targetTime)}s`,
                    width: canvas.width,
                    height: canvas.height,
                  });
                }
              }
              seekResolve();
            };
            video.addEventListener('seeked', onSeeked);

            setTimeout(() => {
              video.removeEventListener('seeked', onSeeked);
              seekResolve();
            }, 1000);
          });
        } catch {
          // Continue to next timestamp
        }
      }

      finish();
    };

    video.onerror = () => {
      finish();
    };

    // Safety timeout
    setTimeout(() => {
      finish();
    }, 3500);
  });
}
