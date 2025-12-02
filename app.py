"""
FastAPI server to serve the Flappy Bird pitch-controlled game
"""
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(title="Pitch Bird Game")

# Mount static files at root level for easy access
app.mount("/static", StaticFiles(directory="."), name="static")

@app.get("/")
async def read_root():
    """Serve the main HTML file"""
    return FileResponse("index.html")

# Serve JavaScript files directly
@app.get("/audio.js")
async def serve_audio_js():
    """Serve audio.js"""
    return FileResponse("audio.js", media_type="application/javascript")

@app.get("/game.js")
async def serve_game_js():
    """Serve game.js"""
    return FileResponse("game.js", media_type="application/javascript")

@app.get("/main.js")
async def serve_main_js():
    """Serve main.js"""
    return FileResponse("main.js", media_type="application/javascript")

@app.get("/style.css")
async def serve_css():
    """Serve style.css"""
    return FileResponse("style.css", media_type="text/css")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)

