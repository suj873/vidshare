import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import VideoCard from '../components/VideoCard';
import { Search, Loader } from 'lucide-react';

const Home = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    fetchVideos();
  }, [searchQuery]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `https://vid-share-backend.onrender.com/api/videos${searchQuery ? `?search=${searchQuery}` : ''}`
      );
      setVideos(response.data.videos);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          {searchQuery ? (
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-2">
                Search Results for "{searchQuery}"
              </h1>
              <p className="text-slate-400">
                {videos.length} video{videos.length !== 1 ? 's' : ''} found
              </p>
            </div>
          ) : (
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-teal-400 bg-clip-text text-transparent mb-4">
                Discover Amazing Videos
              </h1>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Explore a world of creativity. Watch, enjoy, and get inspired by content from creators around the globe.
              </p>
            </div>
          )}
        </div>

        {/* Videos Grid */}
        {videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              {searchQuery ? 'No videos found' : 'No videos available'}
            </h3>
            <p className="text-slate-400 mb-6">
              {searchQuery 
                ? 'Try adjusting your search terms or browse all videos.' 
                : 'Be the first to upload and share your amazing content!'
              }
            </p>
            {!searchQuery && (
              <a
                href="/register"
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Get Started
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
