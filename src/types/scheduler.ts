export type ContentType =
  | 'critical_alert'
  | 'caption'
  | 'summary'
  | 'keyframe'
  | 'audio_segment'
  | 'live_video'
  | 'deferred_video';

export type PriorityClass =
  | 'P1_CRITICAL'
  | 'P2_HIGH'
  | 'P3_MEDIUM'
  | 'P4_LOW';

export type DeliveryStatus =
  | 'queued'
  | 'transmitting'
  | 'delivered'
  | 'deferred'
  | 'expired';

export interface ContentItem {
  id: string;
  type: ContentType;
  priority: PriorityClass;
  title: string;
  payloadBytes: number;
  createdAt: number; // in simulation/broadcast timeline seconds
  deadlineSeconds: number; // time from creation before considered expired
  content: string; // text body, summary snippet, image preview description or data
  status: DeliveryStatus;
  isLive: boolean;
  deliveredAt?: number; // timeline seconds
  transferDurationMs?: number;
  retryCount: number;
  rendition?: '1080p' | '720p' | '360p' | '144p' | 'audio_aac';
  urgencyScore?: number;
  segmentIndex?: number;
}

export type NetworkProfileType =
  | 'strong_fiber'
  | 'moderate_3g'
  | 'weak_2g'
  | 'extreme_edge'
  | 'intermittent_tunnel'
  | 'dynamic_collapse'
  | 'custom';

export interface NetworkProfile {
  name: string;
  type: NetworkProfileType;
  bandwidthKbps: number;
  latencyMs: number;
  packetLossPercent: number;
  isOutage: boolean;
  outageDurationSeconds?: number;
  description: string;
}

export type BroadcastMode = 'AURA' | 'BASELINE';

export interface BroadcastScenario {
  id: string;
  domain: string;
  title: string;
  description: string;
  speaker: string;
  suggestedDurationSeconds: number;
  defaultNetworkProfile: NetworkProfileType;
  sampleVideoUrl?: string;
  items: Omit<ContentItem, 'status' | 'deliveredAt' | 'transferDurationMs' | 'retryCount'>[];
}

export interface BroadcastEvent {
  id: string;
  timestampSeconds: number;
  type: 'SCHEDULED' | 'TRANSMITTING' | 'DELIVERED' | 'DEFERRED' | 'EXPIRED' | 'NETWORK_CHANGE' | 'BUFFER_STALL' | 'BUFFER_RECOVERED';
  itemId?: string;
  itemType?: ContentType;
  message: string;
  details?: Record<string, any>;
  mode: BroadcastMode;
}

export interface BroadcastMetrics {
  timeToFirstEssentialMs: number;
  timeToDeliverAllEssentialMs: number;
  videoStartupDelayMs: number;
  totalBufferingDurationMs: number;
  rebufferingCount: number;
  totalBytesTransferred: number;
  successfulDeliveryRate: number; // percentage 0 - 100
  missedDeadlines: number;
  deferredSegmentsRecovered: number;
  averageEffectiveBandwidthKbps: number;
  playbackContinuityScore: number; // 0 - 100
  isRealMeasurement: boolean;
}

export interface TestSessionReport {
  id: string;
  timestamp: string;
  scenarioTitle: string;
  domain: string;
  mode: BroadcastMode;
  networkProfile: NetworkProfile;
  metrics: BroadcastMetrics;
  itemCount: number;
  deliveredCount: number;
  expiredCount: number;
  deferredCount: number;
  simulatedOrReal: 'SIMULATED' | 'REAL_MEASUREMENT';
  durationSeconds: number;
  eventsCount: number;
}
