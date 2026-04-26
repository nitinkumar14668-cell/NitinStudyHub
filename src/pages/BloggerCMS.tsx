import React, { useState } from 'react';
import { FileEdit, Send, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BloggerCMS() {
  const [apiKey, setApiKey] = useState('');
  const [blogId, setBlogId] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  // Note: To actually publish directly without user login popup, 
  // you usually need OAuth, but for simple fetching or if using service accounts/APIs, we mock the UI here.
  const fetchPosts = async () => {
    if (!apiKey || !blogId) {
      toast.error('API Key aur Blog ID zaroori hai');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${apiKey}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setPosts(data.items || []);
      toast.success('Posts load ho gaye!');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const publishPost = async () => {
    toast.error('Publishing requires OAuth 2.0 configuration. This is a UI Demonstration.');
    // Real implementation requires user to go through OAuth consent screen for blogger scope
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <FileEdit className="text-blue-600" />
          Blogger Studio Editor
        </h1>
        <p className="text-gray-600 mt-2">
          Apne boardresultcheck.blogspot.com ko bina blogger.com khole yahin se manage karein.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-4">New Post Likhein</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Post Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="Jaise: UP Board 10th Result 2026 Declared"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">HTML/Markdown Content</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 font-mono text-sm"
                  placeholder="Yahan apna blog post content likhein..."
                />
              </div>
              <button
                onClick={publishPost}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Send size={18} />
                Publish to Blogger
              </button>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg flex gap-3">
              <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20}/>
              <div className="text-sm text-blue-800">
                <strong>Note:</strong> API se automatically post publish karne ke liye hume aage Google API Console me Google OAuth setup karna hoga taaki ye verify ho sake ki blog aapka hi hai.
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Blogger API Setup</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blog ID</label>
                <input
                  type="text"
                  value={blogId}
                  onChange={(e) => setBlogId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="e.g. 123456789012345"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key (Reading only)</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="AIzaSy..."
                />
              </div>
              <button
                onClick={fetchPosts}
                disabled={loading}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Load Recent Posts
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Recent Posts</h2>
            {posts.length === 0 ? (
              <p className="text-gray-500 text-sm">Koi post fetch nahi ki gayi. API details daalkar fetch karein.</p>
            ) : (
              <div className="space-y-3">
                {posts.slice(0, 5).map((post) => (
                  <div key={post.id} className="border-b pb-2 last:border-0">
                    <a href={post.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium text-sm">
                      {post.title}
                    </a>
                    <p className="text-xs text-gray-500 mt-1">{new Date(post.published).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
