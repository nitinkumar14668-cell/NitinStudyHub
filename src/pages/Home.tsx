import { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Note } from '../types';
import { db, loginWithGoogle } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import NoteCard from '../components/NoteCard';
import PaymentModal from '../components/PaymentModal';
import PreviewModal from '../components/PreviewModal';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, ArrowRight, Sparkles, ShoppingBag, X, Youtube } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../lib/CartContext';
import { Link } from 'react-router-dom';

interface HomeProps {
  user: User | null;
}

const SAMPLE_NOTES: Note[] = [
  {
    id: 'note-1',
    title: 'Advanced Mathematics: Vol 1',
    description: 'Complete guide to Calculus and Linear Algebra for undergraduate engineering students.',
    price: 49,
    pdfUrl: 'https://example.com/notes.pdf',
    thumbnailUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=1974&ixlib=rb-4.0.3',
    category: 'Math'
  },
  {
    id: 'note-2',
    title: 'Physics for IIT-JEE',
    description: 'Shortcut formulas and concepts for Thermodynamics, Optics and Electromagnetism.',
    price: 99,
    pdfUrl: 'https://example.com/physics.pdf',
    thumbnailUrl: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&q=80&w=2074&ixlib=rb-4.0.3',
    category: 'Physics'
  },
  {
    id: 'note-3',
    title: 'Modern Organic Chemistry',
    description: 'Reaction mechanisms and naming conventions for secondary education.',
    price: 79,
    pdfUrl: 'https://example.com/chem.pdf',
    thumbnailUrl: 'https://images.unsplash.com/photo-1532187875605-1ef6ec82a14d?auto=format&fit=crop&q=80&w=2070&ixlib=rb-4.0.3',
    category: 'Chemistry'
  }
];

export default function Home({ user }: HomeProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [checkoutNotes, setCheckoutNotes] = useState<Note[]>([]);
  const [previewNote, setPreviewNote] = useState<Note | null>(null);
  const { cart, addToCart, isInCart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'notes'));
        if (!snapshot.empty) {
          setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)));
        } else {
          setNotes(SAMPLE_NOTES); // Fallback if DB is empty
        }
      } catch (err) {
        console.error("Error fetching notes:", err);
        setNotes(SAMPLE_NOTES);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(['All', ...notes.map(n => n.category)]));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
                           n.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'All' || n.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [notes, search, category]);

  const handleBuy = async (note: Note) => {
    console.log('Buy button clicked for:', note.id);
    if (!user) {
      toast("Please login to proceed!", { icon: '👋', duration: 2000 });
      localStorage.setItem('pendingBuyNoteId', note.id);
      
      const loginToast = toast.loading("Opening login...");
      try {
        await loginWithGoogle();
        toast.success("Welcome back!", { id: loginToast });
      } catch (err: any) {
        console.error('Buy-init login failed:', err);
        if (err.code === 'auth/popup-blocked') {
          toast.error("Popup blocked! Use Chrome/Safari directly.", { id: loginToast });
        } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
          toast.error("Login failed. Try again.", { id: loginToast });
        } else {
          toast.dismiss(loginToast);
        }
      }
      return;
    }
    setCheckoutNotes([note]);
  };

  const handleCheckoutCart = () => {
    if (cart.length === 0) return;
    if (!user) {
      toast("Login to purchase your cart!", { icon: '👋' });
      return;
    }
    setCheckoutNotes(cart);
    setIsCartOpen(false);
  };

  // Check for pending buy action after a redirect/login
  useEffect(() => {
    if (user && notes.length > 0) {
      const pendingId = localStorage.getItem('pendingBuyNoteId');
      if (pendingId) {
        const note = notes.find(n => n.id === pendingId);
        if (note) {
          setCheckoutNotes([note]);
          toast.success(`Resuming purchase: ${note.title}`, { duration: 3000 });
        }
        localStorage.removeItem('pendingBuyNoteId');
      }
    }
  }, [user, notes]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
    >
      {/* Hero Section */}
      <div className="mb-20 text-center relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-100/50 dark:bg-blue-900/20 blur-[100px] -z-10 rounded-full"
        />
        <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 transition-colors">
          <Sparkles className="w-3.5 h-3.5" />
          The Ultimate Student Resource
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tight mb-8 leading-[0.9]">
          Unlock Your <span className="text-blue-600 dark:text-blue-500">Full Academic</span> Potential.
        </h1>
        <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed px-4">
          Premium, handwritten and structured notes from top educators. <br className="hidden md:block" /> Get instant access after a simple verification.
        </p>
        
        <div className="max-w-xl mx-auto relative group px-4">
          <div className="absolute inset-0 bg-blue-600/10 blur-xl group-hover:bg-blue-600/20 transition-all rounded-2xl" />
          <div className="relative flex items-center bg-white dark:bg-gray-800 p-1.5 sm:p-2 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 transition-colors">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 ml-3 sm:ml-4" />
            <input
              type="text"
              placeholder="Search by subject, chapter or topic..."
              className="w-full px-2 sm:px-4 py-2 sm:py-3 bg-transparent outline-none text-sm sm:text-base text-gray-700 dark:text-gray-200 font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="bg-gray-900 dark:bg-blue-600 text-white px-4 sm:px-8 py-2 sm:py-3 rounded-xl text-sm sm:text-base font-bold hover:bg-blue-600 dark:hover:bg-blue-500 transition-all transition-all shrink-0">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Featured Sections */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-4">
          Available Notes
          <span className="text-sm font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{filteredNotes.length} Items</span>
        </h2>
        
        <div className="flex items-center gap-4 overflow-x-auto pb-2 w-full md:w-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-6 py-2 rounded-full border text-sm font-bold whitespace-nowrap transition-all ${
                category === cat 
                  ? 'bg-gray-900 dark:bg-blue-600 text-white border-gray-900 dark:border-blue-600 shadow-lg' 
                  : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-800 hover:border-gray-900 dark:hover:border-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
          <button className="p-2 border border-gray-200 dark:border-gray-800 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
            <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-32">
        <AnimatePresence>
          {filteredNotes.map((note) => (
            <NoteCard 
              key={note.id} 
              note={note} 
              onBuy={handleBuy} 
              onAddToCart={addToCart}
              isInCart={!!cart.find(n => n.id === note.id)}
              onPreview={setPreviewNote}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Video CTA Section */}
      <div className="mb-32">
        <div className="bg-red-50 dark:bg-red-900/10 rounded-[4rem] p-12 lg:p-20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/5 blur-[100px] -z-10 group-hover:scale-110 transition-transform duration-700" />
          <div className="relative flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 space-y-8">
              <div className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                <Youtube className="w-4 h-4" /> New: Visual Learning
              </div>
              <h2 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-tight">
                Master Subjects with <span className="text-red-600">Video Lectures.</span>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                Don't just read—watch and learn. We've curated the best educational content from across YouTube to complement your study notes. High-quality lectures for JEE, NEET, and Board Exams.
              </p>
              <Link 
                to="/videos"
                className="inline-flex items-center gap-3 bg-gray-900 dark:bg-red-600 text-white px-10 py-5 rounded-[2rem] font-bold hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-red-600/20"
              >
                Explore Video Hub <ArrowRight className="w-6 h-6" />
              </Link>
            </div>
            <div className="lg:w-1/2 grid grid-cols-2 gap-4">
               <div className="space-y-4 translate-y-8">
                  <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-3xl overflow-hidden shadow-lg transform -rotate-2">
                     <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=2070" className="w-full h-full object-cover opacity-60" />
                  </div>
                  <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-3xl overflow-hidden shadow-lg transform rotate-2">
                     <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=2071" className="w-full h-full object-cover opacity-60" />
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-3xl overflow-hidden shadow-lg transform rotate-1">
                     <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=2070" className="w-full h-full object-cover opacity-60" />
                  </div>
                  <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-3xl overflow-hidden shadow-lg transform -rotate-1">
                     <img src="https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=1974" className="w-full h-full object-cover opacity-60" />
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cart Floating Button */}
      {cart.length > 0 && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-8 right-8 z-40 bg-blue-600 text-white p-6 rounded-full shadow-2xl flex items-center gap-3 group"
        >
          <div className="relative">
            <ShoppingBag className="w-6 h-6" />
            <span className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-4 border-blue-600 group-hover:scale-110 transition-transform">
              {cart.length}
            </span>
          </div>
          <span className="font-black text-sm uppercase tracking-widest pr-2">Cart</span>
        </motion.button>
      )}

      {/* Cart Sidebar/Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-900 z-50 shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Your Cart</h2>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <Filter className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-8 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-20">
                    <ShoppingBag className="w-16 h-16 text-gray-200 dark:text-gray-800 mx-auto mb-4" />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Cart is empty</p>
                  </div>
                ) : (
                  cart.map(note => (
                    <div key={note.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl flex items-center gap-4 relative group transition-colors">
                      <img src={note.thumbnailUrl} className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
                      <div className="flex-grow">
                        <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{note.title}</h4>
                        <p className="text-blue-600 font-black">₹{note.price}</p>
                      </div>
                      <button 
                         onClick={() => addToCart(note)}
                         className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-8 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-gray-500 font-bold uppercase tracking-widest text-xs">Total Amount</span>
                  <span className="text-3xl font-black text-gray-900 dark:text-white">₹{cart.reduce((sum, n) => sum + n.price, 0)}</span>
                </div>
                <button
                  disabled={cart.length === 0}
                  onClick={handleCheckoutCart}
                  className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  Checkout Now <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Trust Section */}
      <div className="bg-gray-900 rounded-[3rem] p-12 lg:p-20 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/20 blur-[120px]" />
        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-4xl md:text-5xl font-black leading-tight mb-8">
              Why choose NitinStudyHub?
            </h3>
            <ul className="space-y-6">
              {[
                { title: 'Verified Content', desc: 'Notes are curated and double-checked for accuracy.' },
                { title: 'Instant Download', desc: 'Secure payment with immediate file access.' },
                { title: 'Lifetime Access', desc: 'The link is yours to open, then the file is yours forever.' }
              ].map((item, idx) => (
                <li key={idx} className="flex gap-4">
                  <div className="bg-blue-600 w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 font-bold italic text-xs text-white">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-1">{item.title}</h4>
                    <p className="text-gray-400">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-8 rounded-3xl border border-white/10">
            <h4 className="text-2xl font-bold mb-6">Request Specific Notes</h4>
            <p className="text-gray-300 mb-8 font-medium">Can't find what you need? We create custom notes on demand for various competitive exams.</p>
            <button className="w-full bg-white text-gray-900 font-bold py-4 rounded-xl flex items-center justify-center gap-2 group hover:bg-blue-600 hover:text-white transition-all">
              Contact Support <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {previewNote && (
          <PreviewModal
            note={previewNote}
            onClose={() => setPreviewNote(null)}
            onBuy={handleBuy}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {checkoutNotes.length > 0 && (
          <PaymentModal
            notes={checkoutNotes}
            onClose={() => setCheckoutNotes([])}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
