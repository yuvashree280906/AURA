import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Bell,
  BellOff,
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  Radio,
} from 'lucide-react';
import { ContentItem, PriorityClass } from '../../types/scheduler';

interface CriticalAlertsPanelProps {
  deliveredItems: ContentItem[];
  onInjectMessage: (item: ContentItem) => void;
  timelineSeconds: number;
}

export const CriticalAlertsPanel: React.FC<CriticalAlertsPanelProps> = ({
  deliveredItems,
  onInjectMessage,
  timelineSeconds,
}) => {
  const [audioChimeEnabled, setAudioChimeEnabled] = useState<boolean>(true);
  const [customText, setCustomText] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customPriority, setCustomPriority] = useState<PriorityClass>('P1_CRITICAL');
  const [showInjectModal, setShowInjectModal] = useState<boolean>(false);
  const prevDeliveredCountRef = useRef<number>(deliveredItems.length);

  // Play browser synthesizer chime on new P1 alert arrival
  const playChimeTone = () => {
    if (!audioChimeEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15); // E6

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    } catch {
      // AudioContext policy handled
    }
  };

  useEffect(() => {
    if (deliveredItems.length > prevDeliveredCountRef.current) {
      const latest = deliveredItems[deliveredItems.length - 1];
      if (latest && latest.priority === 'P1_CRITICAL') {
        playChimeTone();
      }
    }
    prevDeliveredCountRef.current = deliveredItems.length;
  }, [deliveredItems.length]);

  const handleInject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customText.trim()) return;

    const payloadBytes = Math.max(300, new Blob([customTitle + customText]).size * 3);
    const newItem: ContentItem = {
      id: `inject_${Date.now()}`,
      title: customTitle.trim(),
      content: customText.trim(),
      type: customPriority === 'P1_CRITICAL' ? 'critical_alert' : 'caption',
      priority: customPriority,
      payloadBytes,
      createdAt: timelineSeconds,
      deadlineSeconds: customPriority === 'P1_CRITICAL' ? 10 : 25,
      status: 'queued',
      isLive: true,
      retryCount: 0,
    };

    onInjectMessage(newItem);
    setCustomTitle('');
    setCustomText('');
    setShowInjectModal(false);
  };

  // Filter delivered critical alerts & captions
  const criticalDelivered = deliveredItems.filter(
    (it) => it.type === 'critical_alert' || it.priority === 'P1_CRITICAL' || it.type === 'caption'
  );

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Critical Announcements & Transcripts
            </h3>
            <p className="text-[11px] text-slate-400">
              Immediate meaning-first channel for urgent instructions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Chime Toggle */}
          <button
            type="button"
            onClick={() => setAudioChimeEnabled(!audioChimeEnabled)}
            className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
              audioChimeEnabled
                ? 'bg-slate-800 text-cyan-400 border-cyan-500/40'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title={audioChimeEnabled ? 'Audio Chime Enabled' : 'Audio Chime Muted'}
          >
            {audioChimeEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          </button>

          {/* Inject Alert Button */}
          <button
            type="button"
            onClick={() => setShowInjectModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Send className="w-3 h-3" />
            <span>Inject Alert</span>
          </button>
        </div>
      </div>

      {/* Critical Delivered Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[360px]">
        {criticalDelivered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No critical announcements delivered yet. Start broadcast or inject a message above.
          </div>
        ) : (
          criticalDelivered.map((item) => {
            const isP1 = item.priority === 'P1_CRITICAL';
            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-lg border transition-all ${
                  isP1
                    ? 'bg-rose-950/25 border-rose-500/50 shadow-sm'
                    : 'bg-cyan-950/20 border-cyan-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isP1 ? 'bg-rose-500 text-slate-950' : 'bg-cyan-500 text-slate-950'
                      }`}
                    >
                      {isP1 ? 'URGENT FLASH' : 'LIVE TRANSCRIPT'}
                    </span>
                    <h4 className="text-xs font-bold text-white tracking-tight">
                      {item.title}
                    </h4>
                  </div>

                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> T+{(item.deliveredAt || 0).toFixed(1)}s
                  </span>
                </div>

                <p className="text-xs text-slate-200 mt-2 leading-relaxed">
                  {item.content}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/80 font-mono">
                  <span>Size: {(item.payloadBytes / 1024).toFixed(1)} KB</span>
                  <span className="text-emerald-400 font-semibold">
                    Delivery latency: {item.transferDurationMs || 120}ms
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Inject Modal */}
      {showInjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Broadcast Critical Announcement</span>
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              AURA will immediately schedule this high-priority payload, preempting non-critical video frames.
            </p>

            <form onSubmit={handleInject} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Announcement Headline / Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. URGENT: Critical Takeaway or Immediate Update"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Message Body & Key Instruction
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Essential detail from the presentation that must reach viewers immediately."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Priority Class
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomPriority('P1_CRITICAL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-center transition-colors ${
                      customPriority === 'P1_CRITICAL'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    P1 Critical (Preemptive)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomPriority('P2_HIGH')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-center transition-colors ${
                      customPriority === 'P2_HIGH'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    P2 High (Urgent Caption)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInjectModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs"
                >
                  Broadcast Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
