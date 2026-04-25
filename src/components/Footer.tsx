import { Instagram, Twitter, Mail, Shield, Info, Headphones } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 transition-colors pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xl font-bold mb-4 dark:text-white">NitinStudyHub</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              Premium quality study notes for students. Simplifying education through well-structured and easy-to-understand materials.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 flex items-center gap-2 dark:text-gray-200">
              <Info className="w-4 h-4" /> Quick Links
            </h4>
            <ul className="space-y-2 text-gray-500 dark:text-gray-400 text-sm">
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">How it works</a></li>
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">All Notes</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 flex items-center gap-2 dark:text-gray-200">
              <Shield className="w-4 h-4" /> Policy
            </h4>
            <ul className="space-y-2 text-gray-500 dark:text-gray-400 text-sm">
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Refund Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-100 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <a href="#" className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="mailto:support@nitinstudyhub.com" className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
              <Mail className="w-5 h-5" />
            </a>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Headphones className="w-4 h-4" />
            <span>Support: support@nitinstudyhub.com</span>
          </div>
          
          <p className="text-gray-400 text-xs">
            © {new Date().getFullYear()} NitinStudyHub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
