import React from 'react';
import { Radio } from 'lucide-react';
import { PageId } from './Navbar';

interface FooterProps {
  onNavigate: (page: PageId) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#080d19] py-8 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Radio className="w-3 h-3" />
          </div>
          <span className="text-slate-300 font-semibold">AURA Broadcasting</span>
          <span>·</span>
          <span>Meaning-First Adaptive Broadcasting for Low-Bandwidth Networks</span>
        </div>

        <div className="flex items-center gap-4 text-slate-400">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="hover:text-cyan-400 transition-colors cursor-pointer"
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => onNavigate('setup')}
            className="hover:text-cyan-400 transition-colors cursor-pointer"
          >
            Broadcast Setup
          </button>
          <button
            type="button"
            onClick={() => onNavigate('studio')}
            className="hover:text-cyan-400 transition-colors cursor-pointer"
          >
            Live Studio
          </button>
          <button
            type="button"
            onClick={() => onNavigate('network')}
            className="hover:text-cyan-400 transition-colors cursor-pointer"
          >
            Network Lab
          </button>
          <button
            type="button"
            onClick={() => onNavigate('analytics')}
            className="hover:text-cyan-400 transition-colors cursor-pointer"
          >
            Performance Analytics
          </button>
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="hover:text-cyan-400 transition-colors cursor-pointer"
          >
            Reports
          </button>
        </div>
      </div>
    </footer>
  );
};
