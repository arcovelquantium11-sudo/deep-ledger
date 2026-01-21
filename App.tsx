import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppMode, DocumentData, ChatMessage, CanonicalSpec, User, Theme, FontSize, UserData } from './types';
import { analyzeDocument, chatWithNotebook, generateCanonicalSpec } from './services/geminiService';
import { authService } from './services/authService';
import { storageService } from './services/storageService';
import { initPyodide } from './services/pyodideService'; // Import Pyodide Init
import { Dashboard } from './components/Dashboard';
import { Notebook } from './components/Notebook'; // Import Notebook

// --- Icons ---
const UploadIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>;
const DashboardIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const ChatIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>;
const SpecIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const SettingsIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const LogoutIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const SaveIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>;
const CheckIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>;
const Loader = () => <svg className="animate-spin h-5 w-5 text-app-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

// --- Arcovel Branding ---
const ArcovelLogo = ({ size = "normal" }: { size?: "normal" | "large" }) => {
  const isLarge = size === "large";
  return (
    <div className={`flex items-center ${isLarge ? 'gap-4' : 'gap-3'} select-none`}>
      <div className={`relative ${isLarge ? 'w-12 h-12' : 'w-8 h-8'}`}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full animate-spin-slow">
           <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0.2" />
              </linearGradient>
           </defs>
           {/* Futuristic Ring Structure */}
           <path d="M50 5 A45 45 0 0 1 95 50" stroke="#64748b" strokeWidth="2" strokeLinecap="round" className="opacity-50" />
           <path d="M95 50 A45 45 0 0 1 50 95" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeDasharray="15 5" />
           <path d="M50 95 A45 45 0 0 1 5 50" stroke="#64748b" strokeWidth="2" strokeLinecap="round" className="opacity-50" />
           <path d="M5 50 A45 45 0 0 1 50 5" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" className="opacity-50" />
           
           {/* Inner mechanisms */}
           <circle cx="50" cy="50" r="30" stroke="#334155" strokeWidth="1" fill="url(#grad1)" />
           <circle cx="50" cy="50" r="15" stroke="#f97316" strokeWidth="1" className="opacity-80" />
           
           {/* Needle/Vector */}
           <line x1="50" y1="50" x2="20" y2="80" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
           <circle cx="50" cy="50" r="4" fill="#cbd5e1" />
        </svg>
      </div>
      <div className={`${isLarge ? 'text-4xl' : 'text-xl'} font-bold tracking-tight font-sans`}>
        <span className="text-slate-400">arco</span>
        <span className="text-orange-500">vel</span>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [mode, setMode] = useState<AppMode>(AppMode.UPLOAD);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [processing, setProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [spec, setSpec] = useState<CanonicalSpec | null>(null);
  
  // Customization State
  const [theme, setTheme] = useState<Theme>('dark');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [showSettings, setShowSettings] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  
  // Persistence State
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize
  useEffect(() => {
    // Auth Listener
    const unsubscribe = authService.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });

    // Preload Pyodide in background
    initPyodide().then(() => {
        console.log("Python Runtime Ready");
        setPyodideReady(true);
    }).catch(err => console.error("Failed to load Python", err));

    return () => unsubscribe();
  }, []);

  // Load user data when user changes
  useEffect(() => {
    if (user) {
      const data = storageService.load(user.id);
      if (data) {
        setDocuments(data.documents);
        setChatHistory(data.chatHistory);
        setSpec(data.spec);
        setTheme(data.preferences.theme);
        setFontSize(data.preferences.fontSize);
        if (data.lastMode && Object.values(AppMode).includes(data.lastMode)) {
           setMode(data.lastMode);
        } else if (data.documents.length > 0 && mode === AppMode.UPLOAD) {
           setMode(AppMode.DASHBOARD);
        }
        setLastSaved(data.lastSaved);
      }
    }
  }, [user]);

  // Update root element attributes when settings change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [theme, fontSize]);

  // Save Function
  const handleSave = useCallback(async () => {
    if (!user) return;
    setIsSaving(true);
    
    // Tiny artificial delay to show UI feedback
    await new Promise(r => setTimeout(r, 400));
    
    const timestamp = storageService.save(user.id, {
      documents,
      chatHistory,
      spec,
      preferences: { theme, fontSize },
      lastMode: mode
    });
    
    setLastSaved(timestamp);
    setIsSaving(false);
  }, [user, documents, chatHistory, spec, theme, fontSize, mode]);

  // Auto-save effect (debounce)
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      // Only auto-save if data exists
      if (documents.length > 0 || chatHistory.length > 0) {
        handleSave();
      }
    }, 5000); // Auto-save after 5 seconds of inactivity
    return () => clearTimeout(timer);
  }, [user, documents, chatHistory, spec, theme, fontSize, mode, handleSave]);

  // Auth Handlers
  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setDocuments([]);
    setChatHistory([]);
    setSpec(null);
    setMode(AppMode.UPLOAD);
    setLastSaved(null);
  };
  
  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    setProcessing(true);
    const files = Array.from(e.target.files);
    
    try {
      // Process files concurrently
      const processedDocs = await Promise.all(
        files.map(async (file) => {
          return new Promise<DocumentData | null>((resolve) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
              const text = event.target?.result as string;
              if (!text) {
                 resolve(null);
                 return;
              }
              try {
                const docId = crypto.randomUUID();
                // Analyze immediately on upload (The "Digest" phase)
                const analysis = await analyzeDocument(text);
                
                resolve({
                  id: docId,
                  filename: file.name,
                  content: text,
                  processed: true,
                  entities: analysis.entities.map(en => ({...en, sourceId: docId})),
                  claims: analysis.claims.map(c => ({...c, sourceId: docId})),
                  conflicts: analysis.conflicts.map(c => ({...c, sourceIds: [docId]}))
                });
              } catch (err) {
                console.error(`Analysis failed for ${file.name}`, err);
                resolve(null);
              }
            };
            reader.onerror = () => resolve(null);
            reader.readAsText(file);
          });
        })
      );

      const validDocs = processedDocs.filter((d): d is DocumentData => d !== null);
      
      if (validDocs.length > 0) {
        setDocuments(prev => [...prev, ...validDocs]);
        setMode(AppMode.DASHBOARD);
      }
    } catch (err) {
      console.error("Batch upload error", err);
    } finally {
      setProcessing(false);
      e.target.value = ''; // Reset input to allow re-selection
    }
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

  // Manual Code Injection Handler (for Notebook Mode)
  const handleManualEntry = async (content: string) => {
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content,
      timestamp: Date.now()
    };
    // Add to history without triggering LLM
    setChatHistory(prev => [...prev, newMsg]);
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

  if (loadingAuth) return <div className="h-screen w-screen flex items-center justify-center bg-app-bg text-app-text"><Loader /></div>;

  if (!user) {
    return <AuthScreen onLogin={setUser} />;
  }

  return (
    <div className="flex h-screen bg-app-bg text-app-text font-sans overflow-hidden transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 bg-app-surface border-r border-app-border flex flex-col transition-colors duration-200">
        <div className="p-6 border-b border-app-border">
          <ArcovelLogo />
          <p className="text-xs text-app-subtext mt-3 ml-1">Research & Synthesis</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavButton active={mode === AppMode.UPLOAD} onClick={() => setMode(AppMode.UPLOAD)} icon={<UploadIcon />}>Sources</NavButton>
          <NavButton active={mode === AppMode.DASHBOARD} onClick={() => setMode(AppMode.DASHBOARD)} icon={<DashboardIcon />} disabled={documents.length === 0}>Knowledge Graph</NavButton>
          <NavButton active={mode === AppMode.NOTEBOOK} onClick={() => setMode(AppMode.NOTEBOOK)} icon={<ChatIcon />} disabled={documents.length === 0}>
            Notebook {pyodideReady ? <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1" title="Python Ready" /> : <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500 ml-1 animate-pulse" title="Loading Python..." />}
          </NavButton>
          <NavButton active={mode === AppMode.SPEC_BUILDER} onClick={() => setMode(AppMode.SPEC_BUILDER)} icon={<SpecIcon />} disabled={documents.length === 0}>Canonical Spec</NavButton>
        </nav>

        <div className="p-4 border-t border-app-border">
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className={`flex items-center gap-2 text-sm mb-3 w-full p-2 rounded transition-colors ${
              isSaving 
                ? 'text-app-accent bg-app-accent/10' 
                : 'text-app-subtext hover:text-app-text hover:bg-app-bg'
            }`}
          >
             {isSaving ? <Loader /> : (lastSaved ? <CheckIcon /> : <SaveIcon />)}
             {isSaving ? "Saving..." : "Save Workspace"}
          </button>
          {lastSaved && (
             <div className="text-[10px] text-app-subtext mb-3 px-2">
               Last saved: {new Date(lastSaved).toLocaleTimeString()}
             </div>
          )}

          <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 text-sm text-app-subtext hover:text-app-text mb-3 w-full p-2 rounded hover:bg-app-bg transition-colors">
            <SettingsIcon /> Settings
          </button>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-app-text truncate max-w-[120px]">{user.name}</div>
            <button onClick={handleLogout} className="text-app-subtext hover:text-red-400 p-1 rounded hover:bg-app-bg transition-colors" title="Logout">
              <LogoutIcon />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-app-bg">
        {processing && (
          <div className="absolute inset-0 bg-app-bg/80 backdrop-blur-sm z-50 flex items-center justify-center flex-col gap-4">
            <Loader />
            <div className="text-app-accent font-mono animate-pulse">Running Deep Analysis...</div>
          </div>
        )}

        {mode === AppMode.UPLOAD && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-xl w-full text-center">
              <div className="w-20 h-20 bg-app-surface rounded-2xl mx-auto flex items-center justify-center mb-6 border border-app-border shadow-xl">
                <div className="text-app-text"><UploadIcon /></div>
              </div>
              <h2 className="text-3xl font-bold text-app-text mb-4">Ingest Research Material</h2>
              <p className="text-app-subtext mb-8">Upload text-based documents (.txt, .md, .json) to begin the deep research process.</p>
              
              <label className="inline-flex cursor-pointer items-center gap-3 bg-app-accent hover:bg-app-accent-hover text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg group">
                <span className="group-hover:translate-y-[-1px] transition-transform">Select Documents</span>
                <input type="file" className="hidden" multiple accept=".txt,.md,.json" onChange={handleFileUpload} />
              </label>

               <div className="mt-12 grid grid-cols-2 gap-4 text-left">
                  <div className="p-4 bg-app-surface rounded-lg border border-app-border">
                    <div className="text-blue-400 text-sm font-mono mb-1">01. Digest</div>
                    <div className="text-xs text-app-subtext">Extracts entities, units, and physical claims automatically.</div>
                  </div>
                  <div className="p-4 bg-app-surface rounded-lg border border-app-border">
                    <div className="text-emerald-400 text-sm font-mono mb-1">02. Synthesize</div>
                    <div className="text-xs text-app-subtext">Generates physics-compliant specs, flagging assumptions.</div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {mode === AppMode.DASHBOARD && (
          <div className="flex-1 overflow-auto bg-app-bg">
             <Dashboard documents={documents} theme={theme} />
             <div className="p-6 pt-0">
               <button 
                  onClick={handleGenerateSpec}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-bold text-white shadow-lg hover:shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
                >
                  <SpecIcon />
                  Generate Canonical Specification (Arcovel Deep Research)
               </button>
             </div>
          </div>
        )}

        {mode === AppMode.NOTEBOOK && (
          <Notebook history={chatHistory} onSend={handleSendMessage} onManualEntry={handleManualEntry} />
        )}

        {mode === AppMode.SPEC_BUILDER && (
          <SpecView spec={spec} onRegenerate={handleGenerateSpec} />
        )}
      </main>

      {showSettings && (
        <SettingsModal 
          theme={theme} 
          setTheme={setTheme} 
          fontSize={fontSize} 
          setFontSize={setFontSize} 
          onClose={() => setShowSettings(false)} 
        />
      )}
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
        ? 'bg-app-accent/10 text-app-accent' 
        : disabled ? 'opacity-30 cursor-not-allowed text-app-subtext' : 'text-app-subtext hover:bg-app-surface hover:text-app-text'
    }`}
  >
    <span className={active ? 'text-app-accent' : 'text-app-subtext'}>{icon}</span>
    {children}
  </button>
);

const SpecView = ({ spec, onRegenerate }: { spec: CanonicalSpec | null, onRegenerate: () => void }) => {
  if (!spec) return <div className="flex-1 flex items-center justify-center text-app-subtext">Generating Specification...</div>;

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-app-bg">
      <div className="max-w-4xl mx-auto bg-app-surface text-app-text p-12 rounded-lg shadow-2xl border border-app-border">
        <header className="border-b-2 border-app-border pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold font-mono uppercase tracking-tighter text-app-text">{spec.title}</h1>
            <div className="text-sm font-mono text-app-subtext mt-2">Version: {spec.version} | Generated by Arcovel</div>
          </div>
          <button onClick={onRegenerate} className="text-xs bg-app-bg hover:bg-app-surface border border-app-border px-3 py-1 rounded text-app-text font-medium">Re-Synthesize</button>
        </header>

        <div className="space-y-8 font-serif">
           {spec.sections.map((section, idx) => (
             <section key={idx}>
               <h3 className="text-xl font-bold mb-3 font-sans text-app-text">{idx + 1}. {section.title}</h3>
               {section.type === 'EQUATION' ? (
                 <div className="bg-app-bg p-4 border-l-4 border-app-accent font-mono text-sm my-4 overflow-x-auto text-app-text">
                   {section.content}
                 </div>
               ) : (
                 <p className="text-app-text leading-relaxed whitespace-pre-wrap">{section.content}</p>
               )}
             </section>
           ))}
           
           {/* Assumptions */}
           {spec.assumptions?.length > 0 && (
             <section className="bg-yellow-900/10 p-6 rounded-lg border border-yellow-500/20">
               <h3 className="text-lg font-bold text-yellow-600 mb-3 font-sans">Explicit Assumptions</h3>
               <ul className="list-disc list-inside space-y-1 text-yellow-700 dark:text-yellow-500">
                 {spec.assumptions.map((a, i) => <li key={i}>{a}</li>)}
               </ul>
             </section>
           )}

           {/* Open Questions */}
           {spec.openQuestions?.length > 0 && (
             <section className="bg-red-900/10 p-6 rounded-lg border border-red-500/20">
               <h3 className="text-lg font-bold text-red-600 mb-3 font-sans">Open Technical Questions</h3>
               <ul className="list-disc list-inside space-y-1 text-red-700 dark:text-red-400">
                 {spec.openQuestions.map((q, i) => <li key={i}>{q}</li>)}
               </ul>
             </section>
           )}
        </div>
        
        <footer className="mt-12 pt-6 border-t border-app-border text-center text-xs text-app-subtext font-mono">
          CONFIDENTIAL - ARCOVEL RESEARCH OUTPUT
        </footer>
      </div>
    </div>
  );
};

// --- Auth Component ---

const AuthScreen = ({ onLogin }: { onLogin: (u: User) => void }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Simulate network delay
    setTimeout(async () => {
      try {
        const user = await authService.login(email);
        onLogin(user); // Optimistic update, but state change listener will also fire
      } catch (e) {
        setError("Login failed");
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center justify-center mb-10">
           <ArcovelLogo size="large" />
           <p className="text-slate-500 text-sm mt-4">Sign in to access your research workspace</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-900/20 border border-red-900 text-red-400 text-sm rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email Access</label>
            <input 
              type="email" 
              required
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="researcher@arcovel.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? <Loader /> : 'Enter Workspace'}
          </button>
        </form>
        
        <div className="mt-6 text-xs text-slate-700 text-center px-4">
            Arcovel Secure Environment
        </div>
      </div>
    </div>
  );
};

// --- Settings Modal ---

const SettingsModal = ({ 
  theme, setTheme, fontSize, setFontSize, onClose 
}: { 
  theme: Theme, 
  setTheme: (t: Theme) => void, 
  fontSize: FontSize, 
  setFontSize: (s: FontSize) => void,
  onClose: () => void 
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-app-surface border border-app-border w-full max-w-md rounded-xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-app-text">Interface Settings</h3>
          <button onClick={onClose} className="text-app-subtext hover:text-app-text">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-app-subtext mb-3">Color Theme</label>
            <div className="grid grid-cols-3 gap-3">
              {(['dark', 'light', 'contrast'] as Theme[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-4 py-3 rounded-lg border text-sm capitalize transition-all ${
                    theme === t 
                      ? 'border-app-accent bg-app-accent/10 text-app-accent font-semibold shadow-sm' 
                      : 'border-app-border bg-app-bg text-app-subtext hover:border-app-subtext'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-subtext mb-3">Font Size</label>
            <div className="grid grid-cols-3 gap-3">
               {(['small', 'medium', 'large'] as FontSize[]).map(s => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  className={`px-4 py-3 rounded-lg border text-sm capitalize transition-all ${
                    fontSize === s 
                      ? 'border-app-accent bg-app-accent/10 text-app-accent font-semibold shadow-sm' 
                      : 'border-app-border bg-app-bg text-app-subtext hover:border-app-subtext'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-app-border flex justify-end">
            <button onClick={onClose} className="bg-app-accent hover:bg-app-accent-hover text-white px-5 py-2 rounded-lg font-medium">
                Done
            </button>
        </div>
      </div>
    </div>
  );
};

export default App;