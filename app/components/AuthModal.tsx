'use client'

import React from 'react';
import { useAuth } from './AuthProvider';
import SignInButton from './SignInButton';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  title = "Sign In Required",
  message = "You need to sign in to play this game."
}) => {
  const { user } = useAuth();

  // Auto-close if user becomes authenticated
  React.useEffect(() => {
    if (user && isOpen) {
      onClose();
    }
  }, [user, isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#262628] rounded-2xl p-6 mx-4 max-w-md w-full shadow-2xl border border-[#3c3c3f] animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#9aa0a6] hover:text-[#e3e3e3] transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Icon */}
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 bg-[#fbbf24]/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#fbbf24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-[#e3e3e3] mb-3">
            {title}
          </h2>

          {/* Message */}
          <p className="text-[#9aa0a6] mb-6">
            {message}
          </p>

          {/* Sign In Button */}
          <div className="flex justify-center mb-4">
            <SignInButton variant="modal" />
          </div>

          {/* Cancel button */}
          <button
            onClick={onClose}
            className="text-[#9aa0a6] hover:text-[#e3e3e3] text-sm transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
