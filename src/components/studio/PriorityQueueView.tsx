import React, { useState } from 'react';
import {
  AlertCircle,
  FileText,
  Volume2,
  Video,
  Image,
  Clock,
  Layers,
  Archive,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { ContentItem, ContentType, PriorityClass } from '../../types/scheduler';

interface PriorityQueueViewProps {
  queue: ContentItem[];
  activeItem: ContentItem | null;
  activeItemProgressPercent: number;
  delivered: ContentItem[];
  deferred: ContentItem[];
  expired: ContentItem[];
  timelineSeconds: number;
}

export const PriorityQueueView: React.FC<PriorityQueueViewProps> = ({
  queue,
  activeItem,
  activeItemProgressPercent,
  delivered,
  deferred,
  expired,
  timelineSeconds,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'queued' | 'delivered' | 'deferred' | 'expired'>('all');

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getPriorityStyle = (priority: PriorityClass) => {
    switch (priority) {
      case 'P1_CRITICAL':
        return {
          textColor: 'text-rose-400',
          border: 'border-rose-500/40',
          bg: 'bg-rose-950/20',
          label: 'P1 CRITICAL',
        };
      case 'P2_HIGH':
        return {
          textColor: 'text-amber-400',
          border: 'border-amber-500/40',
          bg: 'bg-amber-950/20',
          label: 'P2 HIGH',
        };
      case 'P3_MEDIUM':
        return {
          textColor: 'text-cyan-400',
          border: 'border-cyan-500/30',
          bg: 'bg-cyan-950/20',
          label: 'P3 MEDIUM',
        };
      case 'P4_LOW':
      default:
        return {
          textColor: 'text-slate-400',
          border: 'border-slate-700/50',
          bg: 'bg-slate-900/30',
          label: 'P4 LOW',
        };
    }
  };

  const getTypeIcon = (type: ContentType) => {
    switch (type) {
      case 'critical_alert':
        return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'caption':
      case 'summary':
        return <FileText className="w-4 h-4 text-cyan-400 shrink-0" />;
      case 'audio_segment':
        return <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'keyframe':
        return <Image className="w-4 h-4 text-indigo-400 shrink-0" />;
      case 'live_video':
        return <Video className="w-4 h-4 text-sky-400 shrink-0" />;
      case 'deferred_video':
        return <Archive className="w-4 h-4 text-purple-400 shrink-0" />;
    }
  };

  const getTypeLabel = (type: ContentType) => {
    switch (type) {
      case 'critical_alert':
        return 'Critical Alert';
      case 'caption':
        return 'Caption';
      case 'summary':
        return 'Summary';
      case 'audio_segment':
        return 'Audio Chunk';
      case 'keyframe':
        return 'Keyframe Image';
      case 'live_video':
        return 'Live Video';
      case 'deferred_video':
        return 'Deferred Video';
    }
  };

  // Compile list based on active tab
  let displayItems: (ContentItem & { displayCategory: string })[] = [];
  if (filterTab === 'all' || filterTab === 'queued') {
    displayItems.push(...queue.map((it) => ({ ...it, displayCategory: 'Queued' })));
  }
  if (filterTab === 'all' || filterTab === 'deferred') {
    displayItems.push(...deferred.map((it) => ({ ...it, displayCategory: 'Deferred' })));
  }
  if (filterTab === 'all' || filterTab === 'delivered') {
    displayItems.push(...delivered.map((it) => ({ ...it, displayCategory: 'Delivered' })));
  }
  if (filterTab === 'all' || filterTab === 'expired') {
    displayItems.push(...expired.map((it) => ({ ...it, displayCategory: 'Expired' })));
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Priority Queue & Transmission Pipeline</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Deadline-aware dispatch with Live-First background catch-up
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(
            [
              { id: 'all', label: 'All', count: queue.length + delivered.length + deferred.length + expired.length },
              { id: 'queued', label: 'Queued', count: queue.length },
              { id: 'delivered', label: 'Delivered', count: delivered.length },
              { id: 'deferred', label: 'Deferred', count: deferred.length },
              { id: 'expired', label: 'Expired', count: expired.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                filterTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className="font-mono text-[10px] text-slate-500">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Transmission Highlight Banner */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-medium text-slate-200">ACTIVE CHANNEL TRANSFER:</span>
            {activeItem ? (
              <span className="text-cyan-300 font-semibold truncate max-w-[220px] sm:max-w-xs">
                {activeItem.title}
              </span>
            ) : (
              <span className="text-slate-500 italic">Channel idle — waiting for items</span>
            )}
          </div>
          {activeItem && (
            <span className="font-mono text-cyan-400 font-semibold">
              {activeItemProgressPercent.toFixed(0)}%
            </span>
          )}
        </div>

        {/* Channel Progress Bar */}
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-200 ease-out"
            style={{ width: `${activeItemProgressPercent}%` }}
          />
        </div>

        {activeItem && (
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
            <div className="flex items-center gap-2">
              <span>{formatBytes(activeItem.payloadBytes)}</span>
              <span>·</span>
              <span>Priority: {activeItem.priority}</span>
              {activeItem.urgencyScore !== undefined && (
                <>
                  <span>·</span>
                  <span className="text-amber-400 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3 inline" /> Score {activeItem.urgencyScore}
                  </span>
                </>
              )}
            </div>
            <span>Est. Remaining: {((100 - activeItemProgressPercent) * 0.05).toFixed(1)}s</span>
          </div>
        )}
      </div>

      {/* Queue Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[380px]">
        {displayItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No items in this category.
          </div>
        ) : (
          displayItems.map((item) => {
            const priorityStyle = getPriorityStyle(item.priority);
            const remainingDeadline = Math.max(
              0,
              item.deadlineSeconds - (timelineSeconds - item.createdAt)
            );
            const isNearDeadline = remainingDeadline < 4 && remainingDeadline > 0;

            return (
              <div
                key={item.id}
                className={`p-3 rounded-lg border transition-colors ${
                  item.status === 'transmitting'
                    ? 'bg-cyan-950/30 border-cyan-500/50 shadow-sm'
                    : item.status === 'delivered'
                    ? 'bg-slate-950/40 border-slate-800/80 opacity-80'
                    : item.status === 'deferred'
                    ? 'bg-purple-950/20 border-purple-800/40'
                    : item.status === 'expired'
                    ? 'bg-rose-950/20 border-rose-900/40 opacity-70'
                    : `${priorityStyle.bg} ${priorityStyle.border}`
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5">{getTypeIcon(item.type)}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-semibold text-slate-200 truncate max-w-sm">
                          {item.title}
                        </h4>
                        <span className={`text-[10px] font-mono font-medium ${priorityStyle.textColor}`}>
                          {priorityStyle.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {item.content}
                      </p>
                    </div>
                  </div>

                  {/* Status & Deadline Column */}
                  <div className="text-right shrink-0">
                    <div className="text-[11px] font-mono text-slate-300">
                      {formatBytes(item.payloadBytes)}
                    </div>

                    {item.status === 'delivered' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono mt-0.5">
                        <CheckCircle2 className="w-3 h-3" /> T+{(item.deliveredAt || 0).toFixed(1)}s
                      </span>
                    ) : item.status === 'expired' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-mono mt-0.5">
                        <XCircle className="w-3 h-3" /> Expired
                      </span>
                    ) : item.status === 'deferred' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-purple-400 font-mono mt-0.5">
                        <Archive className="w-3 h-3" /> Deferred
                      </span>
                    ) : item.status === 'transmitting' ? (
                      <span className="text-[11px] text-cyan-400 font-mono font-bold mt-0.5">
                        Transmitting...
                      </span>
                    ) : (
                      <div
                        className={`text-[11px] font-mono flex items-center justify-end gap-1 mt-0.5 ${
                          isNearDeadline ? 'text-rose-400 font-bold animate-pulse' : 'text-slate-400'
                        }`}
                        title="Remaining window before expiration"
                      >
                        <Clock className="w-3 h-3" />
                        <span>{remainingDeadline.toFixed(1)}s</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2 font-mono">
                  <span>Type: {getTypeLabel(item.type)}</span>
                  <span>·</span>
                  <span>Created: T+{item.createdAt.toFixed(1)}s</span>
                  {item.rendition && (
                    <>
                      <span>·</span>
                      <span className="text-slate-400">{item.rendition}</span>
                    </>
                  )}
                  {item.urgencyScore !== undefined && item.status === 'queued' && (
                    <>
                      <span>·</span>
                      <span className="text-amber-400">Score {item.urgencyScore}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
