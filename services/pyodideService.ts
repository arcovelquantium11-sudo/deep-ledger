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
    return pyodideInstance;
  })();

  return pyodideReadyPromise;
};

export interface PythonOutput {
  text: string;
  image?: string; // Base64 encoded png
  error?: string;
}

export const runPythonCode = async (code: string): Promise<PythonOutput> => {
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