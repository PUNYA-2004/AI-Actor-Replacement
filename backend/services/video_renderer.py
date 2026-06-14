import cv2
import os
import subprocess
import shutil

def get_video_metadata(video_path):
    """
    Get FPS, frame count, width, and height of a video.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {video_path}")
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    
    # Fallback to sensible defaults if metadata is invalid
    if fps <= 0 or fps > 120:
        fps = 30.0
    return {
        "fps": fps,
        "frame_count": frame_count,
        "width": width,
        "height": height
    }

def extract_frames(video_path, output_dir, max_frames=120, max_dim=640):
    """
    Extract all frames from a video and save as images in output_dir.
    Resizes frames and limits frame count to ensure fast CPU processing.
    """
    os.makedirs(output_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {video_path}")
    
    count = 0
    frame_paths = []
    while count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Resize frame if too large (speeds up CPU inference dramatically)
        h, w = frame.shape[:2]
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            new_w = int(w * scale)
            new_h = int(h * scale)
            frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

        frame_name = f"frame_{count:06d}.png"
        frame_path = os.path.join(output_dir, frame_name)
        cv2.imwrite(frame_path, frame)
        frame_paths.append(frame_path)
        count += 1
    
    cap.release()
    print(f"[Log] Extracted frame count: {count} frames from {video_path} (rescaled to max {max_dim}px)")
    return frame_paths

def render_video_from_frames(frame_dir, output_path, fps, size):
    """
    Compile frames from frame_dir into a video file using OpenCV.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    frames = sorted([f for f in os.listdir(frame_dir) if f.startswith("frame_") and f.endswith(".png")])
    if not frames:
        raise ValueError(f"No frames found in directory: {frame_dir}")
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, size)
    
    count = 0
    for frame_name in frames:
        frame_path = os.path.join(frame_dir, frame_name)
        img = cv2.imread(frame_path)
        if img is None:
            continue
        # Resize to specified size if it doesn't match
        if (img.shape[1], img.shape[0]) != size:
            img = cv2.resize(img, size)
        out.write(img)
        count += 1
        
    out.release()
    print(f"[Log] Compiled {count} frames back into video at {output_path}")

def _has_audio_stream(video_path, ffmpeg_path):
    """Check if a video file has an audio stream using ffmpeg."""
    try:
        result = subprocess.run(
            [ffmpeg_path, '-i', video_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
        return 'Audio:' in result.stderr
    except Exception:
        return False


def merge_audio(video_with_no_audio, video_with_audio, final_output_path):
    """
    Merge audio from video_with_audio into video_with_no_audio using ffmpeg.
    If the source has no audio, output the video-only file.
    Falls back to copying the video file if ffmpeg fails.
    """
    success = False
    try:
        try:
            import imageio_ffmpeg
            ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
        except ImportError:
            ffmpeg_path = 'ffmpeg'

        has_audio = _has_audio_stream(video_with_audio, ffmpeg_path)

        if has_audio:
            cmd = [
                ffmpeg_path, '-y',
                '-i', video_with_no_audio,
                '-i', video_with_audio,
                '-map', '0:v:0',
                '-map', '1:a:0',
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-shortest',
                final_output_path
            ]
        else:
            # No audio in source — just copy the processed video as-is
            print("[Log] Source video has no audio stream. Outputting video-only.")
            cmd = [
                ffmpeg_path, '-y',
                '-i', video_with_no_audio,
                '-c:v', 'copy',
                final_output_path
            ]

        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode == 0 and os.path.exists(final_output_path):
            success = True
        else:
            print(f"FFmpeg exit code {result.returncode}. Stderr: {result.stderr}")
    except Exception as e:
        print(f"Failed to merge audio via FFmpeg: {e}")
    
    if not success:
        # Fallback: copy video without audio to final destination
        try:
            shutil.copy2(video_with_no_audio, final_output_path)
            success = True
        except Exception as e:
            print(f"Fallback copy failed: {e}")
            success = False
            
    if success and os.path.exists(final_output_path):
        size_bytes = os.path.getsize(final_output_path)
        # Try to read back duration and print details
        cap = cv2.VideoCapture(final_output_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps if fps > 0 else 0
        cap.release()
        
        print(f"[Log] Output video generated successfully!")
        print(f"[Log] Output Video Path: {os.path.abspath(final_output_path)}")
        print(f"[Log] Output File Size: {size_bytes} bytes")
        print(f"[Log] Output Duration: {duration:.2f} seconds")
        print(f"[Log] Output Frame Count: {frame_count}")
        print(f"[Log] Output FPS: {fps}")

    return success
