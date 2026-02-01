
import React from 'react';
import { GroundingSource } from '../types';

interface SourceCardProps {
  source: GroundingSource;
}

const SourceCard: React.FC<SourceCardProps> = ({ source }) => {
  return (
    <a
      href={source.uri}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-200 hover:shadow-lg transition-all group overflow-hidden"
    >
      <div className="w-8 h-8 flex-shrink-0 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-blue-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[12px] font-bold text-slate-800 truncate">{source.title}</span>
        <span className="text-[10px] text-slate-400 truncate">{new URL(source.uri).hostname}</span>
      </div>
    </a>
  );
};

export default SourceCard;
