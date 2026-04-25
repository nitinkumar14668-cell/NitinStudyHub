import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Transaction, TransactionStatus, Note } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Download as DownloadIcon, AlertTriangle, CheckCircle2, Lock, FileText, ArrowRight } from 'lucide-react';

interface DownloadProps {
  user: User | null;
}

export default function Download({ user }: DownloadProps) {
  const { transactionId } = useParams<{ transactionId: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!transactionId) return;
      try {
        const transRef = doc(db, 'transactions', transactionId);
        const transSnap = await getDoc(transRef);
        
        if (!transSnap.exists()) {
          setError("Transaction not found. Please contact support.");
          setLoading(false);
          return;
        }

        const transData = { id: transSnap.id, ...transSnap.data() } as Transaction;
        setTransaction(transData);

        if (transData.status !== TransactionStatus.APPROVED) {
          setError("This payment has not been verified yet.");
          setLoading(false);
          return;
        }

        const noteRef = doc(db, 'notes', transData.noteId);
        // If note doesn't exist in Firestore, use internal find for demo
        const noteSnap = await getDoc(noteRef);
        if (noteSnap.exists()) {
          setNote({ id: noteSnap.id, ...noteSnap.data() } as Note);
        } else {
          // Hardcoded fallback for demo notes
          setNote({
            id: transData.noteId,
            title: 'Your Study Notes',
            description: 'The premium notes you purchased.',
            price: transData.amount,
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            thumbnailUrl: '',
            category: 'Notes'
          });
        }
      } catch (err) {
        console.error(err);
        setError("An error occurred while fetching your download link.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [transactionId]);

  const handleDownload = async () => {
    if (!transaction || !note || transaction.downloaded) return;

    try {
      // Mark as downloaded first
      const transRef = doc(db, 'transactions', transaction.id);
      await updateDoc(transRef, {
        downloaded: true,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setTransaction(prev => prev ? { ...prev, downloaded: true } : null);

      // Trigger download
      const link = document.createElement('a');
      link.href = note.pdfUrl;
      link.target = '_blank';
      link.download = `${note.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Failed to process download. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="p-4">
          <DownloadIcon className="w-10 h-10 text-blue-600" />
        </motion.div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="bg-red-50 text-red-600 p-8 rounded-[2rem] border border-red-100 mb-8 inline-block">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="font-medium">{error || "Invalid request."}</p>
        </div>
        <button onClick={() => navigate('/')} className="block mx-auto text-gray-500 font-bold hover:text-gray-900 transition-colors">
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-20">
      <AnimatePresence mode="wait">
        {transaction.downloaded ? (
          <motion.div
            key="used"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="bg-orange-50 text-orange-600 p-8 rounded-[2rem] border border-orange-100 mb-8 inline-block">
              <Lock className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-3xl font-black mb-4 tracking-tight">Link Expired</h2>
              <p className="font-medium text-lg leading-relaxed px-8">
                This download link was used once and has now expired for security reasons. <br />
                If you lost your file, please contact support with your transaction ID.
              </p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-2xl mb-8 text-left border border-gray-100 max-w-sm mx-auto">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Transaction ID</p>
              <p className="font-mono text-sm text-gray-600 break-all">{transaction.id}</p>
            </div>

            <button
              onClick={() => navigate('/')}
              className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-blue-600 transition-all flex items-center gap-2 mx-auto"
            >
              Back to Store <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[3rem] shadow-2xl shadow-blue-100 overflow-hidden border border-gray-100"
          >
            <div className="bg-blue-600 p-12 text-white text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full" />
               <CheckCircle2 className="w-20 h-20 mx-auto mb-6 drop-shadow-lg" />
               <h2 className="text-4xl font-black mb-2">Ready to Download!</h2>
               <p className="text-blue-100 font-medium">Thank you {user?.displayName}, for your purchase.</p>
            </div>

            <div className="p-12">
              <div className="flex items-start gap-6 bg-gray-50 p-8 rounded-3xl mb-12 border border-gray-100">
                <div className="bg-blue-100 p-4 rounded-2xl text-blue-600 shrink-0">
                  <FileText className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">{note?.title}</h3>
                  <p className="text-gray-500 font-medium">{note?.description}</p>
                  <div className="flex gap-4 mt-4">
                    <span className="text-xs font-bold bg-white px-3 py-1 rounded-full text-blue-600 border border-blue-50">PDF FORMAT</span>
                    <span className="text-xs font-bold bg-white px-3 py-1 rounded-full text-blue-600 border border-blue-50">PREMIUM CONTENT</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6 text-center">
                <p className="text-sm font-bold text-orange-600 bg-orange-50 py-2 px-4 rounded-lg inline-block">
                  ⚠️ IMPORTANT: This link will expire once you start the download.
                </p>
                
                <button
                  onClick={handleDownload}
                  className="w-full bg-gray-900 text-white py-6 rounded-2xl text-2xl font-black shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-4 active:scale-95"
                >
                  <DownloadIcon className="w-8 h-8" />
                  Download Notes
                </button>
                
                <p className="text-gray-400 text-xs font-medium italic">
                  By clicking download, you agree that this single-use link will be deactivated.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
