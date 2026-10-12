import React, { useState } from 'react';
import {
  Sliders,
  Wifi,
  WifiOff,
  Activity,
  Play,
  RotateCcw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Gauge,
  Server,
  Download,
} from 'lucide-react';
import { NetworkProfile, NetworkProfileType } from '../../types/scheduler';
import { NETWORK_PROFILES } from '../../services/sampleScenarios';
import { probeRealHttpChunk, RealTransferMeasurement } from '../../services/realStreamProbe';

interface NetworkLabProps {
  currentNetwork: NetworkProfile;
  onApplyNetwork: (network: NetworkProfile) => void;
  onNavigateToStudio: () => void;
}

export const NetworkLab: React.FC<NetworkLabProps> = ({
  currentNetwork,
  onApplyNetwork,
  onNavigateToStudio,
}) => {
  const [bandwidthKbps, setBandwidthKbps] = useState<number>(currentNetwork.bandwidthKbps);
  const [latencyMs, setLatencyMs] = useState<number>(currentNetwork.latencyMs);
  const [packetLossPercent, setPacketLossPercent] = useState<number>(currentNetwork.packetLossPercent);
  const [isOutage, setIsOutage] = useState<boolean>(currentNetwork.isOutage);
  const [profileName, setProfileName] = useState<string>(currentNetwork.name);

  // Real HTTP Socket Probe states
  const [probeSizeKb, setProbeSizeKb] = useState<number>(128); // 128 KB
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [realMeasurement, setRealMeasurement] = useState<RealTransferMeasurement | null>(null);
  const [probeHistory, setProbeHistory] = useState<RealTransferMeasurement[]>([]);

  const applyPreset = (presetKey: NetworkProfileType) => {
    const prof = NETWORK_PROFILES[presetKey];
    if (!prof) return;

    setBandwidthKbps(prof.bandwidthKbps);
    setLatencyMs(prof.latencyMs);
    setPacketLossPercent(prof.packetLossPercent);
    setIsOutage(prof.isOutage);
    setProfileName(prof.name);

    onApplyNetwork({
      name: prof.name,
      type: prof.type,
      bandwidthKbps: prof.bandwidthKbps,
      latencyMs: prof.latencyMs,
      packetLossPercent: prof.packetLossPercent,
      isOutage: prof.isOutage,
      description: prof.description,
    });
  };

  const handleApplyCustom = () => {
    const customProf: NetworkProfile = {
      name: profileName || `Custom (${bandwidthKbps} kbps)`,
      type: 'custom',
      bandwidthKbps,
      latencyMs,
      packetLossPercent,
      isOutage,
      description: `Custom configured network: ${bandwidthKbps} kbps, ${latencyMs}ms latency, ${packetLossPercent}% loss.`,
    };
    onApplyNetwork(customProf);
  };

  // Run real socket HTTP transfer via /api/stream/chunk
  const runRealHttpProbe = async () => {
    setIsProbing(true);
    try {
      const measurement = await probeRealHttpChunk({
        sizeBytes: probeSizeKb * 1024,
        throttleKbps: bandwidthKbps,
        latencyMs,
        lossProb: packetLossPercent / 100,
        segmentId: `probe_${Date.now()}`,
        type: 'video',
      });

      setRealMeasurement(measurement);
      setProbeHistory([measurement, ...probeHistory].slice(0, 8));
    } catch (err) {
      console.error('Probe failed:', err);
    } finally {
      setIsProbing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
          <Sliders className="w-3.5 h-3.5" />
          <span>NETWORK SIMULATION LAB & BENCHMARK HARNESS</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Network Simulation & Real Socket Transfer Lab
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Simulate severe bandwidth degradation, packet drops, and radio link blackouts. Test both deterministic
          mathematical scheduling and genuine throttled HTTP segment downloads against the backend server.
        </p>
      </div>

      {/* Preset Profiles Ribbon */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
          Standard Benchmark Profiles:
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {Object.entries(NETWORK_PROFILES).map(([key, prof]) => {
            const isSelected = bandwidthKbps === prof.bandwidthKbps && isOutage === prof.isOutage;
            return (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key as NetworkProfileType)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-md shadow-cyan-500/10'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <div className="font-semibold text-xs truncate text-white">{prof.name.split('(')[0]}</div>
                <div className="font-mono text-[11px] text-cyan-400 mt-1">{prof.bandwidthKbps} kbps</div>
                <div className="font-mono text-[10px] text-slate-500 mt-0.5">{prof.latencyMs}ms RTT</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Interactive Simulation Sliders */}
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <span>Simulated Network Parameters</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              SIMULATED MODEL
            </span>
          </div>

          {/* Bandwidth Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">Available Bandwidth</span>
              <span className="font-mono text-cyan-300 font-bold text-sm">
                {bandwidthKbps >= 1000 ? `${(bandwidthKbps / 1000).toFixed(1)} Mbps` : `${bandwidthKbps} kbps`}
              </span>
            </div>
            <input
              type="range"
              min={20}
              max={6000}
              step={10}
              value={bandwidthKbps}
              onChange={(e) => setBandwidthKbps(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>20 kbps (Disaster edge)</span>
              <span>1200 kbps (3G)</span>
              <span>6000 kbps (Broadband)</span>
            </div>
          </div>

          {/* RTT Latency Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">Round-Trip Latency (RTT)</span>
              <span className="font-mono text-slate-200 font-bold">{latencyMs} ms</span>
            </div>
            <input
              type="range"
              min={5}
              max={1500}
              step={5}
              value={latencyMs}
              onChange={(e) => setLatencyMs(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>5 ms (Fiber)</span>
              <span>300 ms (Mobile)</span>
              <span>1500 ms (Satellite hop)</span>
            </div>
          </div>

          {/* Packet Loss Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">Packet Loss Percentage</span>
              <span
                className={`font-mono font-bold ${
                  packetLossPercent > 10 ? 'text-rose-400' : 'text-slate-200'
                }`}
              >
                {packetLossPercent} %
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              step={0.5}
              value={packetLossPercent}
              onChange={(e) => setPacketLossPercent(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0% (Clean line)</span>
              <span>15% (Severe congestion)</span>
              <span>40% (Radio blackout)</span>
            </div>
          </div>

          {/* Outage Toggle */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Temporary Link Outage</div>
              <div className="text-[11px] text-slate-400">Completely halts socket transmission</div>
            </div>
            <button
              type="button"
              onClick={() => setIsOutage(!isOutage)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isOutage
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {isOutage ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
              <span>{isOutage ? 'OUTAGE ACTIVE' : 'Connected'}</span>
            </button>
          </div>

          {/* Apply to active session */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleApplyCustom}
              className="flex-1 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              Apply to Simulation Scheduler
            </button>
            <button
              type="button"
              onClick={onNavigateToStudio}
              className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Back to Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Real HTTP Network Transfer Environment */}
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Real HTTP Socket Transfer Environment</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              REAL HTTP MEASUREMENT
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Unlike pure frontend math calculations, this harness calls the real backend server endpoint{' '}
            <code className="text-cyan-300 font-mono text-[11px]">/api/stream/chunk</code> with byte-throttled chunking
            and measures actual browser socket transfer time and throughput.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Test Payload Size</label>
              <select
                value={probeSizeKb}
                onChange={(e) => setProbeSizeKb(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded p-2 text-xs font-mono focus:outline-hidden"
              >
                <option value={16}>16 KB (Caption / Summary)</option>
                <option value={64}>64 KB (Audio Segment)</option>
                <option value={128}>128 KB (Keyframe / Diagram)</option>
                <option value={384}>384 KB (Low-Res Video Segment)</option>
                <option value={800}>800 KB (Full Video Chunk)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Active Server Rate Limit</label>
              <div className="w-full bg-slate-950 border border-slate-800 text-cyan-300 rounded p-2 text-xs font-mono font-semibold">
                {bandwidthKbps} kbps (Throttled)
              </div>
            </div>
          </div>

          {/* Run Probe Button */}
          <button
            type="button"
            disabled={isProbing}
            onClick={runRealHttpProbe}
            className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isProbing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Streaming & Measuring Sockets from Server...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Execute Real HTTP Chunk Download Test</span>
              </>
            )}
          </button>

          {/* Latest Measurement Card */}
          {realMeasurement && (
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Latest Socket Measurement</span>
                <span className="font-mono text-slate-400 text-[11px]">{realMeasurement.timestamp}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">MEASURED RATE</span>
                  <span className="text-cyan-300 font-bold text-sm">
                    {realMeasurement.measuredThroughputKbps} kbps
                  </span>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">TRANSFER DURATION</span>
                  <span className="text-slate-200 font-bold text-sm">
                    {realMeasurement.transferDurationMs} ms
                  </span>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">PAYLOAD RECVD</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {(realMeasurement.bytesReceived / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              {realMeasurement.errorMessage && (
                <div className="p-2 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
                  {realMeasurement.errorMessage}
                </div>
              )}
            </div>
          )}

          {/* Historical Log */}
          {probeHistory.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                Socket Benchmark History:
              </span>
              <div className="space-y-1 max-h-32 overflow-y-auto font-mono text-[11px]">
                {probeHistory.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-1.5 rounded bg-slate-950/80 border border-slate-800/60 text-slate-300"
                  >
                    <span>{(m.bytesReceived / 1024).toFixed(0)} KB in {m.transferDurationMs}ms</span>
                    <span className="text-cyan-400 font-semibold">{m.measuredThroughputKbps} kbps</span>
                    <span className="text-slate-500">{m.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
