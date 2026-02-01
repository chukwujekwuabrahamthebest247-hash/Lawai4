
import React, { useState, useRef, useEffect } from 'react';
import { Message, AppStatus, ChatSession, VoiceGender, LegalMethod } from './types';
import { generateAIResponse, generateSpeech, decodeAudioData } from './services/aiService';
import ChatMessage from './components/ChatMessage';

const STORAGE_KEY = 'omnisearch_v11';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('FEMALE');
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setSessions(parsed);
      if (parsed.length > 0) setCurrentSessionId(parsed[0].id);
    } else {
      createNewChat();
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, status]);

  const createNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Search',
      messages: [{
        role: 'assistant',
        content: "I'm ready to search Google for you. I can now use specific legal reasoning methods like IRAC, CREC, or IPAC if you're asking legal questions.",
        timestamp: new Date()
      }],
      lastModified: Date.now(),
      legalMethod: 'NONE'
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];
  const currentLegalMethod = currentSession?.legalMethod || 'NONE';

  const updateLegalMethod = (method: LegalMethod) => {
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, legalMethod: method } : s));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPendingImages(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const playVoice = async (text: string) => {
    if (!audioCtxRef.current) {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      audioCtxRef.current = new AudioContextClass({ sampleRate: 24000 });
    }
    const ctx = audioCtxRef.current;
    const audioData = await generateSpeech(text, voiceGender);
    if (audioData && ctx) {
      try {
        const buffer = await decodeAudioData(audioData, ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
      } catch (err) { console.error(err); }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!inputValue.trim() && pendingImages.length === 0) || status === AppStatus.LOADING) return;

    const prompt = inputValue.trim();
    const images = [...pendingImages];
    const activeMethod = currentLegalMethod;
    setInputValue('');
    setPendingImages([]);
    setErrorMessage(null);

    const userMsg: Message = { role: 'user', content: prompt || "Analyze this image", timestamp: new Date(), images };
    const updatedMessages = [...messages, userMsg];
    
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { 
      ...s, 
      messages: updatedMessages,
      title: updatedMessages.length === 2 ? prompt.slice(0, 20) : s.title 
    } : s));
    
    setStatus(AppStatus.LOADING);

    const res = await generateAIResponse(prompt, images, activeMethod);
    
    if (res.error) {
      setErrorMessage(res.error);
      setStatus(AppStatus.ERROR);
    } else {
      const assistantMsg: Message = { 
        role: 'assistant', 
        content: res.text, 
        timestamp: new Date(), 
        sources: res.sources,
        appliedMethod: activeMethod !== 'NONE' ? activeMethod : undefined
      };
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { 
        ...s, 
        messages: [...updatedMessages, assistantMsg] 
      } : s));
      setStatus(AppStatus.IDLE);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className={`bg-slate-900 text-white transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-72' : 'w-0 opacity-0 overflow-hidden'}`}>
        <div className="p-4 border-b border-white/10">
          <button onClick={createNewChat} className="w-full flex items-center justify-center gap-2 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
            New Search
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {sessions.map(s => (
            <button key={s.id} onClick={() => setCurrentSessionId(s.id)} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold truncate transition-all ${currentSessionId === s.id ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
              {s.title}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/10 space-y-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Legal Analysis</label>
              <div className="group relative">
                <svg className="w-3 h-3 text-slate-500 cursor-help" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-slate-800 text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-white/5">
                  <p className="font-bold text-blue-400">IRAC:</p> Issue, Rule, Analysis, Conclusion<br/>
                  <p className="font-bold text-blue-400 mt-1">CREC:</p> Conclusion, Rule, Explanation, Conclusion<br/>
                  <p className="font-bold text-blue-400 mt-1">IPAC:</p> Issue, Principle, Application, Conclusion
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-slate-800 p-1 rounded-lg">
              {['NONE', 'IRAC', 'CREC', 'IPAC'].map((m) => (
                <button
                  key={m}
                  onClick={() => updateLegalMethod(m as LegalMethod)}
                  className={`py-1.5 rounded text-[10px] font-black tracking-widest transition-all ${currentLegalMethod === m ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  {m === 'NONE' ? 'OFF' : m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Narrator</label>
            <select value={voiceGender} onChange={(e) => setVoiceGender(e.target.value as VoiceGender)} className="bg-slate-800 text-xs font-bold border-none rounded-lg p-2 focus:ring-0">
              <option value="FEMALE">Kore (Female)</option>
              <option value="MALE">Fenrir (Male)</option>
            </select>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" /></svg>
            </button>
            <div className="flex flex-col">
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">OmniSearch</h1>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Google Search Grounding Tool</span>
            </div>
          </div>
          {currentLegalMethod !== 'NONE' && (
            <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black tracking-widest border border-blue-100 uppercase">
              {currentLegalMethod} Mode
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-10 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-8">
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} message={msg} onPlayVoice={() => playVoice(msg.content)} />
            ))}
            {status === AppStatus.LOADING && (
              <div className="flex items-center gap-4 ml-4">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2.5 h-2.5 bg-blue-200 rounded-full animate-bounce delay-150"></div>
                </div>
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Searching Google...</span>
              </div>
            )}
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-600">
                <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs font-bold uppercase tracking-wide leading-relaxed">{errorMessage}</p>
              </div>
            )}
            <div ref={scrollRef} className="h-4" />
          </div>
        </main>

        <footer className="p-6 bg-white border-t border-slate-100">
          <div className="max-w-3xl mx-auto">
            {pendingImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {pendingImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img} className="w-16 h-16 object-cover rounded-xl border border-slate-200" />
                    <button onClick={() => setPendingImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleSubmit} className="relative group">
              <div className="relative flex items-center bg-white border border-slate-200 rounded-[28px] p-2 pr-3 shadow-sm group-focus-within:border-blue-600 transition-all duration-300">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-blue-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </button>
                <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                <input 
                  value={inputValue} 
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={currentLegalMethod === 'NONE' ? "Ask a question..." : `Legal Search in ${currentLegalMethod} mode...`}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-[16px] py-3.5 px-4 font-medium"
                />
                <button type="submit" disabled={(!inputValue.trim() && pendingImages.length === 0) || status === AppStatus.LOADING} className={`p-3.5 rounded-full transition-all ${(!inputValue.trim() && pendingImages.length === 0) || status === AppStatus.LOADING ? 'text-slate-200 bg-slate-50' : 'bg-blue-600 text-white shadow-lg hover:scale-105 active:scale-95'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </button>
              </div>
            </form>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
