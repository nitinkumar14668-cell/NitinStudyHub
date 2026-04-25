import { User, signOut } from 'firebase/auth';
import { auth, loginWithGoogle } from '../lib/firebase';
import { LogIn, LogOut, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold tracking-tight text-gray-900 font-sans">
              Nitin<span className="text-blue-600">StudyHub</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {user?.email === 'nitinkumar14668@gmail.com' && (
              <Link
                to="/admin"
                className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-black transition-all uppercase tracking-widest"
              >
                Admin Panel
              </Link>
            )}
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <img
                  src={user.photoURL || ''}
                  alt={user.displayName || ''}
                  className="w-8 h-8 rounded-full border border-gray-200"
                />
                <button
                  onClick={() => signOut(auth)}
                  className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={loginWithGoogle}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Login
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
