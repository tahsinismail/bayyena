import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import LanguageSwitcher from './LanguageSwitcher';
import { HamburgerMenuIcon, Cross1Icon, ChevronUpIcon } from '@radix-ui/react-icons';
import logo from '../assets/logo.png';
import { navigate } from 'wouter/use-browser-location';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';


interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, setUser } = useAuth();
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { t } = useTranslation();

  // Check if we're on the chat page
  const isChatPage = location.startsWith('/chat');

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 10);
      setShowBackToTop(scrollTop > 300); // Show back to top after 300px scroll
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!user) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  // If on chat page, render without header and footer
  if (isChatPage) {
    return (
      <div className="h-screen bg-gray-50 overflow-hidden">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200' 
          : 'bg-white border-b border-gray-100'
      }`}>
        <div className="min-w-full px-4">
          <div className="flex justify-between items-center h-20">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-2 text-[#a17a1a]">
              <a href="/">
                <img src={logo} alt="BAYYENA Logo" className="w-14 h-14 md:w-18 md:h-18 object-contain" />
              </a>
              <p className="hidden md:block text-lg font-semibold">{t('slogan')}</p>
            </div>
            {/* Right Side - User Info and Language Switcher */}
            <div className="flex items-center space-x-4">
              {/* Language Switcher */}
              <LanguageSwitcher />
              
              {/* User Info */}
              <div className="hidden lg:flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                  <p className="text-xs text-gray-500">Welcome back!</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
                >
                  {t('logout')}
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={toggleMobileMenu}
                className="lg:hidden px-2 py-1 rounded-md text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
              >
                {isMobileMenuOpen ? (
                  <Cross1Icon className="w-6 h-6" />
                ) : (
                  <HamburgerMenuIcon className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="w-full h-max fixed top-20 inset-0 bg-white bg-opacity-50 z-40 lg:hidden"
              onClick={closeMobileMenu}
            />
            
            {/* Mobile Menu Content */}
            <div className="lg:hidden absolute top-full left-0 right-0 bg-white shadow-lg z-50">
          

                {/* Mobile User Info */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                      <p className="text-xs text-gray-500">Welcome back!</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 border border-gray-200 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
                    >
                      {t('logout')}
                    </button>
                  </div>
                </div>

            </div>
          </>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-[80vh]">
        {children}
      </main>

      {/* Footer */}
      <footer className={`w-full mt-8 border-t border-gray-200 grid place-items-center transition-all duration-300`}>
      
        <div className="max-w-full">
            <div className="flex justify-center items-center py-6">
              <p className="text-sm text-[#856A00]">
                © 2025 Bayyena. All rights reserved.
              </p>
            </div>
          
        </div>
      </footer>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="back-to-top-button"
          aria-label="Back to top"
        >
          <ChevronUpIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default Layout;
