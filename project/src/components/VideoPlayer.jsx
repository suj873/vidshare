import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, AlertCircle } from 'lucide-react';

const VideoPlayer = ({ src, poster, onLoadedMetadata }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [quality, setQuality] = useState('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const controlsTimeoutRef = useRef(null);

  // Quality options for Cloudinary video transformation
  const qualityOptions = [
    { label: 'Auto', value: 'auto' },
    { label: '1080p', value: 'q_auto,h_1080' },
    { label: '720p', value: 'q_auto,h_720' },
    { label: '480p', value: 'q_auto,h_480' },
    { label: '360p', value: 'q_auto,h_360' }
  ];

  // Check if this is a Google Drive video
  const isGoogleDriveVideo = () => {
    return src.includes('drive.google.com');
  };

  // Convert Google Drive URL to embed format
  const getDriveEmbedUrl = (url) => {
    // Handle direct download URLs (uc?export=download&id=...)
    const downloadMatch = url.match(/[?&]id=([^&]+)/);
    if (downloadMatch) {
      const fileId = downloadMatch[1];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    
    // Handle share URLs (/file/d/.../view)
    const shareMatch = url.match(/\/file\/d\/([^/]+)/);
    if (shareMatch) {
      const fileId = shareMatch[1];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    
    return url;
  };

  // Transform video URL based on quality selection
  const getVideoUrl = () => {
    if (quality === 'auto') return src;
    
    // For Cloudinary URLs, insert quality parameters
    if (src.includes('cloudinary.com')) {
      const urlParts = src.split('/upload/');
      if (urlParts.length === 2) {
        return `${urlParts[0]}/upload/${quality}/${urlParts[1]}`;
      }
    }
    
    return src;
  };

  useEffect(() => {
    // For Google Drive videos, we don't need video element event listeners
    if (isGoogleDriveVideo()) {
      setIsLoading(false);
      setDuration(0); // Duration not available for iframe videos
      if (onLoadedMetadata) {
        onLoadedMetadata(0);
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => {
      setDuration(video.duration);
      setIsLoading(false);
      if (onLoadedMetadata) {
        onLoadedMetadata(video.duration);
      }
    };

    const handleError = (e) => {
      console.error('Video error:', e);
      setError('Failed to load video. Please check if the video is accessible.');
      setIsLoading(false);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setError(null);
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('durationchange', updateDuration);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('durationchange', updateDuration);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [onLoadedMetadata, src]);

  const togglePlay = () => {
    if (isGoogleDriveVideo()) return; // Can't control iframe playback
    
    const video = videoRef.current;
    if (video.paused) {
      video.play().catch(e => {
        console.error('Play failed:', e);
        setError('Failed to play video. Please try again.');
      });
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e) => {
    if (isGoogleDriveVideo()) return; // Can't control iframe playback
    
    const video = videoRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * duration;
  };

  const handleVolumeChange = (e) => {
    if (isGoogleDriveVideo()) return; // Can't control iframe volume
    
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    videoRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (isGoogleDriveVideo()) return; // Can't control iframe volume
    
    const video = videoRef.current;
    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    const element = isGoogleDriveVideo() ? 
      document.querySelector('.drive-iframe-container') : 
      videoRef.current;
      
    if (!document.fullscreenElement) {
      element.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const showControlsTemporarily = () => {
    if (isGoogleDriveVideo()) return; // No custom controls for iframe
    
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleQualityChange = (newQuality) => {
    if (isGoogleDriveVideo()) return; // No quality control for iframe
    
    const currentTime = videoRef.current.currentTime;
    const wasPlaying = !videoRef.current.paused;
    
    setQuality(newQuality);
    setShowQualityMenu(false);
    
    // After quality change, restore playback position
    setTimeout(() => {
      videoRef.current.currentTime = currentTime;
      if (wasPlaying) {
        videoRef.current.play();
      }
    }, 100);
  };

  // Render Google Drive iframe
  if (isGoogleDriveVideo()) {
    return (
      <div className="relative bg-black rounded-lg overflow-hidden drive-iframe-container">
        <iframe
          src={getDriveEmbedUrl(src)}
          className="w-full h-full aspect-video"
          allow="autoplay; fullscreen"
          allowFullScreen
          style={{ minHeight: '400px' }}
          onLoad={() => setIsLoading(false)}
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}

        {/* Simple fullscreen button for Drive videos */}
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg transition-colors"
        >
          <Maximize className="h-5 w-5" />
        </button>

        {/* Drive video info overlay */}
        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Google Drive Video</span>
          </div>
        </div>
      </div>
    );
  }

  // Render regular video player for non-Drive videos
  return (
    <div 
      className="relative bg-black rounded-lg overflow-hidden group"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={getVideoUrl()}
        poster={poster}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
        crossOrigin="anonymous"
      />

      {/* Loading spinner */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center text-white p-6">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <p className="text-lg font-semibold mb-2">Video Error</p>
            <p className="text-sm text-slate-300 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress bar */}
        <div 
          className="w-full h-2 bg-white/20 rounded-full cursor-pointer mb-4 group/progress"
          onClick={handleSeek}
        >
          <div 
            className="h-full bg-blue-500 rounded-full relative group-hover/progress:bg-blue-400 transition-colors"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          >
            <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"></div>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={togglePlay}
              className="text-white hover:text-blue-400 transition-colors"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="text-white hover:text-blue-400 transition-colors"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            <div className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Quality selector */}
            <div className="relative">
              <button
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="text-white hover:text-blue-400 transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>

              {showQualityMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-slate-800 rounded-lg shadow-lg py-2 min-w-32">
                  {qualityOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleQualityChange(option.value)}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition-colors ${
                        quality === option.value ? 'text-blue-400' : 'text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-blue-400 transition-colors"
            >
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;