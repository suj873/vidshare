import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import VideoCard from '../components/VideoCard';
import { User, Video, Calendar, Loader } from 'lucide-react';
import axios from 'axios';

const Profile = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalVideos: 0
  });

  useEffect(() => {
    fetchUserVideos();
  }, []);

  const fetchUserVideos = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/videos/user/my-videos');
      const userVideos = response.data;
      setVideos(userVideos);

      // Calculate stats
      const totalViews = userVideos.reduce((sum, video) => sum + video.views, 0);
      const totalLikes = userVideos.reduce((sum, video) => sum + (video.likes?.length || 0), 0);
      
      setStats({
        totalViews,
        totalLikes,
        totalVideos: userVideos.length
      });
    } catch (error) {
      console.error('Error fetching user videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-8">
            {/* Avatar */}
            <div className="flex-shrink-0 mb-6 md:mb-0">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {user.username[0].toUpperCase()}
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">
                {user.username}
              </h1>
              <p className="text-slate-400 mb-4">{user.email}</p>
              
              {user.bio && (
                <p className="text-slate-300 mb-4">{user.bio}</p>
              )}

              <div className="flex items-center text-slate-400 text-sm">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Joined {formatDate(user.createdAt || new Date())}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-6 md:mt-0">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {stats.totalVideos}
                </div>
                <div className="text-slate-400 text-sm">Videos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {formatNumber(stats.totalViews)}
                </div>
                <div className="text-slate-400 text-sm">Views</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {formatNumber(stats.totalLikes)}
                </div>
                <div className="text-slate-400 text-sm">Likes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Videos Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Your Videos</h2>
            <div className="flex items-center space-x-2 text-slate-400">
              <Video className="h-5 w-5" />
              <span>{stats.totalVideos} video{stats.totalVideos !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <VideoCard key={video._id} video={video} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Video className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">
                No videos yet
              </h3>
              <p className="text-slate-400 mb-6">
                Start sharing your amazing content with the world!
              </p>
              <a
                href="/upload"
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <Video className="h-5 w-5 mr-2" />
                Upload Your First Video
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;