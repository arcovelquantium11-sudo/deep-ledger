import React, { useState, useRef, useEffect } from 'react';
import { AppMode, DocumentData, ChatMessage, CanonicalSpec } from './types';
import { analyzeDocument, chatWithNotebook, generateCanonicalSpec } from './services/geminiService';
import { Dashboard } from './components/Dashboard';

// --- Icons ---
const UploadIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>;
const DashboardIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const ChatIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>;
const SpecIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const Loader = () => <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.UPLOAD);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [processing, setProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [spec, setSpec] = useState<CanonicalSpec | null>(null);
  
  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    setProcessing(true);
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const docId = crypto.randomUUID();
      
      // Analyze immediately on upload (The "Digest" phase)
      const analysis = await analyzeDocument(text);
      
      const newDoc: DocumentData = {
        id: docId,
        filename: file.name,
        content: text,
        processed: true,
        entities: analysis.entities.map(en => ({...en, sourceId: docId})),
        claims: analysis.claims.map(c => ({...c, sourceId: docId})),
        conflicts: analysis.conflicts.map(c => ({...c, sourceIds: [docId]}))
      };

      setDocuments(prev => [...prev, newDoc]);
      setProcessing(false);
      setMode(AppMode.DASHBOARD);
    };

    reader.readAsText(file);
  };

  // Chat Handler
  const handleSendMessage = async (msg: string) => {
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: msg,
      timestamp: Date.now()
    };
    
    const updatedHistory = [...chatHistory, newMsg];
    setChatHistory(updatedHistory);
    
    const context = documents.map(d => `Document: ${d.filename}\n${d.content}`).join('\n\n');
    const responseText = await chatWithNotebook(updatedHistory, context);
    
    setChatHistory(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'model',
      content: responseText || "I couldn't generate a response.",
      timestamp: Date.now()
    }]);
  };

  // Spec Generation Handler
  const handleGenerateSpec = async () => {
    if (documents.length === 0) return;
    setProcessing(true);
    try {
      const generatedSpec = await generateCanonicalSpec(documents);
      setSpec(generatedSpec);
      setMode(AppMode.SPEC_BUILDER);
    } catch (e) {
      alert("Failed to generate spec. Check console.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Deep Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">Research & Synthesis</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavButton active={mode === AppMode.UPLOAD} onClick={() => setMode(AppMode.UPLOAD)} icon={<UploadIcon />}>Sources</NavButton>
          <NavButton active={mode === AppMode.DASHBOARD} onClick={() => setMode(AppMode.DASHBOARD)} icon={<DashboardIcon />} disabled={documents.length === 0}>Knowledge Graph</NavButton>
          <NavButton active={mode === AppMode.NOTEBOOK} onClick={() => setMode(AppMode.NOTEBOOK)} icon={<ChatIcon />} disabled={documents.length === 0}>Notebook</NavButton>
          <NavButton active={mode === AppMode.SPEC_BUILDER} onClick={() => setMode(AppMode.SPEC_BUILDER)} icon={<SpecIcon />} disabled={documents.length === 0}>Canonical Spec</NavButton>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 mb-2">Active Context</div>
          {documents.length === 0 ? (
            <div className="text-xs italic text-slate-600">No documents loaded</div>
          ) : (
            <ul className="space-y-1">
              {documents.map(d => (
                <li key={d.id} className="text-xs text-slate-400 truncate flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {d.filename}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {processing && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center flex-col gap-4">
            <Loader />
            <div className="text-blue-400 font-mono animate-pulse">Running Deep Analysis...</div>
          </div>
        )}

        {mode === AppMode.UPLOAD && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-xl w-full text-center">
              <div className="w-20 h-20 bg-slate-900 rounded-2xl mx-auto flex items-center justify-center mb-6 border border-slate-800 shadow-xl shadow-black/50">
                <UploadIcon />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Ingest Research Material</h2>
              <p className="text-slate-400 mb-8">Upload text-based documents (.txt, .md, .json) to begin the deep research process. The system will automatically extract claims, parameters, and consistency checks.</p>
              
              <label className="inline-flex cursor-pointer items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg shadow-blue-900/20 group">
                <span className="group-hover:translate-y-[-1px] transition-transform">Select Documents</span>
                <input type="file" className="hidden" accept=".txt,.md,.json" onChange={handleFileUpload} />
              </label>

               <div className="mt-12 grid grid-cols-2 gap-4 text-left">
                  <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-blue-400 text-sm font-mono mb-1">01. Digest</div>
                    <div className="text-xs text-slate-500">Extracts entities, units, and physical claims automatically.</div>
                  </div>
                  <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-emerald-400 text-sm font-mono mb-1">02. Synthesize</div>
                    <div className="text-xs text-slate-500">Generates physics-compliant specs, flagging assumptions.</div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {mode === AppMode.DASHBOARD && (
          <div className="flex-1 overflow-auto bg-slate-950">
             <Dashboard documents={documents} />
             <div className="p-6 pt-0">
               <button 
                  onClick={handleGenerateSpec}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-bold text-white shadow-lg hover:shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
                >
                  <SpecIcon />
                  Generate Canonical Specification (Deep Research)
               </button>
             </div>
          </div>
        )}

        {mode === AppMode.NOTEBOOK && (
          <ChatView history={chatHistory} onSend={handleSendMessage} />
        )}

        {mode === AppMode.SPEC_BUILDER && (
          <SpecView spec={spec} onRegenerate={handleGenerateSpec} />
        )}
      </main>
    </div>
  );
}

// --- Sub-Components ---

const NavButton = ({ active, children, onClick, icon, disabled }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      active 
        ? 'bg-blue-600/10 text-blue-400' 
        : disabled ? 'opacity-30 cursor-not-allowed text-slate-500' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`}
  >
    <span className={active ? 'text-blue-400' : 'text-slate-500'}>{icon}</span>
    {children}
  </button>
);

const ChatView = ({ history, onSend }: { history: ChatMessage[], onSend: (s: string) => void }) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {history.length === 0 && (
          <div className="h-full flex items-center justify-center text-slate-600 italic">
            Ask questions about your research materials...
          </div>
        )}
        {history.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
            }`}>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-slate-800 bg-slate-900">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-slate-600"
            placeholder="Query your documents..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (onSend(input), setInput(''))}
          />
          <button 
            onClick={() => { onSend(input); setInput(''); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const SpecView = ({ spec, onRegenerate }: { spec: CanonicalSpec | null, onRegenerate: () => void }) => {
  if (!spec) return <div className="flex-1 flex items-center justify-center text-slate-500">Generating Specification...</div>;

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-950">
      <div className="max-w-4xl mx-auto bg-white text-slate-900 p-12 rounded-lg shadow-2xl">
        <header className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold font-mono uppercase tracking-tighter">{spec.title}</h1>
            <div className="text-sm font-mono text-slate-500 mt-2">Version: {spec.version} | Generated by Deep Ledger</div>
          </div>
          <button onClick={onRegenerate} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded text-slate-600 font-medium">Re-Synthesize</button>
        </header>

        <div className="space-y-8 font-serif">
           {/* Sections */}
           {spec.sections.map((section, idx) => (
             <section key={idx}>
               <h3 className="text-xl font-bold mb-3 font-sans text-slate-800">{idx + 1}. {section.title}</h3>
               {section.type === 'EQUATION' ? (
                 <div className="bg-slate-50 p-4 border-l-4 border-blue-500 font-mono text-sm my-4 overflow-x-auto">
                   {section.content}
                 </div>
               ) : (
                 <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{section.content}</p>
               )}
             </section>
           ))}

           {/* Assumptions */}
           {spec.assumptions?.length > 0 && (
             <section className="bg-yellow-50 p-6 rounded-lg border border-yellow-100">
               <h3 className="text-lg font-bold text-yellow-800 mb-3 font-sans">Explicit Assumptions</h3>
               <ul className="list-disc list-inside space-y-1 text-yellow-900/80">
                 {spec.assumptions.map((a, i) => <li key={i}>{a}</li>)}
               </ul>
             </section>
           )}

           {/* Open Questions */}
           {spec.openQuestions?.length > 0 && (
             <section className="bg-red-50 p-6 rounded-lg border border-red-100">
               <h3 className="text-lg font-bold text-red-800 mb-3 font-sans">Open Technical Questions</h3>
               <ul className="list-disc list-inside space-y-1 text-red-900/80">
                 {spec.openQuestions.map((q, i) => <li key={i}>{q}</li>)}
               </ul>
             </section>
           )}
        </div>
        
        <footer className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-400 font-mono">
          CONFIDENTIAL - CANONICAL RESEARCH OUTPUT
        </footer>
      </div>
    </div>
  );
};

export default App;
