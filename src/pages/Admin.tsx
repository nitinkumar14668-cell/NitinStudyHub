import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, CheckCircle2, Loader2, Plus, Trash2, ArrowLeft, Clock, Check, X as CloseIcon, Eye, DollarSign, Pencil, Youtube, Sparkles } from 'lucide-react';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, updateDoc, query, orderBy, limit, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Note, Transaction, TransactionStatus, ViewEvent } from '../types';
import { extractFirstPageAsImage } from '../lib/pdfHelper';
import { generateNotePromotion } from '../services/aiService';
import toast from 'react-hot-toast';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';

interface AdminProps {
  user: User | null;
}

export default function Admin({ user }: AdminProps) {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'notes' | 'transactions' | 'media'>('dashboard');
  const [views, setViews] = useState<ViewEvent[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [isChannelConnected, setIsChannelConnected] = useState(false);
  const [autoPostEnabled, setAutoPostEnabled] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    category: 'Math',
    tags: '',
    soldCount: 0
  });
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [socialDrafts, setSocialDrafts] = useState<any[]>([]);
  const [isGeneratingSocial, setIsGeneratingSocial] = useState(false);

  const isAdmin = user?.email === 'nitinkumar14668@gmail.com';

  useEffect(() => {
    if (!isAdmin && user !== null) {
      navigate('/');
    }
    fetchNotes();
    fetchTransactions();
    fetchViews();
  }, [user, isAdmin]);

  const fetchViews = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'views'));
      setViews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ViewEvent)));
    } catch (err) {
      console.error("Error fetching views:", err);
    }
  };

  const fetchNotes = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'notes'));
      setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)));
    } catch (err) {
      console.error("Error fetching notes:", err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    } catch (err) {
      console.error("Error fetching transactions:", err);
    }
  };

  const handleApprove = async (transId: string) => {
    try {
      const trans = transactions.find(t => t.id === transId);
      if (!trans) return;

      const downloadToken = Math.random().toString(36).substring(2, 15);
      await updateDoc(doc(db, 'transactions', transId), {
        status: TransactionStatus.APPROVED,
        downloadToken,
        updatedAt: serverTimestamp()
      });

      // Increment soldCount for each note
      const itemsToUpdate = trans.items || (trans.noteId ? [{ id: trans.noteId }] : []);
      for (const item of itemsToUpdate) {
        await updateDoc(doc(db, 'notes', item.id), {
          soldCount: increment(1)
        });
      }

      toast.success("Transaction Approved!");
      fetchTransactions();
      fetchNotes();
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve.");
    }
  };

  const handleReject = async (transId: string) => {
    try {
      await updateDoc(doc(db, 'transactions', transId), {
        status: TransactionStatus.REJECTED,
        updatedAt: serverTimestamp()
      });
      toast.success("Transaction Rejected.");
      fetchTransactions();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject.");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNoteId && (!pdfFile || !thumbFile)) {
      alert("Please select both PDF and Thumbnail files for a new note.");
      return;
    }

    setIsUploading(true);
    try {
      let pdfUrl = '';
      let thumbnailUrl = '';

      if (editingNoteId) {
        // Look up existing note urls
        const existingNote = notes.find(n => n.id === editingNoteId);
        pdfUrl = existingNote?.pdfUrl || '';
        thumbnailUrl = existingNote?.thumbnailUrl || '';
      }

      const idForStorage = editingNoteId || Math.random().toString(36).substring(7);

      // 1. Upload PDF if provided
      if (pdfFile) {
        const pdfRef = ref(storage, `notes/${idForStorage}/file.pdf`);
        await uploadBytes(pdfRef, pdfFile);
        pdfUrl = await getDownloadURL(pdfRef);
      }

      // 2. Upload Thumbnail if provided
      if (thumbFile) {
        const thumbRef = ref(storage, `notes/${idForStorage}/thumb.jpg`);
        await uploadBytes(thumbRef, thumbFile);
        thumbnailUrl = await getDownloadURL(thumbRef);
      }

      // 3. Save Meta to Firestore
      const finalCategory = isCustomCategory ? customCategory : formData.category;
      
      const payload = {
        ...formData,
        category: finalCategory,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t !== ''),
        pdfUrl,
        thumbnailUrl,
        updatedAt: serverTimestamp()
      };

      if (editingNoteId) {
        await updateDoc(doc(db, 'notes', editingNoteId), payload);
        toast.success("Note updated successfully!");
      } else {
        const docRef = await addDoc(collection(db, 'notes'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        toast.success("Note uploaded successfully!");

        // Auto post logic
        if (autoPostEnabled && isChannelConnected) {
           const noteSnapshot = { id: docRef.id, ...payload } as Note;
           generateSocialPost(noteSnapshot);
        }
      }

      handleCancelEdit();
      fetchNotes();
    } catch (err) {
      console.error(err);
      toast.error(editingNoteId ? "Update failed." : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditStart = (note: Note) => {
    setEditingNoteId(note.id);
    setFormData({
      title: note.title,
      description: note.description,
      price: note.price,
      category: note.category,
      tags: note.tags?.join(', ') || '',
      soldCount: note.soldCount || 0
    });
    // Check if category is in defaults
    const defaults = ['Math', 'Physics', 'Chemistry', 'Biology', 'Computer Science'];
    if (!defaults.includes(note.category)) {
      setIsCustomCategory(true);
      setCustomCategory(note.category);
    } else {
      setIsCustomCategory(false);
      setCustomCategory('');
    }
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setFormData({ title: '', description: '', price: 0, category: 'Math', tags: '', soldCount: 0 });
    setIsCustomCategory(false);
    setCustomCategory('');
    setPdfFile(null);
    setThumbFile(null);
  };

  const generateSocialPost = async (note: Note) => {
    setIsGeneratingSocial(true);
    try {
      // 1. Generate AI Content
      const promo = await generateNotePromotion(note.title, note.description, note.category);
      
      // 2. Extract PDF image (first page)
      const previewImage = await extractFirstPageAsImage(note.pdfUrl);

      if (promo && previewImage) {
        const newDraft = {
          id: note.id,
          title: note.title,
          aiContent: promo,
          image: previewImage,
          scheduledFor: new Date(Date.now() + 6 * 60 * 60 * 1000).toLocaleString(),
          status: 'Ready'
        };
        setSocialDrafts(prev => [newDraft, ...prev]);
        toast.success(`AI Post generated for ${note.title}!`);
      } else {
        toast.error("Could not generate AI content or extract PDF page.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Social Generation failed.");
    } finally {
      setIsGeneratingSocial(false);
    }
  };

  const dashboardStats = useMemo(() => {
    const approvedTrans = transactions.filter(t => t.status === TransactionStatus.APPROVED);
    const totalEarnings = approvedTrans.reduce((sum, t) => sum + t.amount, 0);
    const totalSales = approvedTrans.length;

    // View analysis
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dailyViews = views.filter(v => v.timestamp?.toDate() > dayAgo).length;
    const weeklyViews = views.filter(v => v.timestamp?.toDate() > weekAgo).length;
    const monthlyViews = views.filter(v => v.timestamp?.toDate() > monthAgo).length;

    // Views per note
    const noteViews = notes.map(note => ({
      name: note.title.substring(0, 15) + '...',
      views: views.filter(v => v.noteId === note.id).length,
      sales: approvedTrans.filter(t => t.items?.some(it => it.id === note.id) || t.noteId === note.id).length
    })).sort((a, b) => b.views - a.views);

    // Earnings over time (last 7 days)
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const dayEarnings = approvedTrans.filter(t => t.createdAt?.toDate().toDateString() === d.toDateString()).reduce((sum, t) => sum + t.amount, 0);
      const dayViews = views.filter(v => v.timestamp?.toDate().toDateString() === d.toDateString()).length;
      return { name: dateStr, earnings: dayEarnings, views: dayViews, date: d };
    }).reverse();

    return {
      totalEarnings,
      totalSales,
      dailyViews,
      weeklyViews,
      monthlyViews,
      noteViews,
      last7Days
    };
  }, [transactions, views, notes]);

  const handleDelete = async (noteId: string) => {
    if (confirm("Are you sure?")) {
      try {
        await deleteDoc(doc(db, 'notes', noteId));
        toast.success("Note deleted successfully.");
        fetchNotes();
      } catch (err) {
        toast.error("Failed to delete note.");
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-red-500 font-bold">
        Access Denied. You are not an admin.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2 font-bold text-xs uppercase tracking-widest transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </button>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">Admin Dashboard</h1>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl transition-colors">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'dashboard' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'transactions' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'notes' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Manage Notes
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'media' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Media Hub
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10"
          >
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-xl group">
                <div className="bg-blue-50 dark:bg-blue-900/20 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                   <DollarSign className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Revenue</p>
                <h3 className="text-4xl font-black text-gray-900 dark:text-white transition-colors">₹{dashboardStats.totalEarnings}</h3>
              </div>

              <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-xl group">
                <div className="bg-green-50 dark:bg-green-900/20 w-12 h-12 rounded-2xl flex items-center justify-center text-green-600 dark:text-green-400 mb-6 group-hover:scale-110 transition-transform">
                   <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Sales</p>
                <h3 className="text-4xl font-black text-gray-900 dark:text-white transition-colors">{dashboardStats.totalSales}</h3>
              </div>

              <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-xl group">
                <div className="bg-purple-50 dark:bg-purple-900/20 w-12 h-12 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                   <Eye className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Views</p>
                <h3 className="text-4xl font-black text-gray-900 dark:text-white transition-colors">{views.length}</h3>
              </div>

              <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-xl group">
                <div className="bg-orange-50 dark:bg-orange-900/20 w-12 h-12 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400 mb-6 group-hover:scale-110 transition-transform">
                   <Clock className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Today's Views</p>
                <h3 className="text-4xl font-black text-gray-900 dark:text-white transition-colors">{dashboardStats.dailyViews}</h3>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid lg:grid-cols-2 gap-10">
              <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-800 transition-colors">
                <h3 className="text-xl font-black mb-8 dark:text-white">Earnings & Views (Last 7 Days)</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboardStats.last7Days}>
                      <defs>
                        <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          fontWeight: 700 
                        }} 
                      />
                      <Area yAxisId="left" type="monotone" dataKey="earnings" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorEarnings)" />
                      <Area yAxisId="right" type="monotone" dataKey="views" stroke="#ef4444" strokeWidth={3} fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-800 transition-colors">
                <h3 className="text-xl font-black mb-8 dark:text-white">Note Popularity (Views vs Sales)</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardStats.noteViews.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="views" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="sales" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* In-depth Analytics Table */}
            <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] border border-gray-100 dark:border-gray-800 transition-colors overflow-hidden">
               <h3 className="text-2xl font-black mb-8 dark:text-white capitalize">PDF Performance Analysis</h3>
               <div className="overflow-x-auto">
                 <table className="w-full">
                   <thead>
                     <tr className="text-left border-b border-gray-50 dark:border-gray-800">
                        <th className="pb-4 text-xs font-black text-gray-400 uppercase tracking-widest">PDF Title</th>
                        <th className="pb-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Total Views</th>
                        <th className="pb-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Sales</th>
                        <th className="pb-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Conversion</th>
                        <th className="pb-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Revenue</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                     {notes.map(note => {
                       const vCount = views.filter(v => v.noteId === note.id).length;
                       const sCount = transactions.filter(t => (t.status === TransactionStatus.APPROVED) && (t.items?.some(it => it.id === note.id) || t.noteId === note.id)).length;
                       const convRate = vCount > 0 ? ((sCount / vCount) * 100).toFixed(1) : '0';
                       const revenue = sCount * note.price;
                       
                       return (
                         <tr key={note.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="py-6 pr-4">
                               <div className="flex items-center gap-3">
                                  <img src={note.thumbnailUrl} className="w-10 h-10 rounded-lg object-cover" />
                                  <span className="font-bold text-gray-900 dark:text-white line-clamp-1">{note.title}</span>
                               </div>
                            </td>
                            <td className="py-6 text-center font-bold text-blue-600 dark:text-blue-400">{vCount}</td>
                            <td className="py-6 text-center font-bold text-gray-900 dark:text-white">{sCount}</td>
                            <td className="py-6 text-center">
                               <span className={`px-3 py-1 rounded-full text-[10px] font-black ${Number(convRate) > 5 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {convRate}%
                               </span>
                            </td>
                            <td className="py-6 text-right font-black text-gray-900 dark:text-white">₹{revenue}</td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
            </div>
          </motion.div>
        ) : activeTab === 'media' ? (
          <motion.div
            key="media"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-12"
          >
            {/* Media Hub Header */}
            <div className="bg-gray-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-1/2 h-full bg-red-600/20 blur-[120px]" />
               <div className="relative flex flex-col lg:flex-row items-center justify-between gap-10">
                  <div className="max-w-xl text-center lg:text-left">
                     <div className="inline-flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase mb-4">
                        <Youtube className="w-3 h-3" /> YouTube Media Integration
                     </div>
                     <h2 className="text-3xl md:text-4xl font-black mb-4">Media Automation</h2>
                     <p className="text-gray-400 font-medium leading-relaxed mb-8">
                        Connect your YouTube channel to enable automatic video uploads and community posts. 
                        AI will handle the metadata generation and PDF page extraction.
                     </p>
                     
                     <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-4">
                        <button 
                           onClick={() => {
                              setIsChannelConnected(!isChannelConnected);
                              toast.success(isChannelConnected ? "Channel Disconnected" : "YouTube Channel Connected!");
                           }}
                           className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 ${
                              isChannelConnected 
                                 ? 'bg-green-600 text-white' 
                                 : 'bg-white text-gray-900 hover:bg-gray-100'
                           }`}
                        >
                           <Youtube className="w-5 h-5 flex-shrink-0" />
                           <span className="truncate">{isChannelConnected ? 'Channel Connected' : 'Connect YouTube Channel'}</span>
                        </button>
                        
                        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3 bg-white/5 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/10">
                           <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest leading-none truncate">Auto-Post PDF Uploads</span>
                           <button 
                              onClick={() => setAutoPostEnabled(!autoPostEnabled)}
                              className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${autoPostEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}
                           >
                              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${autoPostEnabled ? 'left-7' : 'left-1'}`} />
                           </button>
                        </div>
                     </div>
                  </div>
                  <div className="w-full lg:w-auto bg-white/10 backdrop-blur-xl p-8 rounded-[2rem] border border-white/20 text-center flex flex-col justify-center">
                     <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{isChannelConnected ? 'Subscribers' : 'Pending Jobs'}</p>
                     <h3 className="text-4xl md:text-5xl font-black">{isChannelConnected ? '12.4K' : socialDrafts.length}</h3>
                  </div>
               </div>
            </div>

            {isChannelConnected && (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                     <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Channel Name</p>
                     <h4 className="text-xl font-bold dark:text-white">Nitin Study Hub</h4>
                  </div>
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                     <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Total Uploads</p>
                     <h4 className="text-xl font-bold dark:text-white">248 Videos</h4>
                  </div>
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                     <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Last Sync</p>
                     <h4 className="text-xl font-bold dark:text-white">2 mins ago</h4>
                  </div>
               </div>
            )}

            <div className="grid lg:grid-cols-12 gap-10 min-w-0">
               {/* Note Selection */}
               <div className="lg:col-span-4 space-y-6 min-w-0">
                  <h3 className="text-xl font-black dark:text-white px-2">1. Select Note to Promote</h3>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                     {notes.map(note => (
                        <div key={note.id} className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between group hover:shadow-lg transition-all">
                           <div className="flex items-center gap-3">
                              <img src={note.thumbnailUrl} className="w-12 h-12 rounded-xl object-cover" />
                              <div>
                                 <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{note.title}</h4>
                                 <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{note.category}</p>
                              </div>
                           </div>
                           <button 
                              disabled={isGeneratingSocial}
                              onClick={() => generateSocialPost(note)}
                              className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                           >
                              {isGeneratingSocial ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                           </button>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Drafts Feed */}
               <div className="lg:col-span-8 space-y-6 min-w-0">
                  <h3 className="text-xl font-black dark:text-white px-2">2. AI Generated Post Drafts</h3>
                  {socialDrafts.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 p-20 rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center">
                       <Youtube className="w-16 h-16 text-gray-100 dark:text-gray-800 mb-6" />
                       <h4 className="text-xl font-bold text-gray-400 mb-2">No drafts generated yet.</h4>
                       <p className="text-sm text-gray-500 max-w-xs">Click the sparkles icon on any note to have AI generate a YouTube blast for it.</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                       {socialDrafts.map((draft, idx) => (
                          <motion.div 
                             key={draft.id + idx}
                             initial={{ opacity: 0, x: 20 }}
                             animate={{ opacity: 1, x: 0 }}
                             className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm"
                          >
                             <div className="flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x divide-gray-100 dark:divide-gray-800">
                                {/* Preview Image (Extracted PDF Page) */}
                                <div className="xl:w-1/3 bg-gray-50 dark:bg-gray-950 p-6 flex flex-col">
                                   <p className="text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest">Extracted PDF Preview</p>
                                   <div className="relative aspect-[3/4] mb-4 shadow-2xl rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
                                      <img src={draft.image} className="w-full h-full object-contain" />
                                      <div className="absolute inset-0 bg-blue-600/5" />
                                   </div>
                                   <button className="mt-auto w-full py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs font-bold rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-colors">
                                      Download Post Image
                                   </button>
                                </div>

                                {/* Content Details */}
                                <div className="xl:w-2/3 p-4 sm:p-8 min-w-0">
                                   <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                                      <div className="min-w-0">
                                         <h4 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-1 truncate">{draft.aiContent.postTitle}</h4>
                                         <p className="text-xs font-bold text-gray-400 uppercase tracking-widest truncate">Post for: {draft.title}</p>
                                      </div>
                                      <div className="sm:text-right flex-shrink-0">
                                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Schedule</p>
                                         <p className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-600/10 px-3 py-1 rounded-full inline-block">+6 hrs Repost</p>
                                      </div>
                                   </div>

                                   <div className="bg-gray-50 dark:bg-gray-950/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
                                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-medium">
                                         {draft.aiContent.description}
                                      </p>
                                   </div>

                                   <div className="flex flex-wrap gap-2 mb-8">
                                      {draft.aiContent.tags.map((tag: any) => (
                                         <span key={tag} className="text-[10px] font-black text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                                            #{tag}
                                         </span>
                                      ))}
                                   </div>

                                   <div className="flex items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
                                      <button 
                                        onClick={() => window.open('https://youtube.com/create', '_blank')}
                                        className="flex-grow w-full sm:w-auto py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-200 dark:shadow-none hover:bg-red-700 flex items-center justify-center gap-2"
                                      >
                                         <Youtube className="w-5 h-5 flex-shrink-0" /> Push to YouTube
                                      </button>
                                      <button 
                                        onClick={() => setSocialDrafts(prev => prev.filter(d => d.id !== draft.id))}
                                        className="p-4 w-full sm:w-auto bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-2xl hover:text-red-500 transition-colors flex items-center justify-center"
                                      >
                                         <Trash2 className="w-5 h-5" />
                                      </button>
                                   </div>
                                </div>
                             </div>
                          </motion.div>
                       ))}
                    </div>
                  )}
               </div>
            </div>
          </motion.div>
        ) : activeTab === 'transactions' ? (
          <motion.div
            key="transactions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black dark:text-white transition-colors">Recent Transactions</h2>
              <button 
                onClick={fetchTransactions}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-widest"
              >
                Refresh List
              </button>
            </div>
            
            <div className="grid gap-4">
              {transactions.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 p-20 rounded-[3rem] text-center border border-gray-100 dark:border-gray-800 italic text-gray-400 font-medium transition-colors">
                  No transactions found yet.
                </div>
              ) : (
                transactions.map(trans => (
                  <div key={trans.id} className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-6 flex flex-col md:flex-row items-center gap-8 hover:shadow-lg transition-all">
                    <div className="flex-grow flex items-center gap-6">
                      <div className={`p-4 rounded-2xl shrink-0 ${
                        trans.status === TransactionStatus.APPROVED ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                        trans.status === TransactionStatus.REJECTED ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                        'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      }`}>
                        <DollarSign className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-lg text-gray-900 dark:text-white transition-colors">{trans.userEmail}</h4>
                          <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full transition-colors ${
                            trans.status === TransactionStatus.APPROVED ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            trans.status === TransactionStatus.REJECTED ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                            'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          }`}>
                            {trans.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                          {trans.items ? (
                            <span className="flex flex-wrap gap-1">
                              {trans.items.map((it, idx) => (
                                <span key={it.id} className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-[10px] dark:text-gray-300">
                                  {it.title}{idx < trans.items!.length - 1 ? '' : ''}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <>Purchased Note ID: <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{trans.noteId}</span></>
                          )}
                          <span className="text-blue-600 dark:text-blue-400 font-bold ml-1">₹{trans.amount}</span>
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-2">
                          <Clock className="w-3 h-3" /> {trans.createdAt?.toDate().toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {trans.screenshotUrl && (
                        <a
                          href={trans.screenshotUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-sm"
                        >
                          <Eye className="w-4 h-4" /> View Screenshot
                        </a>
                      )}
                      
                      {trans.status === TransactionStatus.VERIFYING && (
                        <>
                          <button
                            onClick={() => handleApprove(trans.id)}
                            className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-green-700 transition-all flex items-center gap-2 shadow-lg shadow-green-200 dark:shadow-none"
                          >
                            <Check className="w-4 h-4" /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(trans.id)}
                            className="bg-red-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg shadow-red-200 dark:shadow-none"
                          >
                            <CloseIcon className="w-4 h-4" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="notes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid lg:grid-cols-2 gap-12"
          >
            {/* Upload Form */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-800 transition-colors">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black flex items-center gap-3 dark:text-white">
                  {editingNoteId ? <Pencil className="w-6 h-6 text-blue-600" /> : <Plus className="w-6 h-6 text-blue-600" />}
                  {editingNoteId ? 'Edit Note' : 'Add New Course/Note'}
                </h2>
                {editingNoteId && (
                  <button 
                    onClick={handleCancelEdit}
                    className="text-xs font-bold text-red-500 uppercase tracking-widest hover:underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleUpload} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Note Title</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl outline-none focus:border-blue-600 transition-all font-medium dark:text-white"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Description</label>
                  <textarea
                    required
                    rows={3}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl outline-none focus:border-blue-600 transition-all font-medium dark:text-white"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Price (₹)</label>
                    <input
                      required
                      type="number"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl outline-none focus:border-blue-600 transition-all font-medium font-mono dark:text-white"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                       <label className="block text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Category</label>
                       <button 
                         type="button"
                         onClick={() => setIsCustomCategory(!isCustomCategory)}
                         className="text-[10px] font-black text-blue-600 dark:text-blue-400 hover:text-black dark:hover:text-white uppercase tracking-widest"
                       >
                         {isCustomCategory ? 'Select Existing' : '+ Add New'}
                       </button>
                    </div>
                    {isCustomCategory ? (
                      <input
                        required
                        type="text"
                        placeholder="Enter category name"
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold dark:text-white"
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                      />
                    ) : (
                      <select
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold dark:text-white"
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                      >
                        {/* Dynamic categories from notes + defaults */}
                        {Array.from(new Set(['Math', 'Physics', 'Chemistry', 'Biology', 'Computer Science', ...notes.map(n => n.category)])).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 font-black">Tags (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="E.g. Algebra, Calculus, Class 12"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl outline-none focus:border-blue-600 transition-all font-medium dark:text-white"
                    value={formData.tags}
                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Simulated Sold Count</label>
                  <input
                    required
                    type="number"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl outline-none focus:border-blue-600 transition-all font-medium font-mono dark:text-white"
                    value={formData.soldCount}
                    onChange={e => setFormData({ ...formData, soldCount: Number(e.target.value) })}
                  />
                  <p className="text-[10px] text-gray-400 mt-1 italic">Enter a number to simulate real-world sales metrics.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">PDF File</label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">
                      <FileText className={`w-8 h-8 ${pdfFile ? 'text-green-500' : 'text-gray-400 dark:text-gray-600'}`} />
                      <span className="text-[10px] mt-1 text-gray-500 font-bold max-w-[100px] truncate">{pdfFile ? pdfFile.name : (editingNoteId ? 'Change PDF' : 'Select PDF')}</span>
                      <input type="file" accept=".pdf" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Thumbnail</label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">
                      <Upload className={`w-8 h-8 ${thumbFile ? 'text-green-500' : 'text-gray-400 dark:text-gray-600'}`} />
                      <span className="text-[10px] mt-1 text-gray-500 font-bold max-w-[100px] truncate">{thumbFile ? thumbFile.name : (editingNoteId ? 'Change Image' : 'Select Image')}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => setThumbFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                </div>

                <button
                  disabled={isUploading}
                  className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 dark:shadow-none"
                >
                  {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                  {isUploading ? (editingNoteId ? 'Updating...' : 'Uploading...') : (editingNoteId ? 'Update Note' : 'Publish to Store')}
                </button>
              </form>
            </div>

            {/* Existing Content */}
            <div>
              <h2 className="text-2xl font-black mb-8 dark:text-white transition-colors">Manage Inventory ({notes.length})</h2>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {notes.map(note => (
                  <div key={note.id} className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 hover:shadow-lg transition-all">
                    <img src={note.thumbnailUrl} className="w-16 h-16 rounded-xl object-cover shadow-sm" />
                    <div className="flex-grow">
                      <h4 className="font-bold text-gray-900 dark:text-white transition-colors capitalize">{note.title}</h4>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest transition-colors">
                        {note.category} • ₹{note.price} • {note.soldCount || 0} Sold
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditStart(note)}
                        className="p-3 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 transition-all"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-3 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-600 hover:text-white dark:hover:bg-red-500 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
