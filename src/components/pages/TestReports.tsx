import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Search,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { TestSessionReport } from '../../types/scheduler';
import {
  exportReportToJson,
  exportReportsToCsv,
} from '../../services/reportStorage';
import { PageId } from '../layout/Navbar';

interface TestReportsProps {
  reports: TestSessionReport[];
  onSelectReportToAnalyze: (report: TestSessionReport) => void;
  onRepeatTest: (report: TestSessionReport) => void;
  onClearAllReports: () => void;
  onNavigate: (page: PageId) => void;
}

export const TestReports: React.FC<TestReportsProps> = ({
  reports,
  onSelectReportToAnalyze,
  onRepeatTest,
  onClearAllReports,
  onNavigate,
}) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'AURA' | 'BASELINE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredReports = reports.filter((r) => {
    if (filterMode !== 'ALL' && r.mode !== filterMode) return false;
    if (
      searchQuery.trim() &&
      !r.scenarioTitle.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !r.domain.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>SESSION ARCHIVE & AUDIT TRAIL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Broadcast Test Reports & Comparisons
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review recorded sessions, audit delivery latency vs network conditions, and export data in CSV/JSON.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={reports.length === 0}
            onClick={() => exportReportsToCsv(reports)}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export All (CSV)</span>
          </button>

          {reports.length > 0 && (
            <button
              type="button"
              onClick={onClearAllReports}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
              title="Clear all stored test reports"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by scenario or domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(['ALL', 'AURA', 'BASELINE'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setFilterMode(m)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filterMode === m
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m === 'ALL' ? 'All Modes' : `${m} Mode`}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Table */}
      {filteredReports.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/30 border border-slate-800 space-y-3">
          <FileSpreadsheet className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No reports recorded yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Run a broadcast session in the Live Studio to record reproducible delivery benchmark data.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('setup')}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold transition-colors inline-block cursor-pointer"
          >
            Launch First Broadcast
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-sans">Timestamp & Title</th>
                  <th className="py-3 px-4 font-sans">Mode</th>
                  <th className="py-3 px-4 font-sans">Network Setup</th>
                  <th className="py-3 px-4 text-cyan-400">First Essential</th>
                  <th className="py-3 px-4 text-amber-400">Buffering Freeze</th>
                  <th className="py-3 px-4">Deadlines</th>
                  <th className="py-3 px-4">Delivery</th>
                  <th className="py-3 px-4 font-sans text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-sans font-semibold text-white text-xs max-w-xs truncate">
                        {report.scenarioTitle}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-sans">
                        <span>{report.domain}</span>
                        <span>·</span>
                        <span>{report.timestamp}</span>
                        <span>·</span>
                        <span className="text-cyan-400">{report.simulatedOrReal}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          report.mode === 'AURA'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {report.mode}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-semibold">
                        {report.networkProfile.bandwidthKbps} kbps
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans truncate max-w-[140px]">
                        {report.networkProfile.latencyMs}ms RTT · {report.networkProfile.packetLossPercent}% loss
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-emerald-400 font-bold">
                      {report.metrics.timeToFirstEssentialMs > 0
                        ? `${(report.metrics.timeToFirstEssentialMs / 1000).toFixed(2)}s`
                        : '—'}
                    </td>

                    <td className="py-3.5 px-4">
                      {report.metrics.rebufferingCount > 0 ? (
                        <span className="text-amber-400 font-semibold">
                          {(report.metrics.totalBufferingDurationMs / 1000).toFixed(1)}s ({report.metrics.rebufferingCount}x)
                        </span>
                      ) : (
                        <span className="text-emerald-400">0s (Smooth)</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {report.metrics.missedDeadlines > 0 ? (
                        <span className="text-rose-400 font-bold">{report.metrics.missedDeadlines} missed</span>
                      ) : (
                        <span className="text-emerald-400">0 missed</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-cyan-300">
                      {report.deliveredCount} / {report.itemCount} ({report.metrics.successfulDeliveryRate}%)
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 font-sans">
                        <button
                          type="button"
                          onClick={() => onSelectReportToAnalyze(report)}
                          className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Open detailed analytics"
                        >
                          Analyze
                        </button>

                        <button
                          type="button"
                          onClick={() => onRepeatTest(report)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Repeat test with exact same network conditions"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => exportReportToJson(report)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Export JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
