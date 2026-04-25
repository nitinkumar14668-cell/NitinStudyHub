import axios from 'axios';

const API_KEY = (import.meta as any).env.VITE_YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

export const fetchEducationalVideos = async (query: string = 'educational notes lectures'): Promise<YouTubeVideo[]> => {
  if (!API_KEY) {
    console.warn('YouTube API Key is missing. Please set VITE_YOUTUBE_API_KEY in your environment.');
    return [];
  }

  try {
    const response = await axios.get(`${BASE_URL}/search`, {
      params: {
        part: 'snippet',
        maxResults: 6,
        q: query,
        type: 'video',
        videoEmbeddable: 'true',
        key: API_KEY,
      },
    });

    return response.data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.high.url,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
    }));
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    return [];
  }
};
