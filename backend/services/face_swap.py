import cv2
import numpy as np
import os
import urllib.request

# Try to import insightface
try:
    import insightface
    from insightface.app import FaceAnalysis
    from insightface.model_zoo.inswapper import INSwapper
    HAS_INSIGHTFACE = True
except ImportError:
    HAS_INSIGHTFACE = False

class FaceSwapper:
    def __init__(self):
        self.app = None
        self.swapper = None
        self.initialized = False
        
        # Define and create models directory
        self.model_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "models"))
        os.makedirs(self.model_dir, exist_ok=True)
        self.model_path = os.path.join(self.model_dir, "inswapper_128.onnx")
        
        if HAS_INSIGHTFACE:
            try:
                # 1. Download inswapper_128.onnx if missing
                if not os.path.exists(self.model_path):
                    print(f"Downloading inswapper_128.onnx to {self.model_path}...")
                    url = "https://huggingface.co/ezioruan/inswapper_128.onnx/resolve/main/inswapper_128.onnx"
                    urllib.request.urlretrieve(url, self.model_path)
                    print("Download completed successfully!")
                
                # 2. Initialize FaceAnalysis detector
                self.app = FaceAnalysis(name='buffalo_l', root='~/.insightface')
                self.app.prepare(ctx_id=0, det_size=(640, 640))
                
                # 3. Initialize INSwapper model
                if os.path.exists(self.model_path):
                    self.swapper = INSwapper(model_file=self.model_path, session=None)
                    print("InsightFace and INSwapper initialized successfully.")
                    self.initialized = True
                else:
                    print("inswapper_128.onnx file not found. Falling back to OpenCV.")
            except Exception as e:
                print(f"InsightFace/INSwapper initialization failed: {e}. Falling back to OpenCV.")
                self.initialized = False
        else:
            print("InsightFace libraries not imported. Using OpenCV fallback.")

    def get_landmarks_opencv(self, img):
        """
        Fallback face detector using OpenCV Haar Cascade.
        Returns a bounding box and rough landmarks estimate.
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        face_cascade = cv2.CascadeClassifier(cascade_path)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        if len(faces) == 0:
            return None
        # Return first face found: x, y, w, h
        x, y, w, h = faces[0]
        # Return bounding box and simulated landmarks
        landmarks = np.array([
            [x + w * 0.3, y + h * 0.45], # left eye
            [x + w * 0.7, y + h * 0.45], # right eye
            [x + w * 0.5, y + h * 0.65], # nose tip
            [x + w * 0.35, y + h * 0.85], # left mouth corner
            [x + w * 0.65, y + h * 0.85]  # right mouth corner
        ], dtype=np.float32)
        return landmarks, (x, y, w, h)

    def swap_face(self, source_img, target_face_img, frame_index=None):
        """
        Swap target_face_img into source_img.
        """
        target_face_object = None
        source_face_object = None
        swapped_img = None

        # Step 1: Detect face in target image using InsightFace if initialized
        if self.initialized and self.app is not None and self.swapper is not None:
            try:
                target_faces = self.app.get(target_face_img)
                if len(target_faces) > 0:
                    target_face_object = target_faces[0]
                    print(f"[Log] Face detected in target image. Embedding dim: {target_face_object.embedding.shape}")
                else:
                    print("[Log] No face detected in target image via InsightFace.")
            except Exception as e:
                print(f"InsightFace get target face failed: {e}")

        # Step 2: Detect face in source frame using InsightFace if initialized
        if self.initialized and self.app is not None and self.swapper is not None and target_face_object is not None:
            try:
                source_faces = self.app.get(source_img)
                print(f"[Log] Number of faces detected in source frame: {len(source_faces)}")
                if len(source_faces) > 0:
                    # Swap the largest face found
                    source_face_object = max(source_faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]))
            except Exception as e:
                print(f"InsightFace get source face failed: {e}")

        # Step 3: Run INSwapper if both faces are resolved
        if self.swapper is not None and target_face_object is not None and source_face_object is not None:
            try:
                swapped_img = self.swapper.get(source_img, source_face_object, target_face_object, paste_back=True)
                print("[Log] INSwapper inference success.")
            except Exception as e:
                print(f"INSwapper model inference failed: {e}")

        # Step 4: OpenCV Fallback if InsightFace swapping was not completed
        if swapped_img is None:
            print("[Log] Falling back to OpenCV landmark-based face warping.")
            swapped_img = self.execute_opencv_fallback(source_img, target_face_img)

        # Save validation debug images for frame 1 (or index 0/1)
        if frame_index is not None and (frame_index == 0 or frame_index == 1):
            try:
                os.makedirs("outputs", exist_ok=True)
                cv2.imwrite("outputs/before_swap.png", source_img)
                cv2.imwrite("outputs/after_swap.png", swapped_img)
                print(f"[Log] Frame {frame_index} debug images saved successfully (before_swap.png & after_swap.png).")
            except Exception as e:
                print(f"Failed to save debug images: {e}")

        return swapped_img

    def execute_opencv_fallback(self, source_img, target_face_img):
        """
        High-fidelity affine landmark-based face replacement and seamless blending.
        """
        # Target detection
        res_target = self.get_landmarks_opencv(target_face_img)
        if res_target:
            target_landmarks, _ = res_target
        else:
            # Create dummy default target landmarks if no face is detected (e.g. for cartoon presets)
            h_t, w_t = target_face_img.shape[:2]
            target_landmarks = np.array([
                [w_t * 0.35, h_t * 0.45],
                [w_t * 0.65, h_t * 0.45],
                [w_t * 0.5, h_t * 0.6],
                [w_t * 0.4, h_t * 0.8],
                [w_t * 0.6, h_t * 0.8]
            ], dtype=np.float32)

        # Source detection
        res_source = self.get_landmarks_opencv(source_img)
        if res_source:
            source_landmarks, source_bbox = res_source
        else:
            # Create dummy source coordinates if no face is detected in the video frame
            h_s, w_s = source_img.shape[:2]
            source_bbox = (int(w_s * 0.25), int(h_s * 0.25), int(w_s * 0.5), int(h_s * 0.5))
            source_landmarks = np.array([
                [w_s * 0.42, h_s * 0.45],
                [w_s * 0.58, h_s * 0.45],
                [w_s * 0.5, h_s * 0.55],
                [w_s * 0.45, h_s * 0.65],
                [w_s * 0.55, h_s * 0.65]
            ], dtype=np.float32)

        try:
            # Map target face coordinates onto source face coordinates
            M, _ = cv2.estimateAffinePartial2D(target_landmarks[:5], source_landmarks[:5])
            if M is None:
                return source_img
            
            x, y, w, h = source_bbox
            h_src, w_src = source_img.shape[:2]
            warped_target = cv2.warpAffine(target_face_img, M, (w_src, h_src))
            
            # Create a simple mask for the face area
            mask = np.zeros((h_src, w_src), dtype=np.uint8)
            center_x, center_y = int(x + w / 2), int(y + h / 2)
            cv2.ellipse(mask, (center_x, center_y), (int(w * 0.45), int(h * 0.6)), 0, 0, 360, 255, -1)
            
            # Smooth the mask boundary
            mask = cv2.GaussianBlur(mask, (15, 15), 0)
            
            # Apply seamless cloning to blend target face into source image
            center_x = max(10, min(w_src - 10, center_x))
            center_y = max(10, min(h_src - 10, center_y))
            
            if np.any(mask > 0):
                swapped = cv2.seamlessClone(warped_target, source_img, mask, (center_x, center_y), cv2.NORMAL_CLONE)
                return swapped
        except Exception as e:
            print(f"OpenCV fallback face swap execution failed: {e}")
            
        return source_img
