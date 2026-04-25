import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { auth } from './lib/firebase';
import Home from './pages/Home';
import Download from './pages/Download';
import Admin from './pages/Admin';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { motion, AnimatePresence } from 'motion/react';

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-2xl font-sans font-medium text-gray-500"
        >
          NitinStudyHub
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#f8f9fa] font-sans text-gray-900 flex flex-col">
        <Navbar user={user} />
        <main className="flex-grow">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Home user={user} />} />
              <Route path="/download/:transactionId" element={<Download user={user} />} />
              <Route path="/admin" element={<Admin user={user} />} />
            </Routes>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
