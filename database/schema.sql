-- Database Schema for AI Actor Replacement System

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    consent_accepted BOOLEAN DEFAULT FALSE
);

CREATE TABLE consent_records (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    consent_type VARCHAR(50) NOT NULL, -- e.g., 'FACE_USAGE', 'VOICE_CLONING'
    accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE actors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    face_image_path VARCHAR(500),
    voice_sample_path VARCHAR(500),
    is_system_actor BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE videos (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    original_video_path VARCHAR(500) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE generated_outputs (
    id SERIAL PRIMARY KEY,
    video_id INT REFERENCES videos(id) ON DELETE CASCADE,
    actor_id INT REFERENCES actors(id) ON DELETE SET NULL,
    output_video_path VARCHAR(500),
    job_type VARCHAR(50), -- FACE_SWAP, LIP_SYNC, FULL_REPLACEMENT
    processing_time_seconds INT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE metrics (
    id SERIAL PRIMARY KEY,
    output_id INT REFERENCES generated_outputs(id) ON DELETE CASCADE,
    fid_score FLOAT,
    ssim_score FLOAT,
    psnr_score FLOAT,
    lse_d_score FLOAT,
    lse_c_score FLOAT,
    identity_similarity FLOAT
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_videos_project_id ON videos(project_id);
CREATE INDEX idx_outputs_video_id ON generated_outputs(video_id);
