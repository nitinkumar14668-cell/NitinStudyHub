import React from 'react';
import { Note } from '../types';
import { motion } from 'motion/react';
import { Download, Star, Clock, ShoppingBag } from 'lucide-react';
import { logView } from '../lib/firebase';

interface NoteCardProps {
  note: Note;
  onBuy: (note: Note) => void;
  onAddToCart: (note: Note) => void;
  isInCart: boolean;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onBuy, onAddToCart, isInCart }) => {
  const handleClick = () => {
    logView(note.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      onClick={handleClick}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group cursor-pointer"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-100 dark:bg-gray-800">
        <img
          src={note.thumbnailUrl}
          alt={note.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 shadow-sm">
          {note.category}
        </div>
      </div>

      <div className="p-5 flex-grow flex flex-col">
        <div className="flex items-center gap-1 text-yellow-400 mb-2">
          <Star className="w-4 h-4 fill-current" />
          <Star className="w-4 h-4 fill-current" />
          <Star className="w-4 h-4 fill-current" />
          <Star className="w-4 h-4 fill-current" />
          <Star className="w-4 h-4 fill-current" />
          <span className="text-gray-400 text-xs ml-1">(48)</span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {note.title}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2 flex-grow">
          {note.description}
        </p>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50 dark:border-gray-800">
          <div>
            <span className="text-xs text-gray-400 block uppercase tracking-wider font-semibold">Price</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white">₹{note.price}</span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                onAddToCart(note);
              }}
              className={`p-2.5 rounded-xl transition-all shadow-lg ${
                isInCart 
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800' 
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              title={isInCart ? "Remove from Cart" : "Add to Cart"}
            >
              <ShoppingBag className={`w-5 h-5 ${isInCart ? 'fill-blue-600 dark:fill-blue-400' : ''}`} />
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                onBuy(note);
              }}
              className="flex items-center gap-2 bg-gray-900 dark:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-600 dark:hover:bg-blue-700 active:bg-blue-700 transition-all shadow-lg shadow-gray-200 dark:shadow-none"
            >
              <Download className="w-4 h-4" />
              Buy Now
            </button>
          </div>
        </div>
      </div>
      
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Updated 2d ago</span>
        <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {note.soldCount || '0'} Sold</span>
      </div>
    </motion.div>
  );
};

export default NoteCard;
