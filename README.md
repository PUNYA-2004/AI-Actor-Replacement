# AI Actor Replacement & Casting Simulator

## Project Overview
An AI-powered system that can replace an actor's face in a video, synchronize lip movements with custom audio, optionally clone the actor's voice, and provide a web-based casting simulator for filmmakers.

## Folder Structure
```text
project/
├── frontend/           # ReactJS + TailwindCSS web application
├── backend/            # FastAPI backend services
├── models/             # Pre-trained models (MTCNN, SimSwap, Wav2Lip, GFPGAN)
├── datasets/           # Datasets (LFW, CelebA, FFHQ, LRS2, VoxCeleb)
├── training/           # Scripts for fine-tuning models
├── inference/          # Core AI inference logic (face swap, lip sync)
├── evaluation/         # Evaluation metrics (FID, SSIM, PSNR, LSE-D)
├── deployment/         # Kubernetes/Cloud deployment configs
├── docs/               # System architecture and SRS documentation
├── tests/              # Unit, integration, and performance tests
├── outputs/            # Generated outputs and temp storage
└── docker-compose.yml  # Container orchestration
```

## Dataset Sources
- **LFW (Labeled Faces in the Wild)**: [Link](http://vis-www.cs.umass.edu/lfw/) - 13,000+ images for face verification.
- **CelebA**: [Link](http://mmlab.ie.cuhk.edu.hk/projects/CelebA.html) - 200K+ celebrity images with attributes.
- **FFHQ (Flickr-Faces-HQ)**: [Link](https://github.com/NVlabs/ffhq-dataset) - 70,000 high-quality images.
- **LRS2 (Lip Reading Sentences)**: [Link](https://www.robots.ox.ac.uk/~vgg/data/lip_reading/lrs2.html) - Thousands of spoken sentences from BBC TV.
- **VoxCeleb**: [Link](https://mm.kaist.ac.kr/datasets/voxceleb/) - Large-scale speaker identification dataset.

## Training Pipeline Overview
- **Data Preprocessing**: Face detection (RetinaFace), cropping (256x256 / 512x512), normalization, voice audio resampling (16kHz).
- **Augmentation**: Color jittering, random horizontal flips, noise injection, random crops.
- **Hyperparameters**: 
  - Batch Size: 16 (Face Swap), 64 (Wav2Lip)
  - Learning Rate: 1e-4 (Adam Optimizer)
  - Epochs: 50-100 depending on convergence.
- **Hardware**: NVIDIA RTX 4090 / A100 (Cloud).

## 12-Week Implementation Timeline
- **Week 1-2**: Requirement Gathering, System Design (HLD/LLD), Environment Setup (Docker, Repositories).
- **Week 3-4**: Backend API Setup (FastAPI), Database Design (PostgreSQL), Core Module Research.
- **Week 5-6**: Face Detection & Face Swap Integration (InsightFace, SimSwap).
- **Week 7**: Lip Synchronization Integration (Wav2Lip).
- **Week 8**: Voice Cloning & Face Restoration (XTTS-v2, GFPGAN).
- **Week 9-10**: Frontend Development (React + Tailwind), Dashboard & Video Previews.
- **Week 11**: Evaluation Metrics, Deepfake Detection Setup, System Testing.
- **Week 12**: Deployment (AWS/Docker), Final Documentation, Viva Preparation.
