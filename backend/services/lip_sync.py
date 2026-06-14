import cv2
import numpy as np
import os

try:
    import librosa
    HAS_LIBROSA = True
except ImportError:
    HAS_LIBROSA = False

class LipSyncService:
    def __init__(self):
        # Hooks for actual Wav2Lip model can be initialized here
        pass

    def sync_lips(self, frame_paths, audio_path, fps):
        """
        Synchronize the lips of the face in the video frames with the audio file.
        Uses a volume-envelope mouth-deformation algorithm if Wav2Lip weights are not loaded.
        """
        if not HAS_LIBROSA or not os.path.exists(audio_path):
            print("Audio analysis library (librosa) or audio file missing. Skipping lip modulation.")
            return

        try:
            # 1. Load audio and compute amplitude envelope
            y, sr = librosa.load(audio_path, sr=16000)
            # Duration of audio
            duration = librosa.get_duration(y=y, sr=sr)
            
            # 2. Extract amplitude envelope
            onset_env = librosa.onset.onset_strength(y=y, sr=sr)
            # Normalize envelope
            if np.max(onset_env) > 0:
                onset_env = onset_env / np.max(onset_env)
            
            # Cascade for face detection to locate mouth
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            face_cascade = cv2.CascadeClassifier(cascade_path)
            
            # 3. For each frame, warp the mouth region based on envelope value
            num_frames = len(frame_paths)
            for idx, f_path in enumerate(frame_paths):
                img = cv2.imread(f_path)
                if img is None:
                    continue
                
                # Get the timestamp offset
                t = idx / fps
                env_idx = int((t / duration) * len(onset_env)) if duration > 0 else 0
                env_idx = min(env_idx, len(onset_env) - 1)
                amplitude = onset_env[env_idx] if len(onset_env) > 0 else 0.0
                
                # Only apply deformation if there is sound
                if amplitude > 0.05:
                    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
                    if len(faces) > 0:
                        x, y, w, h = faces[0]
                        # Estimate mouth region (lower third of the face, centered)
                        mx = int(x + w * 0.25)
                        my = int(y + h * 0.65)
                        mw = int(w * 0.5)
                        mh = int(h * 0.25)
                        
                        # Extract mouth ROI
                        mouth_roi = img[my:my+mh, mx:mx+mw]
                        if mouth_roi.size > 0:
                            # Apply a vertical stretch/warp to simulate speaking
                            stretch_factor = 1.0 + float(amplitude * 0.25)
                            new_h = int(mh * stretch_factor)
                            if new_h > 0:
                                mouth_warped = cv2.resize(mouth_roi, (mw, new_h), interpolation=cv2.INTER_LINEAR)
                                # Crop to fit original size
                                if new_h > mh:
                                    start_crop = (new_h - mh) // 2
                                    mouth_final = mouth_warped[start_crop:start_crop+mh, :]
                                else:
                                    # Pad if smaller
                                    mouth_final = np.pad(mouth_warped, ((0, mh-new_h), (0,0), (0,0)), mode='edge')
                                
                                # Blend back
                                img[my:my+mh, mx:mx+mw] = cv2.addWeighted(img[my:my+mh, mx:mx+mw], 0.3, mouth_final, 0.7, 0)
                                cv2.imwrite(f_path, img)
        except Exception as e:
            print(f"Error in lip sync algorithm: {e}")
