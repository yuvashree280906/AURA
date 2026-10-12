import {
  BroadcastEvent,
  BroadcastMetrics,
  BroadcastMode,
  ContentItem,
  ContentType,
  DeliveryStatus,
  NetworkProfile,
  PriorityClass,
} from '../types/scheduler';

export interface SchedulerState {
  timelineSeconds: number;
  mode: BroadcastMode;
  network: NetworkProfile;
  activeItem: ContentItem | null;
  activeItemProgressPercent: number;
  queue: ContentItem[];
  delivered: ContentItem[];
  deferred: ContentItem[];
  expired: ContentItem[];
  events: BroadcastEvent[];
  metrics: BroadcastMetrics;
  playerBufferSeconds: number;
  isStalled: boolean;
  totalPlaybackSeconds: number;
}

const PRIORITY_WEIGHTS: Record<PriorityClass, number> = {
  P1_CRITICAL: 10000,
  P2_HIGH: 3000,
  P3_MEDIUM: 800,
  P4_LOW: 150,
};

const TYPE_WEIGHTS: Record<ContentType, number> = {
  critical_alert: 15.0,
  caption: 8.0,
  summary: 5.0,
  audio_segment: 4.0,
  keyframe: 3.0,
  live_video: 1.5,
  deferred_video: 0.5,
};

export class BroadcastingScheduler {
  private state: SchedulerState;
  private allInitialItems: ContentItem[];
  private isRealMeasurement: boolean;

  constructor(
    items: ContentItem[],
    mode: BroadcastMode,
    initialNetwork: NetworkProfile,
    isRealMeasurement: boolean = false
  ) {
    this.allInitialItems = items.map((it) => ({
      ...it,
      status: 'queued' as DeliveryStatus,
      retryCount: 0,
    }));
    this.isRealMeasurement = isRealMeasurement;

    this.state = {
      timelineSeconds: 0,
      mode,
      network: { ...initialNetwork },
      activeItem: null,
      activeItemProgressPercent: 0,
      queue: [...this.allInitialItems],
      delivered: [],
      deferred: [],
      expired: [],
      events: [
        {
          id: `evt_init_${Date.now()}`,
          timestampSeconds: 0,
          type: 'SCHEDULED',
          message: `Scheduler initialized in ${mode} mode with ${items.length} items. Network: ${initialNetwork.name} (${initialNetwork.bandwidthKbps} kbps).`,
          mode,
        },
      ],
      metrics: {
        timeToFirstEssentialMs: 0,
        timeToDeliverAllEssentialMs: 0,
        videoStartupDelayMs: 0,
        totalBufferingDurationMs: 0,
        rebufferingCount: 0,
        totalBytesTransferred: 0,
        successfulDeliveryRate: 100,
        missedDeadlines: 0,
        deferredSegmentsRecovered: 0,
        averageEffectiveBandwidthKbps: initialNetwork.bandwidthKbps,
        playbackContinuityScore: 100,
        isRealMeasurement,
      },
      playerBufferSeconds: 0,
      isStalled: false,
      totalPlaybackSeconds: 0,
    };

    this.recalculateQueuePriority();
  }

  public getState(): SchedulerState {
    return this.state;
  }

  public updateNetwork(newNetwork: NetworkProfile): void {
    const prev = this.state.network;
    this.state.network = { ...newNetwork };

    this.addEvent(
      'NETWORK_CHANGE',
      `Network shifted: ${newNetwork.bandwidthKbps} kbps (was ${prev.bandwidthKbps} kbps), ${newNetwork.latencyMs}ms latency, ${newNetwork.packetLossPercent}% loss.${
        newNetwork.isOutage ? ' [CONNECTION CUT/OUTAGE ACTIVE]' : ''
      }`
    );

    // Dynamic re-scheduling on network change
    if (this.state.mode === 'AURA') {
      this.recalculateQueuePriority();
    }
  }

  public injectMessage(item: ContentItem): void {
    const newItem = {
      ...item,
      status: 'queued' as DeliveryStatus,
      retryCount: 0,
      createdAt: this.state.timelineSeconds,
    };
    this.state.queue.push(newItem);
    this.addEvent(
      'SCHEDULED',
      `Live message injected: "${item.title}" [${item.priority}] (${item.payloadBytes} bytes)`
    );

    if (this.state.mode === 'AURA') {
      // In AURA mode, if this item is P1_CRITICAL and current active item is low-priority video,
      // AURA preempts or schedules it next!
      this.recalculateQueuePriority();
    }
  }

  private addEvent(
    type: BroadcastEvent['type'],
    message: string,
    itemId?: string,
    itemType?: ContentType,
    details?: Record<string, any>
  ): void {
    const evt: BroadcastEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestampSeconds: Math.round(this.state.timelineSeconds * 10) / 10,
      type,
      message,
      itemId,
      itemType,
      details,
      mode: this.state.mode,
    };
    this.state.events.unshift(evt);
    if (this.state.events.length > 150) {
      this.state.events.pop();
    }
  }

  /**
   * Evaluates priority score for AURA deadline-aware scheduling
   */
  private calculateItemScore(item: ContentItem): number {
    const basePriority = PRIORITY_WEIGHTS[item.priority] || 500;
    const typeFactor = TYPE_WEIGHTS[item.type] || 1.0;

    // Remaining time before deadline expires
    const timeInQueue = this.state.timelineSeconds - item.createdAt;
    const remainingDeadline = Math.max(0.1, item.deadlineSeconds - timeInQueue);

    // Estimated transfer duration based on current bandwidth & latency
    const effectiveBps = (Math.max(10, this.state.network.bandwidthKbps) * 1024) / 8;
    const estimatedTransferSeconds =
      item.payloadBytes / effectiveBps +
      (this.state.network.latencyMs / 1000) * (1 + this.state.network.packetLossPercent / 100);

    // Deadline urgency multiplier: surges as deadline approaches
    let urgencyMultiplier = 1.0;
    if (remainingDeadline < estimatedTransferSeconds * 2) {
      urgencyMultiplier = 2.5;
    } else if (remainingDeadline < estimatedTransferSeconds * 4) {
      urgencyMultiplier = 1.6;
    }

    // Anti-starvation aging credit: prevents lower priority items waiting too long from locking out
    const agingBonus = timeInQueue * 25;

    // Heavy video penalization when bandwidth is critical:
    // When bandwidth is < 120 kbps, down-rank video segments so small vital text & audio flow first
    let capacityPenalty = 1.0;
    if (this.state.network.bandwidthKbps < 120 && (item.type === 'live_video' || item.type === 'deferred_video')) {
      capacityPenalty = 0.05;
    } else if (this.state.network.bandwidthKbps < 250 && item.payloadBytes > 100000) {
      capacityPenalty = 0.3;
    }

    const totalScore = (basePriority * typeFactor * urgencyMultiplier + agingBonus) * capacityPenalty;
    item.urgencyScore = Math.round(totalScore);
    return totalScore;
  }

  /**
   * Recalculates the queue order according to the active mode policy
   */
  public recalculateQueuePriority(): void {
    // 1. Check for expired items in queue
    const now = this.state.timelineSeconds;
    const stillValidQueue: ContentItem[] = [];

    for (const item of this.state.queue) {
      const age = now - item.createdAt;
      if (age > item.deadlineSeconds && item.deadlineSeconds > 0) {
        item.status = 'expired';
        this.state.expired.push(item);
        this.state.metrics.missedDeadlines++;
        this.addEvent(
          'EXPIRED',
          `Item expired before broadcast: "${item.title}" (age: ${age.toFixed(1)}s > deadline: ${item.deadlineSeconds}s)`,
          item.id,
          item.type
        );
      } else {
        stillValidQueue.push(item);
      }
    }
    this.state.queue = stillValidQueue;

    // 2. Sort queue based on Mode
    if (this.state.mode === 'AURA') {
      // Meaning-First & Deadline-Aware:
      // Live-First recovery: if bandwidth is recovering and we have deferred past video vs current live content,
      // prioritize current live content first, while keeping deferred content for background
      this.state.queue.sort((a, b) => {
        const scoreA = this.calculateItemScore(a);
        const scoreB = this.calculateItemScore(b);
        return scoreB - scoreA;
      });
    } else {
      // BASELINE Mode:
      // Conventional sequential FIFO media-first delivery order.
      // Video segments are scheduled in index/timeline order; metadata and captions wait in FIFO queue.
      this.state.queue.sort((a, b) => {
        // Linear creation order (FIFO)
        return a.createdAt - b.createdAt;
      });
    }
  }

  /**
   * Advances simulation by deltaSeconds (e.g. 0.25s or 0.5s ticks)
   */
  public step(deltaSeconds: number): void {
    if (deltaSeconds <= 0) return;
    this.state.timelineSeconds += deltaSeconds;

    // Check outage
    if (this.state.network.isOutage) {
      // Network disconnected; buffer decreases, no transmission progress
      this.updatePlayerBuffer(deltaSeconds, false);
      this.recalculateQueuePriority();
      return;
    }

    // Effective bandwidth accounting for packet loss & jitter
    const lossMultiplier = Math.max(0.05, 1 - this.state.network.packetLossPercent / 100);
    const effectiveBps = ((this.state.network.bandwidthKbps * 1024) / 8) * lossMultiplier;

    // If no active item, pick next item from queue
    if (!this.state.activeItem && this.state.queue.length > 0) {
      // In AURA mode, if the next item is a massive video segment and bandwidth is severely constrained (<100 kbps),
      // we check if we should defer it to let urgent text/audio pass first
      if (
        this.state.mode === 'AURA' &&
        this.state.network.bandwidthKbps < 120 &&
        this.state.queue[0].type === 'live_video'
      ) {
        // Find if there are pending critical alerts, captions or audio
        const urgentIndex = this.state.queue.findIndex(
          (it) => it.type === 'critical_alert' || it.type === 'caption' || it.type === 'audio_segment'
        );
        if (urgentIndex > 0) {
          const deferredVid = this.state.queue.shift()!;
          deferredVid.status = 'deferred';
          this.state.deferred.push(deferredVid);
          this.addEvent(
            'DEFERRED',
            `Deferred heavy video segment (${(deferredVid.payloadBytes / 1024).toFixed(0)} KB) to prioritize immediate vital alerts under ${this.state.network.bandwidthKbps} kbps constraint.`,
            deferredVid.id,
            deferredVid.type
          );
        }
      }

      if (this.state.queue.length > 0) {
        const nextItem = this.state.queue.shift()!;
        nextItem.status = 'transmitting';
        this.state.activeItem = nextItem;
        this.state.activeItemProgressPercent = 0;
        this.addEvent(
          'TRANSMITTING',
          `Began transmitting: "${nextItem.title}" [${nextItem.priority}] (${(nextItem.payloadBytes / 1024).toFixed(1)} KB)`,
          nextItem.id,
          nextItem.type
        );
      }
    }

    // If an item is transmitting, advance its progress
    if (this.state.activeItem) {
      const bytesTransferredThisTick = effectiveBps * deltaSeconds;
      const totalBytes = this.state.activeItem.payloadBytes;
      const progressDelta = (bytesTransferredThisTick / totalBytes) * 100;

      this.state.activeItemProgressPercent = Math.min(100, this.state.activeItemProgressPercent + progressDelta);
      this.state.metrics.totalBytesTransferred += Math.min(totalBytes, bytesTransferredThisTick);

      // Check if finished
      if (this.state.activeItemProgressPercent >= 100) {
        const finished = this.state.activeItem;
        finished.status = 'delivered';
        finished.deliveredAt = this.state.timelineSeconds;
        const totalDurationMs = Math.round(
          (finished.payloadBytes / effectiveBps) * 1000 + this.state.network.latencyMs
        );
        finished.transferDurationMs = totalDurationMs;

        this.state.delivered.push(finished);
        this.state.activeItem = null;
        this.state.activeItemProgressPercent = 0;

        // If this was a deferred segment that got recovered
        if (finished.type === 'deferred_video') {
          this.state.metrics.deferredSegmentsRecovered++;
        }

        // Check essential arrival timings
        const isEssential =
          finished.type === 'critical_alert' || finished.type === 'caption' || finished.type === 'summary';
        if (isEssential && this.state.metrics.timeToFirstEssentialMs === 0) {
          this.state.metrics.timeToFirstEssentialMs = Math.round(this.state.timelineSeconds * 1000);
        }

        // If video segment, feed player buffer
        let fedBuffer = false;
        if (finished.type === 'live_video' || finished.type === 'deferred_video') {
          // Add 6 seconds of playback buffer per segment
          this.state.playerBufferSeconds += 6;
          fedBuffer = true;
          if (this.state.metrics.videoStartupDelayMs === 0) {
            this.state.metrics.videoStartupDelayMs = Math.round(this.state.timelineSeconds * 1000);
          }
        }

        this.addEvent(
          'DELIVERED',
          `Delivered "${finished.title}" in ${totalDurationMs}ms at T+${this.state.timelineSeconds.toFixed(1)}s!`,
          finished.id,
          finished.type,
          { transferDurationMs: totalDurationMs, sizeBytes: finished.payloadBytes }
        );

        this.updatePlayerBuffer(deltaSeconds, fedBuffer);
      } else {
        this.updatePlayerBuffer(deltaSeconds, false);
      }
    } else {
      // Idle channel
      // In AURA mode, if queue is empty but we have deferred items and bandwidth allows (>300 kbps),
      // recover deferred items in background!
      if (this.state.mode === 'AURA' && this.state.deferred.length > 0 && this.state.network.bandwidthKbps > 200) {
        const recoverItem = this.state.deferred.shift()!;
        recoverItem.type = 'deferred_video';
        recoverItem.status = 'queued';
        this.state.queue.push(recoverItem);
        this.addEvent(
          'SCHEDULED',
          `Live-First Recovery: Bandwidth recovered (${this.state.network.bandwidthKbps} kbps). Re-queued deferred segment "${recoverItem.title}" for background catch-up.`,
          recoverItem.id,
          recoverItem.type
        );
      }

      this.updatePlayerBuffer(deltaSeconds, false);
    }

    // Check deadlines for waiting items
    this.recalculateQueuePriority();

    // Update overall metrics
    this.updateMetrics();
  }

  private updatePlayerBuffer(deltaSeconds: number, _justFedBuffer: boolean): void {
    if (this.state.playerBufferSeconds > 0) {
      this.state.playerBufferSeconds = Math.max(0, this.state.playerBufferSeconds - deltaSeconds);
      this.state.totalPlaybackSeconds += deltaSeconds;

      if (this.state.isStalled) {
        this.state.isStalled = false;
        this.addEvent('BUFFER_RECOVERED', `Video playback resumed. Buffer replenished (${this.state.playerBufferSeconds.toFixed(1)}s).`);
      }
    } else {
      // Buffer empty!
      // In Baseline mode, video freezes and playback stalls completely
      // In AURA mode, audio and text keep flowing even if video frames freeze!
      if (!this.state.isStalled && (this.state.timelineSeconds > 1 || this.state.mode === 'BASELINE')) {
        this.state.isStalled = true;
        this.state.metrics.rebufferingCount++;
        this.addEvent('BUFFER_STALL', `BUFFER DEPLETED: Video playback stalled! Network throughput insufficient for media stream.`);
      }

      if (this.state.isStalled) {
        this.state.metrics.totalBufferingDurationMs += Math.round(deltaSeconds * 1000);
      }
    }
  }

  private updateMetrics(): void {
    const totalItems = this.allInitialItems.length;
    const deliveredCount = this.state.delivered.length;
    const expiredCount = this.state.expired.length;

    this.state.metrics.successfulDeliveryRate =
      totalItems > 0 ? Math.round((deliveredCount / totalItems) * 100) : 100;

    // Check if all essential messages delivered
    const allEssentialInitial = this.allInitialItems.filter(
      (it) => it.type === 'critical_alert' || it.type === 'caption' || it.type === 'summary'
    );
    const deliveredEssential = this.state.delivered.filter(
      (it) => it.type === 'critical_alert' || it.type === 'caption' || it.type === 'summary'
    );

    if (
      allEssentialInitial.length > 0 &&
      deliveredEssential.length === allEssentialInitial.length &&
      this.state.metrics.timeToDeliverAllEssentialMs === 0
    ) {
      this.state.metrics.timeToDeliverAllEssentialMs = Math.round(this.state.timelineSeconds * 1000);
    }

    // Playback continuity score (100 minus penalty for buffering ratio)
    const totalTime = Math.max(1, this.state.timelineSeconds);
    const bufferPenalty = Math.min(80, (this.state.metrics.totalBufferingDurationMs / (totalTime * 1000)) * 100);
    const missedDeadlinePenalty = Math.min(30, expiredCount * 10);
    this.state.metrics.playbackContinuityScore = Math.max(0, Math.round(100 - bufferPenalty - missedDeadlinePenalty));
  }
}
