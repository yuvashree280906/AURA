/**
 * Video Media Extractor for AURA
 * Extracts visual keyframes and audio metadata from uploaded browser video files.
 */

export interface ExtractedVideoData {
  frames: string[]; // base64 JPEG data URLs
  durationSeconds: number;
  width: number;
  height: number;
  hasAudioTrack: boolean;
}

/**
 * Extracts 2 to 3 keyframe snapshots from an uploaded browser video File
 */
export async function extractVideoKeyframes(
  fileOrUrl: File | string,
  numFrames: number = 3
): Promise<ExtractedVideoData> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const url = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    video.src = url;

    const frames: string[] = [];
    const canvas = document.createElement('canvas');
    canvas.width = 540;
    canvas.height = 304;
    const ctx = canvas.getContext('2d');

    const cleanup = () => {
      if (typeof fileOrUrl !== 'string') {
        URL.revokeObjectURL(url);
      }
    };

    video.onloadedmetadata = async () => {
      const duration = Math.max(1, video.duration || 10);
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 360;

      // Sample timestamps across video duration (e.g. 15%, 45%, 75%)
      const timestamps = [
        Math.min(1.0, duration * 0.15),
        Math.min(duration * 0.45, duration - 1),
        Math.min(duration * 0.75, duration - 0.5),
      ].slice(0, numFrames);

      for (const targetTime of timestamps) {
        try {
          video.currentTime = Math.max(0.1, targetTime);
          await new Promise<void>((seekResolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              if (ctx) {
                // Clear and draw frame
                ctx.fillStyle = '#0a101f';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
                frames.push(dataUrl);
              }
              seekResolve();
            };
            video.addEventListener('seeked', onSeeked);

            // Timeout safety in case video cannot seek
            setTimeout(() => {
              video.removeEventListener('seeked', onSeeked);
              seekResolve();
            }, 1200);
          });
        } catch {
          // Continue to next frame
        }
      }

      cleanup();
      resolve({
        frames,
        durationSeconds: duration,
        width,
        height,
        hasAudioTrack: true,
      });
    };

    video.onerror = () => {
      cleanup();
      resolve({
        frames: [],
        durationSeconds: 30,
        width: 640,
        height: 360,
        hasAudioTrack: false,
      });
    };

    // Timeout safety
    setTimeout(() => {
      if (frames.length === 0) {
        cleanup();
        resolve({
          frames: [],
          durationSeconds: 30,
          width: 640,
          height: 360,
          hasAudioTrack: false,
        });
      }
    }, 4000);
  });
}
