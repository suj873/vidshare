import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Eye, Heart } from 'lucide-react';

const VideoCard = ({ video }) => {
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const timeAgo = (date) => {
    const now = new Date();
    const videoDate = new Date(date);
    const diffInSeconds = Math.floor((now - videoDate) / 1000);

    const intervals = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'week', seconds: 604800 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 }
    ];

    for (const interval of intervals) {
      const count = Math.floor(diffInSeconds / interval.seconds);
      if (count >= 1) {
        return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
      }
    }

    return 'Just now';
  };

  return (
    <div className="group bg-slate-800/30 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl">
      <Link to={`/video/${video._id}`} className="block relative">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-slate-700 overflow-hidden">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={(e) => {
              e.target.src = `https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=450&fit=crop&crop=center`;
            }}
          />
          
          {/* Play button overlay */}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <Play className="h-8 w-8 text-white" fill="white" />
            </div>
          </div>

          {/* Duration badge */}
          {video.duration > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {formatDuration(video.duration)}
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="p-4">
          <h3 className="text-white font-semibold text-lg line-clamp-2 group-hover:text-blue-400 transition-colors duration-200">
            {video.title}
          </h3>
          
          <div className="mt-2 flex items-center space-x-4 text-sm text-slate-400">
            <div className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>{formatViews(video.views)} views</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Heart className="h-4 w-4" />
              <span>{video.likes?.length || 0}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {video.uploader?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-slate-300 text-sm font-medium">
                {video.uploader?.username || 'Unknown User'}
              </p>
              <p className="text-slate-500 text-xs">
                {timeAgo(video.createdAt)}
              </p>
            </div>
          </div>

          {video.description && (
            <p className="mt-3 text-slate-400 text-sm line-clamp-2">
              {video.description}
            </p>
          )}
        </div>
      </Link>
    </div>
  );
};

export default VideoCard;