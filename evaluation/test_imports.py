import torch
import cv2
import PIL
from skimage.metrics import structural_similarity as ssim
from skimage.metrics import peak_signal_noise_ratio as psnr

print("Torch:", torch.__version__)
print("OpenCV:", cv2.__version__)
print("All imports successful!")