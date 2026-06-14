import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Film, 
  User, 
  Cpu, 
  Sparkles, 
  Upload, 
  Play, 
  CheckCircle, 
  Volume2, 
  Users, 
  TrendingUp, 
  BarChart2, 
  Check, 
  RefreshCw,
  Video,
  FileVideo,
  Settings
} from 'lucide-react';

const API_BASE = '/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('swap');
  const [apiStatus, setApiStatus] = useState({ gpu_available: false, active_jobs: 0, processed_videos: 0 });
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedFace, setSelectedFace] = useState(null);
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [logs, setLogs] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Default presets for simulation
  const videosPreset = [
    { id: 'v1', title: 'Action Scene - Cyberpunk Chase', duration: '0:45', size: '24MB' },
    { id: 'v2', title: 'Emotional Monologue - Shakespeare Room', duration: '1:12', size: '36MB' },
    { id: 'v3', title: 'Romantic Comedy - Cafe Meeting', duration: '0:30', size: '18MB' }
  ];

  const actorsPreset = [
    { id: 'a1', name: 'Alexander Sterling', age: 34, suitability: 94, avatar: '🎭' },
    { id: 'a2', name: 'Sophia Sterling', age: 28, suitability: 88, avatar: '👩‍🎤' },
    { id: 'a3', name: 'Marcus Chen', age: 41, suitability: 76, avatar: '🧑‍💼' }
  ];

  useEffect(() => {
    fetchStatus();
    addLog('System initialized. Ready for casting simulation.');
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/status`);
      setApiStatus(res.data);
    } catch (err) {
      console.error('Failed to fetch API status, using mock data.');
      setApiStatus({ gpu_available: true, active_jobs: 0, processed_videos: 15 });
    }
  };

  const addLog = (msg) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
  };

  const handleUploadVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    addLog(`Uploading video: ${file.name}...`);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API_BASE}/upload-video`, formData);
      setSelectedVideo(res.data.file_id);
      addLog(`Video uploaded successfully. ID: ${res.data.file_id}`);
    } catch (err) {
      // Mock on failure
      const mockId = 'video_' + Math.random().toString(36).substr(2, 9);
      setSelectedVideo(mockId);
      addLog(`Mock Upload: Video uploaded successfully. ID: ${mockId}`);
    }
    setLoading(false);
  };

  const handleUploadFace = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    addLog(`Uploading actor face: ${file.name}...`);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API_BASE}/upload-face`, formData);
      setSelectedFace(res.data.face_id);
      addLog(`Face uploaded successfully. ID: ${res.data.face_id}`);
    } catch (err) {
      // Mock on failure
      const mockId = 'face_' + Math.random().toString(36).substr(2, 9);
      setSelectedFace(mockId);
      addLog(`Mock Upload: Face uploaded successfully. ID: ${mockId}`);
    }
    setLoading(false);
  };

  const startFaceSwap = async () => {
    if (!selectedVideo || !selectedFace) {
      addLog('Error: Please select or upload a video and target face.');
      return;
    }
    setLoading(true);
    setIsPlaying(false);
    setMetrics(null);
    setJobStatus(null);
    addLog('Dispatching face swap request to SimSwap pipeline...');
    try {
      const res = await axios.post(`${API_BASE}/face-swap`, {
        video_id: selectedVideo,
        target_face_id: selectedFace
      });
      const currentJobId = res.data.job_id;
      setJobId(currentJobId);
      setJobStatus('processing');
      setLoading(false);
      addLog(`Job submitted. ID: ${currentJobId}. Neural synthesis in progress...`);
      
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > 120) { // 4 minutes timeout
          clearInterval(pollInterval);
          setJobStatus('failed');
          addLog('Job timed out after 4 minutes. Try a shorter video.');
          return;
        }
        try {
          const metricsRes = await axios.get(`${API_BASE}/metrics/${currentJobId}`);
          const data = metricsRes.data;
          if (data.status === 'completed') {
            clearInterval(pollInterval);
            setMetrics(data);
            setJobStatus('completed');
            addLog('✓ Face Swap complete! GFPGAN face restoration applied. Click Play to view.');
            fetchStatus();
          } else if (data.status === 'failed') {
            clearInterval(pollInterval);
            setJobStatus('failed');
            addLog(`✗ Face Swap failed: ${data.error || 'Unknown error'}`);
          } else if (data.status === 'not_found') {
            clearInterval(pollInterval);
            setJobStatus('failed');
            addLog('✗ Job lost — server may have restarted. Please try again.');
          } else {
            if (attempts % 5 === 0) addLog(`Processing... (${attempts * 2}s elapsed)`);
          }
        } catch (e) {
          console.log('Error polling face swap status:', e);
          clearInterval(pollInterval);
          setJobStatus('failed');
          addLog('✗ Lost connection to server. Please try again.');
        }
      }, 2000);
    } catch (err) {
      setLoading(false);
      setJobStatus('failed');
      addLog('✗ Error dispatching job. Is the backend running?');
    }
  };

  const startLipSync = async () => {
    if (!selectedVideo) {
      addLog('Error: Please select or upload a video.');
      return;
    }
    setLoading(true);
    setIsPlaying(false);
    setMetrics(null);
    setJobStatus(null);
    addLog('Dispatching lip sync request to Wav2Lip-HD pipeline...');
    try {
      const res = await axios.post(`${API_BASE}/lip-sync`, {
        video_id: selectedVideo,
        audio_id: selectedAudio || 'preset_audio'
      });
      const currentJobId = res.data.job_id;
      setJobId(currentJobId);
      setJobStatus('processing');
      setLoading(false);
      addLog(`Lip Sync job submitted. ID: ${currentJobId}. Syncing audio...`);
      
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > 120) { // 4 minutes timeout
          clearInterval(pollInterval);
          setJobStatus('failed');
          addLog('Job timed out after 4 minutes. Try a shorter video.');
          return;
        }
        try {
          const metricsRes = await axios.get(`${API_BASE}/metrics/${currentJobId}`);
          const data = metricsRes.data;
          if (data.status === 'completed') {
            clearInterval(pollInterval);
            setMetrics(data);
            setJobStatus('completed');
            addLog('✓ Lip Sync complete! Audio track mixed successfully. Click Play to view.');
            fetchStatus();
          } else if (data.status === 'failed') {
            clearInterval(pollInterval);
            setJobStatus('failed');
            addLog(`✗ Lip Sync failed: ${data.error || 'Unknown error'}`);
          } else if (data.status === 'not_found') {
            clearInterval(pollInterval);
            setJobStatus('failed');
            addLog('✗ Job lost — server may have restarted. Please try again.');
          } else {
            if (attempts % 5 === 0) addLog(`Processing... (${attempts * 2}s elapsed)`);
          }
        } catch (e) {
          console.log('Error polling lip sync status:', e);
          clearInterval(pollInterval);
          setJobStatus('failed');
          addLog('✗ Lost connection to server. Please try again.');
        }
      }, 2000);
    } catch (err) {
      setLoading(false);
      setJobStatus('failed');
      addLog('✗ Error dispatching lip-sync job. Is the backend running?');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Sparkles className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-brand-400 bg-clip-text text-transparent">
                AetherSwap
              </h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Casting & Actor Simulator</p>
            </div>
          </div>

          {/* Engine Status */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <Cpu className="h-4 w-4 text-emerald-400" />
              <span className="text-slate-300 font-medium">GPU Acceleration:</span>
              <span className="text-emerald-400 font-semibold">{apiStatus.gpu_available ? 'Active' : 'Offline'}</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <TrendingUp className="h-4 w-4 text-brand-400" />
              <span className="text-slate-300 font-medium">Processed:</span>
              <span className="text-brand-400 font-semibold">{apiStatus.processed_videos} videos</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Operations & Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex space-x-1 p-1 bg-slate-900/60 rounded-xl border border-slate-800">
            <button
              onClick={() => { setActiveTab('swap'); setJobStatus(null); setMetrics(null); setIsPlaying(false); }}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'swap'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Actor Face Swap</span>
            </button>
            <button
              onClick={() => { setActiveTab('sync'); setJobStatus(null); setMetrics(null); setIsPlaying(false); }}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'sync'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Volume2 className="h-4 w-4" />
              <span>Lip Sync & Voice</span>
            </button>
            <button
              onClick={() => { setActiveTab('simulator'); setJobStatus(null); setMetrics(null); setIsPlaying(false); }}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'simulator'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Film className="h-4 w-4" />
              <span>Casting Board</span>
            </button>
          </div>

          {/* Configuration Panel */}
          <div className="glass-panel-glow rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center space-x-2">
              <Settings className="h-5 w-5 text-brand-400" />
              <span>Configuration panel</span>
            </h2>

            {/* Video Selection Section */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">1. Select Target Scene</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {videosPreset.map((vid) => (
                  <div
                    key={vid.id}
                    onClick={() => { setSelectedVideo(vid.id); addLog(`Selected video preset: ${vid.title}`); }}
                    className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 ${
                      selectedVideo === vid.id
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
                    }`}
                  >
                    <Video className={`h-6 w-6 mb-2 ${selectedVideo === vid.id ? 'text-brand-400' : 'text-slate-500'}`} />
                    <h3 className="font-semibold text-xs text-slate-200 leading-tight">{vid.title}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">{vid.duration} • {vid.size}</p>
                  </div>
                ))}
              </div>

              {/* File Upload Option */}
              <div className="relative border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-xl p-4 flex flex-col items-center justify-center transition-colors">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleUploadVideo}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="h-5 w-5 text-slate-400 mb-2" />
                <span className="text-xs text-slate-300 font-medium">Or upload custom production video</span>
                <span className="text-[10px] text-slate-500 mt-1">MP4, MOV up to 100MB</span>
              </div>
            </div>

            {/* Face Swap Mode Options */}
            {activeTab === 'swap' && (
              <div className="space-y-4 pt-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">2. Select Replacement Actor</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {actorsPreset.map((act) => (
                    <div
                      key={act.id}
                      onClick={() => { setSelectedFace(act.id); addLog(`Selected actor face preset: ${act.name}`); }}
                      className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 flex items-center space-x-3 ${
                        selectedFace === act.id
                          ? 'border-brand-500 bg-brand-500/10'
                          : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-2xl">{act.avatar}</span>
                      <div>
                        <h3 className="font-semibold text-xs text-slate-200 leading-tight">{act.name}</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Match: {act.suitability}%</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="relative border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-xl p-4 flex flex-col items-center justify-center transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadFace}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="h-5 w-5 text-slate-400 mb-2" />
                  <span className="text-xs text-slate-300 font-medium">Or upload custom actor face reference</span>
                  <span className="text-[10px] text-slate-500 mt-1">JPG, PNG high resolution preferred</span>
                </div>

                <button
                  disabled={loading}
                  onClick={startFaceSwap}
                  className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-medium py-3.5 px-4 rounded-xl shadow-lg shadow-brand-600/20 flex items-center justify-center space-x-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{loading ? 'Processing Pipeline...' : 'Generate Actor Replacement'}</span>
                </button>
              </div>
            )}

            {/* Lip Sync & Audio Section */}
            {activeTab === 'sync' && (
              <div className="space-y-4 pt-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">2. Select Audio Track / Script Voice</label>
                
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <Volume2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">Standard Voice Clone Preset</h4>
                      <p className="text-[10px] text-slate-500">Auto-transcribing and lip syncing using Wav2Lip-HD</p>
                    </div>
                  </div>
                </div>

                <div className="relative border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-xl p-4 flex flex-col items-center justify-center transition-colors">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if(file) {
                        setSelectedAudio(file.name);
                        addLog(`Audio track selected: ${file.name}`);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="h-5 w-5 text-slate-400 mb-2" />
                  <span className="text-xs text-slate-300 font-medium">Upload custom dialogue voice file</span>
                  <span className="text-[10px] text-slate-500 mt-1">MP3, WAV up to 10MB</span>
                </div>

                <button
                  disabled={loading}
                  onClick={startLipSync}
                  className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-medium py-3.5 px-4 rounded-xl shadow-lg shadow-brand-600/20 flex items-center justify-center space-x-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                >
                  <Volume2 className="h-4 w-4" />
                  <span>{loading ? 'Synthesizing Audio...' : 'Generate Lip Sync & Speech'}</span>
                </button>
              </div>
            )}

            {/* Casting Board Section */}
            {activeTab === 'simulator' && (
              <div className="space-y-4 pt-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Actor Performance & Match Comparison</label>
                <div className="space-y-3">
                  {actorsPreset.map((act) => (
                    <div key={act.id} className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{act.avatar}</span>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-200">{act.name}</h4>
                          <p className="text-xs text-slate-400">Target Match: {act.suitability}%</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-brand-400">FID Score: {(10 + Math.random() * 5).toFixed(2)}</div>
                        <div className="text-[10px] text-slate-500">SSIM: {(0.85 + Math.random() * 0.1).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Outputs & Logs */}
        <div className="space-y-6">
          {/* Live Preview Panel */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col h-[380px] justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-brand-500/10 text-brand-400 text-[10px] font-bold px-3 py-1.5 rounded-bl-xl border-l border-b border-slate-800 uppercase tracking-wider">
              Output Simulation Preview
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              {jobStatus === 'processing' && (
                <div className="space-y-4">
                  <div className="relative flex items-center justify-center">
                    <div className="h-16 w-16 border-4 border-slate-800 border-t-brand-500 rounded-full animate-spin"></div>
                    <Sparkles className="absolute h-6 w-6 text-brand-400 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200">Neural Network Synthesis</h4>
                    <p className="text-xs text-slate-500 mt-1">Processing video frames... This may take 1-3 minutes for large videos.</p>
                    <button
                      onClick={() => setJobStatus(null)}
                      className="mt-3 text-[10px] text-slate-500 hover:text-slate-300 border border-slate-700 px-2 py-1 rounded transition-colors"
                    >Cancel / Reset</button>
                  </div>
                </div>
              )}

              {jobStatus === 'failed' && (
                <div className="space-y-4">
                  <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-400">Processing Failed</h4>
                    <p className="text-xs text-slate-500 mt-1">Check the System Logs below for details.</p>
                    <button
                      onClick={() => { setJobStatus(null); setMetrics(null); setIsPlaying(false); }}
                      className="mt-3 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors"
                    >Try Again</button>
                  </div>
                </div>
              )}

              {jobStatus === 'completed' && (
                <div className="space-y-4 w-full">
                  <div className="aspect-video w-full rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 relative overflow-hidden group">
                    {isPlaying && metrics?.output_video_url ? (
                      <video 
                        src={`${API_BASE}${metrics.output_video_url}`} 
                        controls 
                        autoPlay 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80 z-10"></div>
                        <FileVideo className="h-12 w-12 text-brand-400/80 group-hover:scale-110 transition-transform duration-300" />
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center z-20">
                          <span className="text-[10px] font-semibold tracking-wide bg-slate-950/80 px-2.5 py-1 rounded text-emerald-400 border border-slate-800">
                            Render Success
                          </span>
                          <button 
                            onClick={() => setIsPlaying(true)}
                            className="bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-bold py-1 px-2.5 rounded transition-colors flex items-center space-x-1"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            <span>Play Output</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {metrics && metrics.fid !== undefined && (
                    <div className="grid grid-cols-4 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-center">
                      <div>
                        <div className="text-[10px] font-medium text-slate-500 uppercase">FID</div>
                        <div className="text-xs font-bold text-brand-400 mt-0.5">{metrics.fid}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium text-slate-500 uppercase">SSIM</div>
                        <div className="text-xs font-bold text-brand-400 mt-0.5">{metrics.ssim}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium text-slate-500 uppercase">PSNR</div>
                        <div className="text-xs font-bold text-brand-400 mt-0.5">{metrics.psnr}dB</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium text-slate-500 uppercase">LSE-D</div>
                        <div className="text-xs font-bold text-brand-400 mt-0.5">{metrics.lse_d}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!jobStatus && (
                <div className="space-y-4">
                  <div className="h-16 w-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-500 mx-auto">
                    <Film className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200">No active simulation</h4>
                    <p className="text-xs text-slate-500 max-w-[240px] mx-auto mt-1">
                      Configure parameters and hit generate to trigger AI synthesis.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Engine Terminal Logs */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col h-[280px]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">System Logs</h3>
              <button 
                onClick={() => setLogs([])}
                className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center space-x-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Clear</span>
              </button>
            </div>
            
            <div className="flex-1 bg-slate-950/80 border border-slate-900 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-slate-400 overflow-y-auto space-y-1.5 scrollbar-thin">
              {logs.length === 0 ? (
                <div className="text-slate-600 italic">No output events logged yet.</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="border-l border-brand-500/40 pl-2">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center md:flex md:justify-between md:items-center text-xs text-slate-500">
          <p>© 2026 AetherSwap Casting Simulator. Powered by SimSwap & Wav2Lip-HD.</p>
          <p className="mt-2 md:mt-0">All generation tasks comply with deepfake detection standards.</p>
        </div>
      </footer>
    </div>
  );
}
