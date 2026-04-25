import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, CheckCircle2, Loader2, Plus, Trash2, ArrowLeft, Clock, Check, X as CloseIcon, Eye, DollarSign } from 'lucide-react';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, updateDoc, query, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Note, Transaction, TransactionStatus } from '../types';
import toast from 'react-hot-toast';

interface AdminProps {
  user: User | null;
}

export default function Admin({ user }: AdminProps) {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'notes' | 'transactions' | 'social'>('transactions');
  const [socialEnabled, setSocialEnabled] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>(['x']); // Just for demo
  const [isUploading, setIsUploading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    category: 'Math',
    tags: ''
  });

  const isAdmin = user?.email === 'nitinkumar14668@gmail.com';

  useEffect(() => {
    if (!isAdmin && user !== null) {
      navigate('/');
    }
    fetchNotes();
    fetchTransactions();
  }, [user, isAdmin]);

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
      const downloadToken = Math.random().toString(36).substring(2, 15);
      await updateDoc(doc(db, 'transactions', transId), {
        status: TransactionStatus.APPROVED,
        downloadToken,
        updatedAt: serverTimestamp()
      });
      toast.success("Transaction Approved!");
      fetchTransactions();
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
    if (!pdfFile || !thumbFile) {
      alert("Please select both PDF and Thumbnail files.");
      return;
    }

    setIsUploading(true);
    try {
      const id = Math.random().toString(36).substring(7);

      // 1. Upload PDF
      const pdfRef = ref(storage, `notes/${id}/file.pdf`);
      await uploadBytes(pdfRef, pdfFile);
      const pdfUrl = await getDownloadURL(pdfRef);

      // 2. Upload Thumbnail
      const thumbRef = ref(storage, `notes/${id}/thumb.jpg`);
      await uploadBytes(thumbRef, thumbFile);
      const thumbnailUrl = await getDownloadURL(thumbRef);

      // 3. Save Meta to Firestore
      const noteDoc = await addDoc(collection(db, 'notes'), {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t !== ''),
        pdfUrl,
        thumbnailUrl,
        createdAt: serverTimestamp()
      });

      // 4. Auto-Post Logic
      if (socialEnabled && connectedPlatforms.length > 0) {
        setIsPosting(true);
        try {
          await fetch('/api/admin/auto-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: formData.title,
              description: formData.description,
              url: `${window.location.origin}/`,
              platforms: connectedPlatforms
            })
          });
          toast.success("Auto-posted to social media!");
        } catch (err) {
          console.error("Auto-post failed:", err);
        } finally {
          setIsPosting(false);
        }
      }

      toast.success("Note uploaded successfully!");
      setFormData({ title: '', description: '', price: 0, category: 'Math', tags: '' });
      setPdfFile(null);
      setThumbFile(null);
      fetchNotes();
    } catch (err) {
      console.error(err);
      toast.error("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

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
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 mb-2 font-bold text-xs uppercase tracking-widest transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </button>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">Admin Dashboard</h1>
        </div>
        
        <div className="flex bg-gray-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'transactions' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'social' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Social
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'notes' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Manage Notes
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'social' ? (
          <motion.div
            key="social"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl">
              <h2 className="text-3xl font-black mb-4">Auto-Post Integration</h2>
              <p className="text-gray-500 font-medium mb-12 max-w-2xl leading-relaxed">
                Connect your social media accounts to automatically share new PDF uploads with your followers. 
                This uses our secure backend proxy to keep your API keys safe.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { id: 'x', name: 'X (Twitter)', icon: '🐦' },
                  { id: 'instagram', name: 'Instagram', icon: '📸' },
                  { id: 'youtube', name: 'YouTube', icon: '🎥' },
                  { id: 'pinterest', name: 'Pinterest', icon: '📌' },
                  { id: 'facebook', name: 'Facebook', icon: '👤' }
                ].map(plat => (
                  <div key={plat.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{plat.icon}</span>
                      <div>
                        <h4 className="font-bold text-gray-900">{plat.name}</h4>
                        <p className={`text-[10px] uppercase font-black tracking-widest ${connectedPlatforms.includes(plat.id) ? 'text-green-600' : 'text-gray-400'}`}>
                          {connectedPlatforms.includes(plat.id) ? 'Connected' : 'Disconnected'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (connectedPlatforms.includes(plat.id)) {
                          setConnectedPlatforms(prev => prev.filter(p => p !== plat.id));
                          toast(`${plat.name} disconnected`);
                        } else {
                          toast.promise(
                            fetch(`/api/auth/social-url/${plat.id}`).then(r => r.json()),
                            {
                              loading: 'Opening auth window...',
                              success: (data) => {
                                window.open(data.url, 'oauth', 'width=600,height=600');
                                setConnectedPlatforms(prev => [...prev, plat.id]);
                                return `${plat.name} connection initiated!`;
                              },
                              error: 'Failed to start auth'
                            }
                          );
                        }
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        connectedPlatforms.includes(plat.id) 
                        ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' 
                        : 'bg-blue-600 text-white hover:bg-black'
                      }`}
                    >
                      {connectedPlatforms.includes(plat.id) ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-12 p-8 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-1">Global Auto-Post Toggle</h4>
                  <p className="text-sm text-gray-500">When enabled, every new Note upload will be shared to all connected platforms.</p>
                </div>
                <button 
                  onClick={() => setSocialEnabled(!socialEnabled)}
                  className={`w-16 h-8 rounded-full transition-all relative ${socialEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${socialEnabled ? 'left-9' : 'left-1'}`} />
                </button>
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
              <h2 className="text-2xl font-black">Recent Transactions</h2>
              <button 
                onClick={fetchTransactions}
                className="text-xs font-bold text-blue-600 hover:underline uppercase tracking-widest"
              >
                Refresh List
              </button>
            </div>
            
            <div className="grid gap-4">
              {transactions.length === 0 ? (
                <div className="bg-white p-20 rounded-[3rem] text-center border border-gray-100 italic text-gray-400 font-medium">
                  No transactions found yet.
                </div>
              ) : (
                transactions.map(trans => (
                  <div key={trans.id} className="bg-white rounded-[2rem] border border-gray-100 p-6 flex flex-col md:flex-row items-center gap-8 hover:shadow-lg transition-all">
                    <div className="flex-grow flex items-center gap-6">
                      <div className={`p-4 rounded-2xl shrink-0 ${
                        trans.status === TransactionStatus.APPROVED ? 'bg-green-50 text-green-600' :
                        trans.status === TransactionStatus.REJECTED ? 'bg-red-50 text-red-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        <DollarSign className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-lg text-gray-900">{trans.userEmail}</h4>
                          <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                            trans.status === TransactionStatus.APPROVED ? 'bg-green-100 text-green-700' :
                            trans.status === TransactionStatus.REJECTED ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {trans.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">
                          Purchased Note ID: <span className="font-mono text-xs">{trans.noteId}</span> • 
                          <span className="text-blue-600 font-bold ml-1">₹{trans.amount}</span>
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1 mt-2">
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
                          className="flex items-center gap-2 bg-gray-50 text-gray-600 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all"
                        >
                          <Eye className="w-4 h-4" /> View Screenshot
                        </a>
                      )}
                      
                      {trans.status === TransactionStatus.VERIFYING && (
                        <>
                          <button
                            onClick={() => handleApprove(trans.id)}
                            className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-green-700 transition-all flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(trans.id)}
                            className="bg-red-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-700 transition-all flex items-center gap-2"
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
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
              <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                <Plus className="w-6 h-6 text-blue-600" /> Add New Course/Note
              </h2>

              <form onSubmit={handleUpload} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Note Title</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:border-blue-600 transition-all font-medium"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Description</label>
                  <textarea
                    required
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:border-blue-600 transition-all font-medium"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Price (₹)</label>
                    <input
                      required
                      type="number"
                      className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:border-blue-600 transition-all font-medium font-mono"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Category</label>
                    <select
                      className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option>Math</option>
                      <option>Physics</option>
                      <option>Chemistry</option>
                      <option>Biology</option>
                      <option>Computer Science</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">PDF File</label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-4 cursor-pointer hover:bg-blue-50 transition-all">
                      <FileText className={`w-8 h-8 ${pdfFile ? 'text-green-500' : 'text-gray-400'}`} />
                      <span className="text-[10px] mt-1 text-gray-500 font-bold max-w-[100px] truncate">{pdfFile ? pdfFile.name : 'Select PDF'}</span>
                      <input type="file" accept=".pdf" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Thumbnail</label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-4 cursor-pointer hover:bg-blue-50 transition-all">
                      <Upload className={`w-8 h-8 ${thumbFile ? 'text-green-500' : 'text-gray-400'}`} />
                      <span className="text-[10px] mt-1 text-gray-500 font-bold max-w-[100px] truncate">{thumbFile ? thumbFile.name : 'Select Image'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => setThumbFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                </div>

                <button
                  disabled={isUploading || isPosting}
                  className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                >
                  {isUploading || isPosting ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                  {isUploading ? 'Uploading Data...' : isPosting ? 'Auto-Posting...' : 'Publish to Store'}
                </button>
              </form>
            </div>

            {/* Existing Content */}
            <div>
              <h2 className="text-2xl font-black mb-8">Manage Inventory ({notes.length})</h2>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {notes.map(note => (
                  <div key={note.id} className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center gap-4 hover:shadow-lg transition-all">
                    <img src={note.thumbnailUrl} className="w-16 h-16 rounded-xl object-cover" />
                    <div className="flex-grow">
                      <h4 className="font-bold text-gray-900">{note.title}</h4>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{note.category} • ₹{note.price}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-3 text-red-500 bg-red-50 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
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
