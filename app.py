"""
FastAPI server to serve the Flappy Bird pitch-controlled game
"""
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(title="Pitch Bird Game")

# Mount static files
app.mount("/static", StaticFiles(directory="."), name="static")

@app.get("/")
async def read_root():
    """Serve the main HTML file"""
    return FileResponse("index.html")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)

