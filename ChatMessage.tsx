
import React, { useState } from 'react';
import { Message } from '../types';
import SourceCard from './SourceCard';

interface ChatMessageProps {
  message: Message;
  onPlayVoice?: () => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onPlayVoice }) => {
  const isUser = message.role === 'user';
  const [showSources, setShowSources] = useState(false);

  if (isUser) {
    return (
      <div className="flex w-full justify-end animate-in fade-in slide-in-from-right-2 duration-300">
        <div className="max-w-[85%] space-y-2">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-[24px] rounded-tr-none shadow-sm">
            <p className="text-[15px] font-semibold">{message.content}</p>
          </div>
          {message.images && message.images.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2">
              {message.images.map((img, i) => (
                <img key={i} src={img} className="w-24 h-24 object-cover rounded-xl border border-slate-200 shadow-sm" />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col animate-in fade-in slide-in-from-left-2 duration-500">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-[10px] font-black text-white">G</div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Search Results</span>
          {message.appliedMethod && (
            <span className="text-[8px] font-bold text-blue-500 uppercase tracking-widest">Reasoning: {message.appliedMethod}</span>
          )}
        </div>
        <button 
          onClick={onPlayVoice}
          className="ml-auto p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
          title="Listen to search result"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
        </button>
      </div>

      <div className="bg-white border border-slate-100 p-6 rounded-[24px] rounded-tl-none shadow-sm space-y-6">
        <div className="prose prose-slate max-w-none text-[16px] leading-relaxed text-slate-800 font-medium whitespace-pre-wrap">
          {message.content}
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="pt-4 border-t border-slate-50">
            <button 
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors"
            >
              <svg className={`w-3 h-3 transition-transform ${showSources ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              {showSources ? 'Hide Citations' : `Review ${message.sources.length} Sources`}
            </button>
            {showSources && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                {message.sources.map((s, i) => <SourceCard key={i} source={s} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
