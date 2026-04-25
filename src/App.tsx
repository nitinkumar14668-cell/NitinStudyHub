import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { auth } from './lib/firebase';
import Home from './pages/Home';
import Download from './pages/Download';
import Admin from './pages/Admin';
import Purchases from './pages/Purchases';
import Videos from './pages/Videos';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { ThemeProvider } from './lib/ThemeContext';
import { CartProvider } from './lib/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <ThemeProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen w-full overflow-x-hidden font-sans flex flex-col">
            <Toaster position="top-center" />
            <Navbar user={user} />
            <main className="flex-grow">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-grow flex items-center justify-center p-20"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="text-3xl font-black text-blue-600 dark:text-blue-400"
                    >
                      NitinStudyHub
                    </motion.div>
                  </motion.div>
                ) : (
                  <Routes>
                    <Route path="/" element={<Home user={user} />} />
                    <Route path="/download/:transactionId" element={<Download user={user} />} />
                    <Route path="/admin" element={<Admin user={user} />} />
                    <Route path="/purchases" element={<Purchases user={user} />} />
                    <Route path="/videos" element={<Videos />} />
                  </Routes>
                )}
              </AnimatePresence>
            </main>
            <Footer />
          </div>
        </Router>
      </CartProvider>
    </ThemeProvider>
  );
}
