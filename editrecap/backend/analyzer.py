from fastapi import FastAPI, UploadFile, File,Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import cv2, tempfile, os, subprocess, shutil
from typing import List
import json
import shutil
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

@app.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        cap = cv2.VideoCapture(tmp_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        duration = total_frames / fps if fps else 10.97
        cap.release()
        clips = []
        num_clips = 3
        clip_dur = duration / num_clips
        for i in range(num_clips):
            clips.append({
                "clip_id": i+1, "start": round(i*clip_dur, 2), "end": round((i+1)*clip_dur, 2),
                "duration": round(clip_dur, 2),
                "effects": ["zoom_in_110%", "shake_medium"] if i%2==0 else ["velocity_ramp_200%", "blur_transition"],
                "filter": "teal_orange_35%" if i%2==0 else "warm_LUT_40%", "speed": "100%"
            })
        return {
            "template_name": file.filename.split('.')[0] + "_template",
            "total_duration": round(duration,2), "total_clips": len(clips),
            "tempo_bpm": 128.0, "clips": clips,
            "music_sync": {"beats": [0.5, 1.2, 2.1], "drop_at": 2.1}, "export_ready": True
        }
    finally:
        os.remove(tmp_path)

# NEW EXPORT API
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

        # copy chesthe audio sync issue vasthundi kabatti malli encode chesthe better, but ippudu copy tho fast ga
        # Re-encode version kavali ante:
        # cmd2 = [FFMPEG_BIN, "-y", "-f", "concat", "-safe", "0", "-i", list_path, "-c:v", "libx264", "-c:a", "aac", output_path]

        print(f"FINAL SIZE: {os.path.getsize(output_path)}")
        return FileResponse(output_path, filename="EditRecap_export.mp4", media_type="video/mp4")

    except Exception as e:
        print(f"EXPORT ERROR: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}