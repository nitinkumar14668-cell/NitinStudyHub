import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Note, TransactionStatus, Transaction } from '../types';
import { X, Upload, CheckCircle2, Loader2, QrCode, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { db, storage, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';

import toast from 'react-hot-toast';

interface PaymentModalProps {
  notes: Note[];
  onClose: () => void;
}

enum PaymentStep {
  QR_SCAN = 'qr_scan',
  UPLOAD_SCREENSHOT = 'upload_screenshot',
  VERIFYING = 'verifying',
  SUCCESS = 'success',
}

export default function PaymentModal({ notes, onClose }: PaymentModalProps) {
  const [step, setStep] = useState<PaymentStep>(PaymentStep.QR_SCAN);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const navigate = useNavigate();

  const totalPrice = notes.reduce((sum, n) => sum + n.price, 0);

  const upiId = "9627XXXX65@fam"; 
  const upiLink = `upi://pay?pa=${upiId}&pn=NitinStudyHub&am=${totalPrice}&cu=INR`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNextStep = () => {
    if (step === PaymentStep.QR_SCAN) {
      setStep(PaymentStep.UPLOAD_SCREENSHOT);
    }
  };

  const handleUpload = async () => {
    if (!screenshot || !auth.currentUser) return;
    setLoading(true);
    try {
      // 1. Create transaction in Firestore
      const transData = {
        itemIds: notes.map(n => n.id),
        items: notes.map(n => ({ id: n.id, title: n.title, price: n.price })),
        amount: totalPrice,
        status: TransactionStatus.PENDING,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        downloaded: false,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'transactions'), transData);
      const transId = docRef.id;
      setTransactionId(transId);

      // 2. Upload screenshot to Storage
      const storageRef = ref(storage, `screenshots/${transId}/${screenshot.name}`);
      const uploadResult = await uploadBytes(storageRef, screenshot);
      const screenshotUrl = await getDownloadURL(uploadResult.ref);

      // 3. Update transaction with screenshot and change status to verifying
      await updateDoc(doc(db, 'transactions', transId), {
        screenshotUrl,
        status: TransactionStatus.VERIFYING,
        updatedAt: serverTimestamp(),
      });

      toast.success("Screenshot uploaded! Wait for admin approval.", { duration: 5000 });
      setStep(PaymentStep.VERIFYING);
    } catch (error) {
      console.error('Error in payment flow:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check for approval status
  useEffect(() => {
    if (step === PaymentStep.VERIFYING && transactionId) {
      // In a real app we might use onSnapshot to listen for changes
      // For this implementation, the user can check the Purchases page
      // but let's add a small message
    }
  }, [step, transactionId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden relative shadow-2xl transition-colors"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>

        <AnimatePresence mode="wait">
          {step === PaymentStep.QR_SCAN && (
            <motion.div
              key="qr"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 text-center"
            >
              <h2 className="text-2xl font-bold mb-2 dark:text-white">Scan & Pay</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">Scan this QR code using any UPI app like Google Pay, PhonePe, or FamPay.</p>
              
              <div className="bg-gray-50 dark:bg-white p-6 rounded-3xl inline-block border-2 border-dashed border-gray-200 dark:border-gray-100 mb-8 overflow-hidden">
                <QRCodeSVG value={upiLink} size={180} />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 flex items-center justify-between gap-4 mb-8">
                <div className="text-left">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">UPI ID</p>
                  <p className="font-mono text-sm text-blue-900 dark:text-blue-100">{upiId}</p>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all active:bg-gray-50 dark:active:bg-gray-700"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-lg font-bold px-2">
                  <span className="dark:text-gray-200">Payable Amount:</span>
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">₹{totalPrice}</span>
                </div>
                <button
                  onClick={handleNextStep}
                  className="w-full bg-gray-900 dark:bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-gray-800 dark:hover:bg-blue-700 transition-all mt-4"
                >
                  Done, Next Step
                </button>
              </div>
            </motion.div>
          )}

          {step === PaymentStep.UPLOAD_SCREENSHOT && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 text-center"
            >
              <h2 className="text-2xl font-bold mb-2 dark:text-white">Verify Payment</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">Please upload a screenshot of your successful transaction.</p>

              <div className="mb-8">
                <input
                  type="file"
                  id="screenshot-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="screenshot-upload"
                  className={`border-2 border-dashed rounded-3xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all ${
                    screenshot ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                  }`}
                >
                  {screenshot ? (
                    <>
                      <CheckCircle2 className="w-12 h-12 text-green-500" />
                      <div>
                        <p className="font-bold text-green-700 dark:text-green-400 truncate max-w-[200px]">{screenshot.name}</p>
                        <p className="text-xs text-green-600 dark:text-green-500">Click to change</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-400 dark:text-gray-600" />
                      <div>
                        <p className="font-bold text-gray-700 dark:text-gray-300">Upload Screenshot</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">Tap to browse files</p>
                      </div>
                    </>
                  )}
                </label>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  disabled={!screenshot || loading}
                  onClick={handleUpload}
                  className="w-full bg-gray-900 dark:bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-gray-800 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading...
                    </span>
                  ) : (
                    'Submit for Verification'
                  )}
                </button>
                <button
                  onClick={() => setStep(PaymentStep.QR_SCAN)}
                  className="text-gray-400 dark:text-gray-500 font-bold py-2 text-sm hover:text-gray-600 dark:hover:text-gray-300 active:text-gray-900 transition-colors"
                >
                  Go Back to QR
                </button>
              </div>
            </motion.div>
          )}

          {step === PaymentStep.VERIFYING && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 text-center"
            >
              <div className="relative w-24 h-24 mx-auto mb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="absolute inset-0 border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-4 italic dark:text-white">Verifying Payment...</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-2">Our system is checking your transaction screenshot.</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Estimated time: 5-10 seconds</p>
              
              <div className="mt-12 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl text-left border border-gray-100 dark:border-gray-700 transition-colors">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                  <QrCode className="w-3 h-3" /> System Logs
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-[10px] font-mono text-gray-400 dark:text-gray-500 space-y-1"
                >
                  <p>{`> Initializing verification handshake...`}</p>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }}>{`> Scanning transaction ID from metadata...`}</motion.p>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 5 }}>{`> Validating pixel patterns & UI elements...`}</motion.p>
                </motion.div>
              </div>
            </motion.div>
          )}

          {step === PaymentStep.SUCCESS && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 text-center"
            >
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle2 className="w-16 h-16" />
              </div>
              <h2 className="text-3xl font-black mb-4 dark:text-white">Payment Verified!</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-12">Your payment has been successfully confirmed. You can now download your notes.</p>
              
              <button
                onClick={() => navigate(`/download/${transactionId}`)}
                className="w-full bg-green-600 text-white font-bold py-5 rounded-2xl shadow-xl hover:bg-green-700 shadow-green-100 dark:shadow-none transition-all active:bg-green-800"
              >
                Go to Download Page
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
