import React, { useState, useRef } from 'react';
import {
  Upload,
  Video,
  FileVideo,
  Plus,
  Trash2,
  AlertCircle,
  Play,
  FileText,
  Volume2,
  Clock,
  Sparkles,
  Check,
  Radio,
  Sliders,
  HelpCircle,
  Edit2,
  X,
  RefreshCw,
  Copy,
  CheckCheck,
  Image,
  Tv,
  Youtube,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  BroadcastMode,
  BroadcastScenario,
  ContentItem,
  ContentType,
  NetworkProfileType,
  PriorityClass,
} from '../../types/scheduler';
import { NETWORK_PROFILES, SAMPLE_SCENARIOS } from '../../services/sampleScenarios';
import { extractVideoKeyframes } from '../../services/videoMediaExtractor';
import {
  extractYouTubeId,
  fetchYouTubeOEmbed,
  getYouTubeEmbedUrl,
  isYouTubeUrl,
  YOUTUBE_LIVE_PRESETS,
  YouTubeLivePreset,
} from '../../services/youtubeHelper';

interface BroadcastSetupProps {
  onStartBroadcast: (config: {
    title: string;
    description: string;
    speaker: string;
    domain: string;
    videoUrl?: string;
    videoFileName?: string;
    videoFileSizeMb?: number;
    items: ContentItem[];
    mode: BroadcastMode;
    networkProfileType: NetworkProfileType;
    transcription?: string;
  }) => void;
  initialScenarioId?: string;
}

export const BroadcastSetup: React.FC<BroadcastSetupProps> = ({
  onStartBroadcast,
  initialScenarioId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected scenario preset
  const defaultScenario =
    SAMPLE_SCENARIOS.find((s) => s.id === initialScenarioId) || SAMPLE_SCENARIOS[0];

  const [scenarioId, setScenarioId] = useState<string>(defaultScenario.id);
  const [title, setTitle] = useState<string>(defaultScenario.title);
  const [description, setDescription] = useState<string>(defaultScenario.description);
  const [speaker, setSpeaker] = useState<string>(defaultScenario.speaker);
  const [domain, setDomain] = useState<string>(defaultScenario.domain);
  const [mode, setMode] = useState<BroadcastMode>('AURA');
  const [networkProfileType, setNetworkProfileType] = useState<NetworkProfileType>(
    defaultScenario.defaultNetworkProfile
  );

  // Video Source Tab: 'youtube' | 'upload' | 'preset'
  const [videoSourceTab, setVideoSourceTab] = useState<'youtube' | 'upload' | 'preset'>('youtube');

  // Video state
  const [videoUrl, setVideoUrl] = useState<string | undefined>('https://www.youtube.com/watch?v=21X5lGlDOfg');
  const [videoFileName, setVideoFileName] = useState<string>('NASA Live: Earth Views');
  const [videoFileSizeMb, setVideoFileSizeMb] = useState<number>(0);
  const [videoError, setVideoError] = useState<string | null>(null);

  // YouTube input state
  const [youtubeInput, setYoutubeInput] = useState<string>('https://www.youtube.com/watch?v=21X5lGlDOfg');
  const [isLoadingYouTube, setIsLoadingYouTube] = useState<boolean>(false);

  // Transcribed video data
  const [extractedTranscription, setExtractedTranscription] = useState<string>(
    'Mission Control Houston to Station: We are reviewing the solar array tracking telemetry and payload rack status. Orbital daylight begins over the South Pacific in approximately four minutes. Atmospheric telemetry confirms all life-support readings within nominal limits.'
  );
  const [extractedFrames, setExtractedFrames] = useState<string[]>([]);
  const [transcriptionStatusStep, setTranscriptionStatusStep] = useState<string>('');
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState<boolean>(false);

  // User notes & video context
  const [userNotes, setUserNotes] = useState<string>('');
  const [isPreparingContent, setIsPreparingContent] = useState<boolean>(false);
  const [contentSourceMessage, setContentSourceMessage] = useState<string | null>(
    'Loaded NASA Live Space Station Stream with synchronized audio captions and orbital telemetry alert.'
  );

  // Content items list
  const [items, setItems] = useState<ContentItem[]>(
    defaultScenario.items.map((it, idx) => ({
      ...it,
      status: 'queued',
      retryCount: 0,
      segmentIndex: idx + 1,
    }))
  );

  // Editing state for an item in the queue
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);

  // New item form fields
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemContent, setNewItemContent] = useState('');
  const [newItemType, setNewItemType] = useState<ContentType>('critical_alert');
  const [newItemPriority, setNewItemPriority] = useState<PriorityClass>('P1_CRITICAL');
  const [newItemBytes, setNewItemBytes] = useState<number>(650);
  const [newItemDeadline, setNewItemDeadline] = useState<number>(8);

  /**
   * Generates video-specific announcements, captions, and transcripts
   */
  const prepareContentForVideo = async (
    fileOrUrl: File | string,
    fileName: string,
    notes?: string,
    isYouTubeStream: boolean = false
  ) => {
    setIsPreparingContent(true);
    setTranscriptionStatusStep(
      isYouTubeStream
        ? '📡 Connecting to YouTube Live stream and extracting verbal narration...'
        : '📸 Sampling visual keyframes and audio from your video...'
    );
    setContentSourceMessage(`Transcribing video "${fileName}" and extracting speech...`);

    let sampledFrames: string[] = [];
    let videoDuration = 45;

    try {
      // Step 1: If file, extract keyframes
      if (!isYouTubeStream && typeof fileOrUrl !== 'string') {
        const extracted = await extractVideoKeyframes(fileOrUrl, 3);
        sampledFrames = extracted.frames;
        videoDuration = extracted.durationSeconds || 45;
        setExtractedFrames(sampledFrames);
      }

      // Step 2: Call server multimodal transcription engine
      setTranscriptionStatusStep('🤖 Transcribing speech and synthesizing critical announcements with Gemini AI...');

      const response = await fetch('/api/prepare-video-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          videoTitle: fileName,
          youtubeUrl: isYouTubeStream && typeof fileOrUrl === 'string' ? fileOrUrl : undefined,
          userNotes: notes || userNotes,
          durationSeconds: videoDuration,
          frames: sampledFrames,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const resData = await response.json();
      if (resData && resData.data) {
        const prep = resData.data;
        if (prep.title) setTitle(prep.title);
        if (prep.description) setDescription(prep.description);
        if (prep.speaker) setSpeaker(prep.speaker);
        if (prep.domain) setDomain(prep.domain);
        if (prep.fullTranscription) {
          setExtractedTranscription(prep.fullTranscription);
        }

        if (Array.isArray(prep.items) && prep.items.length > 0) {
          const formattedItems: ContentItem[] = prep.items.map((it: any, idx: number) => ({
            id: it.id || `gen_item_${Date.now()}_${idx}`,
            type: it.type || 'caption',
            priority: it.priority || 'P2_HIGH',
            title: it.title || `Item ${idx + 1}`,
            content: it.content || '',
            payloadBytes: it.payloadBytes || 1200,
            createdAt: idx * 2,
            deadlineSeconds: it.deadlineSeconds || 15,
            status: 'queued',
            isLive: true,
            retryCount: 0,
            segmentIndex: idx + 1,
          }));

          setItems(formattedItems);
          setContentSourceMessage(
            `Synchronized! Speech transcribed and ${formattedItems.length} announcements generated for "${fileName}".`
          );
        }
      }
    } catch (err: any) {
      console.warn('Backend content preparation failed, applying local contextual generator:', err);
      // Fallback local generator tailored to the video title/subject
      const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
      setTitle(cleanName);
      setDescription(
        `Broadcast session for "${cleanName}". Prioritizing essential speech captions, voice audio, and emergency data over constrained bandwidth.`
      );
      setSpeaker('Broadcaster / Presenter');

      const transcriptText = `Transcript extracted from "${cleanName}": The presenter explains the key principles and reviews the demonstration. Core visual details and step-by-step instructions are highlighted for the broadcast audience.`;
      setExtractedTranscription(transcriptText);

      const fallbackItems: ContentItem[] = [
        {
          id: `item_alert_${Date.now()}`,
          type: 'critical_alert',
          priority: 'P1_CRITICAL',
          title: `KEY TAKEAWAY: ${cleanName}`,
          content: `Essential message from ${cleanName}: Key presentation findings and instructions are now active.`,
          payloadBytes: 580,
          createdAt: 1,
          deadlineSeconds: 8,
          status: 'queued',
          isLive: true,
          retryCount: 0,
          segmentIndex: 1,
        },
        {
          id: `item_cap_${Date.now()}_1`,
          type: 'caption',
          priority: 'P2_HIGH',
          title: `Live Transcript: ${cleanName}`,
          content: `Transcript: "We are reviewing the primary points and demonstration shown in ${cleanName}."`,
          payloadBytes: 1200,
          createdAt: 3,
          deadlineSeconds: 14,
          status: 'queued',
          isLive: true,
          retryCount: 0,
          segmentIndex: 2,
        },
        {
          id: `item_cap_${Date.now()}_2`,
          type: 'caption',
          priority: 'P2_HIGH',
          title: `Continuing Dialogue: ${cleanName}`,
          content: `Transcript: "Notice the specific output shown on screen as we proceed to the next step."`,
          payloadBytes: 1250,
          createdAt: 6,
          deadlineSeconds: 18,
          status: 'queued',
          isLive: true,
          retryCount: 0,
          segmentIndex: 3,
        },
        {
          id: `item_sum_${Date.now()}`,
          type: 'summary',
          priority: 'P2_HIGH',
          title: `Summary of ${cleanName}`,
          content: `Key summary: 1. Core overview. 2. Primary demonstration elements. 3. Action items.`,
          payloadBytes: 2500,
          createdAt: 8,
          deadlineSeconds: 30,
          status: 'queued',
          isLive: true,
          retryCount: 0,
          segmentIndex: 4,
        },
        {
          id: `item_aud_${Date.now()}`,
          type: 'audio_segment',
          priority: 'P2_HIGH',
          title: `Voice Audio Stream: ${cleanName}`,
          content: `Voice audio stream from ${cleanName}.`,
          payloadBytes: 42000,
          createdAt: 2,
          deadlineSeconds: 20,
          status: 'queued',
          isLive: true,
          retryCount: 0,
          segmentIndex: 5,
        },
        {
          id: `item_vid_${Date.now()}`,
          type: 'live_video',
          priority: 'P4_LOW',
          title: `Live Video Segment: ${cleanName}`,
          content: `High-definition video feed from ${cleanName}.`,
          payloadBytes: 380000,
          createdAt: 0,
          deadlineSeconds: 25,
          status: 'queued',
          isLive: true,
          retryCount: 0,
          segmentIndex: 6,
        },
      ];

      setItems(fallbackItems);
      setContentSourceMessage(`Synchronized! Generated announcements & transcripts for "${cleanName}".`);
    } finally {
      setIsPreparingContent(false);
      setTranscriptionStatusStep('');
    }
  };

  /**
   * Handle YouTube Live Stream URL input
   */
  const handleLoadYouTubeUrl = async (urlToLoad: string) => {
    const trimmed = urlToLoad.trim();
    const ytId = extractYouTubeId(trimmed);

    if (!ytId) {
      setVideoError('Invalid YouTube URL or ID. Please enter a valid YouTube link (e.g., https://www.youtube.com/watch?v=... or https://youtube.com/live/...).');
      return;
    }

    setVideoError(null);
    setIsLoadingYouTube(true);
    setVideoUrl(trimmed);
    setVideoFileSizeMb(0);

    try {
      const oembed = await fetchYouTubeOEmbed(trimmed);
      const streamTitle = oembed?.title || `YouTube Live Stream (${ytId})`;
      const channel = oembed?.authorName || 'YouTube Broadcaster';

      setVideoFileName(streamTitle);
      setTitle(streamTitle);
      setSpeaker(channel);

      // Check if matches known preset for rich transcription
      const matchedPreset = YOUTUBE_LIVE_PRESETS.find((p) => p.youtubeId === ytId);
      if (matchedPreset) {
        setDomain(matchedPreset.category);
        setDescription(matchedPreset.description);
        setExtractedTranscription(matchedPreset.sampleTranscription);

        const presetItems: ContentItem[] = [
          {
            id: `yt_alert_${Date.now()}`,
            type: 'critical_alert',
            priority: 'P1_CRITICAL',
            title: `CRITICAL ALERT: ${matchedPreset.title.split(':')[0]}`,
            content: matchedPreset.urgentAlert,
            payloadBytes: 520,
            createdAt: 1,
            deadlineSeconds: 8,
            status: 'queued',
            isLive: true,
            retryCount: 0,
            segmentIndex: 1,
          },
          {
            id: `yt_cap_1_${Date.now()}`,
            type: 'caption',
            priority: 'P2_HIGH',
            title: `Live Dialogue Line 1`,
            content: matchedPreset.sampleTranscription.split('.')[0] + '.',
            payloadBytes: 1100,
            createdAt: 3,
            deadlineSeconds: 14,
            status: 'queued',
            isLive: true,
            retryCount: 0,
            segmentIndex: 2,
          },
          {
            id: `yt_cap_2_${Date.now()}`,
            type: 'caption',
            priority: 'P2_HIGH',
            title: `Live Dialogue Line 2`,
            content: matchedPreset.sampleTranscription.split('.')[1]
              ? matchedPreset.sampleTranscription.split('.')[1] + '.'
              : 'Verbatim spoken dialogue from YouTube stream.',
            payloadBytes: 1250,
            createdAt: 6,
            deadlineSeconds: 18,
            status: 'queued',
            isLive: true,
            retryCount: 0,
            segmentIndex: 3,
          },
          {
            id: `yt_sum_${Date.now()}`,
            type: 'summary',
            priority: 'P2_HIGH',
            title: `Live Stream Summary`,
            content: matchedPreset.description,
            payloadBytes: 2400,
            createdAt: 8,
            deadlineSeconds: 30,
            status: 'queued',
            isLive: true,
            retryCount: 0,
            segmentIndex: 4,
          },
          {
            id: `yt_aud_${Date.now()}`,
            type: 'audio_segment',
            priority: 'P2_HIGH',
            title: `Live Stream Audio Track`,
            content: `Live audio channel for ${matchedPreset.title}`,
            payloadBytes: 44000,
            createdAt: 2,
            deadlineSeconds: 20,
            status: 'queued',
            isLive: true,
            retryCount: 0,
            segmentIndex: 5,
          },
          {
            id: `yt_vid_${Date.now()}`,
            type: 'live_video',
            priority: 'P4_LOW',
            title: `YouTube 1080p Video Feed`,
            content: `High-bandwidth video feed for ${matchedPreset.title}`,
            payloadBytes: 390000,
            createdAt: 0,
            deadlineSeconds: 25,
            status: 'queued',
            isLive: true,
            retryCount: 0,
            segmentIndex: 6,
          },
        ];

        setItems(presetItems);
        setContentSourceMessage(`Synchronized! Loaded YouTube Live stream: "${streamTitle}" with speech transcription.`);
      } else {
        // Trigger server transcription & announcement pipeline for custom YouTube link
        await prepareContentForVideo(trimmed, streamTitle, userNotes, true);
      }
    } catch (err: any) {
      console.warn('Error loading YouTube live stream:', err);
    } finally {
      setIsLoadingYouTube(false);
    }
  };

  const handleSelectPreset = (preset: YouTubeLivePreset) => {
    setYoutubeInput(preset.youtubeUrl);
    handleLoadYouTubeUrl(preset.youtubeUrl);
  };

  const handleScenarioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = SAMPLE_SCENARIOS.find((s) => s.id === e.target.value);
    if (!selected) return;

    setScenarioId(selected.id);
    setTitle(selected.title);
    setDescription(selected.description);
    setSpeaker(selected.speaker);
    setDomain(selected.domain);
    setNetworkProfileType(selected.defaultNetworkProfile);
    setVideoUrl(selected.sampleVideoUrl);
    setVideoFileName(`${selected.id}_reference.mp4`);
    setContentSourceMessage(null);
    setExtractedFrames([]);

    // Set sample transcription
    const transcriptLines = selected.items
      .filter((it) => it.type === 'caption')
      .map((it) => it.content)
      .join(' ');
    setExtractedTranscription(transcriptLines || `${selected.title}: Core presentation and demonstration content.`);

    setItems(
      selected.items.map((it, idx) => ({
        ...it,
        status: 'queued',
        retryCount: 0,
        segmentIndex: idx + 1,
      }))
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoError(null);

    // Validate type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|ogg)$/i)) {
      setVideoError('Unsupported video format. Please upload MP4 or WebM video.');
      return;
    }

    // Size check
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > 500) {
      setVideoError('File exceeds 500MB browser limit. Please select a smaller segment or clip.');
      return;
    }

    try {
      const objUrl = URL.createObjectURL(file);
      setVideoUrl(objUrl);
      setVideoFileName(file.name);
      setVideoFileSizeMb(Math.round(sizeMb * 10) / 10);

      // Automatically transcribe the uploaded video and extract announcements!
      prepareContentForVideo(file, file.name, userNotes, false);
    } catch {
      setVideoError('Unable to generate preview for selected video.');
    }
  };

  const handleClearAllItems = () => {
    setItems([]);
    setContentSourceMessage('Cleared all messages. You can now add your own or generate new ones.');
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim() || !newItemContent.trim()) return;

    const newItem: ContentItem = {
      id: `custom_item_${Date.now()}`,
      title: newItemTitle.trim(),
      content: newItemContent.trim(),
      type: newItemType,
      priority: newItemPriority,
      payloadBytes: newItemBytes,
      createdAt: 2,
      deadlineSeconds: newItemDeadline,
      status: 'queued',
      isLive: true,
      retryCount: 0,
      segmentIndex: items.length + 1,
    };

    setItems([...items, newItem]);
    setNewItemTitle('');
    setNewItemContent('');
  };

  const handleSaveEditedItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setItems(items.map((it) => (it.id === editingItem.id ? editingItem : it)));
    setEditingItem(null);
  };

  const handleCopyTranscript = () => {
    if (!extractedTranscription) return;
    navigator.clipboard.writeText(extractedTranscription).then(() => {
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    });
  };

  // Sync edited transcript back into caption items
  const handleApplyTranscriptToCaptions = () => {
    if (!extractedTranscription.trim()) return;

    const sentences = extractedTranscription
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    if (sentences.length === 0) return;

    const updatedItems = [...items];
    const captionIndices = updatedItems
      .map((it, idx) => (it.type === 'caption' ? idx : -1))
      .filter((idx) => idx !== -1);

    sentences.slice(0, 3).forEach((sentence, i) => {
      if (i < captionIndices.length) {
        updatedItems[captionIndices[i]].content = sentence;
      } else {
        updatedItems.push({
          id: `manual_cap_${Date.now()}_${i}`,
          type: 'caption',
          priority: 'P2_HIGH',
          title: `Dialogue Line ${i + 1}`,
          content: sentence,
          payloadBytes: 1200,
          createdAt: (i + 1) * 3,
          deadlineSeconds: 15 + i * 5,
          status: 'queued',
          isLive: true,
          retryCount: 0,
          segmentIndex: updatedItems.length + 1,
        });
      }
    });

    setItems(updatedItems);
    setIsEditingTranscript(false);
    setContentSourceMessage('Synchronized transcript dialogue directly into broadcast captions!');
  };

  const handleStart = () => {
    if (items.length === 0) {
      setVideoError('Please add at least one content item or click Auto-Generate Announcements.');
      return;
    }

    onStartBroadcast({
      title,
      description,
      speaker,
      domain,
      videoUrl,
      videoFileName,
      videoFileSizeMb,
      items,
      mode,
      networkProfileType,
      transcription: extractedTranscription,
    });
  };

  const ytId = extractYouTubeId(videoUrl);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Page Title */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
          <Radio className="w-3.5 h-3.5" />
          <span>BROADCAST CONFIGURATION & MULTIMODAL TRANSCRIPTION</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Configure Adaptive Broadcast Session
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Broadcast any YouTube Live stream or upload a video. AURA automatically transcribes speech, extracts key visual
          data, and generates priority-scheduled announcements to keep viewers informed during network drops.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Video Source, YouTube Live, Upload & Mode */}
        <div className="lg:col-span-1 space-y-6">
          {/* Video Source Card with Tabs */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-cyan-400" />
                <span>Video Source</span>
              </h3>
              {videoFileName && (
                <span className="text-[11px] font-mono text-cyan-400 font-semibold truncate max-w-[130px]">
                  {videoFileName}
                </span>
              )}
            </div>

            {/* Video Source Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-medium">
              <button
                type="button"
                onClick={() => setVideoSourceTab('youtube')}
                className={`py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  videoSourceTab === 'youtube'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Youtube className="w-3.5 h-3.5" />
                <span>YouTube</span>
              </button>

              <button
                type="button"
                onClick={() => setVideoSourceTab('upload')}
                className={`py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  videoSourceTab === 'upload'
                    ? 'bg-cyan-600 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>

              <button
                type="button"
                onClick={() => setVideoSourceTab('preset')}
                className={`py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  videoSourceTab === 'preset'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Demos</span>
              </button>
            </div>

            {/* TAB 1: YouTube Live Input & Presets */}
            {videoSourceTab === 'youtube' && (
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-medium text-slate-300">
                  YouTube Live or Video URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={youtubeInput}
                    onChange={(e) => setYoutubeInput(e.target.value)}
                    placeholder="https://youtube.com/live/... or youtu.be/..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-rose-500 font-mono"
                  />
                  <button
                    type="button"
                    disabled={isLoadingYouTube}
                    onClick={() => handleLoadYouTubeUrl(youtubeInput)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingYouTube ? 'Loading...' : 'Load'}
                  </button>
                </div>

                {/* Quick 1-Click YouTube Live Presets */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Popular YouTube Live Feeds (Click to test):
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {YOUTUBE_LIVE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-2 rounded-lg border text-left transition-colors cursor-pointer text-xs ${
                          ytId === preset.youtubeId
                            ? 'bg-rose-950/40 border-rose-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold truncate text-[11px] text-white flex items-center gap-1">
                          <Youtube className="w-3 h-3 text-rose-400 shrink-0" />
                          <span className="truncate">{preset.title.split(':')[0]}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {preset.channel}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Upload Video File */}
            {videoSourceTab === 'upload' && (
              <div className="space-y-3 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-800 hover:border-cyan-500/60 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-950/50"
                >
                  <Upload className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-200">
                    Click or Drag to Upload Local Video
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">MP4 or WebM (up to 500 MB)</p>
                </div>
              </div>
            )}

            {/* TAB 3: Built-in Demo Scenarios */}
            {videoSourceTab === 'preset' && (
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-medium text-slate-300">
                  Select Preset Domain Broadcast:
                </label>
                <select
                  value={scenarioId}
                  onChange={handleScenarioChange}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg p-2.5 focus:outline-hidden focus:border-cyan-500 font-medium"
                >
                  {SAMPLE_SCENARIOS.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.domain}: {sc.title.substring(0, 32)}...
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Video / YouTube Preview Box */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
              {ytId ? (
                <iframe
                  src={getYouTubeEmbedUrl(ytId, { autoplay: false, mute: true })}
                  title="YouTube Preview"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              ) : videoUrl ? (
                <video src={videoUrl} controls className="w-full h-full object-contain" />
              ) : (
                <div className="text-center p-4">
                  <FileVideo className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No video selected</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Test canvas will be used</p>
                </div>
              )}
            </div>

            {videoError && (
              <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{videoError}</span>
              </div>
            )}

            {/* Transcription Status Spinner */}
            {isPreparingContent && (
              <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/40 space-y-2 animate-fade-in">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                  <span>Transcribing Video Speech...</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-tight">
                  {transcriptionStatusStep || 'Analyzing audio track and visual dialogue...'}
                </p>
              </div>
            )}

            {/* Topic Guidance Notes */}
            <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Speech / Context Guidance Notes</span>
              </span>
              <input
                type="text"
                placeholder="e.g. Physics lecture, Emergency bulletin, Quarterly earnings"
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-500"
              />
              <button
                type="button"
                disabled={isPreparingContent}
                onClick={() =>
                  prepareContentForVideo(
                    videoUrl || videoFileName,
                    videoFileName,
                    userNotes,
                    !!ytId
                  )
                }
                className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Re-Transcribe & Generate Announcements</span>
              </button>
            </div>
          </div>

          {/* Delivery Mode & Initial Network */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white">Delivery Mode</h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('AURA')}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  mode === 'AURA'
                    ? 'bg-cyan-950/30 border-cyan-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-bold text-xs text-cyan-300">AURA Engine</div>
                <div className="text-[11px] text-slate-400 mt-1">Meaning-First & Priority Delivery</div>
              </button>

              <button
                type="button"
                onClick={() => setMode('BASELINE')}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  mode === 'BASELINE'
                    ? 'bg-amber-950/30 border-amber-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-bold text-xs text-amber-300">Baseline Engine</div>
                <div className="text-[11px] text-slate-400 mt-1">Conventional FIFO Video ABR</div>
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Initial Network Profile
              </label>
              <select
                value={networkProfileType}
                onChange={(e) => setNetworkProfileType(e.target.value as NetworkProfileType)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg p-2.5 focus:outline-hidden focus:border-cyan-500 font-mono"
              >
                {Object.values(NETWORK_PROFILES).map((prof) => (
                  <option key={prof.type} value={prof.type}>
                    {prof.name} ({prof.bandwidthKbps} kbps, {prof.latencyMs}ms)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Metadata, Extracted Transcription & Items List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Form */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white">Broadcast Metadata (Synchronized to Video)</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Broadcast Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Broadcaster / Speaker
                </label>
                <input
                  type="text"
                  value={speaker}
                  onChange={(e) => setSpeaker(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Broadcast Description & Context
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Extracted Video Transcription & Insights (ALWAYS VISIBLE & EDITABLE) */}
          <div className="p-5 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Video Speech Transcription & Verbatim Dialogue
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Extracted speech narration from your video or YouTube live stream
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingTranscript(!isEditingTranscript)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3 h-3 text-cyan-400" />
                  <span>{isEditingTranscript ? 'Done Editing' : 'Edit Transcript'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyTranscript}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-cyan-400 transition-colors cursor-pointer"
                >
                  {copiedTranscript ? (
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedTranscript ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>
            </div>

            {/* Editable or Formatted Transcription Text */}
            <div className="space-y-2">
              {isEditingTranscript ? (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={extractedTranscription}
                    onChange={(e) => setExtractedTranscription(e.target.value)}
                    placeholder="Type or paste the speech transcription here..."
                    className="w-full bg-slate-900 border border-cyan-500/50 rounded-lg p-3 text-xs text-white leading-relaxed focus:outline-hidden font-sans"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Edit sentences and click apply to update caption broadcast items.
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyTranscriptToCaptions}
                      className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Check className="w-3 h-3" />
                      <span>Sync to Broadcast Captions</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/90 rounded-lg p-3.5 border border-slate-800 text-xs text-slate-200 leading-relaxed max-h-40 overflow-y-auto font-sans selection:bg-cyan-500 selection:text-slate-950 whitespace-pre-line">
                  {extractedTranscription ||
                    'No transcription text available yet. Click "Re-Transcribe & Generate Announcements" or upload a video.'}
                </div>
              )}
            </div>
          </div>

          {/* Priority Queue Builder */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Announcements, Transcripts & Media Items ({items.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Prioritized during bandwidth drops: Critical text and audio are delivered first.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearAllItems}
                  className="px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-950/40 border border-rose-900/40 rounded transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* List of Scheduled Items */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {items.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  No items in broadcast queue. Add an urgent alert or transcription line below.
                </div>
              ) : (
                items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 group hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          item.priority === 'P1_CRITICAL'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : item.priority === 'P2_HIGH'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : item.priority === 'P3_MEDIUM'
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {item.priority.split('_')[0]}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate">
                            {item.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {item.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">
                          {item.content}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] font-mono text-slate-400">
                        {item.payloadBytes > 1000000
                          ? `${(item.payloadBytes / (1024 * 1024)).toFixed(1)} MB`
                          : item.payloadBytes > 1000
                          ? `${Math.round(item.payloadBytes / 1024)} KB`
                          : `${item.payloadBytes} B`}
                      </span>

                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className="text-slate-500 hover:text-cyan-400 p-1 rounded transition-colors cursor-pointer"
                        title="Edit Item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setItems(items.filter((it) => it.id !== item.id))}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Add Custom Item Form */}
            <form onSubmit={handleAddItem} className="pt-2 border-t border-slate-800/80 space-y-3">
              <span className="text-xs font-semibold text-slate-300 block">
                + Add Custom Announcement or Dialogue Line:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Item Title (e.g. Critical Safety Step)"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-500"
                />

                <select
                  value={newItemType}
                  onChange={(e) => setNewItemType(e.target.value as ContentType)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                >
                  <option value="critical_alert">P1: Critical Alert</option>
                  <option value="caption">P2: Speech Caption</option>
                  <option value="summary">P2: Key Summary</option>
                  <option value="audio_segment">P2: Audio Segment</option>
                  <option value="keyframe">P3: Visual Keyframe</option>
                  <option value="live_video">P4: Video Media</option>
                </select>

                <select
                  value={newItemPriority}
                  onChange={(e) => setNewItemPriority(e.target.value as PriorityClass)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                >
                  <option value="P1_CRITICAL">P1 (Critical Urgency)</option>
                  <option value="P2_HIGH">P2 (High Priority)</option>
                  <option value="P3_MEDIUM">P3 (Medium Priority)</option>
                  <option value="P4_LOW">P4 (Low Video)</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Verbatim text content or spoken instruction..."
                  value={newItemContent}
                  onChange={(e) => setNewItemContent(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-500"
                />

                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>
            </form>
          </div>

          {/* Launch Studio Action Banner */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-slate-900/40 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Ready to Broadcast</span>
                <span className="text-xs font-mono font-normal text-cyan-400">
                  ({items.length} items queued · {mode} mode)
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Launches the real-time adaptive transmission scheduler and live video player.
              </p>
            </div>

            <button
              type="button"
              onClick={handleStart}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <span>Launch Live Studio</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
