import React from 'react';
import {
  Radio,
  Sliders,
  PlaySquare,
  BarChart3,
  FileSpreadsheet,
  Layers,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { BroadcastMode, NetworkProfile } from '../../types/scheduler';

export type PageId = 'home' | 'setup' | 'studio' | 'network' | 'analytics' | 'reports';

interface NavbarProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  mode: BroadcastMode;
  network: NetworkProfile;
  isStreamingLive: boolean;
  onToggleMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onSelectPage,
  mode,
  network,
  isStreamingLive,
  onToggleMode,
}) => {
  const navItems: { id: PageId; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Overview', icon: <Layers className="w-4 h-4" /> },
    { id: 'setup', label: 'Broadcast Setup', icon: <Radio className="w-4 h-4" /> },
    { id: 'studio', label: 'Live Studio', icon: <PlaySquare className="w-4 h-4" /> },
    { id: 'network', label: 'Network Lab', icon: <Sliders className="w-4 h-4" /> },
    { id: 'analytics', label: 'Performance', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  return (
    <header className="border-b border-slate-800 bg-[#0b1222]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onSelectPage('home')}
          >
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 transition-colors">
              <Radio className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-lg text-white">AURA</span>
                <span className="text-xs text-cyan-400 font-mono tracking-wider font-semibold">ADAPTIVE BROADCAST</span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                When bandwidth drops, essential information comes first.
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/70 p-1 rounded-lg border border-slate-800">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectPage(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.id === 'studio' && isStreamingLive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick HUD & Mode Switcher */}
          <div className="flex items-center gap-3">
            {/* Network Indicator */}
            <div
              onClick={() => onSelectPage('network')}
              title="Click to adjust Network conditions"
              className="cursor-pointer hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300 hover:border-slate-700 transition-colors"
            >
              {network.isOutage ? (
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span className={network.isOutage ? 'text-rose-400' : 'text-slate-200 font-medium'}>
                {network.isOutage ? 'OUTAGE' : `${network.bandwidthKbps} kbps`}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">{network.latencyMs}ms</span>
            </div>

            {/* Mode Switch Toggle */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={onToggleMode}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                  mode === 'AURA'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="AURA Mode: Deadline-aware priority scheduling & multi-content adaptive delivery"
              >
                AURA
              </button>
              <button
                type="button"
                onClick={onToggleMode}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  mode === 'BASELINE'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Baseline Mode: Conventional media-first sequential streaming"
              >
                Baseline
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-800/80">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
