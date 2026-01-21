import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import io
import contextlib
import base64
import matplotlib
# Configure matplotlib to non-interactive backend to prevent window popping up
matplotlib.use('Agg')
import matplotlib.pyplot as plt

app = FastAPI(title="Arcovel Local Kernel")

# Allow CORS for the frontend app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExecuteRequest(BaseModel):
    code: str

# Persistent global scope to mimic a notebook session
session_globals = {}

@app.post("/execute")
async def execute_code(request: ExecuteRequest):
    # Buffers for capturing output
    stdout = io.StringIO()
    stderr = io.StringIO()
    image_data = None
    error_message = None

    # Clear any previous plots
    plt.clf()
    
    # Execute code within the persistent global scope
    try:
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            exec(request.code, session_globals)
    except Exception as e:
        # Capture tracebacks/errors without crashing the server
        import traceback
        traceback.print_exc(file=stderr)
        error_message = str(e)

    # Check if any plots were generated
    if plt.get_fignums():
        buf = io.BytesIO()
        # Save as PNG to memory buffer
        plt.savefig(buf, format='png', bbox_inches='tight', transparent=True)
        buf.seek(0)
        image_data = base64.b64encode(buf.read()).decode('utf-8')
        # Close figures to free memory
        plt.close('all')

    return {
        "text": stdout.getvalue() + stderr.getvalue(),
        "image": image_data,
        "error": error_message
    }

if __name__ == "__main__":
    print("Starting Arcovel Local Kernel...")
    print("Listening on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
