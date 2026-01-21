import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { runPythonCode, PythonOutput } from '../services/pyodideService';

interface NotebookProps {
  history: ChatMessage[];
  onSend: (msg: string) => void;
  onManualEntry: (content: string) => void;
}

export const Notebook: React.FC<NotebookProps> = ({ history, onSend, onManualEntry }) => {
  const [input, setInput] = useState('');
  const [isCodeMode, setIsCodeMode] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleExecute = () => {
    if (!input.trim()) return;

    if (isCodeMode) {
      // Manual Code Entry: Wrap in markdown and inject directly
      const codeBlock = `\`\`\`python\n${input}\n\`\`\``;
      onManualEntry(codeBlock);
    } else {
      // Standard Chat
      onSend(input);
    }
    setInput('');
  };

  const insertSnippet = () => {
    const snippet = `import numpy as np
import matplotlib.pyplot as plt

x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.figure(figsize=(8, 4))
plt.plot(x, y)
plt.title("Signal Simulation")
plt.grid(True)
plt.show()`;
    setInput(snippet);
    setIsCodeMode(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app-bg overflow-hidden">
      {/* Notebook Toolbar */}
      <div className="h-10 bg-app-surface border-b border-app-border flex items-center px-4 justify-between select-none">
        <div className="flex items-center gap-4 text-xs font-mono text-app-subtext">
           <span className="font-bold text-app-text">Arcovel Notebook</span>
           <span className="cursor-pointer hover:text-app-text">File</span>
           <span className="cursor-pointer hover:text-app-text">Edit</span>
           <span className="cursor-pointer hover:text-app-text">View</span>
           <div className="h-4 w-px bg-app-border"></div>
           <span className="flex items-center gap-1 text-emerald-500"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Runtime Active</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 sm:p-6 space-y-6">
        {history.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-app-subtext space-y-4">
            <div className="p-4 bg-app-surface rounded-full border border-app-border">
                <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            </div>
            <p>Start a simulation or chat with the research assistant.</p>
            <button onClick={insertSnippet} className="text-xs bg-app-surface hover:bg-app-surface-hover border border-app-border px-3 py-1.5 rounded transition-colors text-app-accent">
                Insert Example Simulation
            </button>
          </div>
        )}
        {history.map((msg) => {
          // Check if message is purely code (User Manual Entry) or contains code blocks
          const hasCode = msg.content.includes("```python");
          
          if (msg.role === 'model' || (msg.role === 'user' && hasCode)) {
              return (
                  <div key={msg.id} className="w-full">
                      {msg.role === 'user' && !hasCode ? null : ( // Don't render generic user chat bubbles in this specific block logic unless they are code
                          <NotebookCell content={msg.content} role={msg.role} />
                      )}
                  </div>
              )
          }

          // Fallback for standard User chat messages
          return (
            <div key={msg.id} className="flex justify-end">
                <div className="bg-app-accent text-white rounded-2xl rounded-br-none p-4 max-w-[80%] shadow-lg">
                  {msg.content}
                </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-app-border bg-app-surface p-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {/* Input Controls */}
          <div className="flex items-center gap-2 mb-1">
             <button 
                onClick={() => setIsCodeMode(false)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${!isCodeMode ? 'bg-blue-600 text-white shadow' : 'text-app-subtext hover:bg-app-bg'}`}
             >
                Chat
             </button>
             <button 
                onClick={() => setIsCodeMode(true)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${isCodeMode ? 'bg-emerald-600 text-white shadow' : 'text-app-subtext hover:bg-app-bg'}`}
             >
                Code
             </button>
             {isCodeMode && (
                 <button onClick={insertSnippet} className="ml-auto text-xs text-app-accent hover:underline">
                    Paste Snippet
                 </button>
             )}
          </div>

          <div className="flex gap-2">
            <textarea
                className={`flex-1 bg-app-bg border border-app-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-app-accent text-app-text placeholder-app-subtext font-mono resize-none transition-all ${isCodeMode ? 'h-32 border-emerald-500/30' : 'h-12'}`}
                placeholder={isCodeMode ? "print('Hello World')\nimport numpy as np..." : "Ask questions or request simulations..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isCodeMode) {
                        e.preventDefault();
                        handleExecute();
                    }
                }}
            />
            <button 
                onClick={handleExecute}
                className={`px-4 rounded-lg transition-colors flex items-center justify-center shadow-lg ${isCodeMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-app-accent hover:bg-app-accent-hover'}`}
            >
                {isCodeMode ? (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ) : (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                )}
            </button>
          </div>
          <div className="text-[10px] text-app-subtext text-center">
             {isCodeMode ? "Manual Execution Mode (Python 3.11 via Pyodide)" : "AI Assistant Mode"}
          </div>
        </div>
      </div>
    </div>
  );
};

const NotebookCell = ({ content, role }: { content: string, role: 'user' | 'model' }) => {
  // Simple parser to separate text from code blocks
  const parts = content.split(/```python/);

  return (
    <div className={`w-full my-4 ${role === 'user' ? 'border-l-4 border-emerald-500 pl-4' : ''}`}>
      {role === 'user' && parts.length > 1 && <div className="text-xs font-mono text-emerald-500 mb-2 font-bold uppercase tracking-wider">Manual Code Block</div>}
      
      {parts.map((part, index) => {
        if (index === 0) {
           // Text before first code block
           return part.trim() && <div key={index} className="p-4 whitespace-pre-wrap leading-relaxed text-app-text">{part}</div>;
        }

        // Code block + Potential text after
        const codeEndIndex = part.indexOf('```');
        const code = part.substring(0, codeEndIndex);
        const textAfter = part.substring(codeEndIndex + 3);

        return (
          <React.Fragment key={index}>
            <CodeCell code={code} />
            {textAfter.trim() && <div className="p-4 whitespace-pre-wrap leading-relaxed text-app-text">{textAfter}</div>}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const CodeCell = ({ code }: { code: string }) => {
  const [editableCode, setEditableCode] = useState(code);
  const [output, setOutput] = useState<PythonOutput | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    const result = await runPythonCode(editableCode);
    setOutput(result);
    setIsRunning(false);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-app-border shadow-md bg-[#1e1e1e] group transition-all hover:border-app-accent/50">
      {/* Cell Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-[#333]">
        <span className="text-[10px] font-mono text-gray-400">PYTHON 3</span>
        <div className="flex gap-2">
            <button className="text-gray-500 hover:text-white" title="Copy">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </button>
        </div>
      </div>

      <div className="flex relative">
        {/* Gutter / Play Button */}
        <div className="w-10 bg-[#1e1e1e] flex-shrink-0 flex flex-col items-center pt-3 border-r border-[#333]">
            <button 
                onClick={handleRun}
                disabled={isRunning}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isRunning ? 'border-2 border-gray-500' : 'bg-[#333] hover:bg-emerald-600 text-emerald-500 hover:text-white'}`}
            >
                 {isRunning ? (
                     <div className="w-2 h-2 bg-gray-500 rounded-sm animate-spin"></div>
                 ) : (
                     <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                 )}
            </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1 relative">
            <textarea
                value={editableCode}
                onChange={(e) => setEditableCode(e.target.value)}
                className="w-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-3 focus:outline-none min-h-[120px] resize-y leading-6"
                spellCheck={false}
                style={{ fontFamily: '"Fira Code", "JetBrains Mono", monospace' }}
            />
        </div>
      </div>
      
      {/* Output Area */}
      {(output?.text || output?.image || output?.error) && (
        <div className="border-t border-[#333] bg-black relative">
           <div className="absolute top-0 left-0 w-1 h-full bg-gray-700"></div>
           <div className="p-4 pl-6 font-mono text-sm overflow-x-auto">
             {output.text && <pre className="text-gray-300 whitespace-pre-wrap mb-2">{output.text}</pre>}
             {output.image && (
                <div className="mt-2 inline-block bg-[#1e1e1e] p-2 rounded border border-[#333]">
                   <img src={`data:image/png;base64,${output.image}`} alt="Plot" className="max-w-full h-auto" />
                </div>
             )}
             {output.error && (
                 <div className="text-red-400 whitespace-pre-wrap bg-red-900/10 p-2 rounded border-l-2 border-red-500">
                     <div className="font-bold text-xs mb-1">TRACEBACK</div>
                     {output.error}
                 </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};