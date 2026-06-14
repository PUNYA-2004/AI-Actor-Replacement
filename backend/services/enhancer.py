import cv2
import numpy as np

# Try to import GFPGAN
try:
    from gfpgan import GFPGANer
    HAS_GFPGAN = True
except ImportError:
    HAS_GFPGAN = False

class FaceEnhancer:
    def __init__(self):
        self.enhancer = None
        self.initialized = False
        if HAS_GFPGAN:
            try:
                # Initialize GFPGANer (usually requires a pre-downloaded weights file or downloads automatically)
                # We can specify model_path, upscale, etc.
                self.enhancer = GFPGANer(
                    model_path='models/GFPGANv1.4.pth',
                    upscale=1,
                    arch='clean',
                    channel_multiplier=2,
                    bg_upsampler=None
                )
                self.initialized = True
            except Exception as e:
                print(f"GFPGAN initialization failed: {e}. Falling back to OpenCV filter-based face enhancement.")
                self.initialized = False

    def enhance_face(self, img):
        """
        Enhance the quality of the image, specifically the face.
        If GFPGAN is available and initialized, use it.
        Otherwise, fall back to high-fidelity OpenCV unsharp mask + bilateral filter pipeline.
        """
        if self.initialized and self.enhancer is not None:
            try:
                # GFPGANer returns cropped_faces, restored_faces, restored_img
                _, _, restored_img = self.enhancer.enhance(img, has_aligned=False, only_center_face=False, paste_back=True)
                if restored_img is not None:
                    return restored_img
            except Exception as e:
                print(f"GFPGAN enhancement error: {e}")

        # High-Fidelity Fallback Enhancement Pipeline:
        try:
            # 1. Bilateral filter to smooth skin while maintaining sharp edges
            smooth = cv2.bilateralFilter(img, d=9, sigmaColor=75, sigmaSpace=75)
            
            # 2. Detail enhancement
            enhanced = cv2.detailEnhance(smooth, sigma_s=10, sigma_r=0.15)
            
            # 3. Unsharp masking to sharpen details (eyes, eyebrows, mouth)
            gaussian_3 = cv2.GaussianBlur(enhanced, (0, 0), 2.0)
            sharpened = cv2.addWeighted(enhanced, 1.5, gaussian_3, -0.5, 0)
            
            # 4. CLAHE on L-channel of LAB color space to enhance contrast gently
            lab = cv2.cvtColor(sharpened, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            cl = clahe.apply(l)
            enhanced_lab = cv2.merge((cl, a, b))
            final_img = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
            
            # Blend original and enhanced to prevent over-sharpening
            return cv2.addWeighted(img, 0.3, final_img, 0.7, 0)
        except Exception as e:
            print(f"OpenCV enhancement pipeline failed: {e}")
            return img
