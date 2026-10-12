import { TestSessionReport } from '../types/scheduler';

const STORAGE_KEY = 'aura_broadcast_reports_v1';

export function getStoredReports(): TestSessionReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load reports from storage:', err);
    return [];
  }
}

export function saveReportToStorage(report: TestSessionReport): void {
  try {
    const existing = getStoredReports();
    // Prepend new report and keep last 40
    const updated = [report, ...existing.filter((r) => r.id !== report.id)].slice(0, 40);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Also attempt non-blocking sync to server
    fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    }).catch(() => {
      // Offline or backend unavailable, local storage holds the source of truth
    });
  } catch (err) {
    console.error('Failed to save report to storage:', err);
  }
}

export function exportReportToJson(report: TestSessionReport): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `AURA_Report_${report.mode}_${report.id}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function exportReportsToCsv(reports: TestSessionReport[]): void {
  if (reports.length === 0) return;

  const headers = [
    'Report ID',
    'Timestamp',
    'Scenario Title',
    'Domain',
    'Mode',
    'Type',
    'Bandwidth (kbps)',
    'Latency (ms)',
    'Packet Loss (%)',
    'Time to First Essential (ms)',
    'Time to All Essential (ms)',
    'Video Startup Delay (ms)',
    'Total Buffering Duration (ms)',
    'Rebuffering Count',
    'Total Bytes Transferred',
    'Delivery Success Rate (%)',
    'Missed Deadlines',
    'Deferred Recovered',
    'Continuity Score',
  ];

  const rows = reports.map((r) => [
    r.id,
    r.timestamp,
    `"${r.scenarioTitle.replace(/"/g, '""')}"`,
    `"${r.domain.replace(/"/g, '""')}"`,
    r.mode,
    r.simulatedOrReal,
    r.networkProfile.bandwidthKbps,
    r.networkProfile.latencyMs,
    r.networkProfile.packetLossPercent,
    r.metrics.timeToFirstEssentialMs,
    r.metrics.timeToDeliverAllEssentialMs,
    r.metrics.videoStartupDelayMs,
    r.metrics.totalBufferingDurationMs,
    r.metrics.rebufferingCount,
    r.metrics.totalBytesTransferred,
    r.metrics.successfulDeliveryRate,
    r.metrics.missedDeadlines,
    r.metrics.deferredSegmentsRecovered,
    r.metrics.playbackContinuityScore,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `AURA_Benchmark_Results_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
