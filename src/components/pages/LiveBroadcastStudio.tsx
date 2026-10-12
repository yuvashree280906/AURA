import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  FastForward,
  RotateCcw,
  Sliders,
  Layers,
  AlertTriangle,
  BarChart3,
  Wifi,
  Radio,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import {
  BroadcastEvent,
  BroadcastMode,
  ContentItem,
  NetworkProfile,
  TestSessionReport,
} from '../../types/scheduler';
import { BroadcastingScheduler, SchedulerState } from '../../services/scheduler';
import { VideoPlayer } from '../studio/VideoPlayer';
import { PriorityQueueView } from '../studio/PriorityQueueView';
import { CriticalAlertsPanel } from '../studio/CriticalAlertsPanel';
import { NetworkHud } from '../studio/NetworkHud';
import { LiveEventLog } from '../studio/LiveEventLog';
import { saveReportToStorage } from '../../services/reportStorage';
import { PageId } from '../layout/Navbar';

interface LiveBroadcastStudioProps {
  initialItems: ContentItem[];
  scenarioTitle: string;
  scenarioDomain: string;
  videoUrl?: string;
  initialMode: BroadcastMode;
  initialNetwork: NetworkProfile;
  onNavigate: (page: PageId) => void;
  onSaveReport: (report: TestSessionReport) => void;
}

export const LiveBroadcastStudio: React.FC<LiveBroadcastStudioProps> = ({
  initialItems,
  scenarioTitle,
  scenarioDomain,
  videoUrl,
  initialMode,
  initialNetwork,
  onNavigate,
  onSaveReport,
}) => {
  const [mode, setMode] = useState<BroadcastMode>(initialMode);
  const [network, setNetwork] = useState<NetworkProfile>(initialNetwork);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0); // 1x, 2x, 4x

  // Scheduler instance ref
  const schedulerRef = useRef<BroadcastingScheduler | null>(null);
  const [schedulerState, setSchedulerState] = useState<SchedulerState | null>(null);

  // Initialize or reinitialize scheduler
  const initScheduler = (chosenMode: BroadcastMode, chosenNetwork: NetworkProfile) => {
    const s = new BroadcastingScheduler(initialItems, chosenMode, chosenNetwork, false);
    schedulerRef.current = s;
    setSchedulerState({ ...s.getState() });
    setIsRunning(true);
  };

  useEffect(() => {
    initScheduler(mode, network);
  }, []);

  // Simulation tick loop (every 250ms real time)
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      if (!schedulerRef.current) return;
      const stepDelta = 0.25 * speedMultiplier;
      schedulerRef.current.step(stepDelta);
      setSchedulerState({ ...schedulerRef.current.getState() });
    }, 250);

    return () => clearInterval(interval);
  }, [isRunning, speedMultiplier]);

  // Handle network updates from HUD
  const handleUpdateNetwork = (updated: NetworkProfile) => {
    setNetwork(updated);
    if (schedulerRef.current) {
      schedulerRef.current.updateNetwork(updated);
      setSchedulerState({ ...schedulerRef.current.getState() });
    }
  };

  // Switch between AURA and Baseline mode dynamically
  const handleToggleMode = () => {
    const newMode: BroadcastMode = mode === 'AURA' ? 'BASELINE' : 'AURA';
    setMode(newMode);
    initScheduler(newMode, network);
  };

  // Inject message on the fly
  const handleInjectMessage = (item: ContentItem) => {
    if (schedulerRef.current) {
      schedulerRef.current.injectMessage(item);
      setSchedulerState({ ...schedulerRef.current.getState() });
    }
  };

  // Reset / Restart session
  const handleResetSession = () => {
    initScheduler(mode, network);
  };

  // Finalize & save report
  const handleCompleteAndReport = () => {
    if (!schedulerState) return;

    const report: TestSessionReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      scenarioTitle,
      domain: scenarioDomain,
      mode,
      networkProfile: network,
      metrics: { ...schedulerState.metrics },
      itemCount: initialItems.length,
      deliveredCount: schedulerState.delivered.length,
      expiredCount: schedulerState.expired.length,
      deferredCount: schedulerState.deferred.length,
      simulatedOrReal: 'SIMULATED',
      durationSeconds: Math.round(schedulerState.timelineSeconds),
      eventsCount: schedulerState.events.length,
    };

    saveReportToStorage(report);
    onSaveReport(report);
    onNavigate('analytics');
  };

  if (!schedulerState) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm">
        Initializing studio pipeline...
      </div>
    );
  }

  const {
    timelineSeconds,
    activeItem,
    activeItemProgressPercent,
    queue,
    delivered,
    deferred,
    expired,
    events,
    metrics,
    playerBufferSeconds,
    isStalled,
  } = schedulerState;

  const isCompleted = queue.length === 0 && !activeItem;

  return (
    <div className="space-y-6 pb-16">
      {/* Studio Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                mode === 'AURA'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'bg-amber-500 text-slate-950 font-bold'
              }`}
            >
              {mode} MODE
            </span>
            <span className="text-xs text-slate-400 font-mono">
              TIMELINE: T+{timelineSeconds.toFixed(1)}s
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400 font-sans">{scenarioDomain}</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-white truncate max-w-xl">
            {scenarioTitle}
          </h1>
        </div>

        {/* Studio Playback & Execution Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Speed Controls */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSpeedMultiplier(spd)}
                className={`px-2 py-1 rounded transition-colors ${
                  speedMultiplier === spd
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Simulation Speed ${spd}x`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Pause / Resume */}
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isRunning
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause' : 'Resume'}</span>
          </button>

          {/* Reset Session */}
          <button
            type="button"
            onClick={handleResetSession}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            title="Restart Session with Same Settings"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Switch Mode Directly */}
          <button
            type="button"
            onClick={handleToggleMode}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-cyan-300 transition-colors cursor-pointer"
            title="Switch between AURA Priority vs Baseline FIFO"
          >
            Switch to {mode === 'AURA' ? 'Baseline' : 'AURA'}
          </button>

          {/* Save & Analyze */}
          <button
            type="button"
            onClick={handleCompleteAndReport}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>View Analytics & Report</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (5 cols): Video Screen + Network HUD */}
        <div className="lg:col-span-5 space-y-6">
          {(() => {
            const currentSubtitle =
              activeItem?.type === 'caption'
                ? activeItem.content
                : delivered.filter((d) => d.type === 'caption').slice(-1)[0]?.content;

            return (
              <VideoPlayer
                videoUrl={videoUrl}
                isStalled={isStalled}
                playerBufferSeconds={playerBufferSeconds}
                mode={mode}
                bandwidthKbps={network.bandwidthKbps}
                activeItemTitle={activeItem?.title}
                activeSubtitle={currentSubtitle}
                isLive={true}
              />
            );
          })()}

          <NetworkHud
            network={network}
            onUpdateNetwork={handleUpdateNetwork}
            isRealMeasurement={false}
          />

          {/* Real-Time Live Performance Telemetry Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Live Session Telemetry
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">TIME TO FIRST ESSENTIAL</span>
                <span className="text-sm font-bold text-emerald-400">
                  {metrics.timeToFirstEssentialMs > 0
                    ? `${(metrics.timeToFirstEssentialMs / 1000).toFixed(2)}s`
                    : 'Pending...'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">BUFFER STALL DURATION</span>
                <span
                  className={`text-sm font-bold ${
                    metrics.totalBufferingDurationMs > 0 ? 'text-amber-400' : 'text-slate-300'
                  }`}
                >
                  {(metrics.totalBufferingDurationMs / 1000).toFixed(1)}s ({metrics.rebufferingCount} stalls)
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">DELIVERED / TOTAL</span>
                <span className="text-sm font-bold text-cyan-300">
                  {delivered.length} / {initialItems.length}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">MISSED DEADLINES</span>
                <span
                  className={`text-sm font-bold ${
                    metrics.missedDeadlines > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {metrics.missedDeadlines} items
                </span>
              </div>
            </div>

            {mode === 'BASELINE' && metrics.missedDeadlines > 0 && (
              <div className="p-2.5 rounded bg-rose-950/30 border border-rose-800/50 text-[11px] text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Baseline Stagnation:</strong> Heavy video segment blocked channel while emergency
                  messages expired in queue! Switch to AURA to test priority scheduling.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Col (7 cols): Priority Queue, Critical Alerts, Live Log */}
        <div className="lg:col-span-7 space-y-6">
          {/* Critical Alerts Panel */}
          <CriticalAlertsPanel
            deliveredItems={delivered}
            onInjectMessage={handleInjectMessage}
            timelineSeconds={timelineSeconds}
          />

          {/* Dynamic Priority Queue */}
          <PriorityQueueView
            queue={queue}
            activeItem={activeItem}
            activeItemProgressPercent={activeItemProgressPercent}
            delivered={delivered}
            deferred={deferred}
            expired={expired}
            timelineSeconds={timelineSeconds}
          />

          {/* Live Decision Event Log */}
          <LiveEventLog events={events} />
        </div>
      </div>
    </div>
  );
};
