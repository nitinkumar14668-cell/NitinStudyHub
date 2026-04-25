import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Loader2, Download, ShoppingBag } from 'lucide-react';
import { Note } from '../types';
import { extractFirstPageAsImage } from '../lib/pdfHelper';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  onBuy: (note: Note) => void;
  onAddToCart: (note: Note) => void;
  isInCart: boolean;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, note, onBuy, onAddToCart, isInCart }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && note) {
      setLoading(true);
      setPreviewImage(null);
      extractFirstPageAsImage(note.pdfUrl).then(img => {
        setPreviewImage(img);
        setLoading(false);
      });
    }
  }, [isOpen, note]);

  if (!isOpen || !note) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative bg-white dark:bg-gray-900 w-full max-w-5xl h-[85vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row border border-white/20 dark:border-white/10"
        >
          {/* Close button */}
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 p-2.5 rounded-full bg-black/10 hover:bg-black/20 dark:bg-black/40 dark:hover:bg-black/60 text-gray-800 dark:text-gray-200 transition-colors z-10 backdrop-blur-md"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Preview Section - Left Side */}
          <div className="w-full lg:w-3/5 bg-gray-100 dark:bg-[#0a0a0a] relative flex items-center justify-center h-[50vh] lg:h-full overflow-hidden border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800">
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-500" />
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Generating Preview...</p>
              </div>
            ) : previewImage ? (
              <div className="w-full h-full p-4 lg:p-8 flex items-center justify-center bg-gray-200 dark:bg-[#111]">
                 <img src={previewImage} alt={`${note.title} preview`} className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-sm" />
              </div>
            ) : (
              <div className="relative w-full h-full">
                <img src={note.thumbnailUrl} alt={note.title} className="w-full h-full object-cover opacity-30 blur-xl" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-black/40 backdrop-blur-sm">
                  <ExternalLink className="w-14 h-14 text-white/50 mb-6" />
                  <p className="text-white font-bold text-xl mb-2">Preview Unavailable</p>
                  <p className="text-white/70 text-sm max-w-sm">The PDF requires secure processing to be previewed. You can access it fully upon purchase.</p>
                </div>
              </div>
            )}
          </div>

          {/* Details Section - Right Side */}
          <div className="w-full lg:w-2/5 p-8 lg:p-12 flex flex-col h-[35vh] lg:h-full overflow-y-auto bg-white dark:bg-gray-900">
            <div className="mb-8">
              <span className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                {note.category}
              </span>
              <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tight leading-tight">{note.title}</h2>
              <div className="w-12 h-1 bg-blue-600 rounded-full mb-6"></div>
              <p className="text-gray-600 dark:text-gray-400 text-sm lg:text-base leading-relaxed">{note.description}</p>
            </div>
            
            <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-xs">Price</span>
                <span className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white">₹{note.price}</span>
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    onClose();
                    onBuy(note);
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-600/20"
                >
                  <Download className="w-5 h-5" />
                  Buy Now
                </button>
                
                <button
                  onClick={() => {
                    onAddToCart(note);
                  }}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all border-2 active:scale-[0.98] ${
                    isInCart 
                    ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500 bg-blue-50/50 dark:bg-blue-900/10' 
                    : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <ShoppingBag className={`w-5 h-5 ${isInCart ? 'fill-current' : ''}`} />
                  {isInCart ? 'Added to Cart' : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PreviewModal;
