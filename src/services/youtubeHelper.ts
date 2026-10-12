/**
 * YouTube and YouTube Live Helper for AURA
 * Supports YouTube Live streams, standard videos, and oEmbed metadata extraction.
 */

export interface YouTubeLivePreset {
  id: string;
  title: string;
  channel: string;
  category: string;
  youtubeUrl: string;
  youtubeId: string;
  description: string;
  sampleTranscription: string;
  urgentAlert: string;
}

export const YOUTUBE_LIVE_PRESETS: YouTubeLivePreset[] = [
  {
    id: 'nasa_live',
    title: 'NASA Live: Earth Views & Space Station Feed',
    channel: 'NASA Official',
    category: 'Science & Aerospace',
    youtubeUrl: 'https://www.youtube.com/watch?v=21X5lGlDOfg',
    youtubeId: '21X5lGlDOfg',
    description: 'Continuous live views of Earth from the International Space Station with crew communications and mission control updates.',
    sampleTranscription: 'Mission Control Houston to Station: We are reviewing the solar array tracking telemetry and payload rack status. Orbital daylight begins over the South Pacific in approximately four minutes. Atmospheric telemetry confirms all life-support readings within nominal limits.',
    urgentAlert: 'MISSION BULLETIN: Solar array realignment sequence initiated. Secondary power distribution locked nominal.',
  },
  {
    id: 'bloomberg_live',
    title: 'Bloomberg Global Financial News Live',
    channel: 'Bloomberg Television',
    category: 'Breaking News & Markets',
    youtubeUrl: 'https://www.youtube.com/watch?v=dp8PhLsUcFE',
    youtubeId: 'dp8PhLsUcFE',
    description: 'Live global market coverage, economic data releases, central bank decisions, and breaking financial updates.',
    sampleTranscription: 'Anchor: Breaking headlines across global markets as the benchmark 10-year yield moves three basis points following morning employment data. Tech indices indicate higher open while commodity futures stabilize.',
    urgentAlert: 'BREAKING FINANCIAL ALERT: Benchmark yield shifts 3 bps; Federal Reserve statement expected at 18:00 UTC.',
  },
  {
    id: 'sky_news_live',
    title: 'Sky News Live 24/7 International Stream',
    channel: 'Sky News',
    category: 'Breaking News',
    youtubeUrl: 'https://www.youtube.com/watch?v=9Auq9mYxFEE',
    youtubeId: '9Auq9mYxFEE',
    description: '24/7 live international breaking news broadcasting from correspondents across the globe.',
    sampleTranscription: 'Correspondent on the ground: We are seeing immediate emergency services deployed along the central transit corridor following the severe weather warning issued thirty minutes ago. Authorities urge all non-essential travel to halt.',
    urgentAlert: 'URGENT WEATHER BULLETIN: Gale force advisory issued for coastal transit corridors. Non-essential travel halted.',
  },
  {
    id: 'lofi_study',
    title: 'Lofi Girl - Live Beats & Study Session',
    channel: 'Lofi Girl',
    category: 'E-Learning & Focus',
    youtubeUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    youtubeId: 'jfKfPfyJRdk',
    description: 'Live ambient focus broadcast for remote students, coders, and continuous work sessions.',
    sampleTranscription: 'Instructor voiceover: Welcome to the focused study session. We are covering algorithmic time complexity and data structures today. Make sure to complete problem set 3 before the end of the sprint.',
    urgentAlert: 'STUDY SESSION ANNOUNCEMENT: Assignment submission window closes at 23:59 UTC today.',
  },
];

/**
 * Extracts YouTube Video ID from any standard YouTube URL (standard, shorts, live, or embed)
 */
export function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // If user pasted pure 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex covering:
  // - youtube.com/watch?v=ID
  // - youtube.com/live/ID
  // - youtu.be/ID
  // - youtube.com/embed/ID
  // - youtube.com/v/ID
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([a-zA-Z0-9_-]{11})/
  );

  return match ? match[1] : null;
}

/**
 * Checks if a given string is a valid YouTube URL or ID
 */
export function isYouTubeUrl(url?: string): boolean {
  return extractYouTubeId(url) !== null;
}

/**
 * Generates responsive YouTube embed URL with options
 */
export function getYouTubeEmbedUrl(
  youtubeId: string,
  options: {
    autoplay?: boolean;
    mute?: boolean;
    controls?: boolean;
  } = {}
): string {
  const params = new URLSearchParams({
    enablejsapi: '1',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });

  if (options.autoplay !== false) {
    params.set('autoplay', '1');
  }
  if (options.mute) {
    params.set('mute', '1');
  }
  if (options.controls === false) {
    params.set('controls', '0');
  }

  return `https://www.youtube-nocookie.com/embed/${youtubeId}?${params.toString()}`;
}

/**
 * Fetches video metadata (title, author) via public oEmbed endpoint
 */
export async function fetchYouTubeOEmbed(youtubeUrlOrId: string): Promise<{
  title?: string;
  authorName?: string;
  thumbnailUrl?: string;
} | null> {
  const id = extractYouTubeId(youtubeUrlOrId);
  if (!id) return null;

  try {
    const embedApi = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`;
    const res = await fetch(embedApi);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title,
      authorName: data.author_name,
      thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  } catch {
    return {
      title: `YouTube Live Stream (${id})`,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }
}
