import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Upload, FileText, CheckCircle2, Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Note } from '../types';

interface AdminProps {
  user: User | null;
}

export default function Admin({ user }: AdminProps) {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
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
  }, [user, isAdmin]);

  const fetchNotes = async () => {
    const snapshot = await getDocs(collection(db, 'notes'));
    setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)));
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
      await addDoc(collection(db, 'notes'), {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t !== ''),
        pdfUrl,
        thumbnailUrl,
        createdAt: serverTimestamp()
      });

      alert("Note uploaded successfully!");
      setFormData({ title: '', description: '', price: 0, category: 'Math', tags: '' });
      setPdfFile(null);
      setThumbFile(null);
      fetchNotes();
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (confirm("Are you sure?")) {
      await deleteDoc(doc(db, 'notes', noteId));
      fetchNotes();
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
      <div className="flex items-center justify-between mb-12">
        <div>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-2 font-bold text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </button>
          <h1 className="text-4xl font-black text-gray-900">Admin Dashboard</h1>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
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

            <div>
              <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Tags (comma separated)</label>
              <input
                type="text"
                placeholder="Ex: JEE, Math, Notes, Class 12"
                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none focus:border-blue-600 transition-all font-medium"
                value={formData.tags}
                onChange={e => setFormData({ ...formData, tags: e.target.value })}
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
              disabled={isUploading}
              className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
            >
              {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
              {isUploading ? 'Uploading Data...' : 'Publish to Store'}
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
      </div>
    </div>
  );
}
