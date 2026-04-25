import { Note } from '../types';
import { motion } from 'motion/react';
import { Download, Star, Clock } from 'lucide-react';

interface NoteCardProps {
  note: Note;
  onBuy: (note: Note) => void;
}

export default function NoteCard({ note, onBuy }: NoteCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
        <img
          src={note.thumbnailUrl}
          alt={note.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-blue-600 shadow-sm">
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

        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
          {note.title}
        </h3>
        <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-grow">
          {note.description}
        </p>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
          <div>
            <span className="text-xs text-gray-400 block uppercase tracking-wider font-semibold">Price</span>
            <span className="text-2xl font-black text-gray-900">₹{note.price}</span>
          </div>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onBuy(note)}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-600 transition-colors active:shadow-inner shadow-lg shadow-gray-200"
          >
            <Download className="w-4 h-4" />
            Buy Now
          </motion.button>
        </div>
      </div>
      
      <div className="px-5 py-3 bg-gray-50 flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-gray-400">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Updated 2d ago</span>
        <span className="flex items-center gap-1"><Download className="w-3 h-3" /> 1.2k+ Sold</span>
      </div>
    </motion.div>
  );
}
