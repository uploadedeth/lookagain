'use client'

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import Spinner from './Spinner';

const SignInButton: React.FC = () => {
  const router = useRouter();
  const { user, userProfile, loading, signInWithGoogle, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className="w-40 h-10 bg-[#262628] rounded-full animate-pulse" />
    );
  }

  if (user && userProfile) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-2 hover:bg-[#262628] rounded-full transition-all"
        >
          {userProfile.photoURL ? (
            <img 
              src={userProfile.photoURL} 
              alt={userProfile.displayName}
              className="w-8 h-8 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#262628] flex items-center justify-center">
              <span className="text-sm font-medium text-[#1c1c1d]">
                {userProfile.displayName?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
          <span className="text-sm font-medium text-[#e3e3e3]">
            {userProfile.displayName}
          </span>
          <span className="material-symbols-outlined text-lg text-[#9aa0a6]">
            {showDropdown ? 'arrow_drop_up' : 'arrow_drop_down'}
          </span>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-56 bg-[#262628] rounded-2xl shadow-xl border border-[#3c3c3f] overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-[#3c3c3f]">
              <p className="text-sm font-medium text-[#e3e3e3]">{userProfile.displayName}</p>
              <p className="text-xs text-[#9aa0a6] mt-1">{userProfile.email}</p>
            </div>
            <div className="p-2">
              <button
                  onClick={() => {
                    router.push('/profile');
                    setShowDropdown(false);
                  }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#e3e3e3] hover:bg-[#1c1c1d] rounded-xl transition-all"
              >
                <span className="material-symbols-outlined text-xl">person</span>
                <span>Profile</span>
              </button>
              <button
                onClick={() => {
                  signOut();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#e3e3e3] hover:bg-[#1c1c1d] rounded-xl transition-all"
              >
                <span className="material-symbols-outlined text-xl">logout</span>
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="flex items-center gap-2 px-5 py-2.5 bg-[#262628] hover:bg-[#262628]/50 text-[#e3e3e3] font-medium rounded-full transition-all"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#ffffff"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#ffffff"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#ffffff"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#ffffff"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Sign in with Google
    </button>
  );
};

export default SignInButton;
