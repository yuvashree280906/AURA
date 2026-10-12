import React from 'react';
import {
  Radio,
  Play,
  Upload,
  Sliders,
  BarChart3,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  WifiOff,
  Zap,
  GraduationCap,
  Newspaper,
  Trophy,
  Users,
  Megaphone,
  AlertTriangle,
  Compass,
  Truck,
  HeartPulse,
  ArrowRight,
} from 'lucide-react';
import { PageId } from '../layout/Navbar';
import { BroadcastMode, NetworkProfile, TestSessionReport } from '../../types/scheduler';

interface HomeDashboardProps {
  onNavigate: (page: PageId) => void;
  recentReports: TestSessionReport[];
  currentMode: BroadcastMode;
  currentNetwork: NetworkProfile;
  onQuickStartScenario: (scenarioId: string) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onNavigate,
  recentReports,
  currentMode,
  currentNetwork,
  onQuickStartScenario,
}) => {
  const targetDomains = [
    {
      id: 'emergency-flood-evacuation',
      icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
      title: 'Emergency & Disaster Response',
      desc: 'Evacuation corridors, shelter locations, and emergency audio when cell towers buckle.',
    },
    {
      id: 'education-remote-lecture',
      icon: <GraduationCap className="w-5 h-5 text-cyan-400" />,
      title: 'Rural Education & E-Learning',
      desc: 'Formulas, slide transcripts, and audio lecture prioritized over frozen video frames.',
    },
    {
      id: 'breaking-news-field-report',
      icon: <Newspaper className="w-5 h-5 text-amber-400" />,
      title: 'Breaking News Journalism',
      desc: 'Field reporters broadcasting through congested satellite uplinks and cellular fades.',
    },
    {
      id: 'telehealth-remote-triage',
      icon: <HeartPulse className="w-5 h-5 text-emerald-400" />,
      title: 'Remote Healthcare & Triage',
      desc: 'High-priority vitals telemetry, ECG keyframes, and doctor audio instructions.',
    },
    {
      id: 'sports',
      icon: <Trophy className="w-5 h-5 text-purple-400" />,
      title: 'Live Sports & Congestion',
      desc: 'Goal text flashes, score tickers, and tactical keyframes in crowded stadium networks.',
    },
    {
      id: 'remote-meetings',
      icon: <Users className="w-5 h-5 text-sky-400" />,
      title: 'Remote Collaboration',
      desc: 'Preserves shared action items, whiteboard keyframes, and voice during jitter spikes.',
    },
  ];

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 via-[#0a1224] to-[#080d19] border border-slate-800 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-3 text-cyan-400 text-xs font-mono tracking-wider font-semibold mb-4">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>AURA BROADCASTING FRAMEWORK</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">MEANING-FIRST ADAPTIVE DELIVERY</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight mb-4 text-balance">
            When bandwidth drops,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">
              essential information comes first.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8 max-w-2xl">
            Conventional streaming degrades or buffers video completely when networks collapse below 100 kbps.
            AURA decomposes broadcasts into meaning-ranked tiers — prioritizing urgent alerts, captions, summaries,
            and compressed audio before recovering media when connectivity returns.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('setup')}
              className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Configure New Broadcast</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('studio')}
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm border border-slate-700/80 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 text-cyan-400" />
              <span>Open Live Studio</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('network')}
              className="px-5 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 font-medium text-sm border border-slate-800 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-slate-400" />
              <span>Network Lab</span>
            </button>
          </div>
        </div>

        {/* Live System Health Banner */}
        <div className="mt-10 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 block">SCHEDULER ENGINE</span>
            <span className="text-cyan-300 font-semibold flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Operational
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">CURRENT MODE</span>
            <span className="text-white font-semibold mt-0.5 block">{currentMode} Engine</span>
          </div>

          <div>
            <span className="text-slate-500 block">SIMULATED CHANNEL</span>
            <span className="text-slate-300 font-semibold mt-0.5 block">
              {currentNetwork.bandwidthKbps} kbps ({currentNetwork.latencyMs}ms RTT)
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">REAL HTTP STREAM PROBE</span>
            <span className="text-emerald-400 font-semibold mt-0.5 block">Active on /api/stream</span>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              AURA Innovation Principles
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              How AURA delivers meaning when conventional video streaming completely freezes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">
              Deadline-Aware Priority Scheduling
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every content item carries an explicit payload size, priority class, creation timestamp, and deadline.
              Urgency surges dynamically as expiration nears, preventing vital announcements from starving.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">
              Multi-Content Adaptive Delivery
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Decomposes media into 7 discrete tiers: Critical text &gt; Captions &gt; Structured summaries &gt; Audio chunks
              &gt; Keyframes &gt; Live video &gt; Deferred replay. Small vital text arrives in &lt;300ms even at 48 kbps.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">
              Live-First Background Recovery
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              When bandwidth recovers after a collapse or outage, AURA instantly reconnects users to the live broadcast
              point instead of blocking them behind obsolete buffers. Deferred past segments download opportunistically.
            </p>
          </div>
        </div>
      </section>

      {/* Target Domains Quick-Launcher */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Target Demonstration Scenarios
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pre-configured broadcasts with real payloads, deadlines, and simulated network distress
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {targetDomains.map((domain) => (
            <div
              key={domain.id}
              className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-900/70 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    {domain.icon}
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400/80 group-hover:text-cyan-300 transition-colors">
                    Domain Preset
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                  {domain.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {domain.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onQuickStartScenario(domain.id)}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Launch Scenario</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Benchmark Reports */}
      {recentReports.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Recent Benchmark Sessions
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Comparative evaluations recorded in local test storage
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>View All Reports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">TIMESTAMP</th>
                    <th className="py-3 px-4">SCENARIO</th>
                    <th className="py-3 px-4">MODE</th>
                    <th className="py-3 px-4">NETWORK</th>
                    <th className="py-3 px-4">FIRST ESSENTIAL</th>
                    <th className="py-3 px-4">BUFFER STALLS</th>
                    <th className="py-3 px-4">SUCCESS RATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {recentReports.slice(0, 4).map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 text-slate-400">{rep.timestamp}</td>
                      <td className="py-3 px-4 font-sans font-medium text-white max-w-xs truncate">
                        {rep.scenarioTitle}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            rep.mode === 'AURA'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {rep.mode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {rep.networkProfile.bandwidthKbps} kbps
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-semibold">
                        {rep.metrics.timeToFirstEssentialMs}ms
                      </td>
                      <td className="py-3 px-4">
                        {rep.metrics.rebufferingCount > 0 ? (
                          <span className="text-amber-400 font-semibold">
                            {rep.metrics.rebufferingCount} stalls ({(rep.metrics.totalBufferingDurationMs / 1000).toFixed(1)}s)
                          </span>
                        ) : (
                          <span className="text-emerald-400">0 stalls</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-cyan-300">
                        {rep.metrics.successfulDeliveryRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
