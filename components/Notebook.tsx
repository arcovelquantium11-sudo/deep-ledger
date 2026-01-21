import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { runPythonCode, PythonOutput } from '../services/pyodideService';

interface NotebookProps {
  history: ChatMessage[];
  onSend: (msg: string) => void;
}

export const Notebook: React.FC<NotebookProps> = ({ history, onSend }) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  return (
    <div className="flex-1 flex flex-col h-full bg-app-bg">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {history.length === 0 && (
          <div className="h-full flex items-center justify-center text-app-subtext italic">
            Ask questions or request simulations (e.g., "Simulate a damped harmonic oscillator")...
          </div>
        )}
        {history.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`w-full max-w-[90%] ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
              {msg.role === 'user' ? (
                <div className="bg-app-accent text-white rounded-2xl rounded-br-none p-4 max-w-[80%]">
                  {msg.content}
                </div>
              ) : (
                <NotebookCell content={msg.content} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-app-border bg-app-surface">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            className="flex-1 bg-app-bg border border-app-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-app-accent text-app-text placeholder-app-subtext font-mono"
            placeholder="Run a simulation or ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (onSend(input), setInput(''))}
          />
          <button 
            onClick={() => { onSend(input); setInput(''); }}
            className="bg-app-accent hover:bg-app-accent-hover text-white px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const NotebookCell = ({ content }: { content: string }) => {
  // Simple parser to separate text from code blocks
  const parts = content.split(/```python/);

  return (
    <div className="bg-app-surface text-app-text rounded-2xl rounded-bl-none border border-app-border overflow-hidden shadow-sm w-full">
      {parts.map((part, index) => {
        if (index === 0) {
           // Text before first code block
           return part.trim() && <div key={index} className="p-5 whitespace-pre-wrap leading-relaxed">{part}</div>;
        }

        // Code block + Potential text after
        const codeEndIndex = part.indexOf('```');
        const code = part.substring(0, codeEndIndex);
        const textAfter = part.substring(codeEndIndex + 3);

        return (
          <React.Fragment key={index}>
            <CodeCell code={code} />
            {textAfter.trim() && <div className="p-5 whitespace-pre-wrap leading-relaxed">{textAfter}</div>}
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
    <div className="my-2 border-y border-app-border bg-black/20">
      <div className="flex items-center justify-between px-4 py-2 bg-app-bg border-b border-app-border">
        <span className="text-xs font-mono text-app-subtext">PYTHON KERNEL</span>
        <button 
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors"
        >
          {isRunning ? <span className="animate-spin">⟳</span> : '▶'} RUN CELL
        </button>
      </div>
      <div className="relative group">
        <textarea
            value={editableCode}
            onChange={(e) => setEditableCode(e.target.value)}
            className="w-full bg-[#0d1117] text-gray-300 font-mono text-sm p-4 focus:outline-none min-h-[100px] resize-y leading-6"
            spellCheck={false}
        />
      </div>
      
      {(output?.text || output?.image || output?.error) && (
        <div className="p-4 bg-app-bg border-t border-app-border font-mono text-sm overflow-x-auto">
          {output.text && <pre className="text-app-text whitespace-pre-wrap mb-2">{output.text}</pre>}
          {output.image && (
             <div className="mt-2 bg-white rounded p-2 inline-block">
                <img src={`data:image/png;base64,${output.image}`} alt="Plot" />
             </div>
          )}
          {output.error && <pre className="text-red-400 whitespace-pre-wrap">{output.error}</pre>}
        </div>
      )}
    </div>
  );
};