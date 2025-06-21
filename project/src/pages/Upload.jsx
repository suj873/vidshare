import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload as UploadIcon, X, Film, Loader, Link as LinkIcon } from 'lucide-react';
import axios from 'axios';

const Upload = () => {
  const [uploadType, setUploadType] = useState('file'); // 'file' or 'link'
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    videoUrl: ''
  });
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleUploadTypeChange = (type) => {
    setUploadType(type);
    setFile(null);
    setFormData({ ...formData, videoUrl: '' });
    setError('');
  };

  const handleFileSelect = (selectedFile) => {
    // Validate file type
    const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/wmv', 'video/flv', 'video/webm'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Please select a valid video file (MP4, MOV, AVI, WMV, FLV, WEBM)');
      return;
    }

    // Validate file size (5GB limit)
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
    if (selectedFile.size > maxSize) {
      setError('File size must be less than 5GB');
      return;
    }

    setFile(selectedFile);
    setError('');
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError('');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateVideoUrl = (url) => {
    try {
      const urlObj = new URL(url);
      // Check if it's a valid URL and has video-like extensions or is from known video platforms
      const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv', '.m4v'];
      const videoPlatforms = [
        'youtube.com', 
        'youtu.be', 
        'vimeo.com', 
        'dailymotion.com', 
        'cloudinary.com',
        'drive.google.com',   // Google Drive support
        'docs.google.com'     // Google Drive mobile links
      ];
      
      const hasVideoExtension = videoExtensions.some(ext => url.toLowerCase().includes(ext));
      const isFromVideoPlatform = videoPlatforms.some(platform => urlObj.hostname.includes(platform));
      
      return hasVideoExtension || isFromVideoPlatform;
    } catch {
      return false;
    }
  };

  // Convert Google Drive share links to preview format (for iframe embedding)
  const normalizeDriveLink = (url) => {
    // Handle standard Google Drive share links
    const shareMatch = url.match(/\/file\/d\/([^/]+)/);
    if (shareMatch) {
      const id = shareMatch[1];
      // Keep the original share URL format - the backend will handle conversion to preview
      return url;
    }
    
    // Handle Google Drive view links
    const viewMatch = url.match(/[?&]id=([^&]+)/);
    if (viewMatch && url.includes('drive.google.com')) {
      const id = viewMatch[1];
      // Convert to standard share format
      return `https://drive.google.com/file/d/${id}/view`;
    }
    
    // Return original URL if not a Drive link
    return url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (uploadType === 'file' && !file) {
      setError('Please select a video file');
      return;
    }

    if (uploadType === 'link') {
      if (!formData.videoUrl.trim()) {
        setError('Please enter a video URL');
        return;
      }
      if (!validateVideoUrl(formData.videoUrl)) {
        setError('Please enter a valid video URL');
        return;
      }
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      let response;

      if (uploadType === 'file') {
        // File upload
        const uploadFormData = new FormData();
        uploadFormData.append('video', file);
        uploadFormData.append('title', formData.title);
        uploadFormData.append('description', formData.description);
        uploadFormData.append('tags', formData.tags);

        response = await axios.post(
          'https://vid-share-backend.onrender.com/api/videos/upload',
          uploadFormData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
            },
          }
        );
      } else {
        // Link upload with Drive link normalization
        const normalizedUrl = normalizeDriveLink(formData.videoUrl);
        
        response = await axios.post(
          'https://vid-share-backend.onrender.com/api/videos/upload-link',
          {
            title: formData.title,
            description: formData.description,
            tags: formData.tags,
            videoUrl: normalizedUrl
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

      // Navigate to the uploaded video
      navigate(`/video/${response.data._id}`);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.message || 'Error uploading video');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
            Upload Your Video
          </h1>
          <p className="text-slate-400 text-lg">
            Share your creativity with the world
          </p>
        </div>

        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Upload Type Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-300 mb-4">
              Upload Method
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleUploadTypeChange('file')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  uploadType === 'file'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-slate-600 hover:border-slate-500 text-slate-300'
                }`}
              >
                <UploadIcon className="h-8 w-8 mx-auto mb-2" />
                <div className="font-medium">Upload File</div>
                <div className="text-sm opacity-75">Upload from device</div>
              </button>
              
              <button
                type="button"
                onClick={() => handleUploadTypeChange('link')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  uploadType === 'link'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-slate-600 hover:border-slate-500 text-slate-300'
                }`}
              >
                <LinkIcon className="h-8 w-8 mx-auto mb-2" />
                <div className="font-medium">Video Link</div>
                <div className="text-sm opacity-75">Paste video URL</div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload Area or URL Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-4">
                {uploadType === 'file' ? 'Video File' : 'Video URL'}
              </label>

              {uploadType === 'file' ? (
                !file ? (
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive
                        ? 'border-blue-500 bg-blue-500/5'
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileInput}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    <Film className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-slate-300 mb-2">
                      Drop your video here, or click to browse
                    </p>
                    <p className="text-slate-400 text-sm">
                      Supports MP4, MOV, AVI, WMV, FLV, WEBM (Max: 5GB)
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-700/50 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Film className="h-8 w-8 text-blue-400" />
                      <div>
                        <p className="text-white font-medium">{file.name}</p>
                        <p className="text-slate-400 text-sm">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  <input
                    name="videoUrl"
                    type="url"
                    value={formData.videoUrl}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="https://example.com/video.mp4, YouTube, Vimeo, or Google Drive URL"
                  />
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h4 className="text-blue-400 font-semibold mb-2">📁 Google Drive Instructions:</h4>
                    <ol className="text-slate-300 text-sm space-y-1 list-decimal list-inside">
                      <li>Upload your video to Google Drive</li>
                      <li>Right-click the video → Share</li>
                      <li>Set to <strong>"Anyone with the link can view"</strong></li>
                      <li>Copy the share link and paste it above</li>
                    </ol>
                    <p className="text-slate-400 text-xs mt-2">
                      ✅ Supports YouTube, Vimeo, Google Drive, and direct video links
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
                Title *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter a compelling title for your video"
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="Tell viewers about your video..."
                maxLength={2000}
              />
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-slate-300 mb-2">
                Tags
              </label>
              <input
                id="tags"
                name="tags"
                type="text"
                value={formData.tags}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="gaming, music, tutorial (separate with commas)"
              />
            </div>

            {/* Upload Progress */}
            {uploading && uploadType === 'file' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Uploading...</span>
                  <span className="text-slate-300">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={uploading || (uploadType === 'file' && !file) || (uploadType === 'link' && !formData.videoUrl)}
              className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors"
            >
              {uploading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin mr-2" />
                  {uploadType === 'file' ? 'Uploading...' : 'Processing...'}
                </>
              ) : (
                <>
                  {uploadType === 'file' ? (
                    <UploadIcon className="h-5 w-5 mr-2" />
                  ) : (
                    <LinkIcon className="h-5 w-5 mr-2" />
                  )}
                  {uploadType === 'file' ? 'Upload Video' : 'Add Video Link'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Upload;