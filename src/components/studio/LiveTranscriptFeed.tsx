import React, { useState } from 'react';
import {
  FileText,
  Copy,
  CheckCheck,
  Search,
  Volume2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ContentItem } from '../../types/scheduler';

interface LiveTranscriptFeedProps {
  fullTranscription?: string;
  deliveredItems: ContentItem[];
  activeItem?: ContentItem | null;
  videoTitle: string;
}

export const LiveTranscriptFeed: React.FC<LiveTranscriptFeedProps> = ({
  fullTranscription,
  deliveredItems,
  activeItem,
  videoTitle,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [filterQuery, setFilterQuery] = useState<string>('');

  // Extract all delivered captions and speech lines
  const deliveredCaptions = deliveredItems.filter(
    (item) => item.type === 'caption' || item.type === 'summary'
  );

  const handleCopy = () => {
    const textToCopy =
      fullTranscription ||
      deliveredCaptions.map((c) => `[T+${c.createdAt}s] ${c.content}`).join('\n');

    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden space-y-0 transition-all shadow-lg">
      {/* Header Bar */}
      <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Live Video Transcription & Speech Feed
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                {deliveredCaptions.length} Synced
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-sm">
              Verbatim speech & dialogue extracted from "{videoTitle}"
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-cyan-400 transition-colors cursor-pointer"
            title="Copy entire transcript to clipboard"
          >
            {copied ? (
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Transcript'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse Feed' : 'Expand Feed'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Active Broadcast Caption Spotlight */}
          {activeItem && activeItem.type === 'caption' && (
            <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-start gap-2 animate-pulse">
              <Volume2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="text-[10px] font-mono text-cyan-300 font-bold block">
                  NOW BROADCASTING [T+{activeItem.createdAt}s]:
                </span>
                <span className="text-white font-medium">{activeItem.content}</span>
              </div>
            </div>
          )}

          {/* Search Transcript Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search speech, keywords, speaker..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-500 font-sans"
            />
          </div>

          {/* Delivered Captions Stream */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {deliveredCaptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 font-mono">
                Waiting for first transcript segment transmission over network...
              </div>
            ) : (
              deliveredCaptions
                .filter((item) =>
                  filterQuery
                    ? item.content.toLowerCase().includes(filterQuery.toLowerCase()) ||
                      item.title.toLowerCase().includes(filterQuery.toLowerCase())
                    : true
                )
                .map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-2 rounded bg-slate-950/60 border border-slate-800/80 text-xs flex items-start gap-2.5 hover:border-slate-700 transition-colors"
                  >
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-900/60 shrink-0 mt-0.5">
                      T+{item.createdAt}s
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                        <span>{item.title}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {item.payloadBytes} B
                        </span>
                      </div>
                      <p className="text-slate-200 mt-0.5 leading-relaxed font-sans">{item.content}</p>
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* Full continuous video transcription document */}
          {fullTranscription && (
            <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Full Continuous Speech Transcript:</span>
              </span>
              <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-36 overflow-y-auto font-sans selection:bg-cyan-500 selection:text-slate-950 whitespace-pre-line">
                {fullTranscription}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
