import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Youtube, Search, Play, ExternalLink, Loader2, Sparkles, ArrowLeft, X, BookOpen, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchEducationalVideos, YouTubeVideo } from '../services/youtubeService';

const AdModal: React.FC<{ isOpen: boolean; onClose: () => void; videoUrl: string; onWatchLocally: (url: string) => void }> = ({ isOpen, onClose, videoUrl, onWatchLocally }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800"
        >
          <button 
            onClick={() => {
              onWatchLocally(videoUrl);
            }} 
            className="absolute top-6 right-6 p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col md:flex-row">
            <div className="md:w-2/5 relative h-48 md:h-auto">
              <img src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=1973" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent" />
            </div>
            <div className="md:w-3/5 p-8 lg:p-12">
              <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                < BookOpen className="w-3 h-3" /> Preparation Bundle
              </div>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4 italic">Boost Your Scores!</h3>
              <p className="text-gray-500 dark:text-gray-400 font-medium mb-8 leading-relaxed">
                Videos are great, but <span className="text-blue-600 font-bold underline">Visual Revision Notes</span> are better for retention. Get premium PDF notes for this topic now!
              </p>
              
              <div className="flex flex-col gap-3">
                <Link to="/" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 flex items-center justify-center gap-2">
                  <ShoppingBag className="w-5 h-5" /> Browse Notes <ArrowRight className="w-4 h-4" />
                </Link>
                <button 
                  onClick={() => {
                    onWatchLocally(videoUrl);
                  }}
                  className="w-full py-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold transition-colors"
                >
                  Skip & Watch Video
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const Videos: React.FC = () => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('latest educational lectures');
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const getVideos = async (query: string) => {
    setLoading(true);
    const data = await fetchEducationalVideos(query);
    setVideos(data);
    setLoading(false);
  };

  useEffect(() => {
    getVideos(searchQuery);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    getVideos(searchQuery);
  };

  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-950 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <AdModal 
        isOpen={!!selectedVideoUrl} 
        onClose={() => setSelectedVideoUrl(null)} 
        videoUrl={selectedVideoUrl || ''}
        onWatchLocally={(url) => {
          const id = extractVideoId(url);
          setPlayingVideoId(id);
          setSelectedVideoUrl(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="mb-12 flex items-center justify-between">
          <Link 
            to="/" 
            className="inline-flex items-center gap-3 bg-white dark:bg-gray-900 px-6 py-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 group-hover:bg-gray-900 group-hover:text-white transition-all">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
              Back to Home
            </span>
          </Link>

          {playingVideoId && (
            <button 
              onClick={() => setPlayingVideoId(null)}
              className="text-xs font-black uppercase tracking-widest text-red-600 hover:underline"
            >
              Close Player
            </button>
          )}
        </div>

        {/* Video Player Section */}
        <AnimatePresence>
          {playingVideoId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-16 overflow-hidden"
            >
              <div className="relative aspect-video rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white dark:border-gray-900">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-6"
          >
            <Youtube className="w-4 h-4" />
            Visual Learning Hub
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 leading-tight"
          >
            Watch & <span className="text-red-600">Master</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg mb-10"
          >
            Handpicked educational content curated to complement your study notes. 
            Search for specific topics or browse latest lectures.
          </motion.p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative group mb-12">
            <div className="absolute inset-0 bg-red-600/10 blur-xl group-hover:bg-red-600/20 transition-all rounded-3xl" />
            <div className="relative flex items-center bg-white dark:bg-gray-900 p-2 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
              <Search className="w-5 h-5 text-gray-400 ml-4" />
              <input
                type="text"
                placeholder="Search lectures, topics, or subjects..."
                className="w-full px-4 py-3 bg-transparent outline-none text-gray-700 dark:text-gray-200 font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                type="submit"
                className="bg-red-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-red-700 transition-all flex items-center gap-2"
              >
                Search
              </button>
            </div>
          </form>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
            {['Physics Lectures', 'Chemistry Basics', 'Math Shortcuts', 'Biology NEET', 'JEE Advanced', 'History Notes'].map(pill => (
              <button
                key={pill}
                onClick={() => {
                  setSearchQuery(pill);
                  getVideos(pill);
                }}
                className="px-6 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-full text-xs font-black uppercase tracking-widest text-gray-500 hover:text-red-600 hover:border-red-600 transition-all"
              >
                {pill}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <Loader2 className="w-10 h-10 animate-spin text-red-600" />
             <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Fetching best content...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {videos.map((video, idx) => (
              <motion.div
                key={`${video.id}-${idx}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group cursor-pointer"
                onClick={() => setSelectedVideoUrl(`https://youtube.com/watch?v=${video.id}`)}
              >
                <div className="relative aspect-video rounded-3xl overflow-hidden mb-6 shadow-sm group-hover:shadow-2xl transition-all duration-500">
                  <img 
                    src={video.thumbnail} 
                    alt={video.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                    <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl">
                      <Play className="w-8 h-8 fill-current translate-x-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-wider border border-white/20">
                     Official Lecture
                  </div>
                </div>
                
                <h3 
                  className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2 mb-3 leading-snug group-hover:text-red-600 transition-colors"
                  dangerouslySetInnerHTML={{ __html: video.title }}
                />
                
                <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <Youtube className="w-3 h-3 text-red-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{video.channelTitle}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-300 dark:text-gray-700 group-hover:text-red-500 transition-colors" />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Explore More Section */}
        {!loading && videos.length > 0 && (
          <div className="mt-24 p-12 bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-600/5 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700" />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="max-w-lg">
                <div className="flex items-center gap-2 text-red-600 font-black text-xs uppercase tracking-widest mb-4">
                  <Sparkles className="w-4 h-4" />
                  Smart Recommendation
                </div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Not finding what you need?</h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Use the search bar above to find specific chapters or competitive exam lectures. We prioritize high-quality educational creators.</p>
              </div>
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="bg-gray-900 dark:bg-red-600 text-white px-10 py-5 rounded-[2rem] font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-red-600/20"
              >
                Try Different Search
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Videos;
