// @ts-ignore
let pyodideInstance: any = null;
let pyodideReadyPromise: Promise<any> | null = null;

export const initPyodide = async () => {
  if (pyodideReadyPromise) return pyodideReadyPromise;

  pyodideReadyPromise = (async () => {
    // @ts-ignore
    if (!window.loadPyodide) {
      throw new Error("Pyodide script not loaded");
    }
    // @ts-ignore
    pyodideInstance = await window.loadPyodide();
    await pyodideInstance.loadPackage(["numpy", "matplotlib"]);
    
    // Set default plot style to match dark theme
    await pyodideInstance.runPythonAsync(`
      import matplotlib.pyplot as plt
      try:
        plt.style.use('dark_background')
      except:
        pass
    `);
    
    return pyodideInstance;
  })();

  return pyodideReadyPromise;
};

export interface PythonOutput {
  text: string;
  image?: string; // Base64 encoded png
  error?: string;
}

const runPyodideCode = async (code: string): Promise<PythonOutput> => {
  if (!pyodideInstance) {
    await initPyodide();
  }

  try {
    // Reset output buffer and plot buffer in Python environment
    await pyodideInstance.runPythonAsync(`
      import sys
      import io
      import matplotlib.pyplot as plt
      import base64
      
      # Redirect stdout
      sys.stdout = io.StringIO()
      
      # Clear plots
      plt.clf()
    `);

    // Execute the user code
    await pyodideInstance.runPythonAsync(code);

    // Capture Output and Plot
    const result = await pyodideInstance.runPythonAsync(`
      # Get text output
      text_output = sys.stdout.getvalue()
      
      # Get plot if exists
      img_str = None
      if plt.get_fignums():
          buf = io.BytesIO()
          plt.savefig(buf, format='png')
          buf.seek(0)
          img_str = base64.b64encode(buf.read()).decode('utf-8')
      
      # Return package
      import json
      json.dumps({"text": text_output, "image": img_str})
    `);

    const parsed = JSON.parse(result);
    return {
      text: parsed.text,
      image: parsed.image
    };

  } catch (error: any) {
    return {
      text: '',
      error: error.message || error.toString()
    };
  }
};

export type RuntimeMode = 'BROWSER' | 'LOCAL_KERNEL';

export const executeCode = async (code: string, mode: RuntimeMode): Promise<PythonOutput> => {
  if (mode === 'LOCAL_KERNEL') {
    try {
      const response = await fetch('http://localhost:8000/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      return {
        text: data.text || '',
        image: data.image,
        error: data.error
      };
    } catch (e: any) {
      return {
        text: '',
        error: `Local Kernel Error: ${e.message}\nEnsure backend/server.py is running on port 8000.`
      };
    }
  }

  // Default to Pyodide
  return runPyodideCode(code);
};

// Keep for backward compatibility if needed, though executeCode is preferred
export const runPythonCode = runPyodideCode;
