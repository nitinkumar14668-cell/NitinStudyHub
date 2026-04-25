import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Play, ExternalLink, Youtube, Loader2 } from 'lucide-react';
import { fetchEducationalVideos, YouTubeVideo } from '../services/youtubeService';

const YouTubeSection: React.FC = () => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getVideos = async () => {
      setLoading(true);
      const data = await fetchEducationalVideos();
      setVideos(data);
      setLoading(false);
    };
    getVideos();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading educational videos...</p>
      </div>
    );
  }

  if (videos.length === 0) return null;

  return (
    <div className="py-20">
      <div className="flex items-center justify-between gap-8 mb-12">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-4">
          Visual Learning
          <span className="text-sm font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Youtube className="w-4 h-4" /> YouTube
          </span>
        </h2>
        <p className="hidden md:block text-gray-500 font-medium max-w-md text-right">
          Complement your notes with curated video lectures from top educators around the globe.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {videos.map((video, idx) => (
          <motion.a
            key={video.id}
            href={`https://www.youtube.com/watch?v=${video.id}`}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            viewport={{ once: true }}
            className="group block"
          >
            <div className="relative aspect-video rounded-2xl overflow-hidden mb-4 shadow-sm group-hover:shadow-xl transition-all">
              <img 
                src={video.thumbnail} 
                alt={video.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur p-3 rounded-full scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all">
                  <Play className="w-6 h-6 text-red-600 fill-current" />
                </div>
              </div>
              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur text-white text-[10px] font-black px-2 py-1 rounded-md uppercase">
                Video Lecture
              </div>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors leading-snug" dangerouslySetInnerHTML={{ __html: video.title }}></h3>
            <div className="flex items-center justify-between">
               <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{video.channelTitle}</span>
               <ExternalLink className="w-4 h-4 text-gray-300 dark:text-gray-700 group-hover:text-blue-400 transition-colors" />
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
};

export default YouTubeSection;
