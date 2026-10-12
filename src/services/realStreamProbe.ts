export interface RealTransferMeasurement {
  segmentId: string;
  type: string;
  bytesRequested: number;
  bytesReceived: number;
  transferDurationMs: number;
  measuredThroughputKbps: number;
  latencyRttMs: number;
  serverThrottledKbps: number;
  success: boolean;
  errorMessage?: string;
  timestamp: string;
}

export async function probeRealHttpChunk(options: {
  sizeBytes: number;
  throttleKbps?: number;
  latencyMs?: number;
  lossProb?: number;
  segmentId?: string;
  type?: string;
}): Promise<RealTransferMeasurement> {
  const {
    sizeBytes,
    throttleKbps = 0,
    latencyMs = 0,
    lossProb = 0,
    segmentId = `seg_${Date.now()}`,
    type = 'video',
  } = options;

  const url = `/api/stream/chunk?size=${sizeBytes}&throttleKbps=${throttleKbps}&latencyMs=${latencyMs}&lossProb=${lossProb}&segmentId=${encodeURIComponent(
    segmentId
  )}&type=${encodeURIComponent(type)}`;

  const startTime = performance.now();
  let latencyRttMs = 0;

  try {
    const response = await fetch(url);
    latencyRttMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported on response body');
    }

    const reader = response.body.getReader();
    let bytesReceived = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        bytesReceived += value.byteLength;
      }
    }

    const totalDurationMs = Math.round(performance.now() - startTime);
    const downloadTimeMs = Math.max(1, totalDurationMs - latencyRttMs);
    const measuredThroughputKbps = Math.round(((bytesReceived * 8) / (downloadTimeMs / 1000)) / 1024);

    return {
      segmentId,
      type,
      bytesRequested: sizeBytes,
      bytesReceived,
      transferDurationMs: totalDurationMs,
      measuredThroughputKbps,
      latencyRttMs,
      serverThrottledKbps: throttleKbps,
      success: true,
      timestamp: new Date().toLocaleTimeString(),
    };
  } catch (err: any) {
    const totalDurationMs = Math.round(performance.now() - startTime);
    return {
      segmentId,
      type,
      bytesRequested: sizeBytes,
      bytesReceived: 0,
      transferDurationMs: totalDurationMs,
      measuredThroughputKbps: 0,
      latencyRttMs,
      serverThrottledKbps: throttleKbps,
      success: false,
      errorMessage: err.message || 'Network request failed',
      timestamp: new Date().toLocaleTimeString(),
    };
  }
}
