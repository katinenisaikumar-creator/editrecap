from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import cv2, tempfile, os, subprocess, json
from typing import List
import numpy as np

# SceneDetect imports
from scenedetect.video_manager import VideoManager
from scenedetect.scene_manager import SceneManager
from scenedetect.detectors import ContentDetector

try:
    import imageio_ffmpeg
    FFMPEG_BIN = imageio_ffmpeg.get_ffmpeg_exe()
except:
    FFMPEG_BIN = "ffmpeg"
print(f"Using FFmpeg: {FFMPEG_BIN}")

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/")
def home():
    return {"status": "EditRecap AI Running - OK"}

# ============ SMART ANALYZER ============
def detect_clips_smart(video_path):
    # 1. AUTO SCENE DETECTION
    video_manager = VideoManager([video_path])
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=25.0)) # 0.2sec cut kuda paduthundi

    video_manager.start()
    scene_manager.detect_scenes(frame_source=video_manager)
    scene_list = scene_manager.get_scene_list()
    fps = video_manager.get_fps()
    duration = video_manager.get_duration().get_seconds()

    # 2. SPLIT-SCREEN CHECK - TRAVEL 6 grid laanti vatiki
    cap = cv2.VideoCapture(video_path)
    ret, first_frame = cap.read()
    is_split_screen = False
    split_clip_count = 0

    if ret:
        h, w = first_frame.shape[:2]
        parts = []
        # 6 equal vertical strips check
        for i in range(6):
            x1 = i * w//6
            x2 = (i+1) * w//6
            part = first_frame[:, x1:x2]
            parts.append(np.std(part)) # motion/brightness diff

        if max(parts) - min(parts) > 20: # 6 different videos unte
            is_split_screen = True
            split_clip_count = 6
    cap.release()
    video_manager.release()

    # 3. FINAL LOGIC
    num_scenes = len(scene_list)

    # Case 1: Single clip with effects
    if num_scenes <= 1 and not is_split_screen:
        return {
            "template_name": "Single Clip Effects Template",
            "total_clips": 1,
            "total_duration": round(duration, 2),
            "type": "single_clip_with_effects",
            "message": "1 Clip unna Template detected! 🔥",
            "clips": [{
                "clip_id": 1,
                "start": 0,
                "end": round(duration, 2),
                "duration": round(duration, 2),
                "effects": ["zoom_beat_sync", "shake"],
                "filter": "auto"
            }]
        }

    # Case 2: Split screen
    if is_split_screen:
        clips = []
        split_dur = 5.9 # TRAVEL intro duration
        for i in range(split_clip_count):
            clips.append({
                "clip_id": i+1,
                "start": 0,
                "end": split_dur,
                "duration": split_dur,
                "layout": "split_6_vertical",
                "effects": ["none"],
                "filter": "auto"
            })
        return {
            "template_name": "6-Clip Grid Template",
            "total_clips": split_clip_count,
            "total_duration": round(duration, 2),
            "type": "split_screen_6_clip",
            "message": f"{split_clip_count} Clips unna Grid Template detected! 🎉",
            "clips": clips
        }

    # Case 3: Normal Multi-clip - ANNI CUTS
    clips = []
    for i, (start_time, end_time) in enumerate(scene_list):
        clips.append({
            "clip_id": i+1,
            "start": round(start_time.get_seconds(), 2),
            "end": round(end_time.get_seconds(), 2),
            "duration": round((end_time - start_time).get_seconds(), 2),
            "effects": ["cut"],
            "filter": "auto"
        })

    return {
        "template_name": f"{num_scenes}-Clip Template",
        "total_clips": num_scenes,
        "total_duration": round(duration, 2),
        "type": "multi_clip",
        "message": f"{num_scenes} clips detected! 📌",
        "clips": clips,
        "music_sync": {"tempo_bpm": 120.0} # dummy, tarvatha beat detect add cheyyochu
    }

@app.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        result = detect_clips_smart(tmp_path)
        result["export_ready"] = True
        return result
    finally:
        os.remove(tmp_path)

# ============ EXPORT API - SAME AS YOURS ============
@app.post("/export")
async def export_video(
    files: List[UploadFile] = File(...),
    durations: str = Form("[]"),
    trims: str = Form("[]"),
    effects_json: str = Form("[]")
):
    temp_dir = tempfile.mkdtemp()
    try:
        durs = json.loads(durations) if durations else []
        trim_starts = json.loads(trims) if trims else []

        clip_paths = []
        for idx, f in enumerate(files):
            raw_path = os.path.join(temp_dir, f"raw{idx}.mp4")
            norm_path = os.path.join(temp_dir, f"clip{idx}.mp4")

            with open(raw_path, "wb") as out:
                out.write(await f.read())

            target_dur = float(durs[idx]) if idx < len(durs) else 3.66
            start = float(trim_starts[idx]) if idx < len(trim_starts) else 0

            cmd1 = [
                FFMPEG_BIN, "-y",
                "-ss", str(start),
                "-i", raw_path,
                "-t", str(target_dur),
                "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast",
                "-c:a", "aac", "-r", "30",
                norm_path
            ]
            subprocess.run(cmd1, check=True)
            clip_paths.append(norm_path)

        list_path = os.path.join(temp_dir, "list.txt")
        with open(list_path, "w") as lf:
            for p in clip_paths:
                lf.write(f"file '{p.replace(chr(92), '/')}'\n")

        output_path = os.path.join(temp_dir, "final_export.mp4")
        cmd2 = [FFMPEG_BIN, "-y", "-f", "concat", "-safe", "0", "-i", list_path, "-c", "copy", output_path]
        subprocess.run(cmd2, check=True)

        return FileResponse(output_path, filename="EditRecap_export.mp4", media_type="video/mp4")

    except Exception as e:
        print(f"EXPORT ERROR: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
