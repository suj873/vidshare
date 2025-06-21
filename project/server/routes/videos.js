import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import Video from '../models/Video.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'video-sharing-platform',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'],
    transformation: [
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024 // 5GB limit
  }
});

// Helper function to generate thumbnail URL
const generateThumbnailUrl = (videoUrl) => {
  // For Cloudinary URLs, generate thumbnail
  if (videoUrl.includes('cloudinary.com')) {
    return videoUrl.replace('/video/', '/video/so_0/');
  }
  
  // For Google Drive URLs - Use preview endpoint for thumbnails
  if (videoUrl.includes('drive.google.com')) {
    // Extract file ID from various Google Drive URL formats
    let fileId = null;
    
    // Handle uc?export=download&id=... format
    const downloadMatch = videoUrl.match(/[?&]id=([^&]+)/);
    if (downloadMatch) {
      fileId = downloadMatch[1];
    }
    
    // Handle /file/d/.../view format
    const shareMatch = videoUrl.match(/\/file\/d\/([^/]+)/);
    if (shareMatch) {
      fileId = shareMatch[1];
    }
    
    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800-h450`;
    }
  }
  
  // For YouTube URLs
  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    let videoId = '';
    if (videoUrl.includes('youtube.com/watch?v=')) {
      videoId = videoUrl.split('v=')[1].split('&')[0];
    } else if (videoUrl.includes('youtu.be/')) {
      videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
    }
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
  }
  
  // For Vimeo URLs
  if (videoUrl.includes('vimeo.com')) {
    const videoId = videoUrl.split('/').pop().split('?')[0];
    // Note: Vimeo thumbnails require API call, using placeholder for now
    return `https://vumbnail.com/${videoId}.jpg`;
  }
  
  // Default placeholder thumbnail
  return 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=450&fit=crop&crop=center';
};

// Helper function to extract video ID for Cloudinary
const extractVideoId = (videoUrl) => {
  if (videoUrl.includes('cloudinary.com')) {
    const parts = videoUrl.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('.')[0];
  }
  
  // For Google Drive URLs - Extract file ID
  if (videoUrl.includes('drive.google.com')) {
    // Handle uc?export=download&id=... format
    const downloadMatch = videoUrl.match(/[?&]id=([^&]+)/);
    if (downloadMatch) {
      return `drive_${downloadMatch[1]}`;
    }
    
    // Handle /file/d/.../view format
    const shareMatch = videoUrl.match(/\/file\/d\/([^/]+)/);
    if (shareMatch) {
      return `drive_${shareMatch[1]}`;
    }
  }
  
  return null;
};

// Upload video file
router.post('/upload', auth, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file provided' });
    }

    const { title, description, tags } = req.body;

    const cloudinaryId = req.file.filename;
    const videoUrl = req.file.path;
    const thumbnailUrl = generateThumbnailUrl(videoUrl);

    const video = new Video({
      title,
      description,
      cloudinaryId,
      videoUrl,
      thumbnailUrl,
      duration: 0,
      uploader: req.user._id,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    });

    await video.save();

    // Add video to user's videos array
    await User.findByIdAndUpdate(req.user._id, {
      $push: { videos: video._id }
    });

    await video.populate('uploader', 'username avatar');

    res.status(201).json(video);
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ message: 'Error uploading video' });
  }
});

// Upload video link
router.post('/upload-link', auth, async (req, res) => {
  try {
    const { title, description, tags, videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ message: 'Video URL is required' });
    }

    // Validate URL format
    try {
      new URL(videoUrl);
    } catch {
      return res.status(400).json({ message: 'Invalid video URL format' });
    }

    const thumbnailUrl = generateThumbnailUrl(videoUrl);
    const cloudinaryId = extractVideoId(videoUrl) || `link_${Date.now()}`;

    const video = new Video({
      title,
      description,
      cloudinaryId,
      videoUrl,
      thumbnailUrl,
      duration: 0,
      uploader: req.user._id,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    });

    await video.save();

    // Add video to user's videos array
    await User.findByIdAndUpdate(req.user._id, {
      $push: { videos: video._id }
    });

    await video.populate('uploader', 'username avatar');

    res.status(201).json(video);
  } catch (error) {
    console.error('Video link upload error:', error);
    res.status(500).json({ message: 'Error adding video link' });
  }
});

// Get all videos (public)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 12, search } = req.query;
    const query = { isPrivate: false };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const videos = await Video.find(query)
      .populate('uploader', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Video.countDocuments(query);

    res.json({
      videos,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ message: 'Error fetching videos' });
  }
});

// Get single video
router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('uploader', 'username avatar bio');

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Increment view count
    video.views += 1;
    await video.save();

    res.json(video);
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ message: 'Error fetching video' });
  }
});

// Get user's videos
router.get('/user/my-videos', auth, async (req, res) => {
  try {
    const videos = await Video.find({ uploader: req.user._id })
      .populate('uploader', 'username avatar')
      .sort({ createdAt: -1 });

    res.json(videos);
  } catch (error) {
    console.error('Get user videos error:', error);
    res.status(500).json({ message: 'Error fetching user videos' });
  }
});

// Delete video
router.delete('/:id', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Check if user owns the video
    if (video.uploader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this video' });
    }

    // Delete from Cloudinary only if it's a Cloudinary-hosted video
    if (video.videoUrl.includes('cloudinary.com')) {
      try {
        await cloudinary.uploader.destroy(video.cloudinaryId, { resource_type: 'video' });
      } catch (cloudinaryError) {
        console.error('Cloudinary deletion error:', cloudinaryError);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Remove from database
    await Video.findByIdAndDelete(req.params.id);

    // Remove from user's videos array
    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { videos: req.params.id } }
    );

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ message: 'Error deleting video' });
  }
});

// Like/Unlike video
router.post('/:id/like', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const userLiked = video.likes.includes(req.user._id);

    if (userLiked) {
      video.likes = video.likes.filter(id => id.toString() !== req.user._id.toString());
    } else {
      video.likes.push(req.user._id);
    }

    await video.save();

    res.json({
      liked: !userLiked,
      likesCount: video.likes.length
    });
  } catch (error) {
    console.error('Like video error:', error);
    res.status(500).json({ message: 'Error liking video' });
  }
});

export default router;