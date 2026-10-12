import React, { useState } from 'react';
import {
  ListFilter,
  Download,
  Trash2,
  CheckCircle,
  AlertCircle,
  Wifi,
  PauseCircle,
  Archive,
  Search,
} from 'lucide-react';
import { BroadcastEvent } from '../../types/scheduler';

interface LiveEventLogProps {
  events: BroadcastEvent[];
  onClearEvents?: () => void;
}

export const LiveEventLog: React.FC<LiveEventLogProps> = ({ events, onClearEvents }) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getEventBadge = (type: BroadcastEvent['type']) => {
    switch (type) {
      case 'DELIVERED':
        return <span className="text-emerald-400 font-mono text-[10px] font-semibold">DELIVERED</span>;
      case 'TRANSMITTING':
        return <span className="text-cyan-400 font-mono text-[10px] font-semibold">XMITTING</span>;
      case 'DEFERRED':
        return <span className="text-purple-400 font-mono text-[10px] font-semibold">DEFERRED</span>;
      case 'EXPIRED':
        return <span className="text-rose-400 font-mono text-[10px] font-semibold">EXPIRED</span>;
      case 'BUFFER_STALL':
        return <span className="text-amber-400 font-mono text-[10px] font-semibold">STALL</span>;
      case 'BUFFER_RECOVERED':
        return <span className="text-teal-400 font-mono text-[10px] font-semibold">RESUMED</span>;
      case 'NETWORK_CHANGE':
        return <span className="text-indigo-400 font-mono text-[10px] font-semibold">NET_SHIFT</span>;
      default:
        return <span className="text-slate-400 font-mono text-[10px]">INFO</span>;
    }
  };

  const filteredEvents = events.filter((evt) => {
    if (filterType !== 'ALL' && evt.type !== filterType) return false;
    if (searchQuery.trim() && !evt.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const exportLogsAsText = () => {
    const textLines = events.map(
      (e) => `[T+${e.timestampSeconds.toFixed(1)}s] [${e.mode}] [${e.type}] ${e.message}`
    );
    const blob = new Blob([textLines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AURA_Broadcast_Events_${Date.now()}.log`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-semibold text-white">Live Event & Decision Audit</h4>
          <span className="text-[11px] font-mono text-slate-500">({events.length})</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportLogsAsText}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors"
            title="Download audit log"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          {onClearEvents && (
            <button
              type="button"
              onClick={onClearEvents}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-xs transition-colors"
              title="Clear event log"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-3 py-2 bg-slate-950/70 border-b border-slate-800/80 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search decisions or payloads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded pl-7 pr-2 py-1 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-500"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-[11px] text-slate-300 rounded px-2 py-1 focus:outline-hidden"
        >
          <option value="ALL">All Events</option>
          <option value="DELIVERED">Delivered</option>
          <option value="TRANSMITTING">Transmitting</option>
          <option value="DEFERRED">Deferred</option>
          <option value="EXPIRED">Expired</option>
          <option value="BUFFER_STALL">Stalls</option>
          <option value="NETWORK_CHANGE">Network Shift</option>
        </select>
      </div>

      {/* Log Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[280px] font-mono text-[11px]">
        {filteredEvents.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            No events match the current filter.
          </div>
        ) : (
          filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className="flex items-start gap-2 py-1 border-b border-slate-800/40 hover:bg-slate-800/20 px-1 rounded transition-colors"
            >
              <span className="text-slate-500 shrink-0 select-none">
                T+{evt.timestampSeconds.toFixed(1)}s
              </span>
              <span className="shrink-0">{getEventBadge(evt.type)}</span>
              <span className="text-slate-300 break-words leading-tight">{evt.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
