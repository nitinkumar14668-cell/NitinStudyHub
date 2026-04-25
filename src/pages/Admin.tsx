import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, CheckCircle2, Loader2, Plus, Trash2, ArrowLeft, Clock, Check, X as CloseIcon, Eye, DollarSign, Pencil } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'notes' | 'transactions'>('transactions');
  const [isUploading, setIsUploading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
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
        await addDoc(collection(db, 'notes'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        toast.success("Note uploaded successfully!");
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
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'transactions' ? (
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
