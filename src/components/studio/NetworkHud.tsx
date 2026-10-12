import React from 'react';
import { Wifi, WifiOff, Activity, AlertOctagon, Zap, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { NetworkProfile } from '../../types/scheduler';

interface NetworkHudProps {
  network: NetworkProfile;
  onUpdateNetwork: (updated: NetworkProfile) => void;
  isRealMeasurement: boolean;
}

export const NetworkHud: React.FC<NetworkHudProps> = ({
  network,
  onUpdateNetwork,
  isRealMeasurement,
}) => {
  const triggerCrisisDrop = () => {
    onUpdateNetwork({
      ...network,
      bandwidthKbps: 48,
      latencyMs: 750,
      packetLossPercent: 12,
      isOutage: false,
      name: 'Simulated Extreme Bandwidth Drop (48 kbps)',
    });
  };

  const triggerOutageCut = () => {
    onUpdateNetwork({
      ...network,
      isOutage: true,
      name: 'Simulated 5s Radio Link Outage',
    });
    // Auto restore after 5s
    setTimeout(() => {
      onUpdateNetwork({
        ...network,
        isOutage: false,
        name: network.name,
      });
    }, 5000);
  };

  const triggerRecoveryBoost = () => {
    onUpdateNetwork({
      ...network,
      bandwidthKbps: 3500,
      latencyMs: 35,
      packetLossPercent: 0.5,
      isOutage: false,
      name: 'Broadband Recovered (3.5 Mbps)',
    });
  };

  const triggerModerate = () => {
    onUpdateNetwork({
      ...network,
      bandwidthKbps: 1200,
      latencyMs: 90,
      packetLossPercent: 1.5,
      isOutage: false,
      name: 'Moderate Mobile (1200 kbps)',
    });
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {network.isOutage ? (
              <WifiOff className="w-4 h-4 text-rose-400" />
            ) : (
              <Wifi className="w-4 h-4 text-cyan-400" />
            )}
            <h4 className="text-xs font-semibold text-white">Live Network HUD</h4>
          </div>

          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
              isRealMeasurement
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
            }`}
          >
            {isRealMeasurement ? '● REAL HTTP SOCKETS' : '◆ MODEL SIMULATION'}
          </span>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block mb-0.5">BANDWIDTH</span>
            <span className="text-base font-bold font-mono text-cyan-300">
              {network.isOutage ? '0' : network.bandwidthKbps}{' '}
              <span className="text-[10px] text-slate-400 font-normal">kbps</span>
            </span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block mb-0.5">RTT LATENCY</span>
            <span className="text-base font-bold font-mono text-slate-200">
              {network.latencyMs}{' '}
              <span className="text-[10px] text-slate-400 font-normal">ms</span>
            </span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block mb-0.5">PACKET LOSS</span>
            <span
              className={`text-base font-bold font-mono ${
                network.packetLossPercent > 5 ? 'text-amber-400' : 'text-slate-200'
              }`}
            >
              {network.packetLossPercent}
              <span className="text-[10px] text-slate-400 font-normal">%</span>
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 line-clamp-1 mb-3">
          Profile: <span className="text-slate-200 font-medium">{network.name}</span>
        </p>
      </div>

      {/* Quick Chaos / Stress Test Actions */}
      <div>
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-1.5">
          Live Chaos Injection Triggers:
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={triggerCrisisDrop}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 text-[11px] font-medium text-rose-300 transition-colors"
            title="Drop bandwidth to 48 kbps to test AURA priority vs Baseline stall"
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Drop to 48 kbps</span>
          </button>

          <button
            type="button"
            onClick={triggerOutageCut}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/50 text-[11px] font-medium text-amber-300 transition-colors"
            title="Simulate 5s connection blackout"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>5s Outage Cut</span>
          </button>

          <button
            type="button"
            onClick={triggerRecoveryBoost}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/50 text-[11px] font-medium text-emerald-300 transition-colors"
            title="Restore bandwidth to test AURA Live-First Recovery"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Recover 3.5M</span>
          </button>

          <button
            type="button"
            onClick={triggerModerate}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-slate-300 transition-colors"
            title="Reset to 1200 kbps"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Set 1200 kbps</span>
          </button>
        </div>
      </div>
    </div>
  );
};
