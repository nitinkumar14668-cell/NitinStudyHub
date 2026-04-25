import React from 'react';
import { Note } from '../types';
import { motion } from 'motion/react';
import { X, ExternalLink, Download, ShoppingBag } from 'lucide-react';
import { useCart } from '../lib/CartContext';

interface PreviewModalProps {
  note: Note;
  onClose: () => void;
  onBuy: (note: Note) => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ note, onClose, onBuy }) => {
  const { cart, addToCart } = useCart();
  const isInCart = !!cart.find(n => n.id === note.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl max-h-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row shadow-black/50"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-gray-900/10 hover:bg-gray-900/20 dark:bg-black/20 dark:hover:bg-black/40 rounded-full backdrop-blur-md transition-colors"
        >
          <X className="w-5 h-5 text-gray-900 dark:text-white" />
        </button>

        {/* Preview Section */}
        <div className="w-full md:w-3/5 bg-gray-100 dark:bg-gray-950 flex flex-col items-center justify-center relative overflow-hidden h-[40vh] md:h-[80vh]">
          {/* We use an iframe to show the PDF page 1, or fallback to an image if pdfUrl is empty */}
          {note.pdfUrl ? (
            <iframe
              src={`${note.pdfUrl}#page=1&toolbar=0&navpanes=0&scrollbar=0`}
              className="w-full h-full border-0 pointer-events-auto"
              title={`${note.title} preview`}
            />
          ) : (
            <img 
              src={note.thumbnailUrl} 
              alt={note.title}
              className="w-full h-full object-contain p-4"
            />
          )}
          
          <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.1)] pointer-events-none" />
          <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-bold text-gray-900 dark:text-white shadow-sm flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-blue-600" /> Preview Mode
          </div>
        </div>

        {/* Details Section */}
        <div className="w-full md:w-2/5 p-8 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800 overflow-y-auto max-h-[50vh] md:max-h-none">
          <div className="inline-block bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider mb-4 self-start">
            {note.category}
          </div>
          
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 leading-tight">
            {note.title}
          </h2>
          
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            {note.description}
          </p>
          
          <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800">
            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Price</span>
              <span className="text-4xl font-black text-gray-900 dark:text-white">₹{note.price}</span>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  onClose();
                  onBuy(note);
                }}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black transition-all shadow-lg shadow-blue-600/20"
              >
                <Download className="w-5 h-5" /> Buy Now to Read Full
              </button>
              
              <button
                onClick={() => addToCart(note)}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all border-2 ${
                  isInCart 
                  ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-500' 
                  : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <ShoppingBag className="w-5 h-5" /> 
                {isInCart ? 'Remove from Cart' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PreviewModal;
